import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {applyOfficialRecap, enrichOfficialRecaps} from "../scripts/official-recap.mjs";
const teams = JSON.parse(execFileSync(process.env.FRAMELINE_PYTHON || "python", ["scripts/parse-recap-pdf.py", "tests/fixtures/nationals-recap-week4.pdf"], {encoding:"utf8"}));
const league = JSON.parse(readFileSync("tests/fixtures/nationals-recap-week4.json"));
const scratchInteractive = [{rows:[
  ["Team 6", "Lane 7 points won: 12"],
  ["Burns, Jamie", "187", "0", "154", "201", "188", "543"],
  ["Desimone, Anthony", "208", "0", "222", "256", "203", "681"],
  ["Total", "376", "457", "391", "1224"],
]}];
test("PDF restores James's explicit game and handicap-series wins", () => {
  const result = applyOfficialRecap(league.views.recaps, teams, "4", "official.pdf");
  const table = result.find(t => t.rows.some(r => r[0] === "Casella, James"));
  const index = table.rows.findIndex(r => r[0] === "Casella, James");
  assert.deepEqual(table.emphasis[index].slice(3), [true,true,false,true]);
  assert.equal(table.rows[index][6], "482");
  assert.equal(table.recapDetails[index].handicapSeries, "638");
});
test("scratch recap restores a bowler omitted by the interactive table", () => {
  const scratchTeams = JSON.parse(execFileSync(process.env.FRAMELINE_PYTHON || "python", ["scripts/parse-recap-pdf.py", "tests/fixtures/wednesday-scratch-week5.pdf"], {encoding:"utf8"}));
  const result = applyOfficialRecap(scratchInteractive, scratchTeams, "5", "scratch.pdf")[0];
  const index = result.rows.findIndex(row => row[0] === "James Casella");
  assert.ok(index > 0);
  assert.deepEqual(result.rows[index], ["James Casella", "184", "0", "211", "175", "182", "568"]);
  assert.deepEqual(result.emphasis[index].slice(3), [true, false, true, false]);
  assert.equal(result.recapDetails[index].individualPoints, 1.5);
});

test("scratch recap distinguishes a marked win from an equal-score half point", () => {
  const week1 = JSON.parse(execFileSync(process.env.FRAMELINE_PYTHON || "python", ["scripts/parse-recap-pdf.py", "tests/fixtures/wednesday-scratch-week1.pdf"], {encoding:"utf8"}));
  const james = week1.find(team => team.team === "6").bowlers.find(bowler => bowler.name === "James Casella");
  assert.equal(james.points, 1);
});
test("official point subtotals and half points are preserved without scoring rules", () => {
  const result = applyOfficialRecap(league.views.recaps, teams, "4", "official.pdf");
  const ugly = result.flatMap(t => t.rows).find(r => r[0] === "Team 7");
  assert.match(ugly[1], /points won: 33.5$/);
  const auto = result.find(t => t.rows.some(r => r[0] === "Team 6"));
  const start=auto.rows.findIndex(r=>r[0]==="Team 6");
  const total=auto.rows.findIndex((r,i)=>i>start&&r[0]==="Total");
  assert.equal(auto.recapDetails[total].teamPoints.at(-1), "17.0");
  assert.equal(auto.recapDetails[total].matchPoints.at(-1), "14.0");
});
test("mismatched weeks and changed scores cannot reuse another report's wins", () => {
  assert.throws(()=>applyOfficialRecap(league.views.recaps, teams, "3", "official.pdf"));
  const bad=structuredClone(league.views.recaps);bad.find(t=>t.rows.some(r=>r[0]==="Casella, James")).rows.find(r=>r[0]==="Casella, James")[3]="155";
  assert.throws(()=>applyOfficialRecap(bad, teams, "4", "official.pdf"), /Cannot safely match/);
});

test("archived PDF selection follows the selected period, not stale page metadata", async () => {
  let requested;
  const tables = [{rows:[]}];
  const page = {
    evaluate: callback => runInNewContext(`(${callback.toString()})()`, {document:{querySelector: selector => selector === ".div-main-grid" ? {dataset:{league:"132277",week:"4",year:"2026",season:"f"}} : selector.includes("select") ? {value:"2|2026|f"} : {dataset:{urlprefix:"/center/league"}}}}),
    request:{get:async url=>{requested=url;return {ok:()=>true,text:async()=>"<html>No PDF posted</html>"}}},
  };
  assert.equal(await enrichOfficialRecaps(page,tables),tables);
  assert.match(requested,/132277\/2026\/f\/2$/);
});

