import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../scripts/sync-static-standings.mjs", import.meta.url), "utf8");
const body = source.slice(source.indexOf("function mergeStandings"), source.indexOf("function mergeBowlers"));
const mergeStandings = new Function(`${body}; return mergeStandings;`)();

const headers = ["Place", "Team", "Team#", "Div", "WON", "LOST", "%", "YTD WON", "AVG", "Pins", "HSG", "HSS"];
const active = ["1", "Team 1", "1", "1", "20", "10", "67 %", "20", "600", "5000", "700", "1900"];
const dormant = ["2", "Team 2", "2", "1", "0", "30", "0 %", "0", "500", "0", "0", "0"];

test("official standings may omit an inactive zero-pin placeholder", () => {
  const league = { week: "7", views: { standings: [{ title: "League standings", headers, rows: [active, dormant] }] } };
  const official = { reportWeek: "7", teams: [{ team: "1", place: "1", won: "25", lost: "15", avg: "610", scratchPins: "5500", hsg: "710", hss: "1950" }] };
  const rows = mergeStandings(league, official).standings[0].rows;
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 10), ["1", "Team 1", "1", "1", "25", "15", "63 %", "25", "610", "5500"]);
});

test("official standings still reject an omitted active team", () => {
  const league = { week: "7", views: { standings: [{ title: "League standings", headers, rows: [active, ["2", "Team 2", "2", "1", "5", "25", "17 %", "5", "500", "1200", "600", "1700"]] }] } };
  const official = { reportWeek: "7", teams: [{ team: "1", place: "1", won: "25", lost: "15" }] };
  assert.throws(() => mergeStandings(league, official), /team set differs/);
});
