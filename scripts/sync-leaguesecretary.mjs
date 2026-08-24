import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const seedLeagues = [
  {id:"132277",slug:"nationals-league-2627",name:"NATIONALS LEAGUE 26-27",displayName:"Nationals League 26-27",bowlsOn:"Monday",startDate:"August 17, 2026",startTime:"6:30 PM",bowlDay:1,type:"Handicap Adult Mixed"},
  {id:"111723",slug:"mike-canuso-open-classic-league-2627",name:"MIKE CANUSO OPEN CLASSIC LEAGUE 26-27",displayName:"Mike Canuso Open Classic League 26-27",bowlsOn:"Tuesday",startDate:"Fall 2026",startTime:"6:45 PM",bowlDay:2,type:"Handicap Adult Mixed"},
  {id:"96414",slug:"the-heartland-l-g-b-t-league-2627",name:"The HEARTLAND L G B T LEAGUE 26-27",displayName:"Heartland LGBT League 26-27",bowlsOn:"Tuesday",startDate:"Fall 2026",startTime:"7:00 PM",bowlDay:2,type:"Handicap Adult/Youth Mixed"},
  {id:"148625",slug:"wednesday-fall-draft-league26",name:"Wednesday Fall Draft League-26",displayName:"Wednesday Scratch Draft League",bowlsOn:"Wednesday",startDate:"August 19, 2026",startTime:"9:30 PM",bowlDay:3,type:"Scratch Adult Mixed"},
  {id:"148688",slug:"thirsty-thursday-20262027",name:"Thirsty Thursday 2026-2027",displayName:"Thirsty Thursday 2026-27",bowlsOn:"Thursday",startDate:"Fall 2026",startTime:"6:30 PM",bowlDay:4,type:"Handicap Adult Mixed"},
  {id:"112159",slug:"friday-senior-crazy-mixed-2627",name:"FRIDAY SENIOR CRAZY MIXED 26-27",displayName:"Friday Senior Crazy Mixed 26-27",bowlsOn:"Friday",startDate:"Fall 2026",startTime:"12:00 PM",bowlDay:5,type:"Handicap Adult Mixed"},
  {id:"64208",slug:"graphic-arts-bowling-league-2627",name:"GRAPHIC ARTS BOWLING LEAGUE 26-27",displayName:"Graphic Arts Bowling League 26-27",bowlsOn:"Friday",startDate:"Fall 2026",startTime:"6:30 PM",bowlDay:5,type:"Handicap Mens"}
];
const centerUrl="https://www.leaguesecretary.com/bowling-centers/west-lanes-bowl-omaha-nebraska/leagues/2110";
const knownById=new Map(seedLeagues.map(league=>[league.id,league]));
const viewPaths = { standings:"league/standings", bowlers:"bowler/list", recaps:"league/recaps", lanes:"league/lane-assignments" };
const force = process.argv.includes("--force");
const chicago = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"numeric",hour12:false}).formatToParts(new Date()).map(p=>[p.type,p.value]));
const dayIndex={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[chicago.weekday];

function dateKeyDaysAgo(days) {
  const noonUtc=new Date(Date.UTC(Number(chicago.year),Number(chicago.month)-1,Number(chicago.day)-days,12));
  return noonUtc.toISOString().slice(0,10);
}
function targetCycle(league) { return dateKeyDaysAgo((dayIndex-league.bowlDay+7)%7); }
function isWindowOpen(league,current) {
  return true;
}

function clean(value="") { return value.replace(/\s+/g," ").trim(); }
function cellValue(table,row,name) { return row[table.headers.findIndex(header=>header.toLowerCase()===name.toLowerCase())]??""; }
function slugify(value="") { return clean(value).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function displayName(value="") { return clean(value).replace(/\bL G B T\b/i,"LGBT"); }
function recentlyUpdated(value="") {
  const [month,day,year]=value.split("/").map(Number);
  if(!month||!day||!year) return false;
  return (Date.now()-Date.UTC(year,month-1,day))/864e5<=45;
}
async function discoverLeagues(browser) {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  try {
    await page.goto(centerUrl,{waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForTimeout(6000);
    const rows=await page.locator("table tbody tr").evaluateAll(nodes=>nodes.map(row=>[...row.querySelectorAll("td")].map(cell=>(cell.textContent||"").replace(/\s+/g," ").trim())).filter(row=>row.length>=7));
    const dayNumbers={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
    const discovered=rows.map(([id,name,season,bowlsOn,startTime,type,updated])=>({id,name:clean(name),displayName:displayName(name),slug:slugify(name),season,bowlsOn,startTime:clean(startTime).replace(/(AM|PM)$/i," $1"),type,updated,startDate:`${season} 2026`,bowlDay:dayNumbers[bowlsOn]})).filter(league=>knownById.has(league.id)||(league.season==="Fall"&&recentlyUpdated(league.updated)));
    return discovered.map(league=>({...league,...knownById.get(league.id),updated:league.updated,slug:knownById.get(league.id)?.slug??league.slug})).sort((a,b)=>a.bowlDay-b.bowlDay||a.startTime.localeCompare(b.startTime));
  } finally { await page.close(); }
}
function validTable(table) { return table.headers.length>1 && table.rows.some(row=>row.filter(Boolean).length>1); }
async function extractTables(page) {
  const tables=await page.locator("table").evaluateAll((nodes)=>nodes.map((table,index)=>{
    const title=(table.closest("section,article,.card,.panel")?.querySelector("h1,h2,h3,h4,h5,.card-title")?.textContent||`Table ${index+1}`).replace(/\s+/g," ").trim();
    const all=[...table.querySelectorAll("tr")].map(tr=>[...tr.querySelectorAll("th,td")].map(cell=>(cell.textContent||"").replace(/\s+/g," ").trim()).filter(Boolean)).filter(row=>row.length);
    const first=all[0]||[]; const hasHeader=table.querySelector("thead")||table.querySelector("tr th");
    return {title,headers:hasHeader?first:first.map((_,i)=>`Column ${i+1}`),rows:hasHeader?all.slice(1):all};
  }));
  return tables.filter(validTable);
}
async function expandAllGridRows(page) {
  const expanded=await page.locator(".k-grid").evaluateAll(nodes=>{
    let changed=false;
    for(const node of nodes){
      const grid=window.jQuery?.(node).data("kendoGrid");
      if(grid?.dataSource&&grid.dataSource.total()>grid.dataSource.pageSize()){
        grid.dataSource.pageSize(Math.max(1000,grid.dataSource.total()));
        changed=true;
      }
    }
    return changed;
  }).catch(()=>false);
  if(expanded) await page.waitForTimeout(1800);
}

const browser = await chromium.launch({headless:true});
const leagues=await discoverLeagues(browser);
console.log(`Discovered ${leagues.length} active West Lanes leagues.`);
const candidates=[];
for(const league of leagues){
  const file=path.join(process.cwd(),"public","data","leagues",`${league.id}.json`);
  let current;
  try{current=JSON.parse(await readFile(file,"utf8"));}catch{current={...league,sourceUpdated:"Not posted",syncedAt:null,status:"awaiting-results",week:null,fingerprint:null,lastCompletedCycle:null,views:{standings:[],bowlers:[],recaps:[],lanes:[]}};}
  if(isWindowOpen(league,current)) candidates.push({league,file,current});
}
if(candidates.length===0){await browser.close();console.log("No league is waiting for a new weekly update.");process.exit(0);}
let changed = false;
try {
  for (const {league,file,current} of candidates) {
    const views = {};
    let sourceUpdated = current.sourceUpdated;
    let week = current.week;
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    for (const [view,route] of Object.entries(viewPaths)) {
      const url=`https://www.leaguesecretary.com/bowling-centers/west-lanes/bowling-leagues/${league.slug}/${route}/${league.id}`;
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
      await page.waitForTimeout(6000);
      await expandAllGridRows(page);
      const text=clean(await page.locator("body").innerText());
      const updated=text.match(/Updated:\s*([^|]+?)(?:League Dashboard|Contact League Admin|$)/i)?.[1];
      if(updated) sourceUpdated=clean(updated);
      const weekMatch=text.match(/Week\s+(\d+)/i); if(weekMatch&&view!=="lanes") week=weekMatch[1];
      if(view==="recaps") {
        const collected=[];
        const teamCombo=page.getByRole("combobox").nth(1);
        try {
          await teamCombo.click();
          const labels=[...new Set((await page.getByRole("option").allTextContents()).map(clean).filter(label=>/^Team\s+\d+$/i.test(label)))].sort((a,b)=>Number(a.match(/\d+/)?.[0])-Number(b.match(/\d+/)?.[0]));
          await page.keyboard.press("Escape");
          for(const label of labels) {
            await page.locator("#ddTeam").evaluate((element,target)=>{
              const widget=window.jQuery(element).data("kendoDropDownList");
              const textField=widget.options.dataTextField;
              const valueField=widget.options.dataValueField;
              const item=widget.dataSource.data().find(entry=>String(entry[textField])===target);
              if(!item) throw new Error(`Team selector is missing ${target}`);
              widget.value(item[valueField]);
              widget.trigger("change");
            },label);
            await page.waitForTimeout(1800);
            const matchup=await extractTables(page);
            if(matchup[0]) collected.push({...matchup[0],title:`${label} matchup`});
          }
        } catch(error) {
          console.warn(`Could not enumerate every recap for ${league.displayName}: ${error.message}`);
        }
        views[view]=collected.length?collected:await extractTables(page);
      } else views[view]=await extractTables(page);
    }
    await page.close();
    for(const view of Object.keys(viewPaths)) {
      const nextRows=(views[view]??[]).reduce((sum,table)=>sum+table.rows.length,0);
      const previousRows=(current.views?.[view]??[]).reduce((sum,table)=>sum+table.rows.length,0);
      if(nextRows===0&&previousRows>0) {
        console.warn(`Retaining prior ${view} for ${league.displayName}; LeagueSecretary returned no rows.`);
        views[view]=current.views[view];
      }
    }
    const incomingBowlerTable=views.bowlers?.[0];
    const previousBowlerTable=current.views?.bowlers?.[0];
    const usableTeamAssignments=incomingBowlerTable?.rows.some(row=>cellValue(incomingBowlerTable,row,"Team#")!=="0");
    const priorTeamAssignments=previousBowlerTable?.rows.some(row=>cellValue(previousBowlerTable,row,"Team#")!=="0");
    if(!usableTeamAssignments&&priorTeamAssignments) {
      console.warn(`Retaining prior bowlers for ${league.displayName}; LeagueSecretary omitted team assignments.`);
      views.bowlers=current.views.bowlers;
    }
    const recordCount=Object.values(views).reduce((sum,tables)=>sum+tables.reduce((n,t)=>n+t.rows.length,0),0);
    if(recordCount===0) continue;
    const fingerprint=createHash("sha256").update(JSON.stringify({week,views})).digest("hex");
    const standingsTeams=new Set((views.standings??[]).flatMap(table=>{
      const teamIndex=table.headers.findIndex(h=>h.toLowerCase()==="team#");
      return teamIndex<0?[]:table.rows.map(row=>row[teamIndex]).filter(Boolean);
    }));
    const recapTeams=new Set((views.recaps??[]).flatMap(table=>table.rows.map(row=>row[0]?.match(/^Team\s+(\d+)$/i)?.[1]).filter(Boolean)));
    const allTeamsRecapped=standingsTeams.size>0&&[...standingsTeams].every(team=>recapTeams.has(team));
    const bowlersScored=(views.bowlers??[]).some(table=>{const games=table.headers.findIndex(h=>h.toLowerCase()==="games");return games>=0&&table.rows.some(row=>Number(row[games])>0)});
    const complete=allTeamsRecapped&&bowlersScored;
    const cycle=targetCycle(league);
    const lastCompletedCycle=complete?cycle:(current.lastCompletedCycle??null);
    if(fingerprint===current.fingerprint&&lastCompletedCycle===current.lastCompletedCycle) continue;
    const next={...current,...league,sourceUpdated,syncedAt:new Date().toISOString(),status:complete?"current":"awaiting-results",week,fingerprint,lastCompletedCycle,views};
    await writeFile(file,JSON.stringify(next,null,2)+"\n","utf8");
    changed=true;
    console.log(`${complete?"Completed":"Refreshed"} ${league.displayName}: ${recordCount} rows`);
  }
  const catalog=[];
  for(const league of leagues) {
    try { catalog.push(JSON.parse(await readFile(path.join(process.cwd(),"public","data","leagues",`${league.id}.json`),"utf8"))); }
    catch { catalog.push({...league,sourceUpdated:league.updated||"Not posted",syncedAt:null,status:"awaiting-results",week:null,fingerprint:null,lastCompletedCycle:null,views:{standings:[],bowlers:[],recaps:[],lanes:[]}}); }
  }
  const catalogFile=path.join(process.cwd(),"public","data","leagues","all.json");
  const catalogText=JSON.stringify(catalog,null,2)+"\n";
  let existingCatalog="";
  try { existingCatalog=await readFile(catalogFile,"utf8"); } catch {}
  if(catalogText!==existingCatalog) { await writeFile(catalogFile,catalogText,"utf8"); changed=true; }
} finally { await browser.close(); }
if(!changed) console.log("No verified league update found.");
