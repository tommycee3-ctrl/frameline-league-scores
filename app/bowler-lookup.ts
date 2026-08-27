import leagueCatalog from "../public/data/leagues/all.json";
import type { LeagueSnapshot } from "./leagues/synced-league-dashboard";

export const PROFILE_KEY = "frameline-bowler-name";
export const LEAGUES_KEY = "frameline-current-leagues";
export const leagueSnapshots = leagueCatalog as LeagueSnapshot[];

export type BowlerLeague = {
  id: string;
  displayName: string;
  centerName: string;
  bowlsOn: string;
  startTime: string;
  teams: string[];
  average: string;
  highSeries: string;
  teamAverage: number | null;
  teammates: { name: string; average: string }[];
};
export type BowlerMatch = { key: string; name: string; leagues: BowlerLeague[] };

function tokens(value: string) {
  return value.toLowerCase().replace(/\b(jr|sr|ii|iii|iv|2nd|3rd)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).sort();
}

function teamName(league: LeagueSnapshot, headers: string[], row: string[]) {
  const teamIndex = headers.findIndex((header) => header.toLowerCase() === "team");
  const direct = teamIndex >= 0 ? (row[teamIndex] ?? "").trim() : "";
  if (direct && direct !== "0") return direct;
  const numberIndex = headers.findIndex((header) => header.toLowerCase() === "team#");
  const number = numberIndex >= 0 ? (row[numberIndex] ?? "").trim() : "";
  if (!number || number === "0") return "";
  for (const table of league.views.standings ?? []) {
    const no = table.headers.findIndex((header) => header.toLowerCase() === "team#");
    const name = table.headers.findIndex((header) => header.toLowerCase() === "team");
    const match = no >= 0 && name >= 0 ? table.rows.find((item) => item[no] === number) : undefined;
    if (match?.[name]) return match[name];
  }
  return `Team ${number}`;
}

function valueIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header.toLowerCase()));
}

export function findBowlers(query: string): BowlerMatch[] {
  const wanted = tokens(query);
  if (wanted.join("").length < 2) return [];
  const found = new Map<string, { name: string; leagues: Map<string, { teams: Set<string>; average: string; highSeries: string; teamAverage: number | null; teammates: { name: string; average: string }[] }> }>();
  leagueSnapshots.forEach((league) => {
    (league.views.bowlers ?? []).forEach((table) => {
      const nameIndex = table.headers.findIndex((header) => header.toLowerCase() === "name");
      if (nameIndex < 0) return;
      table.rows.forEach((row) => {
        const name = (row[nameIndex] ?? "").trim();
        const rosterTokens = tokens(name);
        if (!name || !wanted.every((token) => rosterTokens.some((part) => part.includes(token)))) return;
        // Keep "First Last" and "Last, First" records under the same bowler.
        const key = tokens(name).join(" ");
        const entry = found.get(key) ?? { name, leagues: new Map<string, { teams: Set<string>; average: string; highSeries: string; teamAverage: number | null; teammates: { name: string; average: string }[] }>() };
        const details = entry.leagues.get(league.id) ?? { teams: new Set<string>(), average: "—", highSeries: "—", teamAverage: null, teammates: [] as { name: string; average: string }[] };
        const team = teamName(league, table.headers, row);
        if (team) details.teams.add(team);
        const averageIndex = valueIndex(table.headers, ["avg", "average"]);
        const teamIndex = valueIndex(table.headers, ["team#"]);
        const teamNumber = teamIndex >= 0 ? row[teamIndex] : "";
        details.average = averageIndex >= 0 && row[averageIndex] ? row[averageIndex] : "—";
        const highSeriesIndex = valueIndex(table.headers, ["hss"]);
        details.highSeries = highSeriesIndex >= 0 && row[highSeriesIndex] ? row[highSeriesIndex] : "—";
        if (teamNumber && teamNumber !== "0") {
          const teammates = table.rows.filter((item) => item[teamIndex] === teamNumber).map((item) => ({
            name: item[nameIndex] ?? "Bowler",
            average: averageIndex >= 0 && item[averageIndex] ? item[averageIndex] : "—",
          }));
          details.teammates = [...new Map(teammates.map((person) => [tokens(person.name).join(" "), person])).values()];
          const numeric = details.teammates.map((person) => Number(person.average)).filter(Number.isFinite);
          details.teamAverage = numeric.length ? numeric.reduce((sum, average) => sum + average, 0) : null;
        }
        entry.leagues.set(league.id, details);
        found.set(key, entry);
      });
    });
  });
  return [...found.entries()].map(([key, item]) => ({
    key,
    name: item.name,
    leagues: [...item.leagues.entries()].map(([id, details]) => {
      const league = leagueSnapshots.find((entry) => entry.id === id) as (LeagueSnapshot & { centerName?: string }) | undefined;
      return {
        id,
        displayName: league?.displayName ?? `League ${id}`,
        centerName: league?.centerName ?? "Bowling center",
        bowlsOn: league?.bowlsOn ?? "",
        startTime: league?.startTime ?? "",
        teams: [...details.teams],
        average: details.average,
        highSeries: details.highSeries,
        teamAverage: details.teamAverage,
        teammates: details.teammates,
      };
    }),
  })).sort((a, b) => a.name.localeCompare(b.name));
}
