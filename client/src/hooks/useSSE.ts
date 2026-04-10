// Connects to /api/events and dispatches real-time updates to subscribers.
// Falls back gracefully if SSE is unavailable.

import { useEffect, useRef, useCallback, useState } from "react";

export type SSEEventType =
  | "feed_update"
  | "notification"
  | "agent_activity"
  | "task_update"
  | "venture_update"
  | "spv_update"
  | "presence_update"
  | "heartbeat"
  | "connected";

type SSEHandler = (data: Record<string, unknown>) => void;

const handlers = new Map<SSEEventType, Set<SSEHandler>>();
let globalEventSource: EventSource | null = null;
let refCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30_000;

function connect() {
  if (globalEventSource) return;

  try {
    globalEventSource = new EventSource("/api/events");

    globalEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const type = parsed.type as SSEEventType;

        // Reset reconnect delay on successful message
        reconnectDelay = 1000;

        // Dispatch to registered handlers
        const typeHandlers = handlers.get(type);
        if (typeHandlers) {
          Array.from(typeHandlers).forEach((handler) => {
            try {
              handler(parsed);
            } catch (err) {
              console.error("[SSE] Handler error:", err);
            }
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    globalEventSource.onerror = () => {
      // Close and schedule reconnect
      globalEventSource?.close();
      globalEventSource = null;

      if (refCount > 0) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      }
    };
  } catch {
    // SSE not supported or blocked
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  globalEventSource?.close();
  globalEventSource = null;
  reconnectDelay = 1000;
}

function subscribe(type: SSEEventType, handler: SSEHandler) {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);
}

function unsubscribe(type: SSEEventType, handler: SSEHandler) {
  handlers.get(type)?.delete(handler);
  if (handlers.get(type)?.size === 0) {
    handlers.delete(type);
  }
}

export function useSSEConnection() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    refCount++;
    connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    subscribe("connected", onConnect);

    return () => {
      unsubscribe("connected", onConnect);
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        disconnect();
      }
    };
  }, []);

  return { connected };
}

export function useSSEEvent(
  type: SSEEventType,
  handler: SSEHandler,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler: SSEHandler = (data) => handlerRef.current(data);
    subscribe(type, stableHandler);
    return () => unsubscribe(type, stableHandler);
  }, [type, ...deps]);
}

export function useSSEInvalidation(
  type: SSEEventType,
  invalidateFn: () => void,
  deps: unknown[] = []
) {
  const invalidateRef = useRef(invalidateFn);
  invalidateRef.current = invalidateFn;

  // Debounce invalidation to prevent rapid-fire refetches
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedInvalidate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      invalidateRef.current();
      timerRef.current = null;
    }, 500);
  }, []);

  useSSEEvent(type, debouncedInvalidate, deps);
}
