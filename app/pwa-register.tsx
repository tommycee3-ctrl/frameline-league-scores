"use client";

import { useEffect } from "react";
import leagueCatalog from "../public/data/leagues/all.json";

const signature = (entries: typeof leagueCatalog) => JSON.stringify(entries.map(league => [league.id, league.fingerprint, league.updated, league.week]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));

export function PwaRegister() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? (window.location.pathname.startsWith("/frameline-league-scores") ? "/frameline-league-scores" : "");
    let stopped = false;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch(`${base}/data/leagues/all.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const entries = await response.json();
        if (!Array.isArray(entries) || !entries.length || stopped) return;
        const latest = signature(entries);
        const key = "frameline-last-auto-refresh";
        if (latest !== signature(leagueCatalog) && sessionStorage.getItem(key) !== latest) {
          sessionStorage.setItem(key, latest);
          window.location.reload();
        }
      } catch {
        // Keep the downloaded results available while offline.
      } finally { checking = false; }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/`, updateViaCache: "none" }).then(registration => registration.update()).catch(() => {});
    }
    void check();
    const timer = window.setInterval(check, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, []);
  return null;
}
