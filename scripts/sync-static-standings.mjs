import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { createSourceSession } from "./source-fetch-session.mjs";

const run = promisify(execFile);
const root = path.resolve("public/data/leagues");
const catalogFile = path.join(root, "all.json");
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--league="))?.slice(9);
const dryRun = process.argv.includes("--dry-run");
const seasonCode = { Fall: "f", Summer: "u", Spring: "s", Winter: "w" };
let updated = 0, skipped = 0, unavailable = 0;
const parserVersion = 4;

const nameKey = value => String(value ?? "").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).sort().join(" ");

function includePostedRecap(league, bowler) {
  const prior = [...(league.history ?? [])].filter(entry => Number(entry.week) < Number(league.week)).sort((a, b) => Number(b.week) - Number(a.week))[0];
  const priorTable = prior?.views?.bowlers?.[0];
  if (!priorTable) return bowler;
  const priorName = priorTable.headers.findIndex(header => header.toLowerCase() === "name");
  const priorPins = priorTable.headers.findIndex(header => header.toLowerCase() === "pins");
  const priorGames = priorTable.headers.findIndex(header => ["games", "gms"].includes(header.toLowerCase()));
  const previous = priorTable.rows.find(row => nameKey(row[priorName]) === nameKey(bowler.name));
  if (!previous || previous[priorPins] !== String(bowler.pins) || previous[priorGames] !== String(bowler.games)) return bowler;
  for (const table of league.views?.recaps ?? []) {
    const name = table.headers.findIndex(header => ["bowler", "name"].includes(header.toLowerCase()));
    const row = table.rows.find(row => nameKey(row[name]) === nameKey(bowler.name));
    if (!row) continue;
    const gameIndexes = table.headers.map((header, index) => /^game \d+$/i.test(header) ? index : -1).filter(index => index >= 0);
    const scores = gameIndexes.map(index => Number(row[index])).filter(score => Number.isFinite(score) && score > 0);
    if (!scores.length) return bowler;
    const pins = Number(bowler.pins) + scores.reduce((sum, score) => sum + score, 0);
    const games = Number(bowler.games) + scores.length;
    return { ...bowler, pins: String(pins), games: String(games), average: String(Math.floor(pins / games)),
      highGame: String(Math.max(Number(bowler.highGame) || 0, ...scores)), highSeries: String(Math.max(Number(bowler.highSeries) || 0, scores.reduce((sum, score) => sum + score, 0))) };
  }
  return bowler;
}

