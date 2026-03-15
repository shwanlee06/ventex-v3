// ============================================================================
// AI Chat Router — Claude 4.6 Sonnet via Forge API
// ============================================================================

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, type Message } from "../_core/llm";

const SYSTEM_PROMPT = `You are the ATLAS Venture Intelligence Operations assistant for Thalora. You are powered by Claude 4.6 Sonnet.

You serve as an AI-powered operations assistant for a multi-sector venture holding company. The company manages ventures across Real Estate, F&B, Yacht, Entertainment, Oil & Gas, and other sectors.

Key portfolio context:
- The company operates across multiple geographies including Dubai, Oman, Greece, USA, and Lebanon
- Key ventures include Nammos brand partnerships (Watson Island, Lagonissi), Zarka City (Oman), and various real estate projects
- SPV (Special Purpose Vehicle) deals are tracked through stages: Active deal, In negotiation, Closed deal, Dropped deal
- The team includes Jimmy Frangi (Founder), Carl Frangi (Investor Relations), Anton Maghami (VP Operations), Jon Eichner (COO), Maher Abou Chakra (Accounting), and others
- Key partner: Monterock International (UAE) — luxury lifestyle holding company

Your role:
1. Answer questions about venture operations, SPV pipeline, team, and distributions
2. Draft professional communications (LP updates, investor memos, internal briefs)
3. Provide strategic analysis and recommendations
4. Help with task prioritization and operational planning

Communication style:
- Professional, concise, and data-driven
- Use markdown formatting for structured responses
- When drafting emails or communications, mark them as requiring approval
- Reference specific ventures, SPVs, and team members by name when relevant
- Use tables for comparative data when appropriate

Important: You are Claude 4.6 Sonnet. When asked about your model or identity, confirm this.`;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const aiRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(messageSchema),
      })
    )
    .mutation(async ({ input }) => {
      const llmMessages: Message[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      try {
        const result = await invokeLLM({
          messages: llmMessages,
          maxTokens: 4096,
        });

        const content = result.choices?.[0]?.message?.content;
        const textContent =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .filter((c) => c.type === "text")
                  .map((c) => (c as { type: "text"; text: string }).text)
                  .join("")
              : "I apologize, but I was unable to generate a response. Please try again.";

        // Check if the response contains a draft that needs approval
        const requiresApproval =
          textContent.toLowerCase().includes("draft") &&
          (textContent.toLowerCase().includes("email") ||
            textContent.toLowerCase().includes("memo") ||
            textContent.toLowerCase().includes("letter") ||
            textContent.toLowerCase().includes("approval"));

        return {
          content: textContent,
          requiresApproval,
          model: result.model || "claude-4.6-sonnet",
        };
      } catch (error: unknown) {
        console.error("[AI Chat] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`AI response failed: ${errorMessage}`);
      }
    }),
});
