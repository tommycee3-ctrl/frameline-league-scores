"use client";

import { useMemo, useState } from "react";
import leagueCatalog from "../../public/data/leagues/all.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "../leagues/synced-league-dashboard";

type AuditableLeague = LeagueSnapshot & {
  area?: string;
  centerName?: string;
  season?: string;
  updated?: string;
  syncedAt?: string | null;
  status?: string;
};

const leagues = leagueCatalog as AuditableLeague[];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const formatChecked = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not checked yet";

export function LeagueView() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All areas");
  const [center, setCenter] = useState("All centers");
  const [day, setDay] = useState("All days");
  const [selectedId, setSelectedId] = useState("");
  const areas = unique(leagues.map((league) => league.area ?? "Other"));
  const centers = unique(leagues.filter((league) => area === "All areas" || (league.area ?? "Other") === area).map((league) => league.centerName ?? "Bowling center"));
  const filtered = useMemo(() => leagues.filter((league) => {
    const text = `${league.displayName} ${league.id} ${league.centerName ?? ""}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) &&
      (area === "All areas" || (league.area ?? "Other") === area) &&
      (center === "All centers" || (league.centerName ?? "Bowling center") === center) &&
      (day === "All days" || league.bowlsOn === day);
  }).sort((a, b) => (b.updated ?? b.sourceUpdated ?? "").localeCompare(a.updated ?? a.sourceUpdated ?? "") || a.displayName.localeCompare(b.displayName)), [query, area, center, day]);
  const selected = leagues.find((league) => league.id === selectedId);
  const openLeague = (id: string) => {
    setSelectedId(id);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById("audited-league")?.scrollIntoView({ behavior: "smooth", block: "start" })));
  };

  return <main className="league-view-page">
    <section className="section league-view-heading">
      <p className="eyebrow red">Data verification</p>
      <h1>League View</h1>
      <p>Browse every imported league without adding it to My Leagues. Compare its source date and full results with LeagueSecretary.</p>
    </section>
    <section className="section league-browser">
      <div className="league-browser-tools">
        <label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="League, center, or League ID" /></label>
        <label><span>Area</span><select value={area} onChange={(event) => { setArea(event.target.value); setCenter("All centers"); }}><option>All areas</option>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Center</span><select value={center} onChange={(event) => setCenter(event.target.value)}><option>All centers</option>{centers.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Day</span><select value={day} onChange={(event) => setDay(event.target.value)}><option>All days</option>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="league-browser-count"><b>{filtered.length}</b> imported {filtered.length === 1 ? "league" : "leagues"}</div>
      <div className="league-browser-list">
        {filtered.map((league) => <article key={league.id} className={selectedId === league.id ? "active" : ""}>
          <button type="button" onClick={() => openLeague(league.id)}>
            <span><small>League ID {league.id}</small><strong>{league.displayName}</strong><em>{league.centerName ?? "Bowling center"} · {league.bowlsOn} at {league.startTime}</em></span>
            <span><small>Source updated</small><b>{league.updated || league.sourceUpdated || "Not posted"}</b></span>
            <span><small>FrameLine checked</small><b>{formatChecked(league.syncedAt)}</b></span>
            <span><small>Results</small><b>{league.week ? `Week ${league.week}` : "Awaiting Week 1"}</b></span>
            <strong>View league →</strong>
          </button>
        </article>)}
      </div>
    </section>
    {selected && <section id="audited-league" className="league-audit-results">
      <div className="section league-audit-banner"><span><small>Viewing without saving</small><strong>{selected.displayName}</strong></span><button type="button" onClick={() => setSelectedId("")}>Close league ×</button></div>
      <SyncedLeagueDashboard key={selected.id} data={selected} />
    </section>}
  </main>;
}
