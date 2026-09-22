import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildOfficialRecaps } from "./official-recap.mjs";

const run = promisify(execFile);
const root = path.resolve("public/data/leagues");
const catalogFile = path.join(root, "all.json");
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--league="))?.slice(9);
const dryRun = process.argv.includes("--dry-run");
const seasonCode = { Fall: "f", Summer: "u", Spring: "s", Winter: "w" };
const parserVersion = 6;
let updated = 0, partial = 0, skipped = 0, unavailable = 0;

async function reportFor(league) {
  if (!league.slug || !league.centerSlug) return null;
  const pageUrl = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/recaps/${league.id}`);
  const pageResponse = await fetch(pageUrl, { signal: AbortSignal.timeout(30000) });
  if (!pageResponse.ok) throw new Error(`recap page HTTP ${pageResponse.status}`);
  const page = await pageResponse.text();
  const selected = page.match(/<option\s+value="(\d+)\|(\d{4})\|([fsuw])"\s+selected="selected">([^<]*)/i);
  if (!selected) return null;
  const [, week, year, season] = selected;
  if (season !== seasonCode[league.season] || Number(week) < Number(league.week)) return null;
  const url = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/recaps-png/${league.id}/${year}/${season}/${week}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`report page HTTP ${response.status}`);
  const html = await response.text();
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
  for (const link of links) {
    const shared = new URL(link, url);
    const reportPath = shared.pathname === "/reports/shared" ? shared.searchParams.get("path") : shared.pathname;
    if (!reportPath || !/^\/uploads\/[\w/.-]*reprnt\d*\.pdf$/i.test(reportPath)) continue;
    const reportUrl = new URL(reportPath, url).toString();
    const pdfResponse = await fetch(reportUrl, { signal: AbortSignal.timeout(30000) });
    if (!pdfResponse.ok) throw new Error(`report PDF HTTP ${pdfResponse.status}`);
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    if (pdf.subarray(0, 4).toString() !== "%PDF") throw new Error("report is not a PDF");
    return { pdf, reportUrl, hash: createHash("sha256").update(pdf).digest("hex"), week, selectedLabel: selected[4] };
  }
  return null;
}

const candidates = catalog.filter(league =>
  (!requested || league.id === requested) && /^\d+$/.test(league.id) &&
  league.views?.recaps?.some(table => table.rows?.length));
for (const [index, listed] of candidates.entries()) {
  const file = path.join(root, `${listed.id}.json`);
  try {
    const league = JSON.parse(await readFile(file, "utf8"));
    const report = await reportFor(league);
    if (!report) { unavailable++; continue; }
    if (report.week === String(league.week) && report.hash === league.officialRecapHash && league.officialRecapParserVersion >= parserVersion && league.views.recaps.every(table => table.sourceReport)) { skipped++; continue; }
    const directory = await mkdtemp(path.join(tmpdir(), "frameline-static-recap-"));
    let teams;
    try {
      const pdfFile = path.join(directory, "recap.pdf");
      await writeFile(pdfFile, report.pdf);
      const { stdout } = await run(process.env.FRAMELINE_PYTHON || "python", [path.resolve("scripts/parse-recap-pdf.py"), pdfFile], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
      teams = JSON.parse(stdout);
    } finally { await rm(directory, { recursive: true, force: true }); }
    const newWeek = report.week !== String(league.week);
    const recaps = buildOfficialRecaps(newWeek ? [] : league.views.recaps, teams, report.week, report.reportUrl);
    if (!recaps.length || recaps.some(table => !table.sourceReport)) throw new Error("official recap did not cover every table");
    const now = new Date().toISOString();
    const incomplete = recaps.some(table => table.officialTotalsComplete === false);
    const printedDate = report.selectedLabel.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    const sourceUpdated = printedDate ? new Date(Date.UTC(Number(printedDate[3]), Number(printedDate[1]) - 1, Number(printedDate[2]))).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : league.sourceUpdated;
    const next = { ...league, week: report.week, sourceUpdated: newWeek ? sourceUpdated : league.sourceUpdated, views: { ...league.views, recaps }, officialRecapHash: report.hash, officialRecapParserVersion: parserVersion, officialRecapSyncedAt: now };
    if (Array.isArray(next.history)) {
      next.history = newWeek
        ? [...next.history.filter(entry => String(entry.week) !== report.week), { week: report.week, sourceUpdated, syncedAt: now, views: { recaps } }]
        : next.history.map(entry => String(entry.week) === report.week ? { ...entry, views: { ...entry.views, recaps } } : entry);
    }
    if (!dryRun) {
      await writeFile(file, JSON.stringify(next, null, 2) + "\n");
      const catalogIndex = catalog.findIndex(item => item.id === league.id);
      catalog[catalogIndex] = next;
    }
    updated++;
    if (incomplete) partial++;
    console.log(`${dryRun ? "Would update" : "Updated"} ${league.displayName} Week ${report.week} from official PDF${incomplete ? " (printed team totals clipped; missing totals left unverified)" : ""}`);
  } catch (error) {
    skipped++;
    console.warn(`Skipped ${listed.displayName}: ${error.message}`);
  }
  if ((index + 1) % 25 === 0) console.log(`Checked ${index + 1}/${candidates.length} leagues`);
}
if (updated && !dryRun) await writeFile(catalogFile, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Official recap pass: ${updated} updated (${partial} with clipped printed totals), ${skipped} unchanged or unsafe, ${unavailable} without a posted PDF`);
