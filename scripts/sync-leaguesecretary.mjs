import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const leagues = [{
  id:"148625", slug:"wednesday-fall-draft-league26", name:"Wednesday Fall Draft League-26",
  displayName:"Wednesday Scratch Draft League", bowlsOn:"Wednesday", startDate:"August 19, 2026",
  startTime:"9:30 PM", checkDay:"Thursday"
}];
const viewPaths = { standings:"league/standings", bowlers:"bowler/list", recaps:"league/recaps", lanes:"league/lane-assignments" };
const force = process.argv.includes("--force");
const chicago = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"long",hour:"numeric",hour12:false}).formatToParts(new Date()).map(p=>[p.type,p.value]));

function clean(value="") { return value.replace(/\s+/g," ").trim(); }
function validTable(table) { return table.headers.length>1 && table.rows.some(row=>row.filter(Boolean).length>1); }

const browser = await chromium.launch({headless:true});
let changed = false;
try {
  for (const league of leagues) {
    if (!force && (chicago.weekday!==league.checkDay || Number(chicago.hour)%2!==0)) continue;
    const file = path.join(process.cwd(),"public","data","leagues",`${league.id}.json`);
    const current = JSON.parse(await readFile(file,"utf8"));
    const views = {};
    let sourceUpdated = current.sourceUpdated;
    let week = current.week;
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    for (const [view,route] of Object.entries(viewPaths)) {
      const url=`https://www.leaguesecretary.com/bowling-centers/west-lanes/bowling-leagues/${league.slug}/${route}/${league.id}`;
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
      await page.waitForTimeout(6000);
      const text=clean(await page.locator("body").innerText());
      const updated=text.match(/Updated:\s*([^|]+?)(?:League Dashboard|Contact League Admin|$)/i)?.[1];
      if(updated) sourceUpdated=clean(updated);
      const weekMatch=text.match(/Week\s+(\d+)/i); if(weekMatch) week=weekMatch[1];
      const tables=await page.locator("table").evaluateAll((nodes)=>nodes.map((table,index)=>{
        const title=(table.closest("section,article,.card,.panel")?.querySelector("h1,h2,h3,h4,h5,.card-title")?.textContent||`Table ${index+1}`).replace(/\s+/g," ").trim();
        const all=[...table.querySelectorAll("tr")].map(tr=>[...tr.querySelectorAll("th,td")].map(cell=>(cell.textContent||"").replace(/\s+/g," ").trim()).filter(Boolean)).filter(row=>row.length);
        const first=all[0]||[]; const hasHeader=table.querySelector("thead")||table.querySelector("tr th");
        return {title,headers:hasHeader?first:first.map((_,i)=>`Column ${i+1}`),rows:hasHeader?all.slice(1):all};
      }));
      views[view]=tables.filter(validTable);
    }
    await page.close();
    const recordCount=Object.values(views).reduce((sum,tables)=>sum+tables.reduce((n,t)=>n+t.rows.length,0),0);
    if(recordCount===0) continue;
    const fingerprint=createHash("sha256").update(JSON.stringify({week,views})).digest("hex");
    if(fingerprint===current.fingerprint) continue;
    const next={...current,...league,sourceUpdated,syncedAt:new Date().toISOString(),status:"current",week,fingerprint,views};
    await writeFile(file,JSON.stringify(next,null,2)+"\n","utf8");
    changed=true;
    console.log(`Updated ${league.displayName}: ${recordCount} rows`);
  }
} finally { await browser.close(); }
if(!changed) console.log("No verified league update found.");
