"use client";

/* eslint-disable react-hooks/set-state-in-effect -- local device profile hydrates after the client mounts */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BowlerMatch, LEAGUES_KEY, PROFILE_ALIASES_KEY, PROFILE_KEY } from "./bowler-lookup";
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

  const choose = (matches: BowlerMatch[]) => {
    if (!matches.length) return;
    const ids = [...new Set([...saved, ...matches.flatMap((match) => match.leagues.map((league) => league.id))])];
    const leagueBowlers = Object.fromEntries(matches.flatMap((match) => match.leagues.map((league) => [league.id, match.name])));
    localStorage.setItem(PROFILE_KEY, matches[0].name);
    localStorage.setItem(PROFILE_ALIASES_KEY, JSON.stringify(matches.map((match) => match.name)));
    localStorage.setItem("frameline-league-bowlers", JSON.stringify(leagueBowlers));
    localStorage.setItem(LEAGUES_KEY, JSON.stringify(ids));
    router.replace("/leagues");
  };

  if (!ready) return <main className="welcome-home"><div className="frameline-loading">Opening your leagues…</div></main>;

  return <main className="welcome-home onboarding-home">
    <BowlerSearchPanel onSelectMany={choose} heading="Hello, Bowler." intro="Search your name, then select every roster version that belongs to you—for example, Tom and Tommy." />
  </main>;
}
