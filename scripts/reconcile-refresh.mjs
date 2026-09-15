import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const stamp=entry=>Date.parse(entry?.lastCheckedAt??entry?.syncedAt??'1970-01-01')||0;
export function mergeCatalog(base,local,upstream) {
 const before=new Map(base.map(entry=>[entry.id,entry]));
 const merged=new Map(upstream.map(entry=>[entry.id,entry]));
 for(const entry of local) if(JSON.stringify(entry)!==JSON.stringify(before.get(entry.id))) {
   const latest=merged.get(entry.id);
   if(!latest||stamp(entry)>=stamp(latest)) merged.set(entry.id,entry);
 }
 return [...merged.values()];
}
export function mergeRefreshHistory(local,upstream) {
 return [...new Map([...upstream,...local].map(entry=>[entry.startedAt+':'+(entry.scope??'all'),entry])).values()]
  .sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,250);
}
async function reconcile() {
 if(process.env.GITHUB_ACTIONS!=='true') throw new Error('Publication reconciliation runs only in the disposable GitHub Actions checkout.');
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const catalogPath='public/data/leagues/all.json',historyPath='.github/refresh-history.json';
 const tracked=git('diff','--name-only').split('\n').filter(Boolean);
 const allowed=name=>/^public\/data\/leagues\/[^/]+\.json$/.test(name)||name===historyPath;
 if(tracked.some(name=>!allowed(name))) throw new Error('Unexpected tracked changes; refusing to alter this checkout.');
 const newFiles=git('ls-files','--others','--exclude-standard','--','public/data/leagues').split('\n').filter(Boolean);
 if(newFiles.some(name=>!allowed(name))) throw new Error('Unexpected league file; refusing to reconcile.');
 const local=JSON.parse(await readFile(catalogPath,'utf8'));
 const base=JSON.parse(git('show','HEAD:'+catalogPath));
 const history=JSON.parse(await readFile(historyPath,'utf8'));
 const snapshots=new Map();
 for(const name of [...tracked,...newFiles].filter(name=>name!==catalogPath&&name!==historyPath)) snapshots.set(name,JSON.parse(await readFile(name,'utf8')));
 git('restore','--source=HEAD','--worktree','--staged','--','public/data/leagues',historyPath);
 for(const name of newFiles) await unlink(name);
 git('pull','--ff-only','origin','main');
 const upstream=JSON.parse(await readFile(catalogPath,'utf8'));
 const catalog=mergeCatalog(base,local,upstream);
 const catalogById=new Map(catalog.map(entry=>[entry.id,entry]));
 for(const [name,entry] of snapshots) if(stamp(entry)>=stamp(catalogById.get(entry.id))) await writeFile(name,JSON.stringify(entry,null,2)+'\n');
 await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
 await writeFile(historyPath,JSON.stringify(mergeRefreshHistory(history,JSON.parse(await readFile(historyPath,'utf8'))),null,2)+'\n');
 console.log('Reconciled verified refresh with the latest published catalog.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) await reconcile();
