import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";

const run = promisify(execFile);
const root = path.resolve("public/data/leagues");
const catalogFile = path.join(root, "all.json");
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--league="))?.slice(9);
const dryRun = process.argv.includes("--dry-run");
const seasonCode = { Fall: "f", Summer: "u", Spring: "s", Winter: "w" };
let updated = 0, skipped = 0, unavailable = 0;

async function reportFor(league) {
  const year = league.startDate?.match(/\b20\d{2}\b/)?.[0];
  const season = seasonCode[league.season];
  if (!year || !season || !league.week || !league.slug || !league.centerSlug) return null;
  const url = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/standings-png/${league.id}/${year}/${season}/${league.week}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`standings page HTTP ${response.status}`);
  const html = await response.text();
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
  for (const link of links) {
    const shared = new URL(link, url);
    const reportPath = shared.pathname === "/reports/shared" ? shared.searchParams.get("path") : shared.pathname;
    if (!reportPath || !/^\/uploads\/[\w/.-]*standg\d*\.pdf$/i.test(reportPath)) continue;
    const reportUrl = new URL(reportPath, url).toString();
    const pdfResponse = await fetch(reportUrl, { signal: AbortSignal.timeout(30000) });
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
  const byTeam = new Map(official.teams.map(team => [team.team, team]));
  if (byTeam.size !== original.rows.length || original.rows.some(row => !byTeam.has(row[2])))
    throw new Error("official standings team set differs from published league");
  const rows = original.rows.map(row => {
    const team = byTeam.get(row[2]);
    const totalPoints = Number(row[4]) + Number(row[5]);
    const won = Number(team.won);
    const lost = team.lost !== null ? Number(team.lost) : totalPoints - won;
    if (!Number.isFinite(totalPoints) || !Number.isFinite(won) || !Number.isFinite(lost) || lost < 0)
      throw new Error(`official points cannot be reconciled for team ${team.team}`);
    const percent = totalPoints > 0 ? `${Math.round(won / (won + lost) * 100)} %` : "0 %";
    return [team.place, row[1], row[2], row[3], team.won, String(lost), percent,
      row[7] === row[4] ? team.won : row[7], team.avg, team.scratchPins, team.hsg, team.hss];
  }).sort((a, b) => Number(a[0]) - Number(b[0]));
  const names = new Map(original.rows.map(row => [row[2], row[1]]));
  const lanes = official.teams.map(team => [team.lane, team.team, names.get(team.team)]).sort((a, b) => Number(a[0]) - Number(b[0]));
  return { standings: [{ ...original, rows }], lanes: [{ title: league.views.lanes?.[0]?.title ?? "Lane assignments", headers: ["Lane", "Team#", "Team"], rows: lanes }] };
}

for (const listed of catalog.filter(league => (!requested || league.id === requested) && /^\d+$/.test(league.id) && league.views?.standings?.[0]?.rows?.length)) {
  const file = path.join(root, `${listed.id}.json`);
  try {
    const league = JSON.parse(await readFile(file, "utf8"));
    const report = await reportFor(league);
    if (!report) { unavailable++; continue; }
    if (report.hash === league.officialStandingsHash) { skipped++; continue; }
    const directory = await mkdtemp(path.join(tmpdir(), "frameline-static-standings-"));
    let official;
    try {
      const pdfFile = path.join(directory, "standings.pdf");
      await writeFile(pdfFile, report.pdf);
      const { stdout } = await run(process.env.FRAMELINE_PYTHON || "python", [path.resolve("scripts/parse-standings-pdf.py"), pdfFile], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
      official = JSON.parse(stdout);
    } finally { await rm(directory, { recursive: true, force: true }); }
    const views = mergeStandings(league, official);
    const next = { ...league, views: { ...league.views, ...views }, officialStandingsHash: report.hash, officialStandingsSyncedAt: new Date().toISOString() };
    if (Array.isArray(next.history)) next.history = next.history.map(entry => String(entry.week) === String(league.week) ? { ...entry, views: { ...entry.views, ...views } } : entry);
    if (!dryRun) {
      await writeFile(file, JSON.stringify(next, null, 2) + "\n");
      const index = catalog.findIndex(item => item.id === league.id);
      catalog[index] = next;
    }
    updated++;
    console.log(`${dryRun ? "Would update" : "Updated"} ${league.displayName} standings from published PDF`);
  } catch (error) { skipped++; console.warn(`Skipped ${listed.displayName} standings: ${error.message}`); }
}
if (updated && !dryRun) await writeFile(catalogFile, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Official standings pass: ${updated} updated, ${skipped} unchanged or unsafe, ${unavailable} without a posted PDF`);