test("new shared report links still attach official recap results", async () => {
  const pdf = readFileSync("tests/fixtures/wednesday-scratch-week5.pdf");
  let reportUrl = "";
  const page = {
    evaluate: callback => runInNewContext("(" + callback.toString() + ")()", {document:{querySelector: selector => selector === ".div-main-grid" ? {dataset:{league:"148625",week:"5",year:"2026",season:"f"}} : selector.includes("select") ? {value:"5|2026|f"} : {dataset:{urlprefix:"/bowling-centers/west-lanes/bowling-leagues/wednesday-fall-draft-league26"}}}}),
    request:{get:async url => {
      if (url.includes("/recaps-png/")) return {ok:()=>true,text:async()=>'<a href="/reports/shared?path=%2Fuploads%2F2026%2Ff%2F5%2Frecapreprnt00.pdf&amp;token=abc">Open PDF</a>'};
      reportUrl = url;
      return {ok:()=>true,body:async()=>pdf};
    }},
  };
  const result = await enrichOfficialRecaps(page, scratchInteractive);
  assert.match(reportUrl, /\/reports\/shared\?path=/);
  assert.ok(result.every(table => table.sourceReport === reportUrl));
  assert.ok(result.flatMap(table => table.rows).some(row => row[0] === "James Casella"));
});

test("book averages touching long names retain all score columns and markings", () => {
  const teams = JSON.parse(execFileSync(process.env.FRAMELINE_PYTHON || "python", ["scripts/parse-recap-pdf.py", "tests/fixtures/nationals-recap-week1.pdf"], {encoding:"utf8"}));
  const sarah=teams.find(t=>t.team==="5").bowlers.find(b=>b.name.includes("SARAH"));
  assert.deepEqual(sarah.values,["158","49","193","206","162","561"]);
  assert.deepEqual(sarah.wins,[true,true,true,true]);
  const laura=teams.find(t=>t.team==="9").bowlers.find(b=>b.name.includes("LAURA"));
  assert.deepEqual(laura.values,["151","55","178","164","118","460"]);
  assert.equal(laura.name,"LAURA BEHRENS-MORRIS");
});

test("identical numbers do not attach a different bowler's win markings", () => {
  const bad=structuredClone(league.views.recaps);bad.find(t=>t.rows.some(r=>r[0]==="Casella, James")).rows.find(r=>r[0]==="Casella, James")[0]="Another, Bowler";
  assert.throws(()=>applyOfficialRecap(bad,teams,"4","official.pdf"),/Cannot safely match/);
});

test("original sheet totals override incomplete interactive aggregates", () => {
  const bad=structuredClone(league.views.recaps);const table=bad.find(t=>t.rows.some(r=>r[0]==="Team 6"));const start=table.rows.findIndex(r=>r[0]==="Team 6");const index=table.rows.findIndex((r,i)=>i>start&&r[0]==="Total");table.rows[index][4]="2000";
  const result=applyOfficialRecap([table],teams,"4","official.pdf");
  assert.equal(result[0].rows[index][4],"2682");
  assert.equal(result[0].recapDetails[index].teamPoints.at(-1),"17.0");
});


test("PDF middle initials omitted by the interactive report retain a unique exact-score match", () => {
  const source=[{rows:[["Team 4", ""],["Gilpin, David","162","52","158","212","133","503"]]}];
  const pdf=[{team:"4",week:"5",bowlers:[{name:"David M. Gilpin",values:["162","52","158","212","133","503"],handicapSeries:"659",wins:[true,true,false,true]}]}];
  assert.equal(applyOfficialRecap(source,pdf,"5","official.pdf")[0].recapDetails[1].handicapSeries,"659");
  pdf[0].bowlers[0].name="Daniel M. Gilpin";
  assert.throws(()=>applyOfficialRecap(source,pdf,"5","official.pdf"), /Cannot safely match/);
});

test("an exact single-name bowler retains a unique exact-score match", () => {
  const source=[{rows:[["Team 3", ""],[", Ibrahim","127","80","146","124","112","382"]]}];
  const pdf=[{team:"3",week:"4",bowlers:[{name:"Ibrahim",values:["127","80","146","124","112","382"],handicapSeries:"622",wins:[false,true,false,true]}]}];
  assert.equal(applyOfficialRecap(source,pdf,"4","official.pdf")[0].recapDetails[1].handicapSeries,"622");
  pdf[0].bowlers[0].name="Abraham";
  assert.throws(()=>applyOfficialRecap(source,pdf,"4","official.pdf"), /Cannot safely match/);
});

test("interactive vacant placeholders do not block official rows", () => {
  const source=[{rows:[["Team 6", ""],[", Vacant","125","95","125","125","125","375"],["Christianson, Damien L.","157","63","169","148","155","472"],["Total","294","273","280","847"]]}];
  const pdf=[{team:"6",week:"1",bowlers:[{name:"Damien L. Christianson",values:["157","63","169","148","155","472"],handicapSeries:"661",wins:[false,false,false,false]}],scratchTotal:["294","273","280","847","847"],total:["484","463","470","847","1417"],totalWins:[false,false,false,false]}];
  const result=applyOfficialRecap(source,pdf,"1","official.pdf")[0];
  assert.equal(result.sourceReport,"official.pdf");
  assert.deepEqual(result.recapDetails[1],{});
  assert.equal(result.recapDetails[2].handicapSeries,"661");
});
