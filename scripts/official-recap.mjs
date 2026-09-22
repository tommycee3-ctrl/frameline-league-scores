import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const run = promisify(execFile);
const numeric = value => String(value ?? "").replace(/^(?:bk|[a-z])/i, "");
const tokens = name => String(name).toLowerCase().replace(/\b111\b/g,"iii").replace(/\b11\b/g,"ii").replace(/\b1v\b/g,"iv").split(/[^a-z0-9]+/).filter(Boolean);
const sameName = (sourceName, pdfName) => {
  const source = tokens(sourceName);
  const pdf = tokens(pdfName).filter(token => !["sr", "jr"].includes(token) || source.includes(token));
  // Some source records contain one legal/display name only. Score columns are
  // still required to match uniquely before this name check is accepted.
  if (source.length === 1 || pdf.length === 1)
    return source.length === 1 && pdf.length === 1 && source[0] === pdf[0];
  // The interactive report can reduce "Xavier Harbeck" to "H, X".
  // The score-row match below must still identify exactly one PDF bowler.
  const initials = source.filter(token => !["ii", "iii", "iv", "jr", "sr"].includes(token));
  if (/^[^,]+,\s*[^,]+$/.test(sourceName) && initials.length === 2 && initials.every(part => part.length === 1))
    return initials[0] === pdf.at(-1)?.[0] && initials[1] === pdf[0]?.[0];
  // BLS prints middle initials that the interactive report can omit.
  // Require both primary names; numeric row matching still must be unique.
  const primary = pdf.length > 2 ? pdf.filter((token, index) => token.length > 1 || index === 0 || index === pdf.length - 1) : pdf;
  return primary.length >= 2 && primary.every(token => source.some(full => full === token || (token.length >= 3 && full.startsWith(token))));
};
export function applyOfficialRecap(tables, teams, week, sourceReport) {
  return tables.map(table => {
    const result = structuredClone(table);
    const matched = new Map();
    result.recapDetails = result.rows.map(() => ({}));
    result.emphasis ??= result.rows.map(row => row.map(() => false));
    let team;
    for (const [index, row] of result.rows.entries()) {
      const header = row[0]?.match(/^Team (\d+)$/);
      if (header) {
        const lane = row[1]?.match(/\bLane\s+(\d+)\b/i)?.[1];
        const laneMatches = lane ? teams.filter(t => t.lane === lane && t.week === String(week)) : [];
        team = laneMatches.length === 1 ? laneMatches[0] : teams.find(t => t.team === header[1] && t.week === String(week));
        if (!team) throw new Error(`Official recap PDF missing team ${header[1]}, week ${week}`);
        // Duplicate team names can make the interactive name-to-number lookup
        // choose the wrong number. The printed lane identifies this matchup.
        row[0] = `Team ${team.team}`;
        if (team.points) row[1] = `Lane ${team.lane} points won: ${Number(team.points.at(-1))}`;
      } else if (team && row[0] === "Total") {
        // Copy the original sheet's scratch totals: interactive aggregates can
        // omit absent scores even while displaying those scores in bowler rows.
        if (!team.total && !team.bowlers.length && row.slice(1).every(value => value === "0" || value === "")) continue;
        if (!team.total || !team.scratchTotal) throw new Error(`Official recap team ${team.team} week ${week} totals are missing`);
        result.rows[index] = ["Total", ...team.scratchTotal.slice(0,4)];
        result.emphasis[index] = [false, ...team.totalWins.slice(0,3), team.totalWins[3]];
        result.recapDetails[index] = { handicapSeries: team.total.at(-1), handicapGames: team.total.slice(0,3), teamPoints: team.teamPoints, matchPoints: team.matchPoints };
      } else if (team) {
        // Vacant placeholders can appear only in the interactive report. They
        // have no official PDF row or win markings to attach.
        if (/vacant/i.test(row[0] ?? "")) continue;
        const key = row.slice(1,7).map(numeric).join("|");
        const candidates = team.bowlers.filter(b => b.values.map(numeric).join("|") === key && sameName(row[0], b.name));
        if (candidates.length !== 1) throw new Error(`Cannot safely match official recap bowler ${row[0]} in team ${team.team}; scores ${key}; PDF candidates ${JSON.stringify(team.bowlers.filter(b => b.name.includes(row[0].split(",")[0].split("-")[0].toUpperCase())))}`);
        const bowler = candidates[0];
        if (!matched.has(team.team)) matched.set(team.team, new Set());
        matched.get(team.team).add(bowler);
        result.emphasis[index] = [false, false, false, ...bowler.wins];
        result.recapDetails[index] = { handicapSeries: bowler.handicapSeries, individualPoints: bowler.points };
      }
    }
    // LeagueSecretary's interactive recap can omit bowlers even when their
    // scores are present in the official PDF. Restore those official rows.
    for (let index = result.rows.length - 1; index >= 0; index--) {
      const header = result.rows[index]?.[0]?.match(/^Team (\d+)$/);
      if (!header) continue;
      const official = teams.find(t => t.team === header[1] && t.week === String(week));
      if (!official) continue;
      const present = matched.get(official.team) ?? new Set();
      const missing = official.bowlers.filter(bowler => !present.has(bowler) && !/^vacant$/i.test(bowler.name));
      if (!missing.length) continue;
      let insertAt = result.rows.findIndex((row, rowIndex) => rowIndex > index && (row[0] === "Total" || /^Team \d+$/.test(row[0] ?? "")));
      if (insertAt < 0) insertAt = result.rows.length;
      result.rows.splice(insertAt, 0, ...missing.map(bowler => [bowler.name, ...bowler.values]));
      result.emphasis.splice(insertAt, 0, ...missing.map(bowler => [false, false, false, ...bowler.wins]));
      result.recapDetails.splice(insertAt, 0, ...missing.map(bowler => ({ handicapSeries: bowler.handicapSeries, individualPoints: bowler.points })));
    }
    result.sourceReport = sourceReport;
    return result;
  });
}
export function buildOfficialRecaps(tables, teams, week, sourceReport) {
  const printed = teams.filter(team => team.week === String(week));
  const byLane = new Map(printed.map(team => [String(team.lane), team]));
  const prior = new Map();
  for (const table of tables) {
    let lane;
    for (const row of table.rows ?? []) {
      const headerLane = row[0]?.match(/^Team \d+$/) && row[1]?.match(/\bLane\s+(\d+)\b/i)?.[1];
      if (headerLane) { lane = headerLane; prior.set(lane, { rows: [], header: row }); }
      else if (lane && prior.has(lane)) prior.get(lane).rows.push(row);
    }
  }
  if (!printed.length || byLane.size !== printed.length ||
      [...prior.keys()].some(lane => !byLane.has(lane)))
    throw new Error(`Official recap lane set does not match the published Week ${week} matchup`);
  const pairs = new Map();
  for (const team of printed) {
    const pair = Math.ceil(Number(team.lane) / 2);
    if (!Number.isInteger(pair) || pair < 1) throw new Error(`Invalid official lane ${team.lane}`);
    if (!pairs.has(pair)) pairs.set(pair, []);
    pairs.get(pair).push(team);
  }
  if ([...pairs.values()].some(pair => pair.length !== 2)) throw new Error(`Incomplete official Week ${week} lane pair`);
  return [...pairs.entries()].sort((a, b) => a[0] - b[0]).map(([, pair]) => {
    pair.sort((a, b) => Number(a.lane) - Number(b.lane));
    const result = { title: `${pair[0].name} vs ${pair[1].name}`, headers: tables[0]?.headers ?? ["Bowler", "Average", "Handicap", "Game 1", "Game 2", "Game 3", "Scratch series"],
      rows: [], emphasis: [], recapDetails: [], sourceReport };
    for (const team of pair) {
      if (team.scratchTotal && [0, 1, 2].some(game => {
        const printed = Number(team.scratchTotal[game]);
        const all = team.bowlers.reduce((sum, bowler) => sum + Number(bowler.values[game + 2] || 0), 0);
        const occupied = team.bowlers.filter(bowler => !/^vacant$/i.test(bowler.name.trim())).reduce((sum, bowler) => sum + Number(bowler.values[game + 2] || 0), 0);
        return all !== printed && occupied !== printed;
      }))
        throw new Error(`Official PDF bowler scores do not add up for team ${team.team}, lane ${team.lane}`);
      const saved = prior.get(String(team.lane)) ?? { header: [], rows: [] };
      const points = team.points?.at(-1) ?? team.teamPoints?.at(-1) ?? (!team.bowlers.length ? "0" : null);
      result.rows.push([`Team ${team.team}`, `Lane ${team.lane} points won: ${points ?? "unverified"}`]);
      result.emphasis.push([false, false]);
      result.recapDetails.push({});
      for (const bowler of team.bowlers) {
        result.rows.push([bowler.name, ...bowler.values]);
        result.emphasis.push([false, false, false, ...bowler.wins]);
        result.recapDetails.push({ handicapSeries: bowler.handicapSeries, individualPoints: bowler.points });
      }
      const knownScores = new Set(team.bowlers.map(bowler => bowler.values.join("|")));
      const clipped = Boolean(team.bowlers.length && (!team.total || !team.scratchTotal));
      if (clipped) {
        for (const row of saved.rows.filter(row => row[0] !== "Total" && !/vacant/i.test(row[0] ?? ""))) {
          if (knownScores.has(row.slice(1, 7).map(numeric).join("|"))) continue;
          result.rows.push(row);
          result.emphasis.push(row.map(() => false));
          result.recapDetails.push({ officialRowUnavailable: true });
        }
      }
      const total = team.scratchTotal ? ["Total", ...team.scratchTotal.slice(0, 4)] : saved.rows.find(row => row[0] === "Total") ?? (!team.bowlers.length ? ["Total", "0", "0", "0", "0"] : ["Total", "—", "—", "—", "—"]);
      if (!total) throw new Error(`No total available for team ${team.team}, lane ${team.lane}`);
      result.rows.push(total);
      result.emphasis.push(team.totalWins?.length >= 4 ? [false, ...team.totalWins.slice(0, 4)] : total.map(() => false));
      result.recapDetails.push(team.total ? { handicapSeries: team.total.at(-1), handicapGames: team.total.slice(0, 3), teamPoints: team.teamPoints, matchPoints: team.matchPoints } : team.bowlers.length ? { officialTotalsUnavailable: true } : {});
      if (clipped) result.officialTotalsComplete = false;
    }
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
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replaceAll("&amp;", "&"));
  const link = links.find(link => {
    const report = new URL(link, url);
    return /reprnt\d*\.pdf/i.test(report.pathname) ||
      (report.pathname === "/reports/shared" && /reprnt\d*\.pdf/i.test(report.searchParams.get("path") ?? ""));
  });
  if (!link) return tables;
  const shared = new URL(link, url);
  // The new shared-report route renders an HTML viewer. Its path parameter
  // points to the same-origin original PDF that the parser needs.
  const pdfPath = shared.pathname === "/reports/shared" ? shared.searchParams.get("path") : null;
  const sourceReport = pdfPath && /^\/uploads\/[\w/.-]+\.pdf$/i.test(pdfPath)
    ? new URL(pdfPath, url).toString() : shared.toString();
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
