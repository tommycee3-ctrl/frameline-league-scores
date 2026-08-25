"use client";

import { useEffect, useRef, useState } from "react";
import leagueCatalog from "../../public/data/leagues/all.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

const snapshots = leagueCatalog as LeagueSnapshot[];
const STORAGE_KEY = "frameline-current-leagues";
const AREAS = ["Omaha", "Bellevue", "Lincoln", "Council Bluffs"];
const CENTERS: Record<string, string[]> = {
  Omaha: ["West Lanes", "Maplewood Lanes", "Mockingbird Lanes", "Western Bowl"],
  Bellevue: [],
  Lincoln: ["Sun Valley Lanes", "Parkway Lanes", "Hollywood Bowl"],
  "Council Bluffs": ["Thunderbowl of Council Bluffs"],
};

export function LeagueSwitcher() {
  const [leagueId, setLeagueId] = useState(snapshots[0]?.id ?? "");
  const [leagueSelection, setLeagueSelection] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [area, setArea] = useState("Omaha");
  const [center, setCenter] = useState("West Lanes");
  const [candidateId, setCandidateId] = useState(snapshots[0]?.id ?? "");
  const pullStart = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
      const legacy = JSON.parse(localStorage.getItem("west-lanes-favorite-leagues") || "[]") as string[];
      const valid = (current.length ? current : legacy).filter((id) => snapshots.some((item) => item.id === id));
      // Local storage is client-only; hydrate the saved dashboard after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(valid);
      if (valid[0]) setLeagueId(valid[0]);
      setSettingsOpen(valid.length === 0);
    } catch { setSettingsOpen(true); }
    setReady(true);
  }, []);

  useEffect(() => {
    const start = (event: TouchEvent) => {
      if (window.scrollY <= 1) { pullStart.current = event.touches[0]?.clientY ?? null; pullDistanceRef.current = 0; }
    };
    const move = (event: TouchEvent) => {
      if (pullStart.current === null) return;
      const distance = Math.min(120, Math.max(0, ((event.touches[0]?.clientY ?? pullStart.current) - pullStart.current) * 0.65));
      pullDistanceRef.current = distance; setPullDistance(distance);
    };
    const finish = () => {
      const refresh = pullDistanceRef.current >= 72;
      pullStart.current = null; pullDistanceRef.current = 0; setPullDistance(0);
      if (refresh) { const url = new URL(window.location.href); url.searchParams.set("refresh", Date.now().toString()); window.location.assign(url.toString()); }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", finish, { passive: true });
    window.addEventListener("touchcancel", finish, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", finish); window.removeEventListener("touchcancel", finish); };
  }, []);

  const persist = (ids: string[]) => { setSaved(ids); localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); };
  const openLeague = (id: string) => {
    setLeagueId(id); setLeagueSelection((value) => value + 1); setSettingsOpen(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById("league-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" })));
  };
  const addLeague = () => {
    if (!candidateId) return;
    if (!saved.includes(candidateId)) persist([...saved, candidateId]);
    openLeague(candidateId);
  };
  const removeLeague = (id: string) => {
    const next = saved.filter((savedId) => savedId !== id); persist(next);
    if (id === leagueId && next[0]) openLeague(next[0]);
    if (!next.length) setSettingsOpen(true);
  };

  const selected = snapshots.find((item) => item.id === leagueId) ?? snapshots[0];
  const savedLeagues = saved.map((id) => snapshots.find((item) => item.id === id)).filter((item): item is LeagueSnapshot => Boolean(item));
  const hasResults = selected && Object.values(selected.views).some((tables) => tables.some((table) => table.rows.length));
  const centerOptions = CENTERS[area] ?? [];
  const availableLeagues = area === "Omaha" && center === "West Lanes" ? snapshots : [];
  const week = selected?.week ? `Week ${selected.week}` : "Awaiting Week 1";
  const schedule = selected ? `${selected.bowlsOn} · ${selected.startTime} · Started ${selected.startDate}` : "";

  if (!ready) return <section className="section frameline-loading">Loading your leagues…</section>;

  return <div id="league-center">
    <div className={`pull-refresh ${pullDistance >= 72 ? "ready" : ""}`} style={{ transform: `translate(-50%, ${pullDistance - 54}px)`, opacity: pullDistance ? 1 : 0 }} aria-hidden="true">
      <span>{pullDistance >= 72 ? "↻" : "↓"}</span>{pullDistance >= 72 ? "Release to refresh" : "Pull to refresh"}
    </div>

    <section className="section current-leagues-section">
      <div className="current-leagues-heading">
        <div><p className="eyebrow red">Quick select</p><h2>Current leagues</h2><p>Saved on this device for quick access.</p></div>
        <button className="league-settings-button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
          <span aria-hidden="true">⚙</span> {settingsOpen ? "Close" : "Manage leagues"}
        </button>
      </div>
      {savedLeagues.length ? <div className="current-league-cards">
        {savedLeagues.map((item) => <article key={item.id} className={leagueId === item.id ? "active" : ""}>
          <button className="league-card-main" onClick={() => openLeague(item.id)}>
            <small>{item.bowlsOn} · {item.startTime}</small><strong>{item.displayName}</strong><span>{item.week ? `Week ${item.week}` : "Awaiting results"} →</span>
          </button>
          <button className="remove-current" onClick={() => removeLeague(item.id)} aria-label={`Remove ${item.displayName}`}>×</button>
        </article>)}
      </div> : <div className="empty-current"><strong>No current leagues yet.</strong><span>Use the setup below to add your first league.</span></div>}
    </section>

    {settingsOpen && <section className="section league-setup" id="league-settings">
      <div className="setup-heading"><p className="eyebrow red">League setup</p><h2>Add another league</h2><p>Choose a location and league. More areas and centers can be added without changing the rest of the app.</p></div>
      <div className="setup-steps">
        <label><span><b>1</b> Select your area</span><select value={area} onChange={(event) => { const next = event.target.value; setArea(next); setCenter(CENTERS[next]?.[0] ?? ""); setCandidateId(""); }}>{AREAS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span><b>2</b> Select your alley</span><select value={center} disabled={!centerOptions.length} onChange={(event) => { setCenter(event.target.value); setCandidateId(snapshots[0]?.id ?? ""); }}>{centerOptions.length ? centerOptions.map((item) => <option key={item}>{item}</option>) : <option>Coming soon</option>}</select></label>
        <label><span><b>3</b> Select your league</span><select value={candidateId} disabled={!availableLeagues.length} onChange={(event) => setCandidateId(event.target.value)}>{availableLeagues.length ? availableLeagues.map((item) => <option value={item.id} key={item.id}>{item.displayName}</option>) : <option>No leagues added yet</option>}</select></label>
      </div>
      <button className="add-current-button" disabled={!candidateId || saved.includes(candidateId)} onClick={addLeague}>{saved.includes(candidateId) ? "Already in Current Leagues" : "Add to Current Leagues"} <span>→</span></button>
    </section>}

    {selected && saved.length > 0 && <>
      <section className="section nationals-overview league-identity">
        <div className="nationals-title"><p className="eyebrow red">League ID {selected.id}</p><h2>{selected.displayName}</h2><p>{schedule}</p></div>
        <div className="league-facts"><article><small>Current week</small><strong>{week}</strong></article><article><small>Last updated</small><strong>{selected.sourceUpdated || "Awaiting first update"}</strong></article></div>
      </section>
      {hasResults ? <SyncedLeagueDashboard key={`${selected.id}-${leagueSelection}`} data={selected}/> : <section className="section league-hub awaiting-league"><p className="eyebrow red">Results coming soon</p><h2>Week 1 has not been posted yet.</h2><p>This league will fill in after its first official upload.</p></section>}
    </>}
  </div>;
}
