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

test("official standings remove a team no longer published by the source", () => {
  const league = { week: "7", views: { standings: [{ title: "League standings", headers, rows: [active, ["2", "Team 2", "2", "1", "5", "25", "17 %", "5", "500", "1200", "600", "1700"]] }] } };
  const official = { reportWeek: "7", teams: [{ team: "1", place: "1", won: "25", lost: "15" }] };
  assert.deepEqual(mergeStandings(league, official).standings[0].rows.map(row => row[2]), ["1"]);
});

test("an official BYE placeholder does not block current team points", () => {
  const league = { week: "8", views: { standings: [{ title: "League standings", headers, rows: [active] }] } };
  const official = { reportWeek: "8", teams: [
    { team: "1", place: "1", printedName: "Team 1", won: "40", lost: "20", scratchPins: "6200" },
    { team: "2", place: "2", printedName: "BYE", won: "0", lost: "0", scratchPins: "0" },
  ] };
  const rows = mergeStandings(league, official).standings[0].rows;
  assert.deepEqual(rows[0].slice(0, 10), ["1", "Team 1", "1", "1", "40", "20", "67 %", "40", "600", "6200"]);
});

test("a newly published real team is added from the official standings", () => {
  const league = { week: "8", views: { standings: [{ title: "League standings", headers, rows: [active] }] } };
  const official = { reportWeek: "8", teams: [
    { team: "1", place: "1", printedName: "Team 1", won: "40", lost: "20" },
    { team: "3", place: "2", printedName: "New Team", won: "32", lost: "28", scratchPins: "4800" },
  ] };
  const rows = mergeStandings(league, official).standings[0].rows;
  assert.deepEqual(rows[1].slice(0, 10), ["2", "New Team", "3", "1", "32", "28", "53 %", "32", "", "4800"]);
});
