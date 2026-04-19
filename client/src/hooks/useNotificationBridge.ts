// Bridge between SSE real-time events and browser push notifications
// When the app is in the background or the user has the tab unfocused,
// this sends native push notifications for important events.

import { useEffect, useRef } from "react";
import { useSSEEvent } from "./useSSE";
import { usePWA } from "./usePWA";

type NotificationConfig = {
  title: string;
  body: string;
  url?: string;
};

function formatNotification(type: string, data: Record<string, unknown>): NotificationConfig | null {
  switch (type) {
    case "notification":
      return {
        title: (data.title as string) || "VENTEX Alert",
        body: (data.message as string) || (data.body as string) || "New notification",
        url: (data.url as string) || "/dashboard",
      };

    case "task_update":
      return {
        title: "Task Update",
        body: `${data.taskTitle || "A task"} was ${data.action || "updated"}`,
        url: "/tasks",
      };

    case "venture_update":
      return {
        title: "Venture Update",
        body: `${data.ventureName || "A venture"}: ${data.action || "status changed"}`,
        url: data.ventureSlug ? `/ventures/${data.ventureSlug}` : "/ventures",
      };

    case "agent_activity":
      return {
        title: "VENTEX AI",
        body: (data.message as string) || "AI agent completed an action",
        url: "/agent",
      };

    case "feed_update":
      return {
        title: "New Activity",
        body: (data.message as string) || "New activity in your portfolio",
        url: "/activity",
      };

    default:
      return null;
  }
}

export function useNotificationBridge() {
  const { sendLocalNotification, notificationPermission } = usePWA();
  const isDocumentVisible = useRef(true);

  // Track document visibility
  useEffect(() => {
    const handleVisibility = () => {
      isDocumentVisible.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Bridge SSE events to push notifications when tab is not visible
  const handleEvent = (type: string) => (data: Record<string, unknown>) => {
    // Only send push notification if tab is not visible and permission is granted
    if (isDocumentVisible.current) return;
    if (notificationPermission !== "granted") return;

    const config = formatNotification(type, data);
    if (!config) return;

    sendLocalNotification(config.title, config.body, config.url);
  };

  useSSEEvent("notification", handleEvent("notification"));
  useSSEEvent("task_update", handleEvent("task_update"));
  useSSEEvent("venture_update", handleEvent("venture_update"));
  useSSEEvent("agent_activity", handleEvent("agent_activity"));
  useSSEEvent("feed_update", handleEvent("feed_update"));
}
