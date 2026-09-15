import {test} from 'node:test';import assert from 'node:assert/strict';
import {mergeCatalog,mergeRefreshHistory} from '../scripts/reconcile-refresh.mjs';
test('concurrent directory discoveries survive a score refresh',()=>{
 const old={id:'a',syncedAt:'2026-09-01'},fresh={id:'a',syncedAt:'2026-09-15'},discovered={id:'new',syncedAt:null};
 assert.deepEqual(mergeCatalog([old],[fresh],[old,discovered]),[fresh,discovered]);
});
test('a slower refresh cannot overwrite newer verified scores',()=>{
 const old={id:'a',syncedAt:'2026-09-01'},local={id:'a',syncedAt:'2026-09-14'},newer={id:'a',syncedAt:'2026-09-15'};
 assert.deepEqual(mergeCatalog([old],[local],[newer]),[newer]);
});
test('concurrent refresh history preserves both runs',()=>{
 assert.equal(mergeRefreshHistory([{startedAt:'2026-09-15',scope:'all'}],[{startedAt:'2026-09-14',scope:'center:2119'}]).length,2);
});
