import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
const source = await readFile(new URL('../scripts/sync-leaguesecretary.mjs', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const extractTables = new Function(section('function validTable', 'async function readStandingsFingerprint') + ';return extractTables')();
const normalizeRecap = new Function(section('function clean', 'function slugify') + section('function normalizeRecap', 'function rosterIdentity') + ';return normalizeRecap')();
test('split report headers and empty cells retain their column positions', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<div class="k-grid"><table><thead><tr><th data-field="BowlerName">Name</th><th data-field="TeamNum">Team no.</th><th data-field="TeamName">Team</th><th>Games</th></tr></thead></table><table><tbody><tr><td>Example, Bowler</td><td>0</td><td></td><td>3</td></tr></tbody></table></div>`);
    const tables = await extractTables(page);
    assert.equal(tables.length, 1);
    assert.deepEqual(tables[0].headers, ['Name', 'Team#', 'Team', 'Games']);
    assert.deepEqual(tables[0].rows, [['Example, Bowler', '0', '', '3']]);
  } finally { await browser.close(); }
});
test('new recap team labels and scratch totals retain the dashboard format', () => {
  const table = {headers: [], rows: [['TEAM Bowling Stones Lane 16 · 4 team points won'], ['Ohren, Marcy','127','56','128','109','148','385'], ['Team total','','','383','353','376','1112']]};
  table.emphasis = [[], [], [false,false,false,true,false,true,true]];
  const standings = {headers:['Team#','Team'], rows:[['6','Bowling Stones']]};
  const result = normalizeRecap(table, standings);
  assert.deepEqual(result.rows[0], ['Team 6','Lane 16 points won: 4']);
  assert.deepEqual(result.rows[2], ['Total','383','353','376','1112']);
  assert.deepEqual(result.emphasis[2], [false,true,false,true,true]);
});
test('an empty center scan is rejected instead of logged as a successful refresh', async () => {
  const discover = new Function('centers', 'requestedCenter', section('async function discoverLeagues', 'function validTable') + ';return discoverLeagues')([{id:'2175',name:'Papio Bowl',slug:'papio-bowl'}], undefined);
  const page = {goto:async()=>{},waitForTimeout:async()=>{},locator:()=>({evaluateAll:async()=>[]}),close:async()=>{}};
  await assert.rejects(discover({newPage:async()=>page}), /No league rows returned for Papio Bowl/);
});
