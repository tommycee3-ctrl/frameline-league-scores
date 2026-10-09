import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const historyFile = path.resolve(".github/refresh-history.json");
const catalogFile = path.resolve("public/data/leagues/all.json");
const startedAt = process.env.FRAMELINE_REFRESH_STARTED_AT || new Date().toISOString();
const failedStages = (process.env.FRAMELINE_FAILED_STAGES || "").split(",").filter(Boolean);
const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
let history = [];
try { history = JSON.parse(await readFile(historyFile, "utf8")); } catch {}

const finishedAt = new Date().toISOString();
const record = {
  startedAt,
  finishedAt,
  durationSeconds: Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000)),
  mode: "known leagues",
  scope: "all",
  source: "official report fallback",
  checkedCount: catalog.filter(league => /^\d+$/.test(league.id)).length,
  changeCount: 0,
  changes: [],
  failures: failedStages.map(stage => ({ stage, error: "Refresh stage exited before completing" })),
  deferredLeagues: failedStages,
};

history.unshift(record);
await writeFile(historyFile, JSON.stringify(history.slice(0, 250), null, 2) + "\n");
console.log(`Recorded official report refresh cycle${failedStages.length ? ` with retryable failures: ${failedStages.join(", ")}` : ""}.`);
