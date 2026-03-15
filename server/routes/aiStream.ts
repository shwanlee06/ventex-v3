// ============================================================================
// AI Chat Streaming Endpoint — SSE for real-time token delivery
// ============================================================================

import { Router, Request, Response } from "express";
import { ENV } from "../_core/env";

const SYSTEM_PROMPT = `You are the ATLAS Venture Intelligence Operations assistant for Royalton Venture Holding. You are powered by Claude 4.6 Sonnet.

You serve as an AI-powered operations assistant for a multi-sector venture holding company managing ventures across Real Estate, F&B, Yacht, Entertainment, Oil & Gas, and other sectors.

Key context:
- Geographies: Dubai, Oman, Greece, USA, Lebanon
- Key ventures: Nammos partnerships (Watson Island, Lagonissi), Zarka City (Oman), various real estate
- SPV stages: Active deal, In negotiation, Closed deal, Dropped deal
- Team: Jimmy Frangi (Founder), Carl Frangi (IR), Anton Maghami (VP Ops), Jon Eichner (COO), Maher Abou Chakra (Accounting)
- Partner: Monterock International (UAE)

Your role: Answer venture ops questions, draft communications, provide strategic analysis, help with task planning.

Style: Professional, concise, data-driven. Use markdown. Reference specific ventures/SPVs/team by name. Mark drafted communications as requiring approval.

Important: You are Claude 4.6 Sonnet.`;

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

export const aiStreamRouter = Router();

aiStreamRouter.post("/api/ai/stream", async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!ENV.forgeApiKey) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const llmMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: llmMessages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.write(
        `data: ${JSON.stringify({ error: `LLM error: ${response.status} ${errorText}` })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      res.write(
        `data: ${JSON.stringify({ error: "No response body" })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Track if client disconnects
    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
      reader.cancel();
    });

    while (!clientDisconnected) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines from the upstream
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta;

            if (delta?.content) {
              res.write(
                `data: ${JSON.stringify({ content: delta.content })}\n\n`
              );
            }

            // Check for finish
            if (chunk.choices?.[0]?.finish_reason) {
              res.write(
                `data: ${JSON.stringify({ finish_reason: chunk.choices[0].finish_reason, model: chunk.model || "claude-4.6-sonnet" })}\n\n`
              );
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed === "data: [DONE]") {
        res.write("data: [DONE]\n\n");
      } else if (trimmed.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            res.write(
              `data: ${JSON.stringify({ content: delta.content })}\n\n`
            );
          }
        } catch {
          // Skip
        }
      }
    }

    if (!clientDisconnected) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    console.error("[AI Stream] Error:", error);
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Stream failed" })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});
