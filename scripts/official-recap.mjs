import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const run = promisify(execFile);
const numeric = value => String(value ?? "").replace(/^(?:bk|[abp])/i, "");
const tokens = name => String(name).toLowerCase().replace(/\b111\b/g,"iii").replace(/\b11\b/g,"ii").replace(/\b1v\b/g,"iv").split(/[^a-z0-9]+/).filter(Boolean);
const sameName = (sourceName, pdfName) => {
  const source = tokens(sourceName), pdf = tokens(pdfName);
  return pdf.length >= 2 && pdf.every(token => source.some(full => full === token || (token.length >= 3 && full.startsWith(token))));
};
export function applyOfficialRecap(tables, teams, week, sourceReport) {
  return tables.map(table => {
    const result = structuredClone(table);
    result.recapDetails = result.rows.map(() => ({}));
    result.emphasis ??= result.rows.map(row => row.map(() => false));
    let team;
    for (const [index, row] of result.rows.entries()) {
      const header = row[0]?.match(/^Team (\d+)$/);
      if (header) {
        team = teams.find(t => t.team === header[1] && t.week === String(week));
        if (!team) throw new Error(`Official recap PDF missing team ${header[1]}, week ${week}`);
        if (team.points) row[1] = `Lane ${team.lane} points won: ${Number(team.points.at(-1))}`;
      } else if (team && row[0] === "Total") {
        // Copy the original sheet's scratch totals: interactive aggregates can
        // omit absent scores even while displaying those scores in bowler rows.
        if (!team.total && !team.bowlers.length && row.slice(1).every(value => value === "0" || value === "")) continue;
        if (!team.total || !team.scratchTotal) throw new Error(`Official recap team ${team.team} week ${week} totals are missing`);
        result.rows[index] = ["Total", ...team.scratchTotal.slice(0,4)];
        result.emphasis[index] = [false, ...team.totalWins.slice(0,3), team.totalWins[3]];
        result.recapDetails[index] = { handicapSeries: team.total[4], handicapGames: team.total.slice(0,3), teamPoints: team.teamPoints, matchPoints: team.matchPoints };
      } else if (team) {
        const key = row.slice(1,7).map(numeric).join("|");
        const candidates = team.bowlers.filter(b => b.values.map(numeric).join("|") === key && sameName(row[0], b.name));
        if (candidates.length !== 1) throw new Error(`Cannot safely match official recap bowler ${row[0]} in team ${team.team}; scores ${key}; PDF candidates ${JSON.stringify(team.bowlers.filter(b => b.name.includes(row[0].split(",")[0].split("-")[0].toUpperCase())))}`);
        const bowler = candidates[0];
        result.emphasis[index] = [false, false, false, ...bowler.wins];
        result.recapDetails[index] = { handicapSeries: bowler.handicapSeries };
      }
    }
    result.sourceReport = sourceReport;
    return result;
  });
}
export async function enrichOfficialRecaps(page, tables) {
  if (!tables.length) return tables;
  const context = await page.evaluate(() => {
    const main = document.querySelector(".div-main-grid");
    if (!main) return null;
    const element = document.querySelector("#ddLeagueSeasonYearWeek, select[id$=Period]");
    const selected = element?.value?.split("|") ?? [];
    return { ...main.dataset,
      ...(selected.length === 3 ? { week: selected[0], year: selected[1], season: selected[2] } : {}),
      prefix: document.querySelector(".league-header")?.dataset.urlprefix };

  });
  if (!context?.league || !context.year || !context.season || !context.week || !context.prefix) return tables;
  const url = new URL(`${context.prefix}/league/recaps-png/${context.league}/${context.year}/${context.season}/${context.week}`, "https://www.leaguesecretary.com");
  const response = await page.request.get(url.toString(), { timeout: 30000 });
  if (!response.ok()) throw new Error(`Official recap document returned ${response.status()}`);
  const html = await response.text();
  const links = [...html.matchAll(/href="([^"]+\.pdf(?:\?[^"]*)?)"/g)].map(m => m[1].replaceAll("&amp;", "&"));
  const link = links.find(link => /reprnt\d*\.pdf/i.test(link));
  if (!link) return tables;
  const sourceReport = new URL(link, url).toString();
  const pdf = await page.request.get(sourceReport, { timeout: 30000 });
  if (!pdf.ok()) throw new Error(`Official recap PDF returned ${pdf.status()}`);
  const directory = await mkdtemp(path.join(tmpdir(), "frameline-recap-"));
  try {
    const file = path.join(directory, "recap.pdf");
    await writeFile(file, await pdf.body());
    const { stdout } = await run(process.env.FRAMELINE_PYTHON || "python", [path.resolve("scripts/parse-recap-pdf.py"), file], { maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
    return applyOfficialRecap(tables, JSON.parse(stdout), context.week, sourceReport);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
