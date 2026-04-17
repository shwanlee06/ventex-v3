import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_KEY = "ventex_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(COOKIE_KEY, "dismissed");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50"
        >
          <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground font-medium mb-1">
                  Cookie Notice
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  We use essential cookies for authentication and session management.
                  Analytics cookies help us improve the platform.
                  See our{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>{" "}
                  for details.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={accept} className="text-[11px] h-7 px-3">
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={dismiss}
                className="text-[11px] h-7 px-3"
              >
                Essential Only
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
