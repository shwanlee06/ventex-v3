// PWA service worker registration + install prompt hook
import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const registered = useRef(false);

  // Register service worker
  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwRegistration(reg);
          console.log("[PWA] Service worker registered");
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when app is installed
    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setCanInstall(false);

      if (outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as NotificationPermission;

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch {
      return "denied" as NotificationPermission;
    }
  }, []);

  // Send a local notification (for testing / in-app alerts)
  const sendLocalNotification = useCallback(
    (title: string, body: string, url?: string) => {
      if (!swRegistration || notificationPermission !== "granted") return;

      swRegistration.showNotification(title, {
        body,
        icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png",
        badge: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png",
        tag: `ventex-${Date.now()}`,
        data: { url: url || "/dashboard" },
      } as NotificationOptions);
    },
    [swRegistration, notificationPermission]
  );

  return {
    canInstall,
    isInstalled,
    installApp,
    notificationPermission,
    requestNotificationPermission,
    sendLocalNotification,
    swRegistration,
  };
}
