import { readFile, writeFile, mkdtemp, rm, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";

const run = promisify(execFile);
const root = path.resolve("public/data/leagues");
const catalogFile = path.join(root, "all.json");
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
const requested = process.argv.find(arg => arg.startsWith("--league="))?.slice(9);
const dryRun = process.argv.includes("--dry-run");
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
let updated = 0, unchanged = 0, unavailable = 0;

function teamNames(league) {
  const names = new Map();
  for (const table of [league.views?.standings?.[0], league.views?.lanes?.[0]]) {
    if (!table) continue;
    const teamNumber = table.headers.findIndex(header => /^team#|team no\.?$/i.test(header));
    const teamName = table.headers.findIndex(header => /^team$/i.test(header));
    if (teamNumber < 0 || teamName < 0) continue;
    for (const row of table.rows ?? []) if (row[teamNumber] && row[teamName]) names.set(String(row[teamNumber]), row[teamName]);
  }
  return names;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "FrameLine/1.0 lane schedule refresh" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function refresh(league) {
  const laneUrl = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/lane-assignments/${league.id}`);
  const laneHtml = await fetchText(laneUrl);
  const selected = laneHtml.match(/<option\s+value="(\d+)\|(\d+)\|([^"]+)"\s+selected(?:="selected")?[^>]*>([^<]+)<\/option>/i);
  if (!selected) throw new Error("current lane period is unavailable");
  const [, week, year, season, label] = selected;
  const date = clean(label).match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? clean(label);
  const scheduleUrl = new URL(`https://www.leaguesecretary.com/bowling-centers/${league.centerSlug}/bowling-leagues/${league.slug}/league/schedule-png/${league.id}/${year}/${season}`);
  const scheduleHtml = await fetchText(scheduleUrl);
  const encodedPath = [...scheduleHtml.matchAll(/href="([^"]+)"/gi)]
    .map(match => match[1].replaceAll("&amp;", "&"))
    .map(link => new URL(link, scheduleUrl))
    .map(link => link.pathname === "/reports/shared" ? link.searchParams.get("path") : link.pathname)
    .find(value => value && /schdle00\.pdf$/i.test(value));
  if (!encodedPath) throw new Error("official schedule PDF is unavailable");
  const pdfResponse = await fetch(new URL(encodedPath, scheduleUrl), { signal: AbortSignal.timeout(30000) });
  if (!pdfResponse.ok) throw new Error(`schedule PDF HTTP ${pdfResponse.status}`);
  const directory = await mkdtemp(path.join(tmpdir(), "frameline-static-lanes-"));
  try {
    const pdfFile = path.join(directory, "schedule.pdf");
    await writeFile(pdfFile, Buffer.from(await pdfResponse.arrayBuffer()));
    const { stdout } = await run(process.env.FRAMELINE_PYTHON || "python", [path.resolve("scripts/parse-schedule-pdf.py"), pdfFile, week], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    const names = teamNames(league);
    const rows = parsed.rows.map(([lane, team]) => [lane, team, names.get(team) ?? `Team ${team}`]);
    if (!rows.length) throw new Error("official schedule contained no assignments");
    return { week, date, rows };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const storedIds = new Set((await readdir(root)).map(name => name.match(/^(\d+)\.json$/)?.[1]).filter(Boolean));
const candidates = catalog.filter(league => (!requested || String(league.id) === requested) && storedIds.has(String(league.id)) && league.slug && league.centerSlug && league.startDate?.includes("2026"));
for (let offset = 0; offset < candidates.length; offset += 6) {
  const batch = candidates.slice(offset, offset + 6);
  await Promise.all(batch.map(async listed => {
    const file = path.join(root, `${listed.id}.json`);
    try {
      const league = JSON.parse(await readFile(file, "utf8"));
      const result = await refresh(league);
      const priorRows = league.views?.lanes?.[0]?.rows ?? [];
      const same = String(league.laneWeek ?? "") === result.week && JSON.stringify(priorRows) === JSON.stringify(result.rows);
      if (same) { unchanged++; return; }
      const lanes = [{ title: "All scheduled teams", headers: ["Lane", "Team#", "Team"], rows: result.rows, emphasis: result.rows.map(() => [true, false, false]) }];
      const next = { ...league, laneWeek: result.week, laneSourceUpdated: result.date, views: { ...league.views, lanes } };
      if (!dryRun) {
        await writeFile(file, JSON.stringify(next, null, 2) + "\n");
        const index = catalog.findIndex(item => String(item.id) === String(league.id));
        catalog[index] = next;
      }
      updated++;
      console.log(`${dryRun ? "Would update" : "Updated"} ${league.displayName} lanes to Week ${result.week} (${result.date})`);
    } catch (error) {
      unavailable++;
      console.warn(`Retained ${listed.displayName} lanes: ${error.message}`);
    }
  }));
}
if (updated && !dryRun) await writeFile(catalogFile, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Official lane pass: ${updated} updated, ${unchanged} current, ${unavailable} unavailable`);
