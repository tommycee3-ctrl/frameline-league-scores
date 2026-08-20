"use client";

import { ReactNode, useMemo, useState } from "react";
import wednesday from "../../public/data/leagues/148625.json";

type Table = { title:string; headers:string[]; rows:string[][] };
type LeagueSnapshot = { id:string; name:string; displayName:string; bowlsOn:string; startDate:string; startTime:string; sourceUpdated:string; syncedAt:string|null; status:string; week:string|null; fingerprint:string|null; views:Record<string,Table[]> };

function SyncedLeague({data}:{data:LeagueSnapshot}) {
  const tabs = ["standings","bowlers","recaps","lanes"] as const;
  const labels = {standings:"League Standings",bowlers:"Bowlers",recaps:"Weekly Recaps",lanes:"Lane Assignments"};
  const [tab,setTab]=useState<(typeof tabs)[number]>("standings");
  const [query,setQuery]=useState("");
  const tables=useMemo(()=>data.views[tab]??[],[data,tab]);
  const filtered=useMemo(()=>tables.map(table=>({...table,rows:table.rows.filter(row=>row.join(" ").toLowerCase().includes(query.toLowerCase()))})).filter(table=>table.rows.length),[tables,query]);
  const hasPostedData=Object.values(data.views).some(view=>view.some(table=>table.rows.length));
  const hasScores=(data.views.recaps??[]).some(table=>table.rows.length>0)||(data.views.bowlers??[]).some(table=>{const games=table.headers.findIndex(h=>h.toLowerCase()==="games");return games>=0&&table.rows.some(row=>Number(row[games])>0)});
  return <>
    <section className="section nationals-overview">
      <div className="nationals-title"><p className="eyebrow red">League ID {data.id}</p><h2>{data.displayName}</h2><p>{data.bowlsOn} nights · {data.startTime} · Started {data.startDate}.</p></div>
      <div className="league-facts"><article><small>Status</small><strong>{hasScores?`Week ${data.week??"posted"}`:hasPostedData?"Roster posted":"Awaiting Week 1"}</strong></article><article><small>Source update</small><strong>{data.sourceUpdated}</strong></article><article><small>Automatic check</small><strong>Every 6 hours</strong></article></div>
    </section>
    <section className="section league-hub" id="league-dashboard">
      <div className="section-heading"><div><p className="eyebrow red">{hasScores?`Week ${data.week??"results"}`:"Season setup"}</p><h2>{data.displayName}</h2></div><p>{hasScores?"Latest verified league results":"Results will appear automatically after LeagueSecretary posts them."}</p></div>
      <div className="league-hub-tabs" role="tablist" aria-label="League views">{tabs.map(id=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{labels[id]}</button>)}</div>
      <div className="league-tools team-search"><label><span>Search {labels[tab].toLowerCase()}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Team or bowler name"/></label></div>
      {!hasScores&&<div className="league-awaiting"><span>WED</span><div><h3>{hasPostedData?"Teams and bowlers are posted":"Wednesday Scratch Draft League is ready"}</h3><p>The first score check begins Thursday at midnight Central. It will retry every six hours until LeagueSecretary posts a verified change.</p></div></div>}
      {filtered.map((table,index)=><article className="synced-table" key={`${table.title}-${index}`}><h3>{table.title||labels[tab]}</h3><div className="recap-scroll"><table><thead><tr>{table.headers.map((h,i)=><th key={`${h}-${i}`}>{h}</th>)}</tr></thead><tbody>{table.rows.map((row,rowIndex)=><tr key={`${rowIndex}-${row.join("-")}`} className="clickable-source-row">{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></article>)}
    </section>
  </>;
}

export function LeagueSwitcher({nationals}:{nationals:ReactNode}) {
  const [league,setLeague]=useState<"132277"|"148625">("132277");
  return <div id="league-center"><section className="section league-picker"><p className="eyebrow red">Choose a league</p><div><button className={league==="132277"?"active":""} onClick={()=>setLeague("132277")}><small>MONDAY · 6:30 PM</small><strong>Nationals League 26–27</strong></button><button className={league==="148625"?"active":""} onClick={()=>setLeague("148625")}><small>WEDNESDAY · 9:30 PM</small><strong>Wednesday Scratch Draft League</strong></button></div></section>{league==="132277"?nationals:<SyncedLeague data={wednesday as LeagueSnapshot}/>}</div>;
}
