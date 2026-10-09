import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the score workflow records the PDF fallback and preserves partial updates", async () => {
  const workflow = await readFile(new URL("../.github/workflows/sync-leagues.yml", import.meta.url), "utf8");
  assert.match(workflow, /node scripts\/record-fallback-refresh\.mjs/);
  assert.match(workflow, /recap_status=\$\{PIPESTATUS\[0\]\}/);
  assert.match(workflow, /standings_status=\$\{PIPESTATUS\[0\]\}/);
  assert.match(workflow, /lanes_status=\$\{PIPESTATUS\[0\]\}/);
  assert.match(workflow, /leaguepals_status=\$\{PIPESTATUS\[0\]\}/);
  assert.match(workflow, /failed_stages=\(\)/);
});

test("catalog writers keep the aggregate below GitHub's file limit", async () => {
  for (const file of ["sync-leaguesecretary.mjs", "sync-static-recaps.mjs", "sync-static-standings.mjs", "sync-static-lanes.mjs", "sync-leaguepals.mjs", "reconcile-refresh.mjs"]) {
    const source = await readFile(new URL(`../scripts/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /JSON\.stringify\(catalog(?:,null|, null),2\)/);
  }
});