async function reportFor(league) {
  const sourceFetch = createSourceSession();
  const year = league.startDate?.match(/\b20\d{2}\b/)?.[0];
  const season = seasonCode[league.season];
  if (!year || !season || !league.week || !league.slug || !league.centerSlug) return null;
  const url = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/standings-png/${league.id}/${year}/${season}/${league.week}`);
  const response = await sourceFetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`standings page HTTP ${response.status}`);
  const html = await response.text();
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
  for (const link of links) {
    const shared = new URL(link, url);
    const reportPath = shared.pathname === "/reports/shared" ? shared.searchParams.get("path") : shared.pathname;
    if (!reportPath || !/^\/uploads\/[\w/.-]*standg\d*\.pdf$/i.test(reportPath)) continue;
    const reportUrl = shared.pathname === "/reports/shared" ? shared.toString() : new URL(reportPath, url).toString();
    const pdfResponse = await sourceFetch(reportUrl, { signal: AbortSignal.timeout(30000) });
    if (!pdfResponse.ok) throw new Error(`standings PDF HTTP ${pdfResponse.status}`);
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    if (pdf.subarray(0, 4).toString() !== "%PDF") throw new Error("standings report is not a PDF");
    return { pdf, reportUrl, hash: createHash("sha256").update(pdf).digest("hex") };
  }
  return null;
}

function mergeStandings(league, official) {
  const original = league.views?.standings?.[0];
  if (!original || !["Place", "Team", "Team#", "Div", "WON", "LOST", "%", "YTD WON", "AVG", "Pins", "HSG", "HSS"].every((header, index) => original.headers[index] === header))
    throw new Error("unsupported interactive standings columns");
  const reportWeek = Number(official.reportWeek), currentWeek = Number(league.week);
  if (reportWeek !== currentWeek && reportWeek !== currentWeek + 1)
    throw new Error(`standings PDF period ${reportWeek} does not match recap Week ${currentWeek}`);
  // Scratch draft reports print the BYE as a numbered zero-score team. It is
  // a schedule placeholder and must not block all real team point updates.
  const byTeam = new Map(official.teams
    .filter(team => !/^bye\b/i.test(String(team.printedName ?? "").trim()))
    .map(team => [team.team, team]));
  if ([...byTeam.values()].every(team => Number(team.won) === 0) && original.rows.some(row => Number(row[4]) > 0))
    throw new Error("official standings contain no usable point totals");
  const originalByTeam = new Map(original.rows.map(row => [row[2], row]));
  const rows = [...byTeam.values()].map(team => {
    const row = originalByTeam.get(team.team) ?? [];
    const won = Number(team.won);
    const publishedLost = team.lost !== null ? Number(team.lost) : Number(row[5]);
    const lost = Number.isFinite(publishedLost) && publishedLost >= 0 ? publishedLost : null;
    if (!Number.isFinite(won))
      throw new Error(`official points cannot be reconciled for team ${team.team}`);
    const percent = lost !== null && won + lost > 0 ? `${Math.round(won / (won + lost) * 100)} %` : row[6] ?? "—";
    return [team.place, row[1] ?? team.printedName ?? `Team ${team.team}`, team.team, row[3] ?? "1", team.won,
      lost === null ? (row[5] ?? "—") : String(lost), percent,
      !row.length || row[7] === row[4] ? team.won : row[7], team.avg ?? row[8] ?? "", team.scratchPins ?? row[9] ?? "", team.hsg ?? row[10] ?? "", team.hss ?? row[11] ?? ""];
  }).sort((a, b) => Number(a[3]) - Number(b[3]) || Number(a[0]) - Number(b[0]));
  // A standings sheet describes the lanes used for the completed score week.
  // League Secretary can already have the next week's assignments posted, so
  // replacing views.lanes here would roll the schedule back one week.
  return { standings: [{ ...original, rows }] };
}

function mergeBowlers(league, official) {
  const existing = league.views?.bowlers?.[0];
  const officialBowlersAreConsistent = official.bowlers?.length && official.bowlers.every(bowler => {
    const pins = Number(bowler.pins), games = Number(bowler.games), average = Number(bowler.average);
    return Number.isFinite(pins) && Number.isFinite(games) && Number.isFinite(average) &&
      (games === 0 ? pins === 0 : Math.abs(Math.floor(pins / games) - average) <= 1);
  });
  if (!officialBowlersAreConsistent) {
    if (!existing) return null;
    const at = label => existing.headers.findIndex(header => header.toLowerCase() === label);
    const indexes = { name: at("name"), pins: at("pins"), games: existing.headers.findIndex(header => ["games", "gms"].includes(header.toLowerCase())), average: at("avg"), highGame: at("hsg"), highSeries: at("hss") };
    let changed = false;
    const rows = existing.rows.map(row => {
      const updated = includePostedRecap(league, { name: row[indexes.name], pins: row[indexes.pins], games: row[indexes.games], average: row[indexes.average], highGame: row[indexes.highGame], highSeries: row[indexes.highSeries] });
      if (updated.pins === row[indexes.pins] && updated.games === row[indexes.games]) return row;
      changed = true;
      const next = [...row];
      next[indexes.pins] = updated.pins; next[indexes.games] = updated.games; next[indexes.average] = updated.average;
      next[indexes.highGame] = updated.highGame; next[indexes.highSeries] = updated.highSeries;
      return next;
    });
    return changed ? [{ ...existing, rows }] : null;
  }
  const prior = new Map((existing?.rows ?? []).map(row => {
    const name = existing.headers.findIndex(header => header.toLowerCase() === "name");
    return [String(row[name] ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), row];
  }));
  return [{ title: existing?.title ?? "Bowler List",
    headers: ["Name", "Team#", "Pos#", "Team", "Gndr", "Pins", "Games", "Avg", "EnteringAvg", "HCP", "HHG", "HHS", "HSG", "HSS", "MIB", "WON"],
    rows: official.bowlers.map((publishedBowler, index) => {
      const bowler = includePostedRecap(league, publishedBowler);
      const key = String(bowler.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const saved = prior.get(key) ?? [];
      return [bowler.name, bowler.team, String(index + 1), bowler.teamName, saved[4] ?? "", bowler.pins, bowler.games, bowler.average,
        saved[8] ?? "0", bowler.handicap, saved[10] ?? "0", saved[11] ?? "0", bowler.highGame, bowler.highSeries, saved[14] ?? "0", saved[15] ?? "0"];
    }) }];
}

for (const listed of catalog.filter(league => (!requested || league.id === requested) && /^\d+$/.test(league.id) && league.views?.standings?.[0]?.rows?.length)) {
  const file = path.join(root, `${listed.id}.json`);
  try {
    const league = JSON.parse(await readFile(file, "utf8"));
    const report = await reportFor(league);
    if (!report) { unavailable++; continue; }
    if (report.hash === league.officialStandingsHash &&
        league.officialStandingsParserVersion >= parserVersion &&
        league.officialStandingsRecapHash === league.officialRecapHash) { skipped++; continue; }
    const directory = await mkdtemp(path.join(tmpdir(), "frameline-static-standings-"));
    let official;
    try {
      const pdfFile = path.join(directory, "standings.pdf");
      await writeFile(pdfFile, report.pdf);
      const { stdout } = await run(process.env.FRAMELINE_PYTHON || "python", [path.resolve("scripts/parse-standings-pdf.py"), pdfFile], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
      official = JSON.parse(stdout);
    } finally { await rm(directory, { recursive: true, force: true }); }
    const bowlers = mergeBowlers(league, official);
    let views = bowlers ? { bowlers } : {};
    let retainedReason = "";
    try {
      views = { ...views, ...mergeStandings(league, official) };
    } catch (error) {
      if (!bowlers) throw error;
      retainedReason = error.message;
    }
    const next = { ...league, views: { ...league.views, ...views },
      // Retried on every refresh until the official standings themselves can
      // be merged safely; refreshing only the Bowler List is not completion.
      officialStandingsHash: retainedReason ? league.officialStandingsHash : report.hash,
      officialStandingsParserVersion: retainedReason ? league.officialStandingsParserVersion : parserVersion,
      officialStandingsRecapHash: retainedReason ? league.officialStandingsRecapHash : league.officialRecapHash,
      officialStandingsSyncedAt: retainedReason ? league.officialStandingsSyncedAt : new Date().toISOString() };
    if (Array.isArray(next.history)) next.history = next.history.map(entry => String(entry.week) === String(league.week) ? { ...entry, views: { ...entry.views, ...views } } : entry);
    if (!dryRun) {
      await writeFile(file, JSON.stringify(next, null, 2) + "\n");
      const index = catalog.findIndex(item => item.id === league.id);
      catalog[index] = next;
    }
    updated++;
    console.log(`${dryRun ? "Would update" : "Updated"} ${league.displayName} official report${retainedReason ? ` (Bowler List refreshed; standings retained: ${retainedReason})` : ""}`);
  } catch (error) { skipped++; console.warn(`Skipped ${listed.displayName} standings: ${error.message}`); }
}
if (updated && !dryRun) await writeFile(catalogFile, JSON.stringify(catalog) + "\n");
console.log(`Official standings pass: ${updated} updated, ${skipped} unchanged or unsafe, ${unavailable} without a posted PDF`);
