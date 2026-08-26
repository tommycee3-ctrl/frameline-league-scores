"use client";

/* eslint-disable react-hooks/set-state-in-effect -- local device profile hydrates after the client mounts */

import Link from "next/link";
import { useEffect, useState } from "react";
import { BowlerMatch, LEAGUES_KEY, PROFILE_KEY, leagueSnapshots } from "./bowler-lookup";
import { BowlerSearchPanel } from "./bowler-search-panel";

export function HomeDashboard() {
  const [ready, setReady] = useState(false);
  const [bowler, setBowler] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setBowler(localStorage.getItem(PROFILE_KEY) || "");
    try { setSaved(JSON.parse(localStorage.getItem(LEAGUES_KEY) || "[]")); } catch { setSaved([]); }
    setReady(true);
  }, []);

  const choose = (match: BowlerMatch) => {
    const ids = [...new Set([...saved, ...match.leagues.map((league) => league.id)])];
    localStorage.setItem(PROFILE_KEY, match.name);
    localStorage.setItem(LEAGUES_KEY, JSON.stringify(ids));
    setBowler(match.name);
    setSaved(ids);
  };
  const reset = () => { localStorage.removeItem(PROFILE_KEY); setBowler(""); };
  if (!ready) return <main className="welcome-home"><div className="frameline-loading">Loading FrameLine…</div></main>;

  if (!bowler) return <main className="welcome-home onboarding-home">
    <BowlerSearchPanel onSelect={choose} heading="Hello, Bowler." intro="Please enter your name and I’ll find every imported league and team connected to you." />
  </main>;

  const firstName = (bowler.includes(",") ? bowler.split(",")[1] : bowler).trim().split(/\s+/)[0] || "Bowler";
  const leagues = saved.map((id) => leagueSnapshots.find((league) => league.id === id)).filter(Boolean);
  return <main className="welcome-home">
    <section className="welcome-heading">
      <div><p className="frameline-kicker">YOUR BOWLING DASHBOARD</p><h1>Welcome, <em>{firstName}.</em></h1><p>Your saved leagues and scores are ready.</p></div>
      <button type="button" onClick={reset}>Change my bowler</button>
    </section>
    <section className="welcome-leagues">
      <div className="welcome-section-title"><div><small>QUICK SELECT</small><h2>My Leagues</h2></div><Link href="/manage-leagues">Add / Remove</Link></div>
      <div className="welcome-league-grid">{leagues.length ? leagues.map((league) => {
        if (!league) return null;
        const location = league as typeof league & { centerName?: string };
        return <Link href={`/leagues?league=${league.id}`} key={league.id}><small>{location.centerName ?? "Bowling center"}</small><strong>{league.displayName}</strong><span>{league.week ? `Week ${league.week}` : "Awaiting results"} →</span></Link>;
      }) : <div className="welcome-empty"><strong>No leagues saved yet.</strong><Link href="/manage-leagues">Find my leagues →</Link></div>}</div>
    </section>
  </main>;
}
