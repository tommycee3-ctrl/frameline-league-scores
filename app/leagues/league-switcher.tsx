"use client";

import { ReactNode, useState } from "react";
import nationalsData from "../../public/data/leagues/132277.json";
import canuso from "../../public/data/leagues/111723.json";
import heartland from "../../public/data/leagues/96414.json";
import wednesday from "../../public/data/leagues/148625.json";
import thirsty from "../../public/data/leagues/148688.json";
import seniors from "../../public/data/leagues/112159.json";
import graphicArts from "../../public/data/leagues/64208.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

const snapshots = [
  nationalsData,
  canuso,
  heartland,
  wednesday,
  thirsty,
  seniors,
  graphicArts,
] as LeagueSnapshot[];

export function LeagueSwitcher({nationals}:{nationals:ReactNode}) {
  const [leagueId,setLeagueId]=useState("132277");
  const selected=snapshots.find(item=>item.id===leagueId)??snapshots[1];
  const hasResults=Object.values(selected.views).some(tables=>tables.some(table=>table.rows.length));
  const week=selected.week?`Week ${selected.week}`:"Awaiting Week 1";
  const schedule=`${selected.bowlsOn} · ${selected.startTime} · ${selected.startDate}.`;

  return <div id="league-center">
    <section className="section league-picker">
      <p className="eyebrow red">Choose a league</p>
      <div>{snapshots.map(item=><button key={item.id} className={leagueId===item.id?"active":""} onClick={()=>setLeagueId(item.id)}>
        <small>{item.bowlsOn?.toUpperCase()} · {item.startTime}</small>
        <strong>{item.displayName}</strong>
      </button>)}</div>
    </section>
    <section className="section nationals-overview league-identity">
      <div className="nationals-title"><p className="eyebrow red">League ID {selected.id}</p><h2>{selected.displayName}</h2><p>{schedule}</p></div>
      <div className="league-facts"><article><small>Current week</small><strong>{week}</strong></article><article><small>Last updated</small><strong>{selected.sourceUpdated||"Awaiting first update"}</strong></article></div>
    </section>
    {leagueId==="132277"?nationals:hasResults?<SyncedLeagueDashboard data={selected}/>:<section className="section league-hub awaiting-league"><p className="eyebrow red">Results coming soon</p><h2>Week 1 has not been posted yet.</h2><p>This league is active and will fill in automatically after its first official upload.</p></section>}
  </div>;
}
