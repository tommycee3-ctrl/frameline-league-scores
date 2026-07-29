"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav({ links }: { links: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
        <span/><span/>
      </button>
      {open && (
        <nav className="mobile-panel" aria-label="Mobile navigation">
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        </nav>
      )}
    </div>
  );
}
