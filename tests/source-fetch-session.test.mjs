import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createSourceSession } from "../scripts/source-fetch-session.mjs";

test("source session retains the report cookie for signed PDF downloads", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/report") {
      response.setHeader("set-cookie", "report-session=ready; Path=/; HttpOnly");
      response.end("report page");
      return;
    }
    if (request.headers.cookie?.includes("report-session=ready")) {
      response.setHeader("content-type", "application/pdf");
      response.end("%PDF signed report");
      return;
    }
    response.end("access page");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const sourceFetch = createSourceSession();
    await sourceFetch(`http://127.0.0.1:${address.port}/report`);
    const pdf = await sourceFetch(`http://127.0.0.1:${address.port}/signed-pdf`);
    assert.equal(await pdf.text(), "%PDF signed report");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
