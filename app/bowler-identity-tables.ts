import type { LeagueSnapshot, Table } from "./leagues/synced-league-dashboard";

// Identity comes from published person columns, never from team names. Official
// recap rows are included so a substitute can be discovered before appearing
// on the season Bowler List or roster.
export function bowlerIdentityTables(league: LeagueSnapshot): Table[] {
  const rosterTables = ["bowlers", "rosters", "lanes"].flatMap(view =>
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
  const recapTables = (league.views.recaps ?? []).filter(table => Boolean(table.sourceReport)).map(table => {
    let team = "";
    const rows = table.rows.flatMap(row => {
      const marker = String(row[0] ?? "").match(/^Team\s+(\d+)$/i);
      if (marker) { team = marker[1]; return []; }
      const name = String(row[0] ?? "").trim();
      if (!team || !name || /^(total|vacant)$/i.test(name) || row.length < 4) return [];
      return [[...row, team]];
    });
    return { ...table, headers: [...table.headers.map(header => ["bowler", "bowler name"].includes(header.toLowerCase()) ? "Name" : header), "Team#"], rows };
  }).filter(table => table.rows.length);
  return [...rosterTables, ...recapTables];
}
