"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser storage and URL settings hydrate this client-only dashboard after mount */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { findBowlers } from "../bowler-lookup";
import leagueCatalog from "../../public/data/leagues/all.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

const snapshots = leagueCatalog as LeagueSnapshot[];
const STORAGE_KEY = "frameline-current-leagues";
const PROFILE_KEY = "frameline-bowler-name";
const AREAS = ["Omaha", "Bellevue", "Lincoln", "Council Bluffs"];
const CENTERS: Record<string, string[]> = {
  Omaha: ["West Lanes", "Maplewood Lanes", "Mockingbird Lanes", "Western Bowl"],
  Bellevue: [],
  Lincoln: ["Sun Valley Lanes", "Parkway Lanes", "Hollywood Bowl"],
  "Council Bluffs": ["Thunderbowl of Council Bluffs"],
};

function nameTokens(value: string) {
  return value.toLowerCase().replace(/\b(jr|sr|ii|iii|iv|2nd|3rd)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).sort();
}

type BowlerLeagueMatch = { id: string; teams: string[] };
type BowlerSearchMatch = { key: string; name: string; leagues: BowlerLeagueMatch[] };

function bowlerTeamName(league: LeagueSnapshot, headers: string[], row: string[]) {
  const teamIndex = headers.findIndex((header) => header.toLowerCase() === "team");
  const directName = teamIndex >= 0 ? (row[teamIndex] ?? "").trim() : "";
  if (directName && directName !== "0") return directName;
  const numberIndex = headers.findIndex((header) => header.toLowerCase() === "team#");
  const teamNumber = numberIndex >= 0 ? (row[numberIndex] ?? "").trim() : "";
  if (!teamNumber || teamNumber === "0") return "";
  for (const table of league.views.standings ?? []) {
    const standingsNumber = table.headers.findIndex((header) => header.toLowerCase() === "team#");
    const standingsName = table.headers.findIndex((header) => header.toLowerCase() === "team");
    if (standingsNumber < 0 || standingsName < 0) continue;
    const match = table.rows.find((standingsRow) => standingsRow[standingsNumber] === teamNumber);
    if (match?.[standingsName]) return match[standingsName];
  }
  return `Team ${teamNumber}`;
}

