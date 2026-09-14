import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateSourceView,selectRosterTable} from '../scripts/source-contract.mjs';
test('missing scoring columns stop an import even when rows are present',()=>{
 assert.throws(()=>validateSourceView('bowlers',[{headers:['Name','Average'],rows:[['Bowler','190']]}]),/missing columns Team#, Games, Avg/);
});
test('empty reports are allowed only when no prior report is required',()=>{
 validateSourceView('recaps',[]);
 assert.throws(()=>validateSourceView('recaps',[],{required:true}),/returned no rows/);
});
test('unrecognized recap team labels stop publication',()=>{
 assert.throws(()=>validateSourceView('recaps',[{headers:['Game 1','Game 2','Game 3'],rows:[['New team layout']]}]),/could not be matched/);
});

test('weekly team scoring tables cannot be mistaken for current rosters',()=>{const scores={headers:['Week','Date','Gm1','AVG'],rows:[['1','09/01','500','500']]};const roster={headers:['Pos','Name','Gms','AVG'],rows:[['1','Example, Bowler','3','190']]};assert.equal(selectRosterTable([scores,roster]),roster);assert.equal(selectRosterTable([scores]),undefined);});
