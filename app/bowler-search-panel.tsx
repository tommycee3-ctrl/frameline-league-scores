"use client";

import { useState } from "react";
import { BowlerMatch, findBowlers } from "./bowler-lookup";

export function BowlerSearchPanel({ onSelect, heading = "Find a bowler", intro = "Search by any part of a bowler's name." }: { onSelect?: (match: BowlerMatch) => void; heading?: string; intro?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BowlerMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const search = () => { setResults(findBowlers(query)); setSearched(true); };

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
        {match.leagues.map((league) => <div key={league.id}>
          <span><b>{league.displayName}</b><small>{league.centerName} · {league.bowlsOn}{league.startTime ? ` at ${league.startTime}` : ""}</small></span>
          <strong>{league.teams.length ? league.teams.join(" / ") : "Team not posted"}</strong>
        </div>)}
      </article>)}
    </div>
  </section>;
}
