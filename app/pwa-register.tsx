"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? (window.location.pathname.startsWith("/frameline-league-scores") ? "/frameline-league-scores" : "");
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // The website remains fully usable when installation is unavailable.
    });
  }, []);
  return null;
}
