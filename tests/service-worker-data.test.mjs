import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
const script = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
test('league data prefers the network and uses one offline cache entry across refresh queries', async () => {
  const handlers = {};
  const stored = new Map();
  let online = true;
  let value = 'new results';
  const context = {
    self: {location: {origin:'https://example.test'}, addEventListener:(name, handler) => {handlers[name]=handler;}},
    URL, Request,
    fetch: async () => {if(!online) throw new Error('offline'); return new Response(value);},
    caches: {open:async()=>({put:async(key,response)=>stored.set(key.url,response)}),match:async key=>stored.get(key.url)?.clone()},
  };
  vm.runInNewContext(script, context);
  const load = async query => {
    let result;
    handlers.fetch({request:new Request(`https://example.test/data/leagues/all.json?t=${query}`),respondWith:promise=>{result=promise;}});
    return (await result).text();
  };
  assert.equal(await load(1), 'new results');
  value = 'newer results';
  assert.equal(await load(2), 'newer results');
  assert.equal(stored.size, 1);
  online = false;
  assert.equal(await load(3), 'newer results');
});
