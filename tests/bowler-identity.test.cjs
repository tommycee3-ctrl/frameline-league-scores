const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('app/bowler-identity-tables.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exportsObject={};new Function('exports',code)(exportsObject);const {bowlerIdentityTables}=exportsObject;
test('team rosters remain searchable without a bowler list and keep their team assignment',()=>{
 const tables=bowlerIdentityTables({views:{bowlers:[],rosters:[{team:'7',headers:['Name','Gms','Avg'],rows:[['Example, Alex','0','']] }],lanes:[{headers:['Lane','Team#','Team'],rows:[['1','7','Example Team']]}]}});
 assert.equal(tables.length,1);assert.deepEqual(tables[0].headers,['Name','Games','Avg','Team#']);assert.deepEqual(tables[0].rows,[['Example, Alex','0','','7']]);
});
test('explicit lane-assignment bowler names are searchable without matching team names',()=>{
 const tables=bowlerIdentityTables({views:{lanes:[{headers:['Lane','Team#','Bowler Name'],rows:[['2','3','Alex Example']]}]}});
 assert.equal(tables[0].headers[2],'Name');assert.equal(tables[0].rows[0][2],'Alex Example');
});

test('lookup finds a roster-only league and resolves its team through lane assignments',()=>{
 const catalog=[{id:'new',displayName:'New league',centerName:'Maplewood Lanes',views:{bowlers:[],standings:[],rosters:[{team:'7',headers:['Name','Gms','Avg'],rows:[['Example, Alex','0','']]}],lanes:[{headers:['Lane','Team#','Team'],rows:[['2','7','Spare Team']]}]}}];
 const compiled=ts.transpileModule(fs.readFileSync('app/bowler-lookup.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const lookup={};new Function('exports','require',compiled)(lookup,name=>name.includes('identity')?exportsObject:{default:catalog});
 const matches=lookup.findBowlers('Alex Example');assert.equal(matches.length,1);assert.equal(matches[0].leagues[0].id,'new');assert.deepEqual(matches[0].leagues[0].teams,['Spare Team']);assert.equal(matches[0].leagues[0].average,'\u2014');
});


test('all Double Trouble roster names can be discovered including names missing from its bowler list',()=>{
 const league=require('../public/data/leagues/all.json').find(item=>item.id==='50719');
 const compiled=ts.transpileModule(fs.readFileSync('app/bowler-lookup.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const lookup={};new Function('exports','require',compiled)(lookup,name=>name.includes('identity')?exportsObject:{default:[league]});
 const names=league.views.rosters.flatMap(table=>table.rows.map(row=>row[table.headers.findIndex(h=>h.toLowerCase()==='name')]));
 assert.ok(names.length>0);
 for(const name of names) assert.ok(lookup.findBowlers(name).some(match=>match.leagues.some(item=>item.id==='50719')),name+' should match Double Trouble');
});
