"use client";

import { useMemo, useState } from "react";
import { nationalsRosterByTeam } from "./nationals-rosters";

export type Table = {
  title: string;
  headers: string[];
  rows: string[][];
  team?: string;
};
export type LeagueSnapshot = {
  id: string;
  displayName: string;
  bowlsOn?: string;
  type?: string;
  startDate: string;
  startTime: string;
  sourceUpdated: string;
  week: string | null;
  views: Record<string, Table[]>;
  history?: Array<{
    week: string | null;
    sourceUpdated: string;
    syncedAt: string;
    views: Record<string, Table[]>;
  }>;
};
const cell = (table: Table, row: string[], name: string) =>
  row[table.headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())] ??
  "";
const personName = (name: string) => {
  if (!name.includes(",")) return name;
  const [familyRaw = "", givenRaw = ""] = name.split(",").map((x) => x.trim()),
    suffixPattern = /\b(111|11|1v|jr|sr|ii|iii|iv|2nd|3rd)\b/gi,
    suffix = [
      ...(familyRaw.match(suffixPattern) ?? []),
      ...(givenRaw.match(suffixPattern) ?? []),
    ].at(-1),
    family = familyRaw.replace(suffixPattern, "").trim(),
    given = givenRaw.replace(suffixPattern, "").trim(),
    raw = suffix?.toLowerCase(),
    formattedSuffix =
      raw === "111" || raw === "iii"
        ? "III"
        : raw === "11" || raw === "ii"
          ? "II"
          : raw === "1v" || raw === "iv"
            ? "IV"
            : suffix;
  return [given, family, formattedSuffix].filter(Boolean).join(" ");
};
const score = (row: string[], game: number) => Number(row[3 + game] ?? 0);
const series = (row: string[]) => Number(row.at(-1) ?? 0);
const laneNumber = (value = "") => Number(value.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
const resultClass = (left: number, right: number) =>
  left > right ? "winner-score" : left < right ? "loser-score" : "tie-score";
const individualPoints = (bowler: string[], opponent: string[]) =>
  [0, 1, 2].reduce(
    (points, game) =>
      points +
      (score(bowler, game) > score(opponent, game)
        ? 1
        : score(bowler, game) === score(opponent, game)
          ? 0.5
          : 0),
    0,
  ) +
  (series(bowler) > series(opponent)
    ? 1
    : series(bowler) === series(opponent)
      ? 0.5
      : 0);
const teamResult = (team: string[], opponent: string[], game: number) => {
  const left =
      game < 3 ? Number(team[1 + game] ?? 0) : Number(team.at(-1) ?? 0),
    right =
      game < 3 ? Number(opponent[1 + game] ?? 0) : Number(opponent.at(-1) ?? 0);
  return { left, right, points: left > right ? 2 : left === right ? 1 : 0 };
};

export function SyncedLeagueDashboard({ data }: { data: LeagueSnapshot }) {
  const tabs = ["standings", "honors", "bowlers", "recaps", "lanes"] as const;
  const labels = {
    standings: "League Standings",
    honors: "Honors",
    bowlers: "Bowlers",
    recaps: "Weekly Recaps",
    lanes: "Lane Assignments",
  };
  const [tab, setTab] = useState<(typeof tabs)[number]>("standings");
  const [honorsView, setHonorsView] = useState<"weekly" | "yearly">("weekly");
  const [query, setQuery] = useState("");
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<{
    name: string;
    team: string;
  } | null>(null);
  const [standingSort, setStandingSort] = useState<{
    key: "place" | "team" | "won" | "lost" | "percent" | "average" | "pins";
    direction: "asc" | "desc";
  }>({ key: "place", direction: "asc" });
  const standings = data.views.standings?.[0];
  const bowlerTable = data.views.bowlers?.[0];
  const teamName = (team: string) => {
    const row = standings?.rows.find(
      (item) => cell(standings, item, "Team#") === team,
    );
    return row
      ? cell(standings!, row, "Team") || `Team ${team}`
      : `Team ${team}`;
  };
  const bowlersByTeam = useMemo(() => {
    const result: Record<string, string[][]> = {};
    for (const row of bowlerTable?.rows ?? []) {
      const team = cell(bowlerTable, row, "Team#");
      (result[team] ??= []).push(row);
    }
    return result;
  }, [bowlerTable]);
  const rosterForTeam = (team: string) => bowlersByTeam[team] ?? [];
  const fallbackRoster = (team: string) =>
    data.id === "132277" ? (nationalsRosterByTeam[team] ?? []) : [];
  const currentRosters = useMemo(
    () =>
      Object.fromEntries(
        (data.views.rosters ?? [])
          .filter((table) => table.team)
          .map((table) => [table.team!, table]),
      ),
    [data],
  );
  const recapByTeam = useMemo(() => {
    const result: Record<
      string,
      { lane: string; points: string; rows: string[][] }
    > = {};
    for (const table of data.views.recaps ?? []) {
      let current = "";
      for (const row of table.rows) {
        const m = row[0]?.match(/^Team\s+(\d+)$/i);
        if (m) {
          current = m[1];
          const detail = row.slice(1).join(" ");
          result[current] = {
            lane: detail.match(/Lane\s+\d+/i)?.[0] ?? "",
            points: detail.match(/points won:\s*([\d.]+)/i)?.[1] ?? "",
            rows: [],
          };
        } else if (current && row[0]?.toLowerCase() !== "total")
          result[current].rows.push(row);
      }
    }
    return result;
  }, [data]);
  const rosterDetails = (team: string) => {
    const currentRoster = currentRosters[team];
    if (currentRoster)
      return currentRoster.rows
        .map((person) => ({
          name: personName(cell(currentRoster, person, "Name")),
          average: cell(currentRoster, person, "Avg") || "—",
          handicap: cell(currentRoster, person, "HCP"),
        }))
        .filter((person) => person.name && !/vacant/i.test(person.name));
    const recapRows = recapByTeam[team]?.rows ?? [];
    const liveRows = rosterForTeam(team);
    const details = new Map<
      string,
      { name: string; average: string; handicap: string }
    >();
    for (const person of recapRows) {
      const name = personName(person[0]);
      if (name)
        details.set(name, {
          name,
          average: person[1] || "—",
          handicap: person[2] || "",
        });
    }
    for (const person of liveRows) {
      const name = personName(cell(bowlerTable!, person, "Name"));
      if (name)
        details.set(name, {
          name,
          average:
            cell(bowlerTable!, person, "Avg") ||
            details.get(name)?.average ||
            "—",
          handicap:
            cell(bowlerTable!, person, "HCP") ||
            details.get(name)?.handicap ||
            "",
        });
    }
    for (const person of fallbackRoster(team)) {
      if (!details.has(person.name))
        details.set(person.name, {
          name: person.name,
          average: String(person.average),
          handicap: "",
        });
    }
    return [...details.values()];
  };
  const recapMatchups = useMemo(() => {
    return (data.views.recaps ?? [])
      .map((table) => {
        const teams: Array<{
          team: string;
          lane: string;
          points: string;
          rows: string[][];
          total: string[];
        }> = [];
        let active: (typeof teams)[number] | null = null;
        for (const row of table.rows) {
          const m = row[0]?.match(/^Team\s+(\d+)$/i);
          if (m) {
            const detail = row.slice(1).join(" ");
            active = {
              team: m[1],
              lane: detail.match(/Lane\s+\d+/i)?.[0] ?? "",
              points: detail.match(/points won:\s*([\d.]+)/i)?.[1] ?? "",
              rows: [],
              total: [],
            };
            teams.push(active);
          } else if (active && row[0]?.toLowerCase() === "total")
            active.total = row;
          else if (active) active.rows.push(row);
        }
        return teams;
      })
      .filter((matchup) => matchup.length);
  }, [data]);
  const hasIndividualPoints = useMemo(() => {
    if (!bowlerTable) return false;
    const wonIndex = bowlerTable.headers.findIndex(
      (header) => header.toLowerCase() === "won",
    );
    return (
      wonIndex >= 0 &&
      bowlerTable.rows.some((row) => Number(row[wonIndex]) > 0)
    );
  }, [bowlerTable]);
  const leagueHonors = useMemo(() => {
    if (!bowlerTable) return [];
    const isScratchLeague = data.type?.toLowerCase().includes("scratch");
    const divisions = [
      { id: "men", label: "Men", matches: (value: string) => /^m/i.test(value) },
      { id: "women", label: "Women", matches: (value: string) => /^(w|f)/i.test(value) },
    ];
    const categories = [
      { id: "scratch-game", label: "Scratch High Game", column: "HSG", handicap: false },
      { id: "scratch-series", label: "Scratch High Series", column: "HSS", handicap: false },
      { id: "handicap-game", label: "Handicap High Game", column: "HHG", handicap: true },
      { id: "handicap-series", label: "Handicap High Series", column: "HHS", handicap: true },
    ];
    return divisions.flatMap((division) => {
      const divisionRows = bowlerTable.rows.filter((row) =>
        division.matches(cell(bowlerTable, row, "Gndr")),
      );
      if (!divisionRows.length) return [];
      const groups = categories
        .filter((category) => !category.handicap || !isScratchLeague)
        .map((category) => ({
          ...category,
          leaders: [...divisionRows]
            .filter((row) => Number(cell(bowlerTable, row, category.column)) > 0)
            .sort(
              (a, b) =>
                Number(cell(bowlerTable, b, category.column)) -
                Number(cell(bowlerTable, a, category.column)),
            )
            .slice(0, 3)
            .map((row) => ({
              name: personName(cell(bowlerTable, row, "Name")),
              team: cell(bowlerTable, row, "Team#"),
              score: cell(bowlerTable, row, category.column),
            })),
        }))
        .filter((category) => category.leaders.length);
      return groups.length ? [{ ...division, groups }] : [];
    });
  }, [bowlerTable, data.type]);
  const weeklyHonors = useMemo(() => {
    if (!bowlerTable) return [];
    const isScratchLeague = data.type?.toLowerCase().includes("scratch");
    const seen = new Set<string>();
    const records = recapMatchups.flatMap((matchup) => matchup.flatMap((team) => team.rows.map((row) => {
      const name = personName(row[0] ?? "");
      const key = `${team.team}-${name}`;
      if (!name || seen.has(key)) return null;
      seen.add(key);
      const bowler = bowlerTable.rows.find((candidate) => personName(cell(bowlerTable, candidate, "Name")) === name && cell(bowlerTable, candidate, "Team#") === team.team);
      const games = [0, 1, 2].map((game) => score(row, game)).filter((value) => value > 0);
      if (!games.length) return null;
      const handicap = Number(row[2] || (bowler ? cell(bowlerTable, bowler, "HCP") : 0)) || 0;
      const scratchSeries = games.reduce((sum, value) => sum + value, 0);
      return {
        name,
        team: team.team,
        gender: bowler ? cell(bowlerTable, bowler, "Gndr") : "",
        values: {
          "scratch-game": Math.max(...games),
          "scratch-series": scratchSeries,
          "handicap-game": Math.max(...games.map((value) => value + handicap)),
          "handicap-series": scratchSeries + handicap * games.length,
        },
      };
    }))).filter((record): record is NonNullable<typeof record> => Boolean(record));
    const divisions = [
      { id: "men", label: "Men", matches: (value: string) => /^m/i.test(value) },
      { id: "women", label: "Women", matches: (value: string) => /^(w|f)/i.test(value) },
    ];
    const categories = [
      { id: "scratch-game" as const, label: "Scratch High Game", handicap: false },
      { id: "scratch-series" as const, label: "Scratch High Series", handicap: false },
      { id: "handicap-game" as const, label: "Handicap High Game", handicap: true },
      { id: "handicap-series" as const, label: "Handicap High Series", handicap: true },
    ];
    return divisions.flatMap((division) => {
      const divisionRecords = records.filter((record) => division.matches(record.gender));
      if (!divisionRecords.length) return [];
      const groups = categories.filter((category) => !category.handicap || !isScratchLeague).map((category) => ({
        ...category,
        leaders: [...divisionRecords].sort((a, b) => b.values[category.id] - a.values[category.id]).slice(0, 3).map((record) => ({
          name: record.name,
          team: record.team,
          score: String(record.values[category.id]),
        })),
      })).filter((category) => category.leaders.length);
      return groups.length ? [{ ...division, groups }] : [];
    });
  }, [bowlerTable, data.type, recapMatchups]);
  const bowlerWeekPoints = (name: string, team: string) => {
    for (const matchup of recapMatchups) {
      const side = matchup.findIndex((entry) => entry.team === team);
      if (side < 0 || matchup.length < 2) continue;
      const rowIndex = matchup[side].rows.findIndex(
        (row) => personName(row[0]) === name,
      );
      if (rowIndex < 0) continue;
      return individualPoints(
        matchup[side].rows[rowIndex],
        matchup[side === 0 ? 1 : 0].rows[rowIndex] ?? [],
      );
    }
    return null;
  };
  const bowlerHistory = (name: string, team: string) => {
    const snapshots = data.history?.length
      ? data.history
      : [{ week: data.week, sourceUpdated: data.sourceUpdated, syncedAt: "", views: data.views }];
    return snapshots
      .map((snapshot) => {
        const table = snapshot.views.bowlers?.[0];
        const row = table?.rows.find(
          (item) =>
            personName(cell(table, item, "Name")) === name &&
            cell(table, item, "Team#") === team,
        );
        let scoreRow: string[] | undefined;
        for (const recap of snapshot.views.recaps ?? []) {
          let activeTeam = "";
          for (const candidate of recap.rows) {
            const match = candidate[0]?.match(/^Team\s+(\d+)$/i);
            if (match) activeTeam = match[1];
            else if (activeTeam === team && personName(candidate[0]) === name) {
              scoreRow = candidate;
              break;
            }
          }
          if (scoreRow) break;
        }
        if (!row && !scoreRow) return null;
        return {
          week: snapshot.week ?? "—",
          games: scoreRow?.slice(3, 6).filter(Boolean) ?? [],
          series: scoreRow?.at(-1) || (table && row ? cell(table, row, "HSS") : ""),
          average: table && row ? cell(table, row, "Avg") : scoreRow?.[1] || "—",
          totalPoints: hasIndividualPoints && table && row ? cell(table, row, "WON") : "",
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .reverse();
  };
  const q = query.trim().toLowerCase();
  const week = data.week ?? "1";
  const laneTable = data.views.lanes?.[0];
  const sortStanding = (key: typeof standingSort.key) =>
    setStandingSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
        : {
            key,
            direction: key === "place" || key === "team" ? "asc" : "desc",
          },
    );
  const standingValue = (row: string[], key: typeof standingSort.key) =>
    key === "place"
      ? cell(standings!, row, "Place")
      : key === "team"
        ? cell(standings!, row, "Team") ||
          `Team ${cell(standings!, row, "Team#")}`
        : key === "won"
          ? cell(standings!, row, "Won")
          : key === "lost"
            ? cell(standings!, row, "Lost")
            : key === "percent"
              ? cell(standings!, row, "% Won")
              : key === "average"
                ? cell(standings!, row, "Avg")
                : cell(standings!, row, "Pins");
  const sortedStandingRows = standings
    ? [...standings.rows].sort((a, b) => {
        const av = standingValue(a, standingSort.key),
          bv = standingValue(b, standingSort.key);
        const comparison =
          standingSort.key === "team"
            ? av.localeCompare(bv)
            : Number(String(av).replace(/[^\d.-]/g, "")) -
              Number(String(bv).replace(/[^\d.-]/g, ""));
        return standingSort.direction === "asc" ? comparison : -comparison;
      })
    : [];
  return (
    <>
      <section className="section league-hub" id="league-dashboard">
        <div className="section-heading">
          <div>
            <p className="eyebrow red">
              Week {week} · {data.startDate}
            </p>
            <h2>League results hub</h2>
          </div>
          <p>
            {data.type?.toLowerCase().includes("scratch")
              ? "Scratch scores · scratch used for points"
              : "Scratch scores · handicap used for points"}
          </p>
        </div>
        <div className="league-hub-tabs">
          {tabs.map((id) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setQuery("");
              }}
            >
              {labels[id]}
            </button>
          ))}
        </div>
        {tab !== "honors" && (
          <div className="league-tools team-search">
            <label>
              <span>Search {labels[tab].toLowerCase()}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Team or bowler name"
              />
            </label>
          </div>
        )}
        {tab === "standings" && standings && (
          <div className="league-standings-direct synced-standing-list">
            <div className="result-head standing-grid sortable-head">
              {(
                [
                  ["place", "Place"],
                  ["team", "Team"],
                  ["won", "Won"],
                  ["lost", "Lost"],
                  ["percent", "Win %"],
                  ["average", "Average"],
                  ["pins", "Pins"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => sortStanding(key)}
                  className={standingSort.key === key ? "active" : ""}
                >
                  {label}
                  <span>
                    {standingSort.key === key
                      ? standingSort.direction === "desc"
                        ? "↓"
                        : "↑"
                      : "↕"}
                  </span>
                </button>
              ))}
            </div>
            {sortedStandingRows
              .filter((row) => {
                const team = cell(standings, row, "Team#");
                const names = (bowlersByTeam[team] ?? [])
                  .map((r) => cell(bowlerTable!, r, "Name"))
                  .join(" ");
                return (
                  !q ||
                  row.join(" ").toLowerCase().includes(q) ||
                  names.toLowerCase().includes(q)
                );
              })
              .map((row) => {
                const team = cell(standings, row, "Team#"),
                  name = cell(standings, row, "Team") || `Team ${team}`,
                  roster = rosterForTeam(team),
                  verifiedFallback = fallbackRoster(team),
                  recap = recapByTeam[team],
                  expanded = openTeam === team;
                return (
                  <article
                    className={`standing-team-block ${expanded ? "expanded" : ""}`}
                    key={team}
                  >
                    <button
                      className="standing-direct-row standing-grid"
                      onClick={() => setOpenTeam(expanded ? null : team)}
                      aria-expanded={expanded}
                    >
                      <strong>{cell(standings, row, "Place")}</strong>
                      <span>
                        <b>{name}</b>
                      </span>
                      <span>
                        {cell(standings, row, "Won")}
                        <small className="mobile-label">Won</small>
                      </span>
                      <span>
                        {cell(standings, row, "Lost")}
                        <small className="mobile-label">Lost</small>
                      </span>
                      <span>
                        {cell(standings, row, "% Won").replace(/\s*%/g, "%")}
                        <small className="mobile-label">Win %</small>
                      </span>
                      <span>
                        {cell(standings, row, "Avg")}
                        <small className="mobile-label">Average</small>
                      </span>
                      <span>
                        {Number(cell(standings, row, "Pins")).toLocaleString()}
                        <small className="mobile-label">Pins</small>
                      </span>
                    </button>
                    {expanded && (
                      <div className="standing-scorecard">
                        <div className="scorecard-summary">
                          <span>
                            <small>Lane</small>
                            <strong>
                              {recap?.lane || "Assignment posted"}
                            </strong>
                          </span>
                          <span>
                            <small>Team points won</small>
                            <strong>
                              {recap?.points || cell(standings, row, "Won")}
                            </strong>
                          </span>
                        </div>
                        <div className="team-roster">
                          {recap?.rows.length
                            ? recap.rows.map((person, index) => {
                                const n = personName(person[0]),
                                  source = roster.find(
                                    (r) =>
                                      personName(
                                        cell(bowlerTable!, r, "Name"),
                                      ) === n,
                                  );
                                return (
                                  <div
                                    className="roster-score-row"
                                    key={`${n}-${index}`}
                                  >
                                    <span>
                                      <button className="bowler-history-trigger" onClick={() => setSelectedBowler({ name: n, team })}>{n}</button>
                                      <small>
                                        {person
                                          .slice(3, 6)
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </small>
                                    </span>
                                    <span>
                                      <small>Average</small>
                                      <strong>{source ? cell(bowlerTable!, source, "Avg") || person[1] || "—" : person[1] || "—"}</strong>
                                    </span>
                                    {hasIndividualPoints && <span>
                                      <small>Total pts</small>
                                      <strong className="week-points">
                                        {source
                                          ? cell(bowlerTable!, source, "WON")
                                          : "—"}
                                      </strong>
                                    </span>}
                                  </div>
                                );
                              })
                            : verifiedFallback.length
                              ? verifiedFallback.map((person) => (
                                  <div
                                    className="roster-score-row fallback-roster-row"
                                    key={person.name}
                                  >
                                    <span>
                                      <button className="bowler-history-trigger" onClick={() => setSelectedBowler({ name: person.name, team })}>{person.name}</button>
                                      <small>Current roster</small>
                                    </span>
                                    {hasIndividualPoints && <span>
                                      <small>Average</small>
                                      <strong>{person.average}</strong>
                                    </span>}
                                    <span>
                                      <small>Week pts</small>
                                      <strong className="week-points">—</strong>
                                    </span>
                                  </div>
                                ))
                              : roster.map((person, index) => {
                                  const n = personName(
                                    cell(bowlerTable!, person, "Name"),
                                  );
                                  return (
                                    <div
                                      className="roster-score-row"
                                      key={`${n}-${index}`}
                                    >
                                      <span>
                                        <button className="bowler-history-trigger" onClick={() => setSelectedBowler({ name: n, team })}>{n}</button>
                                        <small>
                                          Game scores pending full recap
                                        </small>
                                      </span>
                                      {hasIndividualPoints && <span>
                                        <small>Average</small>
                                        <strong>
                                          {cell(bowlerTable!, person, "Avg") ||
                                            "—"}
                                        </strong>
                                      </span>}
                                      <span>
                                        <small>Week pts</small>
                                        <strong className="week-points">
                                          {cell(bowlerTable!, person, "WON") ||
                                            "—"}
                                        </strong>
                                      </span>
                                    </div>
                                  );
                                })}
                          {!roster.length &&
                            !verifiedFallback.length &&
                            !recap?.rows.length && (
                              <p>Roster details are awaiting the next sync.</p>
                            )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        )}
        {tab === "bowlers" && bowlerTable && (
          <div className="bowler-results">
            <div className="result-head">
              <span>Bowler</span>
              <span>Games</span>
              <span>Series</span>
              <span>Avg</span>
              {hasIndividualPoints && <span>Pts</span>}
            </div>
            {bowlerTable.rows
              .filter((row) => !q || row.join(" ").toLowerCase().includes(q))
              .sort(
                (a, b) =>
                  Number(cell(bowlerTable, b, "HSS")) -
                  Number(cell(bowlerTable, a, "HSS")),
              )
              .map((row, index) => {
                const team = cell(bowlerTable, row, "Team#"),
                  name = personName(cell(bowlerTable, row, "Name"));
                const scoreRow = recapByTeam[team]?.rows.find(
                  (r) => personName(r[0]) === name,
                );
                const games = scoreRow?.slice(3, 6).filter(Boolean) ?? [];
                return (
                  <button className="bowler-row" key={`${team}-${name}-${index}`} onClick={() => setSelectedBowler({ name, team })}>
                    <span>
                      <strong>{name}</strong>
                      <small>Team {team}</small>
                    </span>
                    <span>
                      {games.length
                        ? games.join(" · ")
                        : "Scores pending recap"}
                    </span>
                    <b>{scoreRow?.at(-1) || cell(bowlerTable, row, "HSS")}</b>
                    <span>{cell(bowlerTable, row, "Avg")}</span>
                    {hasIndividualPoints && <span>{cell(bowlerTable, row, "WON")}</span>}
                  </button>
                );
              })}
          </div>
        )}
        {tab === "honors" && (
          <div className="league-honors">
            <div className="honors-view-buttons" role="group" aria-label="Choose honors period">
              <button type="button" className={honorsView === "weekly" ? "active" : ""} onClick={() => setHonorsView("weekly")}>Weekly Honors</button>
              <button type="button" className={honorsView === "yearly" ? "active" : ""} onClick={() => setHonorsView("yearly")}>Yearly Honors</button>
            </div>
            {[
              { id: "weekly", eyebrow: `Week ${data.week ?? "—"}`, title: "Weekly Honors", description: "Top three scores from the latest posted week.", divisions: weeklyHonors },
              { id: "yearly", eyebrow: "Season to date", title: "Yearly Honors", description: "Top three posted scores across the full league season.", divisions: leagueHonors },
            ].filter((section) => section.id === honorsView).map((section) => <section className="honors-section" key={section.id}>
              <div className="recap-heading">
                <div><p className="eyebrow red">{section.eyebrow}</p><h3>{section.title}</h3></div>
                <p>{section.description}</p>
              </div>
              {section.divisions.length ? section.divisions.map((division) => (
                <section className="honors-division" key={`${section.id}-${division.id}`}>
                  <header><span>{division.id === "men" ? "M" : "W"}</span><h3>{division.label}</h3></header>
                  <div className="honors-grid">
                    {division.groups.map((group) => (
                      <article key={group.id}>
                        <h4>{group.label}</h4>
                        <ol>
                          {group.leaders.map((leader, index) => (
                            <li key={`${leader.name}-${leader.score}`}>
                              <b>{index + 1}</b>
                              <button onClick={() => setSelectedBowler({ name: leader.name, team: leader.team })}>{leader.name}</button>
                              <strong>{leader.score}</strong>
                            </li>
                          ))}
                        </ol>
                      </article>
                    ))}
                  </div>
                </section>
              )) : <div className="empty-current"><strong>{section.title} are awaiting posted scores.</strong><span>This section will fill automatically with the next league update.</span></div>}
            </section>)}
          </div>
        )}
        {tab === "recaps" && (
          <div className="weekly-recaps">
            <div className="recap-heading">
              <div>
                <p className="eyebrow red">Week {week}</p>
                <h3>Full matchup recaps</h3>
              </div>
              <p>Individual and team points are shown separately.</p>
            </div>
            {recapMatchups
              .filter(
                (matchup) =>
                  !q ||
                  matchup.some((team) =>
                    (
                      `${teamName(team.team)} Team ${team.team} ` +
                      team.rows.flat().join(" ")
                    )
                      .toLowerCase()
                      .includes(q),
                  ),
              )
              .map((matchup) => [...matchup].sort((left, right) => laneNumber(left.lane) - laneNumber(right.lane)))
              .sort((left, right) => Math.min(...left.map((team) => laneNumber(team.lane))) - Math.min(...right.map((team) => laneNumber(team.lane))))
              .map((matchup, index) => (
                <article className="full-recap" key={index}>
                  <header>
                    <span>
                      <small>{matchup[0]?.lane}</small>
                      <strong>{teamName(matchup[0]?.team)}</strong>
                      <b>{matchup[0]?.points} official pts</b>
                    </span>
                    <em>vs</em>
                    <span>
                      <small>{matchup[1]?.lane}</small>
                      <strong>{teamName(matchup[1]?.team)}</strong>
                      <b>{matchup[1]?.points} official pts</b>
                    </span>
                  </header>
                  <div className="recap-scroll">
                    {matchup.map((team, teamIndex) => {
                      const opponent = matchup[teamIndex === 0 ? 1 : 0];
                      return (
                        <table key={team.team}>
                          <thead>
                            <tr>
                              <th>Bowler</th>
                              <th>Avg</th>
                              <th>HDCP</th>
                              <th>Game 1</th>
                              <th>Game 2</th>
                              <th>Game 3</th>
                              <th>Series</th>
                              <th>Individual pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.rows.map((row, r) => {
                              const versus = opponent?.rows[r] ?? [];
                              return (
                                <tr key={r}>
                                  <td>
                                    <b>{personName(row[0])}</b>
                                  </td>
                                  <td>{row[1]}</td>
                                  <td>{row[2]}</td>
                                  {[0, 1, 2].map((game) => (
                                    <td
                                      key={game}
                                      className={resultClass(
                                        score(row, game),
                                        score(versus, game),
                                      )}
                                    >
                                      {row[3 + game]}
                                    </td>
                                  ))}
                                  <td
                                    className={resultClass(
                                      series(row),
                                      series(versus),
                                    )}
                                  >
                                    <b>{row.at(-1)}</b>
                                  </td>
                                  <td className="individual-points">
                                    <b>{individualPoints(row, versus)}</b>
                                    <small>of 4</small>
                                  </td>
                                </tr>
                              );
                            })}
                            {team.total.length > 0 &&
                              opponent?.total.length > 0 && (
                                <tr className="recap-total">
                                  <td>Team total</td>
                                  <td></td>
                                  <td></td>
                                  {[0, 1, 2].map((game) => {
                                    const result = teamResult(
                                      team.total,
                                      opponent.total,
                                      game,
                                    );
                                    return (
                                      <td
                                        key={game}
                                        className={resultClass(
                                          result.left,
                                          result.right,
                                        )}
                                      >
                                        {result.left}
                                        <small>{result.points} team pts</small>
                                      </td>
                                    );
                                  })}
                                  {(() => {
                                    const result = teamResult(
                                      team.total,
                                      opponent.total,
                                      3,
                                    );
                                    return (
                                      <td
                                        className={resultClass(
                                          result.left,
                                          result.right,
                                        )}
                                      >
                                        <b>{result.left}</b>
                                        <small>{result.points} team pts</small>
                                      </td>
                                    );
                                  })()}
                                  <td className="team-points-cell">
                                    <b>
                                      {[0, 1, 2, 3].reduce(
                                        (sum, game) =>
                                          sum +
                                          teamResult(
                                            team.total,
                                            opponent.total,
                                            game,
                                          ).points,
                                        0,
                                      )}
                                    </b>
                                    <small>team pts</small>
                                  </td>
                                </tr>
                              )}
                          </tbody>
                        </table>
                      );
                    })}
                  </div>
                </article>
              ))}
          </div>
        )}
        {tab === "lanes" && laneTable && (
          <div className="lane-assignments">
            <div className="recap-heading">
              <div>
                <p className="eyebrow red">Week {Number(week) + 1}</p>
                <h3>Lane assignments</h3>
              </div>
              <p>
                Upcoming {data.bowlsOn} matchups, listed in lane order. Select a
                team to view its roster.
              </p>
            </div>
            <div className="lane-assignment-grid">
              {laneTable.rows
                .filter((row) => {
                  const team = cell(laneTable, row, "Team#") || row[1],
                    names = rosterDetails(team)
                      .map((person) => person.name)
                      .join(" ");
                  return (
                    !q || `${row.join(" ")} ${names}`.toLowerCase().includes(q)
                  );
                })
                .map((row, index) => {
                  const lane = cell(laneTable, row, "Lane") || row[0],
                    team = cell(laneTable, row, "Team#") || row[1],
                    name =
                      cell(laneTable, row, "Team") || row[2] || `Team ${team}`,
                    roster = rosterDetails(team),
                    expanded = openTeam === `lane-${team}`;
                  return (
                    <article
                      className={expanded ? "expanded" : ""}
                      key={`${lane}-${team}-${index}`}
                    >
                      <button
                        className="lane-team-trigger"
                        onClick={() =>
                          setOpenTeam(expanded ? null : `lane-${team}`)
                        }
                        aria-expanded={expanded}
                      >
                        <b>{lane}</b>
                        <span>
                          {!cell(laneTable, row, "Team") && (
                            <small>Team #{team}</small>
                          )}
                          <strong>{name}</strong>
                        </span>
                        <em>{expanded ? "−" : "+"}</em>
                      </button>
                      {expanded && (
                        <div className="lane-roster">
                          {roster.length ? (
                            roster.map((person) => (
                              <div key={person.name}>
                                <button className="bowler-history-trigger lane-bowler-trigger" onClick={() => setSelectedBowler({ name: person.name, team })}>{person.name}</button>
                                <span className="lane-roster-stats">
                                  <span>
                                    <small>Average</small>
                                    <b>{person.average}</b>
                                  </span>
                                  {person.handicap &&
                                    Number(person.handicap) > 0 && (
                                      <span>
                                        <small>Handicap</small>
                                        <b>+{person.handicap}</b>
                                      </span>
                                    )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p>Roster details are awaiting the next sync.</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          </div>
        )}
      </section>
      {selectedBowler && (
        <div className="bowler-modal-backdrop" onMouseDown={() => setSelectedBowler(null)}>
          <section className="bowler-modal bowler-history-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${selectedBowler.name} weekly results`}>
            <button className="modal-close" onClick={() => setSelectedBowler(null)} aria-label="Close">×</button>
            <p className="eyebrow red">{teamName(selectedBowler.team)}</p>
            <h2>{selectedBowler.name}</h2>
            <p>Week-by-week scores and current average.</p>
            <div className="bowler-week-history">
              {bowlerHistory(selectedBowler.name, selectedBowler.team).map((entry, index) => (
                <article key={`${entry.week}-${index}`}>
                  <header><strong>Week {entry.week}</strong><span>Average {entry.average}</span></header>
                  <div className="week-score-line">
                    <span><small>Games</small><b>{entry.games.length ? entry.games.join(" · ") : "Scores not posted"}</b></span>
                    <span><small>Series</small><b>{entry.series || "—"}</b></span>
                    {hasIndividualPoints && <>
                      <span><small>Week pts</small><b className="week-points">{bowlerWeekPoints(selectedBowler.name, selectedBowler.team) ?? "—"}</b></span>
                      <span><small>Total pts</small><b className="total-points">{entry.totalPoints || "—"}</b></span>
                    </>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
