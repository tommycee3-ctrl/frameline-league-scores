"use client";

import { useState } from "react";
import { BowlerMatch, findBowlers } from "./bowler-lookup";

export function BowlerSearchPanel({ onSelect, heading = "Find a bowler", intro = "Search by any part of a bowler's name." }: { onSelect?: (match: BowlerMatch) => void; heading?: string; intro?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BowlerMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [openLeague, setOpenLeague] = useState("");
  const search = () => { setResults(findBowlers(query)); setSearched(true); setOpenLeague(""); };

  return <section className="bowler-finder">
    <p className="frameline-kicker">BOWLER LOOKUP</p>
    <h1>{heading}</h1>
    <p>{intro}</p>
    <div className="bowler-finder-form">
      <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder="First or last name" autoComplete="name" />
      <button type="button" onClick={search}>Search</button>
    </div>
    {searched && !results.length && <p className="finder-empty">No matching bowlers are in the imported leagues yet.</p>}
    <div className="finder-results">
      {results.map((match) => <article key={match.key}>
        <header><strong>{match.name}</strong>{onSelect && <button type="button" onClick={() => onSelect(match)}>This is me</button>}</header>
        {match.leagues.map((league) => {
          const detailKey = `${match.key}-${league.id}`;
          const expanded = openLeague === detailKey;
          return <div className={`finder-league ${expanded ? "expanded" : ""}`} key={league.id}>
            <button className="finder-league-trigger" type="button" onClick={() => setOpenLeague(expanded ? "" : detailKey)} aria-expanded={expanded}>
              <span><b>{league.displayName}</b><small>{league.centerName} · {league.bowlsOn}{league.startTime ? ` at ${league.startTime}` : ""}</small></span>
              <span><strong>{league.teams.length ? league.teams.join(" / ") : "Team not posted"}</strong><small>Average {league.average}</small></span>
              <b>{expanded ? "Close" : "View team"} →</b>
            </button>
            {expanded && <section className="finder-team-detail">
              <header><span><small>Bowler average</small><strong>{league.average}</strong></span><span><small>Combined team average</small><strong>{league.teamAverage ?? "—"}</strong></span></header>
              <div>{league.teammates.length ? league.teammates.map((person) => <p key={person.name}><strong>{person.name}</strong><span>Average <b>{person.average}</b></span></p>) : <p>Team roster averages have not been posted yet.</p>}</div>
            </section>}
          </div>;
        })}
      </article>)}
    </div>
  </section>;
}
