"use client";

import { useEffect, useRef, useState } from "react";

export function PullToRefresh() {
  const startY = useRef<number | null>(null);
  const currentDistance = useRef(0);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const start = (event: TouchEvent) => {
      if (window.scrollY <= 1) {
        startY.current = event.touches[0]?.clientY ?? null;
        currentDistance.current = 0;
      }
    };
    const move = (event: TouchEvent) => {
      if (startY.current === null) return;
      const next = Math.min(120, Math.max(0, ((event.touches[0]?.clientY ?? startY.current) - startY.current) * 0.65));
      currentDistance.current = next;
      setDistance(next);
    };
    const finish = () => {
      const shouldRefresh = currentDistance.current >= 72;
      startY.current = null;
      currentDistance.current = 0;
      setDistance(0);
      if (shouldRefresh) {
        const url = new URL(window.location.href);
        url.searchParams.set("refresh", Date.now().toString());
        window.location.assign(url.toString());
      }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", finish, { passive: true });
    window.addEventListener("touchcancel", finish, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", finish);
    };
  }, []);

  return <div className={`pull-refresh ${distance >= 72 ? "ready" : ""}`} style={{ transform: `translate(-50%, ${distance - 54}px)`, opacity: distance ? 1 : 0 }} aria-hidden="true">
    <span>{distance >= 72 ? "↻" : "↓"}</span>{distance >= 72 ? "Release to refresh" : "Pull to refresh"}
  </div>;
}