function findBowlerMatches(query: string): BowlerSearchMatch[] {
  const wanted = nameTokens(query);
  if (wanted.join("").length < 2) return [];
  const matches = new Map<string, { name: string; leagues: Map<string, Set<string>> }>();
  snapshots.forEach((league) => {
    (league.views.bowlers ?? []).forEach((table) => {
      const index = table.headers.findIndex((header) => header.toLowerCase() === "name");
      if (index < 0) return;
      table.rows.forEach((row) => {
        const name = (row[index] ?? "").trim();
        const roster = nameTokens(name);
        if (!name || !wanted.every((token) => roster.some((part) => part.includes(token)))) return;
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const current = matches.get(key) ?? { name, leagues: new Map<string, Set<string>>() };
        const teams = current.leagues.get(league.id) ?? new Set<string>();
        const team = bowlerTeamName(league, table.headers, row);
        if (team) teams.add(team);
        current.leagues.set(league.id, teams);
        matches.set(key, current);
      });
    });
  });
  return [...matches.entries()].map(([key, match]) => ({
    key,
    name: match.name,
    leagues: [...match.leagues.entries()].map(([id, teams]) => ({ id, teams: [...teams] })),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function LeagueSwitcher({ manageOnly = false }: { manageOnly?: boolean }) {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState(snapshots[0]?.id ?? "");
  const [leagueSelection, setLeagueSelection] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [bowlerName, setBowlerName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [bowlerMatches, setBowlerMatches] = useState<BowlerSearchMatch[]>([]);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(manageOnly);
  const [area, setArea] = useState("Omaha");
  const [center, setCenter] = useState("West Lanes");
  const [candidateId, setCandidateId] = useState(snapshots[0]?.id ?? "");

  useEffect(() => {
    try {
      const requestedArea = new URLSearchParams(window.location.search).get("area");
      const requestedLeague = new URLSearchParams(window.location.search).get("league");
      if (requestedArea && AREAS.includes(requestedArea)) {
        setArea(requestedArea);
        setCenter(CENTERS[requestedArea]?.[0] ?? "");
        setCandidateId(requestedArea === "Omaha" ? snapshots.find((item) => ((item as LeagueSnapshot & { centerName?: string }).centerName ?? "West Lanes") === "West Lanes")?.id ?? "" : "");
        setSettingsOpen(true);
      }
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
      const legacy = JSON.parse(localStorage.getItem("west-lanes-favorite-leagues") || "[]") as string[];
      const valid = (current.length ? current : legacy).filter((id) => snapshots.some((item) => item.id === id));
      if (!manageOnly && valid.length === 0) {
        localStorage.removeItem(PROFILE_KEY);
        router.replace("/");
        return;
      }
      // Local storage is client-only; hydrate the saved dashboard after mount.
      setSaved(valid);
      setBowlerName(localStorage.getItem(PROFILE_KEY) || "");
      if (requestedLeague && snapshots.some((item) => item.id === requestedLeague)) setLeagueId(requestedLeague);
      else if (valid[0]) setLeagueId(valid[0]);
      if (manageOnly) setSettingsOpen(true);
      else if (!requestedArea) setSettingsOpen(valid.length === 0);
    } catch { setSettingsOpen(true); }
    setReady(true);
  }, [manageOnly, router]);

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
  const findMyLeagues = () => {
    const name = bowlerName.trim();
    if (!name) { setProfileMessage("Enter your first and last name."); return; }
    const matches = findBowlerMatches(name);
    setBowlerMatches(matches);
    if (!matches.length) { setProfileMessage("No matching bowlers found yet. You can still add a league manually below."); return; }
    setProfileMessage(`${matches.length} matching ${matches.length === 1 ? "bowler" : "bowlers"} found. Select the correct league below.`);
  };
  const selectBowlerLeague = (match: BowlerSearchMatch, id: string) => {
    localStorage.setItem(PROFILE_KEY, match.name);
    setBowlerName(match.name);
    if (!saved.includes(id)) persist([...saved, id]);
    setBowlerMatches([]);
    setProfileMessage("");
    openLeague(id);
  };
  const removeLeague = (id: string) => {
    const next = saved.filter((savedId) => savedId !== id); persist(next);
    if (id === leagueId && next[0]) openLeague(next[0]);
    if (!next.length) {
      localStorage.removeItem(PROFILE_KEY);
      setBowlerName("");
      router.replace("/");
    }
  };
  const resetBowler = () => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("west-lanes-favorite-leagues");
    setSaved([]);
    setBowlerName("");
    router.replace("/");
  };

  const selected = snapshots.find((item) => item.id === leagueId) ?? snapshots[0];
  const savedLeagues = saved.map((id) => snapshots.find((item) => item.id === id)).filter((item): item is LeagueSnapshot => Boolean(item));
  const hasResults = selected && Object.values(selected.views).some((tables) => tables.some((table) => table.rows.length));
  const centerOptions = CENTERS[area] ?? [];
  const availableLeagues = snapshots.filter((item) => {
    const location = item as LeagueSnapshot & { area?: string; centerName?: string };
    return (location.area ?? "Omaha") === area && (location.centerName ?? "West Lanes") === center;
  });
  const week = selected?.week ? `Week ${selected.week}` : "Awaiting Week 1";
  const schedule = selected ? `${selected.bowlsOn} · ${selected.startTime} · Started ${selected.startDate}` : "";
  const bowlerProfile = bowlerName ? findBowlers(bowlerName).find((match) => nameTokens(match.name).join(" ") === nameTokens(bowlerName).join(" ")) : undefined;
  const firstName = bowlerName
    ? (bowlerName.includes(",") ? bowlerName.split(",")[1] : bowlerName).trim().split(/\s+/)[0]
    : "Bowler";

  if (!ready) return <section className="section frameline-loading">Loading your leagues…</section>;

  return <div id="league-center">
    <section className="section current-leagues-section">
      <div className="current-leagues-heading">
        <div>{manageOnly && <p className="eyebrow red">League setup</p>}<h2>{manageOnly ? "Add / Remove Leagues" : `Welcome, ${firstName}`}</h2>{manageOnly && <p>{bowlerName ? `Bowling as ${bowlerName}.` : "Saved on this device for quick access."}</p>}</div>
        {!manageOnly && <div className="league-heading-actions"><Link className="league-settings-button" href="/manage-leagues"><span aria-hidden="true">⚙</span> Add / Remove Leagues</Link><button className="reset-bowler-button" type="button" onClick={resetBowler}>Reset bowler</button></div>}
      </div>
      {savedLeagues.length ? <div className="current-league-cards">
        {savedLeagues.map((item) => {
          const details = bowlerProfile?.leagues.find((league) => league.id === item.id);
          return <article key={item.id} className={leagueId === item.id ? "active" : ""}>
            <button className="league-card-main" onClick={() => openLeague(item.id)}>
              <small>{item.bowlsOn} · {item.startTime}</small>
              <strong>{item.displayName}</strong>
              <span className="league-card-team">{details?.teams.join(" / ") || "Team not posted"}</span>
              <span className="league-card-stats"><b>Average {details?.average ?? "—"}</b><b>{item.week ? `Week ${item.week}` : "Awaiting results"}</b></span>
              <span className="league-card-updated">Updated {item.sourceUpdated || "not yet posted"} →</span>
            </button>
            <button className="remove-current" onClick={() => removeLeague(item.id)} aria-label={`Remove ${item.displayName}`}>×</button>
          </article>;
        })}
      </div> : <div className="empty-current"><strong>No current leagues yet.</strong><span>Use the setup below to add your first league.</span></div>}
    </section>

    {(manageOnly || settingsOpen) && <section className="section league-setup" id="league-settings">
      <div className="setup-heading"><p className="eyebrow red">League setup</p><h2>Add another league</h2><p>Choose a location and league. More areas and centers can be added without changing the rest of the app.</p></div>
      <div className="bowler-profile-setup">
        <div><span className="setup-number">A</span><div><strong>Your name</strong><small>We’ll search imported rosters and add leagues that contain your name.</small></div></div>
        <div className="bowler-name-row"><input value={bowlerName} onChange={(event) => { setBowlerName(event.target.value); setProfileMessage(""); setBowlerMatches([]); }} onKeyDown={(event) => { if (event.key === "Enter") findMyLeagues(); }} placeholder="Enter any part of a bowler's name" autoComplete="name"/><button onClick={findMyLeagues}>Search Bowlers</button></div>
        {profileMessage && <p className="profile-message" role="status">{profileMessage}</p>}
        {bowlerMatches.length > 0 && <div className="bowler-match-results">
          {bowlerMatches.map((match) => <article key={match.key}>
            <strong>{match.name}</strong>
            <div>{match.leagues.map(({ id, teams }) => {
              const league = snapshots.find((item) => item.id === id);
              if (!league) return null;
              const location = league as LeagueSnapshot & { centerName?: string };
              return <button type="button" key={id} onClick={() => selectBowlerLeague(match, id)}>
                <span>{league.displayName}{teams.length > 0 && <em>{teams.join(" / ")}</em>}</span><small>{location.centerName ?? "Bowling center"} · {league.bowlsOn} at {league.startTime}</small><b>{saved.includes(id) ? "Open league" : "Add league"} →</b>
              </button>;
            })}</div>
          </article>)}
        </div>}
      </div>
      <div className="manual-divider"><span>OR FIND A LEAGUE MANUALLY</span></div>
      <div className="setup-steps">
        <label><span><b>1</b> Select your area</span><select value={area} onChange={(event) => { const next = event.target.value; setArea(next); setCenter(CENTERS[next]?.[0] ?? ""); setCandidateId(""); }}>{AREAS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span><b>2</b> Select your alley</span><select value={center} disabled={!centerOptions.length} onChange={(event) => { setCenter(event.target.value); setCandidateId(snapshots[0]?.id ?? ""); }}>{centerOptions.length ? centerOptions.map((item) => <option key={item}>{item}</option>) : <option>Coming soon</option>}</select></label>
        <label><span><b>3</b> Select your league</span><select value={candidateId} disabled={!availableLeagues.length} onChange={(event) => setCandidateId(event.target.value)}>{availableLeagues.length ? availableLeagues.map((item) => <option value={item.id} key={item.id}>{item.displayName}</option>) : <option>No leagues added yet</option>}</select></label>
      </div>
      <button className="add-current-button" disabled={!candidateId || saved.includes(candidateId)} onClick={addLeague}>{saved.includes(candidateId) ? "Already in Current Leagues" : "Add to Current Leagues"} <span>→</span></button>
    </section>}

    {!manageOnly && selected && saved.length > 0 && <>
      <section className="section nationals-overview league-identity">
        <div className="nationals-title"><p className="eyebrow red">League ID {selected.id}</p><h2>{selected.displayName}</h2><p>{schedule}</p></div>
        <div className="league-facts"><article><small>Current week</small><strong>{week}</strong></article><article><small>Last updated</small><strong>{selected.sourceUpdated || "Awaiting first update"}</strong></article></div>
      </section>
      {hasResults ? <SyncedLeagueDashboard key={`${selected.id}-${leagueSelection}`} data={selected}/> : <section className="section league-hub awaiting-league"><p className="eyebrow red">Results coming soon</p><h2>Week 1 has not been posted yet.</h2><p>This league will fill in after its first official upload.</p></section>}
    </>}
  </div>;
}
