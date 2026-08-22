"use client";

import { ReactNode, useState } from "react";
import wednesday from "../../public/data/leagues/148625.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

export function LeagueSwitcher({nationals}:{nationals:ReactNode}) {
  const [league,setLeague]=useState<"132277"|"148625">("132277");
  const info=league==="132277"
    ? {id:"132277",name:"Nationals League 26–27",schedule:"Monday nights · 6:30 PM · Started August 17, 2026.",week:"Week 1",updated:"08/18/2026"}
    : {id:"148625",name:wednesday.displayName,schedule:`Wednesday nights · ${wednesday.startTime} · Started ${wednesday.startDate}.`,week:`Week ${wednesday.week??1}`,updated:wednesday.sourceUpdated};
  return <div id="league-center">
    <section className="section league-picker"><p className="eyebrow red">Choose a league</p><div>
      <button className={league==="132277"?"active":""} onClick={()=>setLeague("132277")}><small>MONDAY · 6:30 PM</small><strong>Nationals League 26–27</strong></button>
      <button className={league==="148625"?"active":""} onClick={()=>setLeague("148625")}><small>WEDNESDAY · 9:30 PM</small><strong>Wednesday Scratch Draft League</strong></button>
    </div></section>
    <section className="section nationals-overview league-identity">
      <div className="nationals-title"><p className="eyebrow red">League ID {info.id}</p><h2>{info.name}</h2><p>{info.schedule}</p></div>
      <div className="league-facts"><article><small>Status</small><strong>{info.week}</strong></article><article><small>Last league update</small><strong>{info.updated}</strong></article></div>
    </section>
    {league==="132277"?nationals:<SyncedLeagueDashboard data={wednesday as LeagueSnapshot}/>}
  </div>;
}
