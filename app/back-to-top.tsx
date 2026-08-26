"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 420);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <button
    type="button"
    className={`back-to-top ${visible ? "visible" : ""}`}
    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    aria-label="Back to the top of the page"
    title="Back to top"
  ><span aria-hidden="true">↑</span><small>Top</small></button>;
}
