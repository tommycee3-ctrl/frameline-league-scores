import assert from 'node:assert/strict';
import {test} from 'node:test';
import {withSourceRetry} from '../scripts/source-retry.mjs';
test('temporary source timeouts retry and preserve the successful result',async()=>{let calls=0;const data=await withSourceRetry(async()=>{if(++calls<3){const error=new Error('timeout');error.name='TimeoutError';throw error;}return ['official rows'];},{pauseMs:0});assert.equal(calls,3);assert.deepEqual(data,['official rows']);});
test('persistent empty source pages fail after the bounded retries',async()=>{let calls=0;await assert.rejects(withSourceRetry(async()=>{calls++;const error=new Error('No league rows');error.code='SOURCE_EMPTY';throw error;},{pauseMs:0}),/No league rows/);assert.equal(calls,3);});
test('schema failures are not retried or hidden',async()=>{let calls=0;await assert.rejects(withSourceRetry(async()=>{calls++;throw new Error('missing scoring columns');},{pauseMs:0}),/missing scoring columns/);assert.equal(calls,1);});
