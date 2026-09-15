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

test('publication rebases verified files onto a concurrently updated disposable checkout', async()=>{
 const fs=await import('node:fs/promises');const {execFileSync}=await import('node:child_process');const path=await import('node:path');
 const root=await fs.mkdtemp(path.resolve('../publication-test-'));
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe']});
 const remote=path.join(root,'remote.git'),local=path.join(root,'local'),other=path.join(root,'other');
 await fs.mkdir(local);git(root,'init','--bare',remote);git(local,'init','-b','main');git(local,'config','user.name','Test');git(local,'config','user.email','test@example.com');
 await fs.mkdir(path.join(local,'public/data/leagues'),{recursive:true});await fs.mkdir(path.join(local,'.github'));
 const old={id:'a',syncedAt:'2026-09-01'},fresh={id:'a',syncedAt:'2026-09-15'},newLeague={id:'b',syncedAt:null};
 const save=async(cwd,name,value)=>fs.writeFile(path.join(cwd,name),JSON.stringify(value));
 await save(local,'public/data/leagues/all.json',[old]);await save(local,'public/data/leagues/a.json',old);await save(local,'.github/refresh-history.json',[]);
 git(local,'add','.');git(local,'commit','-m','base');git(local,'remote','add','origin',remote);git(local,'push','-u','origin','main');
 git(root,'clone','-b','main',remote,other);git(other,'config','user.name','Test');git(other,'config','user.email','test@example.com');await save(other,'public/data/leagues/all.json',[old,newLeague]);git(other,'add','.');git(other,'commit','-m','directory discovery');git(other,'push');
 await save(local,'public/data/leagues/all.json',[fresh]);await save(local,'public/data/leagues/a.json',fresh);
 execFileSync(process.execPath,[path.resolve('scripts/reconcile-refresh.mjs')],{cwd:local,env:{...process.env,GITHUB_ACTIONS:'true'},stdio:['pipe','pipe','pipe']});
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(local,'public/data/leagues/all.json'))),[fresh,newLeague]);assert.deepEqual(JSON.parse(await fs.readFile(path.join(local,'public/data/leagues/a.json'))),fresh);
});
