import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { officialScoreClass } from "../app/leagues/recap-results.ts";

test("unmarked scores never imply wins, losses or ties", () => {
  assert.equal(officialScoreClass(false), "");
  assert.equal(officialScoreClass(undefined), "");
  assert.equal(officialScoreClass(true), "winner-score");
});
test("Nationals lower scratch series gets no inferred handicap win", () => {
  const league = JSON.parse(readFileSync("public/data/leagues/132277.json"));
  const table = league.views.recaps.find(t => t.rows.some(r => r[0] === "Casella, James"));
  const index = table.rows.findIndex(r => r[0] === "Casella, James");
  assert.equal(table.rows[index][6], "482");
  assert.equal(officialScoreClass(table.emphasis[index][6]), "");
});
test("all stored leagues render unmarked recap scores neutrally", () => {
  let checked = 0;
  for (const file of readdirSync("public/data/leagues").filter(f => /^\d+\.json$/.test(f))) {
    const league = JSON.parse(readFileSync(`public/data/leagues/${file}`));
    for (const table of league.views?.recaps ?? []) {
      for (const flags of table.emphasis ?? []) for (const flag of flags.slice(3)) {
        assert.equal(officialScoreClass(flag), flag === true ? "winner-score" : "");
        checked++;
      }
    }
  }
  assert.ok(checked > 100);
});
test("dashboard never replaces official zero points or calculates result classes", () => {
  const source = readFileSync("app/leagues/synced-league-dashboard.tsx", "utf8");
  assert.ok(source.includes("const resolvedWeekPoints = entry.reportedWeekPoints;"));
  assert.ok(!/pointSeries|individualPoints\(|teamResult\(|resultClass\(/.test(source));
});
