// SSE Event Bus — Server-Sent Events for real-time updates
// Clients subscribe to /api/events and receive push notifications

import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";

export type SSEEventType =
  | "feed_update"       // New velocity feed item
  | "notification"      // New notification
  | "agent_activity"    // Agent execution update
  | "task_update"       // Task status change
  | "venture_update"    // Venture status change
  | "spv_update"        // SPV stage change
  | "presence_update"   // User presence change
  | "heartbeat";        // Keep-alive ping

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  userId?: number;          // Target specific user (null = broadcast)
  organizationId?: number;  // Target specific org
}

interface SSEClient {
  id: string;
  res: Response;
  userId: number;
  organizationId: number | null;
  connectedAt: Date;
}

const clients = new Map<string, SSEClient>();
let clientIdCounter = 0;

export function broadcastSSE(event: SSEEvent) {
  const payload = `data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`;

  Array.from(clients.entries()).forEach(([id, client]) => {
    try {
      // Filter: if event targets a specific user, only send to that user
      if (event.userId && client.userId !== event.userId) return;

      // Filter: if event targets a specific org, only send to members of that org
      if (event.organizationId && client.organizationId !== event.organizationId) return;

      client.res.write(payload);
    } catch {
      // Client disconnected — clean up
      clients.delete(id);
    }
  });
}

setInterval(() => {
  const heartbeat = `data: ${JSON.stringify({ type: "heartbeat", ts: Date.now() })}\n\n`;
  Array.from(clients.entries()).forEach(([id, client]) => {
    try {
      client.res.write(heartbeat);
    } catch {
      clients.delete(id);
    }
  });
}, 30_000); // Every 30 seconds

export const sseRouter = Router();

sseRouter.get("/api/events", async (req: Request, res: Response) => {
  // Authenticate the user
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Register client
  const clientId = `sse_${++clientIdCounter}_${user.id}`;
  const client: SSEClient = {
    id: clientId,
    res,
    userId: user.id,
    organizationId: user.organizationId ?? null,
    connectedAt: new Date(),
  };
  clients.set(clientId, client);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: "connected", clientId, ts: Date.now() })}\n\n`);

  // Clean up on disconnect
  req.on("close", () => {
    clients.delete(clientId);
  });
});

sseRouter.get("/api/events/stats", async (req: Request, res: Response) => {
  let statsUser;
  try {
    statsUser = await sdk.authenticateRequest(req);
  } catch {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!statsUser || (statsUser.role !== "admin" && statsUser.role !== "owner")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({
    connectedClients: clients.size,
    clients: Array.from(clients.values()).map(c => ({
      id: c.id,
      userId: c.userId,
      organizationId: c.organizationId,
      connectedAt: c.connectedAt.toISOString(),
    })),
  });
});

export function getConnectedClientCount(): number {
  return clients.size;
}
