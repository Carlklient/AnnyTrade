"use client";

import { useEffect } from "react";

/** Registers the AnnyTrade PWA service worker once on the client. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore SW failures on unsupported hosts */
    });
  }, []);
  return null;
}
