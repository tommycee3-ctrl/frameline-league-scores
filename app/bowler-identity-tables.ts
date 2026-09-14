import type { LeagueSnapshot, Table } from "./leagues/synced-league-dashboard";

// Identity comes from published person columns, never from team names.
export function bowlerIdentityTables(league: LeagueSnapshot): Table[] {
  return ["bowlers", "rosters", "lanes"].flatMap(view =>
    (league.views[view] ?? []).filter(table => table.headers.some(header =>
      ["name", "bowler", "bowler name"].includes(header.toLowerCase())
    )).map(table => {
      const headers = table.headers.map(header => {
        const key = header.toLowerCase();
        return ["bowler", "bowler name"].includes(key) ? "Name" : key === "gms" ? "Games" : header;
      });
      const needsTeam = !headers.some(header => header.toLowerCase() === "team#") && Boolean(table.team);
      return { ...table, headers: needsTeam ? [...headers, "Team#"] : headers,
        rows: table.rows.map(row => needsTeam ? [...row, table.team!] : row) };
    })
  );
}
