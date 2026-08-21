"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Cookie } from "lucide-react";

const STORAGE_KEY = "agenticflow:cookie-consent";
const REOPEN_EVENT = "agenticflow:reopen-cookie-consent";

/** Fired by the footer's "Cookie Preferences" control to bring the banner back. */
export function reopenCookieConsent() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // Checked client-side only (after mount) so the server-rendered markup and
  // the first client render match — localStorage doesn't exist on the server.
  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    const reopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const dismiss = (value: "accepted" | "dismissed") => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-lg z-50"
        >
          <div className="flex items-center gap-4 rounded-2xl bg-white border border-zinc-200 shadow-xl p-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[13px] text-zinc-600 leading-snug flex-1">
              We use cookies to enhance your browsing experience and analyze our traffic. By clicking &quot;Accept&quot; you consent to our{" "}
              <span className="text-blue-600 underline underline-offset-2 font-medium">use of cookies</span>.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => dismiss("accepted")}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => dismiss("dismissed")}
                aria-label="Dismiss cookie notice"
                className="w-8 h-8 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
