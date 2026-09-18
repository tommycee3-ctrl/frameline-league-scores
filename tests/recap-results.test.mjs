import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { combinedReportedPoints, officialScoreClass, reportedPointTotals } from "../app/leagues/recap-results.ts";

test("unmarked scores never imply wins, losses or ties", () => {
  assert.equal(officialScoreClass(false), "");
  assert.equal(officialScoreClass(undefined), "");
  assert.equal(officialScoreClass(true), "winner-score");
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
  assert.ok(source.includes("const weekPoints = reportedWeekPoints;"));
  assert.ok(!/pointSeries|individualPoints\(|teamResult\(|resultClass\(/.test(source));
});

test("missing weeks never produce a falsely complete season point total", () => {
  assert.deepEqual(reportedPointTotals([{week:"2",reportedWeekPoints:4},{week:"3",reportedWeekPoints:4}]), ["", ""]);
  assert.deepEqual(reportedPointTotals([{week:"1",reportedWeekPoints:0},{week:"2",reportedWeekPoints:4}]), ["0", "4"]);
  assert.deepEqual(reportedPointTotals([{week:"1",reportedWeekPoints:4},{week:"2",reportedWeekPoints:null},{week:"3",reportedWeekPoints:4}]), ["4", "", ""]);
});

test("duplicate League Secretary accounts combine their official wins", () => {
  assert.equal(combinedReportedPoints(["1.5", "0"]), 1.5);
  assert.equal(combinedReportedPoints(["0", "2"]), 2);
  assert.equal(combinedReportedPoints(["", null]), null);
  assert.deepEqual(reportedPointTotals([
    {week:"1",reportedWeekPoints:.5},
    {week:"2",reportedWeekPoints:2},
    {week:"3",reportedWeekPoints:1},
    {week:"4",reportedWeekPoints:0},
    {week:"5",reportedWeekPoints:1.5},
  ]), ["0.5", "2.5", "3.5", "3.5", "5"]);
});
