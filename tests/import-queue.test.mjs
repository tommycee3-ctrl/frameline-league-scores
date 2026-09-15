import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runImportQueue} from '../scripts/import-queue.mjs';
test('imports run within the concurrency limit and finish before publishing',async()=>{
 let active=0,peak=0;const completed=[];
 const pending=await runImportQueue([1,2,3,4,5],async item=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));completed.push(item);active--;},{concurrency:2});
 assert.equal(peak,2);assert.equal(active,0);assert.equal(completed.length,5);assert.deepEqual(pending,[]);
});
test('the refresh deadline retains remaining leagues for the next run',async()=>{
 let clock=0;const completed=[];
 const pending=await runImportQueue([1,2,3,4],async item=>{completed.push(item);clock=10;},{concurrency:2,deadline:10,now:()=>clock});
 assert.deepEqual(completed,[1,2]);assert.deepEqual(pending,[3,4]);
});
