"use client";

import { useMemo, useState } from "react";

export type Table={title:string;headers:string[];rows:string[][]};
export type LeagueSnapshot={id:string;displayName:string;startDate:string;startTime:string;sourceUpdated:string;week:string|null;views:Record<string,Table[]>};
const cell=(table:Table,row:string[],name:string)=>row[table.headers.findIndex(h=>h.toLowerCase()===name.toLowerCase())]??"";
const personName=(name:string)=>name.includes(",")?name.split(",").map(x=>x.trim()).reverse().join(" "):name;

export function SyncedLeagueDashboard({data}:{data:LeagueSnapshot}){
  const tabs=["standings","bowlers","recaps","lanes"] as const;
  const labels={standings:"League Standings",bowlers:"Bowlers",recaps:"Weekly Recaps",lanes:"Lane Assignments"};
  const [tab,setTab]=useState<(typeof tabs)[number]>("standings");
  const [query,setQuery]=useState("");
  const [openTeam,setOpenTeam]=useState<string|null>(null);
  const standings=data.views.standings?.[0];
  const bowlerTable=data.views.bowlers?.[0];
  const bowlersByTeam=useMemo(()=>{
    const result:Record<string,string[][]>={};
    for(const row of bowlerTable?.rows??[]){const team=cell(bowlerTable,row,"Team#");(result[team]??=[]).push(row);}
    return result;
  },[bowlerTable]);
  const recapByTeam=useMemo(()=>{
    const result:Record<string,{lane:string;points:string;rows:string[][]}>={};
    for(const table of data.views.recaps??[]){let current="";for(const row of table.rows){const m=row[0]?.match(/^Team\s+(\d+)$/i);if(m){current=m[1];const detail=row.slice(1).join(" ");result[current]={lane:detail.match(/Lane\s+\d+/i)?.[0]??"",points:detail.match(/points won:\s*([\d.]+)/i)?.[1]??"",rows:[]};}else if(current&&row[0]?.toLowerCase()!=="total")result[current].rows.push(row);}}
    return result;
  },[data]);
  const q=query.trim().toLowerCase();
  const week=data.week??"1";
  return <>
    <section className="section nationals-overview"><div className="nationals-title"><p className="eyebrow red">League ID {data.id}</p><h2>{data.displayName}</h2><p>Wednesday nights · {data.startTime} · Started {data.startDate}.</p></div><div className="league-facts"><article><small>Status</small><strong>Week {week}</strong></article><article><small>Last league update</small><strong>{data.sourceUpdated}</strong></article></div></section>
    <section className="section league-hub" id="league-dashboard">
      <div className="section-heading"><div><p className="eyebrow red">Week {week}</p><h2>{data.displayName}</h2></div><p>Latest posted league results</p></div>
      <div className="league-hub-tabs">{tabs.map(id=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setQuery("");}}>{labels[id]}</button>)}</div>
      <div className="league-tools team-search"><label><span>Search {labels[tab].toLowerCase()}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Team or bowler name"/></label></div>
      {tab==="standings"&&standings&&<div className="standing-list synced-standing-list">{standings.rows.filter(row=>{const team=cell(standings,row,"Team#");const names=(bowlersByTeam[team]??[]).map(r=>cell(bowlerTable!,r,"Name")).join(" ");return !q||row.join(" ").toLowerCase().includes(q)||names.toLowerCase().includes(q);}).map(row=>{
        const team=cell(standings,row,"Team#"),name=cell(standings,row,"Team")||`Team ${team}`,roster=bowlersByTeam[team]??[],recap=recapByTeam[team],expanded=openTeam===team;
        return <article className={`standing-team-block ${expanded?"expanded":""}`} key={team}>
          <button className="standing-direct-row standing-grid" onClick={()=>setOpenTeam(expanded?null:team)} aria-expanded={expanded}><strong>{cell(standings,row,"Place")}</strong><span><b>{name}</b><small>Team {team}</small></span><span>{cell(standings,row,"Won")}<small>Won</small></span><span>{cell(standings,row,"Lost")}<small>Lost</small></span><span>{cell(standings,row,"% Won")}<small>Win %</small></span><span>{cell(standings,row,"Pins")}<small>Pins</small></span><b>{expanded?"−":"+"}</b></button>
          {expanded&&<div className="standing-scorecard"><div className="scorecard-summary"><span><small>Lane</small><strong>{recap?.lane||"Assignment posted"}</strong></span><span><small>Team points won</small><strong>{recap?.points||cell(standings,row,"Won")}</strong></span></div><div className="team-roster">{(recap?.rows.length?recap.rows:roster).map((person,index)=>{const fromRecap=!!recap?.rows.length;const n=personName(fromRecap?person[0]:cell(bowlerTable!,person,"Name"));const games=fromRecap?person.slice(3,6).filter(Boolean).join(" · "):"Game scores pending full recap";const series=fromRecap?person.at(-1):cell(bowlerTable!,person,"HSS")||cell(bowlerTable!,person,"Pins");const source=roster.find(r=>personName(cell(bowlerTable!,r,"Name"))===n);return <div className="roster-score-row" key={`${n}-${index}`}><span><b>{n}</b><small>{games}</small></span><span><small>Series</small><strong>{series||"—"}</strong></span><span><small>Week pts</small><strong className="week-points">{source?cell(bowlerTable!,source,"WON"):"—"}</strong></span></div>;})}{!roster.length&&!recap?.rows.length&&<p>Roster details are awaiting the next sync.</p>}</div></div>}
        </article>;})}</div>}
      {tab!=="standings"&&(data.views[tab]??[]).map((table,index)=><article className="synced-table" key={`${tab}-${index}`}><h3>{table.title||labels[tab]}</h3><div className="recap-scroll"><table><thead><tr>{table.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{table.rows.filter(row=>!q||row.join(" ").toLowerCase().includes(q)).map((row,r)=><tr key={r}>{row.map((v,c)=><td key={c}>{v}</td>)}</tr>)}</tbody></table></div></article>)}
    </section>
  </>;
}
