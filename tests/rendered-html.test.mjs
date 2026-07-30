import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the West Lanes social-club homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>West Lanes Bowlatorium<\/title>/i);
  assert.match(html, /class="social-home"/);
  assert.match(html, /Good times/);
  assert.match(html, /roll here\./i);
  assert.match(html, /Today at West Lanes/);
  assert.match(html, /Never roll hungry/i);
});

test("keeps the compact desktop layout responsive", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="social-dashboard"/);
  assert.match(page, /href="\/open-bowling"/);
  assert.match(page, /href="\/leagues"/);
  assert.match(page, /href="\/food-drinks"/);
  assert.match(page, /href="\/cosmic-bowling"/);
  assert.match(css, /min-height:calc\(100vh - 92px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /\.social-home\{display:block;overflow:visible/);
});
