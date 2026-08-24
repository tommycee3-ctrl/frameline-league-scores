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
const viewPaths = { standings:"league/standings", bowlers:"bowler/list", recaps:"league/recaps", lanes:"league/lane-assignments", rosters:"team/list" };
const force = process.argv.includes("--force");
const requestedLeague=process.argv.find(argument=>argument.startsWith("--league="))?.split("=")[1];
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
function normalizeRecap(table,standings) {
  if(!table||!standings) return table;
  const teamNumberByName=new Map(standings.rows.map(row=>[
    clean(cellValue(standings,row,"Team")).toLowerCase(),
    cellValue(standings,row,"Team#")
  ]).filter(([name,number])=>name&&number));
  return {...table,rows:table.rows.map(row=>{
    if(!/^Lane\s+\d+/i.test(row[1]??"")) return row;
    const teamNumber=teamNumberByName.get(clean(row[0]).toLowerCase());
    return teamNumber?[`Team ${teamNumber}`,...row.slice(1)]:row;
  })};
}
function rosterIdentity(name="") {
  const suffix=/\b(111|11|1v|jr|sr|ii|iii|iv|2nd|3rd)\b/gi;
  const [family="",given=""]=clean(name).split(",").map(clean);
  return clean(`${given.replace(suffix,"")} ${family.replace(suffix,"")}`).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function romanSuffix(name="") {
  const suffix=name.match(/\b(111|11|1v|iii|ii|iv)\b/i)?.[1]?.toLowerCase();
  return suffix==="111"||suffix==="iii"?"III":suffix==="11"||suffix==="ii"?"II":suffix==="1v"||suffix==="iv"?"IV":"";
}
function withRomanSuffix(name,suffix) {
  if(!suffix) return name;
  const suffixPattern=/\b(111|11|1v|jr|sr|ii|iii|iv|2nd|3rd)\b/gi;
  const [family="",given=""]=clean(name).split(",").map(clean);
  return `${family.replace(suffixPattern,"").trim()}, ${given.replace(suffixPattern,"").trim()} ${suffix}`.trim();
}
function currentRoster(table) {
  if(!table) return table;
  const nameIndex=table.headers.findIndex(header=>header.toLowerCase()==="name");
  const gamesIndex=table.headers.findIndex(header=>header.toLowerCase()==="gms");
  if(nameIndex<0) return table;
  const groups=new Map();
  for(const row of table.rows) {
    const name=row[nameIndex]??"";
    if(!name||/vacant/i.test(name)) continue;
    const identity=rosterIdentity(name);
    if(!groups.has(identity)) groups.set(identity,[]);
    groups.get(identity).push(row);
  }
  const people=[];
  for(const rows of groups.values()) {
    const selected=[...rows].sort((left,right)=>Number(right[gamesIndex]??0)-Number(left[gamesIndex]??0))[0];
    const suffix=rows.map(row=>romanSuffix(row[nameIndex])).find(Boolean)||romanSuffix(selected[nameIndex]);
    const normalized=[...selected];
    normalized[nameIndex]=withRomanSuffix(selected[nameIndex],suffix);
    people.push(normalized);
  }
  return {...table,rows:people};
}

const browser = await chromium.launch({headless:true});
const discoveredLeagues=await discoverLeagues(browser);
const leagues=requestedLeague?discoveredLeagues.filter(league=>league.id===requestedLeague):discoveredLeagues;
console.log(`Discovered ${leagues.length} active West Lanes leagues.`);
const candidates=[];
for(const league of leagues){
  const file=path.join(process.cwd(),"public","data","leagues",`${league.id}.json`);
  let current;
  try{current=JSON.parse(await readFile(file,"utf8"));}catch{current={...league,sourceUpdated:"Not posted",syncedAt:null,status:"awaiting-results",week:null,fingerprint:null,lastCompletedCycle:null,views:{standings:[],bowlers:[],recaps:[],lanes:[],rosters:[]}};}
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
      if(view==="rosters") {
        const teamPages=await page.evaluate(()=>{
          const grid=window.jQuery?.(".grid_main").data("kendoGrid");
          const main=window.jQuery?.(".div-main-grid");
          const prefix=window.jQuery?.(".league-header").data("urlprefix");
          if(!grid||!main||!prefix) return [];
          const leagueId=main.data("league"),year=main.data("year"),season=main.data("season");
          return grid.dataSource.data().map(team=>({
            team:String(team.TeamNum??""),
            name:String(team.TeamName??""),
            url:`${prefix}/team/history/${leagueId}/${year}/${season}/${team.TeamID}`
          })).filter(team=>team.team&&team.url);
        }).catch(()=>[]);
        const rosters=[];
        for(const team of teamPages) {
          await page.goto(new URL(team.url,"https://www.leaguesecretary.com").toString(),{waitUntil:"domcontentloaded",timeout:90000});
          await page.locator("table tbody tr").first().waitFor({state:"visible",timeout:15000}).catch(()=>{});
          await page.waitForTimeout(1800);
          const tables=await extractTables(page);
          if(tables[0]) rosters.push({...currentRoster(tables[0]),team:team.team,title:`Team ${team.team} · ${team.name} roster`});
          else console.warn(`Roster page returned no current bowlers for ${league.displayName} team ${team.team}.`);
        }
        views[view]=rosters;
      } else if(view==="recaps") {
        const collected=new Map();
        try {
          const options=await page.locator("#ddTeam").evaluate(element=>{
            const widget=window.jQuery(element).data("kendoDropDownList");
            const textField=widget.options.dataTextField;
            const valueField=widget.options.dataValueField;
            return widget.dataSource.data().map(entry=>({
              label:String(entry[textField]??"").replace(/\s+/g," ").trim(),
              value:String(entry[valueField]??"")
            })).filter(option=>option.label&&option.value);
          });
          const uniqueOptions=[...new Map(options.map(option=>[option.value,option])).values()];
          for(const option of uniqueOptions) {
            await page.locator("#ddTeam").evaluate((element,target)=>{
              const widget=window.jQuery(element).data("kendoDropDownList");
              widget.value(target);
              widget.trigger("change");
            },option.value);
            await page.waitForTimeout(1800);
            const matchup=await extractTables(page);
            if(matchup[0]) {
              const normalized=normalizeRecap(matchup[0],views.standings?.[0]);
              const teams=normalized.rows.map(row=>row[0]?.match(/^Team\s+(\d+)$/i)?.[1]).filter(Boolean).sort((a,b)=>Number(a)-Number(b));
              const signature=teams.join("-")||option.value;
              collected.set(signature,{...normalized,title:`${option.label} matchup`});
            }
          }
        } catch(error) {
          console.warn(`Could not enumerate every recap for ${league.displayName}: ${error.message}`);
        }
        if(collected.size) views[view]=[...collected.values()];
        else views[view]=(await extractTables(page)).map(table=>normalizeRecap(table,views.standings?.[0]));
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
  for(const league of discoveredLeagues) {
    try { catalog.push(JSON.parse(await readFile(path.join(process.cwd(),"public","data","leagues",`${league.id}.json`),"utf8"))); }
    catch { catalog.push({...league,sourceUpdated:league.updated||"Not posted",syncedAt:null,status:"awaiting-results",week:null,fingerprint:null,lastCompletedCycle:null,views:{standings:[],bowlers:[],recaps:[],lanes:[],rosters:[]}}); }
  }
  const catalogFile=path.join(process.cwd(),"public","data","leagues","all.json");
  const catalogText=JSON.stringify(catalog,null,2)+"\n";
  let existingCatalog="";
  try { existingCatalog=await readFile(catalogFile,"utf8"); } catch {}
  if(catalogText!==existingCatalog) { await writeFile(catalogFile,catalogText,"utf8"); changed=true; }
} finally { await browser.close(); }
if(!changed) console.log("No verified league update found.");
