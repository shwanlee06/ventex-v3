// PWA Install Prompt — subtle banner encouraging users to install the app
import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Bell, BellOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DISMISS_KEY = "ventex_pwa_dismiss";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function PWAInstallPrompt() {
  const {
    canInstall,
    isInstalled,
    installApp,
    notificationPermission,
    requestNotificationPermission,
  } = usePWA();
  const [dismissed, setDismissed] = useState(true);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION) {
        setDismissed(true);
        return;
      }
    }

    // Show install prompt after 3 seconds if installable
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => setDismissed(false), 3000);
      return () => clearTimeout(timer);
    }

    // Show notification prompt if installed but notifications not granted
    if (isInstalled && notificationPermission === "default") {
      const timer = setTimeout(() => {
        setShowNotifPrompt(true);
        setDismissed(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, notificationPermission]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast.success("VENTEX installed successfully", {
        description: "You can now access VENTEX from your home screen",
      });
    }
    setDismissed(true);
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      toast.success("Notifications enabled", {
        description: "You'll receive alerts for new action items and updates",
      });
    } else if (permission === "denied") {
      toast.error("Notifications blocked", {
        description: "You can enable them later in your browser settings",
      });
    }
    setDismissed(true);
    setShowNotifPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setShowNotifPrompt(false);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[380px] z-[9999]"
      >
        <div
          className="rounded-xl border border-emerald-500/20 p-4 shadow-2xl shadow-emerald-500/5"
          style={{ backgroundColor: "#0d1117" }}
        >
          {showNotifPrompt ? (
            // Notification permission prompt
            <>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 flex-shrink-0">
                  <Bell className="size-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    Enable Notifications
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Get instant alerts when new action items arrive, ventures advance, or your team needs attention.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3 ml-[52px]">
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3"
                >
                  <Bell className="size-3.5 mr-1.5" />
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-zinc-400 hover:text-zinc-200 text-xs h-8 px-3"
                >
                  <BellOff className="size-3.5 mr-1.5" />
                  Not now
                </Button>
              </div>
            </>
          ) : (
            // Install prompt
            <>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 flex-shrink-0">
                  <Smartphone className="size-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    Install VENTEX
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Add VENTEX to your home screen for instant access, offline support, and push notifications.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3 ml-[52px]">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3"
                >
                  <Download className="size-3.5 mr-1.5" />
                  Install App
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-zinc-400 hover:text-zinc-200 text-xs h-8 px-3"
                >
                  Maybe later
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
