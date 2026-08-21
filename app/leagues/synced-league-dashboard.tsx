"use client";

import { useMemo, useState } from "react";

export type Table={title:string;headers:string[];rows:string[][]};
export type LeagueSnapshot={id:string;displayName:string;startDate:string;startTime:string;sourceUpdated:string;week:string|null;views:Record<string,Table[]>};
const cell=(table:Table,row:string[],name:string)=>row[table.headers.findIndex(h=>h.toLowerCase()===name.toLowerCase())]??"";
const personName=(name:string)=>name.includes(",")?name.split(",").map(x=>x.trim()).reverse().join(" "):name;
const score=(row:string[],game:number)=>Number(row[3+game]??0);
const series=(row:string[])=>Number(row.at(-1)??0);
const resultClass=(left:number,right:number)=>left>right?"winner-score":left<right?"loser-score":"tie-score";
const individualPoints=(bowler:string[],opponent:string[])=>[0,1,2].reduce((points,game)=>points+(score(bowler,game)>score(opponent,game)?1:score(bowler,game)===score(opponent,game)?0.5:0),0)+(series(bowler)>series(opponent)?1:series(bowler)===series(opponent)?0.5:0);
const teamResult=(team:string[],opponent:string[],game:number)=>{const left=game<3?Number(team[1+game]??0):Number(team.at(-1)??0),right=game<3?Number(opponent[1+game]??0):Number(opponent.at(-1)??0);return {left,right,points:left>right?2:left===right?1:0};};

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
  const recapMatchups=useMemo(()=>{
    return (data.views.recaps??[]).map(table=>{
      const teams:Array<{team:string;lane:string;points:string;rows:string[][];total:string[]}>=[];
      let active:(typeof teams)[number]|null=null;
      for(const row of table.rows){const m=row[0]?.match(/^Team\s+(\d+)$/i);if(m){const detail=row.slice(1).join(" ");active={team:m[1],lane:detail.match(/Lane\s+\d+/i)?.[0]??"",points:detail.match(/points won:\s*([\d.]+)/i)?.[1]??"",rows:[],total:[]};teams.push(active);}else if(active&&row[0]?.toLowerCase()==="total")active.total=row;else if(active)active.rows.push(row);}
      return teams;
    }).filter(matchup=>matchup.length);
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
      {tab==="bowlers"&&bowlerTable&&<div className="bowler-results"><div className="result-head"><span>Bowler</span><span>Games</span><span>Series</span><span>Avg</span><span>Pts</span></div>{bowlerTable.rows.filter(row=>!q||row.join(" ").toLowerCase().includes(q)).sort((a,b)=>Number(cell(bowlerTable,b,"HSS"))-Number(cell(bowlerTable,a,"HSS"))).map((row,index)=>{const team=cell(bowlerTable,row,"Team#"),name=personName(cell(bowlerTable,row,"Name"));const scoreRow=recapByTeam[team]?.rows.find(r=>personName(r[0])===name);const games=scoreRow?.slice(3,6).filter(Boolean)??[];return <div className="bowler-row" key={`${team}-${name}-${index}`}><span><strong>{name}</strong><small>Team {team}</small></span><span>{games.length?games.join(" · "):"Scores pending recap"}</span><b>{scoreRow?.at(-1)||cell(bowlerTable,row,"HSS")}</b><span>{cell(bowlerTable,row,"Avg")}</span><span>{cell(bowlerTable,row,"WON")}</span></div>;})}</div>}
      {tab==="recaps"&&<div className="weekly-recaps"><div className="recap-heading"><div><p className="eyebrow red">Week {week}</p><h3>Full matchup recaps</h3></div><p><b className="recap-key-win">Green = win</b> · <b className="recap-key-loss">Red = loss</b>. Individual and team points are shown separately.</p></div>{recapMatchups.filter(matchup=>!q||matchup.some(team=>(`Team ${team.team} `+team.rows.flat().join(" ")).toLowerCase().includes(q))).map((matchup,index)=><article className="full-recap" key={index}><header><span><small>{matchup[0]?.lane}</small><strong>Team {matchup[0]?.team}</strong><b>{matchup[0]?.points} official pts</b></span><em>vs</em><span><small>{matchup[1]?.lane}</small><strong>Team {matchup[1]?.team}</strong><b>{matchup[1]?.points} official pts</b></span></header><div className="recap-scroll">{matchup.map((team,teamIndex)=>{const opponent=matchup[teamIndex===0?1:0];return <table key={team.team}><thead><tr><th>Bowler</th><th>Avg</th><th>HDCP</th><th>Game 1</th><th>Game 2</th><th>Game 3</th><th>Series</th><th>Individual pts</th></tr></thead><tbody>{team.rows.map((row,r)=>{const versus=opponent?.rows[r]??[];return <tr key={r}><td><b>{personName(row[0])}</b></td><td>{row[1]}</td><td>{row[2]}</td>{[0,1,2].map(game=><td key={game} className={resultClass(score(row,game),score(versus,game))}>{row[3+game]}</td>)}<td className={resultClass(series(row),series(versus))}><b>{row.at(-1)}</b></td><td className="individual-points"><b>{individualPoints(row,versus)}</b><small>of 4</small></td></tr>})}{team.total.length>0&&opponent?.total.length>0&&<tr className="recap-total"><td>Team total</td><td></td><td></td>{[0,1,2].map(game=>{const result=teamResult(team.total,opponent.total,game);return <td key={game} className={resultClass(result.left,result.right)}>{result.left}<small>{result.points} team pts</small></td>})}{(()=>{const result=teamResult(team.total,opponent.total,3);return <td className={resultClass(result.left,result.right)}><b>{result.left}</b><small>{result.points} team pts</small></td>})()}<td className="team-points-cell"><b>{[0,1,2,3].reduce((sum,game)=>sum+teamResult(team.total,opponent.total,game).points,0)}</b><small>team pts</small></td></tr>}</tbody></table>})}</div></article>)}</div>}
      {tab==="lanes"&&(data.views.lanes??[]).map((table,index)=><article className="synced-table" key={`lanes-${index}`}><h3>{table.title||labels.lanes}</h3><div className="recap-scroll"><table><thead><tr>{table.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{table.rows.filter(row=>!q||row.join(" ").toLowerCase().includes(q)).map((row,r)=><tr key={r}>{row.map((v,c)=><td key={c}>{v}</td>)}</tr>)}</tbody></table></div></article>)}
    </section>
  </>;
}
