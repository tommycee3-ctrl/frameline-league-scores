export async function runImportQueue(candidates, importLeague, {concurrency=1,deadline=Infinity,now=Date.now}={}) {
  for(let offset=0;offset<candidates.length;offset+=concurrency) {
    if(now()>=deadline) return candidates.slice(offset);
    await Promise.all(candidates.slice(offset,offset+concurrency).map(importLeague));
  }
  return [];
}
