"use client";

/* eslint-disable react-hooks/set-state-in-effect -- local device profile hydrates after the client mounts */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BowlerMatch, LEAGUES_KEY, PROFILE_KEY } from "./bowler-lookup";
import { BowlerSearchPanel } from "./bowler-search-panel";

export function HomeDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const storedBowler = localStorage.getItem(PROFILE_KEY) || "";
    try { setSaved(JSON.parse(localStorage.getItem(LEAGUES_KEY) || "[]")); } catch { setSaved([]); }
    if (storedBowler) router.replace("/leagues");
    else setReady(true);
  }, [router]);

  const choose = (match: BowlerMatch) => {
    const ids = [...new Set([...saved, ...match.leagues.map((league) => league.id)])];
    localStorage.setItem(PROFILE_KEY, match.name);
    localStorage.setItem(LEAGUES_KEY, JSON.stringify(ids));
    router.replace("/leagues");
  };

  if (!ready) return <main className="welcome-home"><div className="frameline-loading">Opening your leagues…</div></main>;

  return <main className="welcome-home onboarding-home">
    <BowlerSearchPanel onSelect={choose} heading="Hello, Bowler." intro="Please enter your name and I’ll find every imported league and team connected to you." />
  </main>;
}
