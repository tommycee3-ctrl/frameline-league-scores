import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "https://www.leaguepals.com";
const CENTER_NAME = "Bowlero Council Bluffs - 763";
const CENTER_ID = "6363a65cd18330c73ecf7919";
const AREA = "Council Bluffs";
const catalogFile = path.join(process.cwd(), "public", "data", "leagues", "all.json");
const refreshHistoryFile = path.join(process.cwd(), ".github", "refresh-history.json");
const force = process.argv.includes("--force");
const requestedLeague = process.argv.find((value) => value.startsWith("--league="))?.split("=")[1];
const startedAt = new Date();

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(value)) : "Not posted";
const slugify = (value = "") => clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const api = async (route, options) => {
  const response = await fetch(`${ROOT}${route}`, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${route}`);
  const payload = await response.json();
  return payload.data ?? payload;
};

async function discover() {
  const result = await api(`/publicLeagueSearch?search=${encodeURIComponent("Bowlero")}&lat=41.2619&lng=-95.8608&includeArchived=false`);
  const leagues = result.leagues ?? [];
  return leagues.filter((entry) => entry.center?.centerName === CENTER_NAME && entry._id && entry.name)
    .filter((entry) => !/GOOGLE|TEST/i.test(entry.name))
    .map((entry) => ({ id: `lp-${entry._id}`, sourceId: entry._id, source: "LeaguePals", name: clean(entry.name), displayName: clean(entry.name), slug: slugify(entry.name), centerId: CENTER_ID, centerName: CENTER_NAME, centerSlug: "bowlero-council-bluffs", area: AREA, bowlsOn: clean(entry.weekday), startTime: clean(entry.time), startDate: formatDate(entry.dateStart), sourceUpdated: formatDate(entry.updatedAt ?? entry.dateUpdated ?? entry.dateStart), type: clean(entry.leagueType || "Bowling league") }));
}

function teamNumber(info, teamId, fallback) {
  return String(info.user_team_ids?.[teamId] ?? fallback);
}

function bowlerGames(person) {
  return Array.isArray(person.games) ? person.games.map(number).filter((score) => score >= 0).slice(-3).reverse() : [];
}

function historyFromRosters(rosters, info) {
  const byWeek = new Map();
  for (const roster of rosters) for (const person of roster.people) {
    for (const [date, entries] of Object.entries(person.weekGames ?? {})) {
      const entry = Array.isArray(entries) ? entries.at(-1) : null;
      const raw = Array.isArray(entry?.games) ? entry.games.map(number) : [];
      const games = raw.length > info.gamesPerWeek ? raw.slice(0, info.gamesPerWeek) : raw;
      const series = raw.length > info.gamesPerWeek ? raw.at(-1) : games.reduce((sum, score) => sum + score, 0);
      const week = String(number(entry?.weekIdx) + 1);
      if (!byWeek.has(week)) byWeek.set(week, { date, rows: [] });
      byWeek.get(week).rows.push([person.name, roster.teamNumber, roster.teamName, String(person.average ?? ""), String(person.handicap ?? person.hdcp ?? ""), String(games.length), String(series), String(Math.max(0, ...games))]);
    }
  }
  return [...byWeek.entries()].sort((a, b) => number(a[0]) - number(b[0])).map(([week, value]) => ({ week, sourceUpdated: formatDate(value.date), syncedAt: new Date().toISOString(), views: { bowlers: [{ title: `Week ${week} bowlers`, headers: ["Name", "Team#", "Team", "Avg", "HCP", "Games", "HSS", "HGS"], rows: value.rows }], recaps: [] } }));
}

async function normalize(league, previous = {}) {
  const info = await api(`/fullLeagueInfoPublic?id=${league.sourceId}&allTeams=true&simpleLoad=true`);
  const standingsResult = await api(`/api/getStandingsPublic?leagueId=${league.sourceId}&split=0&curWeekIdx=0`);
  const standingsRaw = standingsResult.standings ?? [];
  const rosters = [];
  for (const [index, standing] of standingsRaw.entries()) {
    const team = standing.team ?? {};
    let people = [];
    try { people = await api(`/api/loadIndividualTeamPublic?id=${team._id}`); }
    catch (error) { console.warn(`Roster unavailable for ${league.name} / ${team.name}: ${error.message}`); }
    rosters.push({ teamNumber: teamNumber(info, team._id, index + 1), teamName: clean(team.name) || `Team ${index + 1}`, people: Array.isArray(people) ? people : [] });
  }
  const standingsRows = standingsRaw.map((standing, index) => {
    const team = standing.team ?? {};
    const won = number(standing.pointsWon ?? standing.wins);
    const lost = number(standing.pointsLost ?? standing.losses);
    const played = won + lost;
    return [String(index + 1), teamNumber(info, team._id, index + 1), clean(team.name) || `Team ${index + 1}`, String(won), String(lost), played ? `${Math.round(won / played * 100)}%` : "0%", String(number(standing.average)), String(number(standing.totalPins ?? standing.scratchPins))];
  });
  const bowlerRows = rosters.flatMap((roster) => roster.people.filter((person) => person.name && !/vacant/i.test(person.name)).map((person) => {
    const games = bowlerGames(person);
    return [clean(person.name), roster.teamNumber, roster.teamName, String(number(person.realAvg ?? person.average)), String(number(person.handicap ?? person.hdcp)), String(number(person.gamesPlayed, games.length)), String(number(person.highSeries, games.reduce((sum, score) => sum + score, 0))), String(number(person.highGame, Math.max(0, ...games)))];
  }));
  const rosterTables = rosters.map((roster) => ({ title: `Team ${roster.teamNumber} · ${roster.teamName} roster`, team: roster.teamNumber, headers: ["Name", "Avg", "HCP"], rows: roster.people.filter((person) => person.name && !/vacant/i.test(person.name)).map((person) => [clean(person.name), String(number(person.realAvg ?? person.average)), String(number(person.handicap ?? person.hdcp))]) }));
  const history = historyFromRosters(rosters, info);
  const week = String(number(standingsResult.sortData?.weekNum, Math.max(1, ...history.map((item) => number(item.week)))));
  const views = { standings: [{ title: "League standings", headers: ["Place", "Team#", "Team", "Won", "Lost", "% Won", "Avg", "Pins"], rows: standingsRows }], bowlers: [{ title: "Bowlers", headers: ["Name", "Team#", "Team", "Avg", "HCP", "Games", "HSS", "HGS"], rows: bowlerRows }], recaps: previous.views?.recaps ?? [], lanes: previous.views?.lanes ?? [], rosters: rosterTables.some((table) => table.rows.length) ? rosterTables : (previous.views?.rosters ?? []) };
  // Never replace a previously complete public roster with a temporary empty response.
  if (!bowlerRows.length && previous.views?.bowlers?.[0]?.rows?.length) views.bowlers = previous.views.bowlers;
  const fingerprintHistory = history.map(({ syncedAt: _syncedAt, ...entry }) => entry);
  const fingerprint = createHash("sha256").update(JSON.stringify({ week, views, history: fingerprintHistory })).digest("hex");
  return { ...previous, ...league, name: info.name ?? league.name, displayName: info.name ?? league.displayName, bowlsOn: info.weekday ?? league.bowlsOn, startTime: info.time ?? league.startTime, startDate: formatDate(info.dateStart) ?? league.startDate, type: info.leagueType ?? league.type, sourceUpdated: formatDate(info.updatedAt ?? info.dateStart), syncedAt: new Date().toISOString(), status: standingsRows.some((row) => number(row[3]) + number(row[4]) > 0) ? "current" : "awaiting-results", week, fingerprint, views, history };
}

const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
const discovered = (await discover()).filter((league) => !requestedLeague || league.id === requestedLeague || league.sourceId === requestedLeague);
const changes = [];
for (const league of discovered) {
  const previous = catalogById.get(league.id) ?? {};
  const next = await normalize(league, previous);
  const changed = force || next.fingerprint !== previous.fingerprint || !previous.sourceId;
  if (changed) {
    await writeFile(path.join(process.cwd(), "public", "data", "leagues", `${league.id}.json`), JSON.stringify(next, null, 2) + "\n", "utf8");
    changes.push(next);
  }
  catalogById.set(league.id, changed ? next : previous);
  console.log(`${changed ? "Refreshed" : "Current"} ${next.displayName}: ${next.views.standings[0].rows.length} teams, ${next.views.bowlers[0].rows.length} bowlers`);
}
await writeFile(catalogFile, JSON.stringify([...catalogById.values()], null, 2) + "\n", "utf8");
const finishedAt = new Date();
let refreshHistory = [];
try { refreshHistory = JSON.parse(await readFile(refreshHistoryFile, "utf8")); } catch {}
refreshHistory.unshift({
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationSeconds: Math.max(0, Math.round((finishedAt - startedAt) / 1000)),
  mode: "LeaguePals leagues",
  leaguesChecked: discovered.length,
  changeCount: changes.length,
  changes: changes.map((league) => ({ id: league.id, name: league.displayName, area: league.area, center: league.centerName, week: league.week, sourceUpdated: league.sourceUpdated })),
});
await writeFile(refreshHistoryFile, JSON.stringify(refreshHistory.slice(0, 250), null, 2) + "\n", "utf8");
console.log(`LEAGUEPALS SUMMARY | ${finishedAt.toISOString()} | checked ${discovered.length} | changed ${changes.length} | ${Math.round((finishedAt - startedAt) / 1000)} seconds`);
for (const league of changes) console.log(`LEAGUEPALS CHANGE | ${league.area} | ${league.centerName} | ${league.id} | ${league.displayName} | Week ${league.week}`);
