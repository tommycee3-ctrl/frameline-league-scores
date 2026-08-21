"use client";

import { ReactNode, useState } from "react";
import wednesday from "../../public/data/leagues/148625.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

export function LeagueSwitcher({nationals}:{nationals:ReactNode}) {
  const [league,setLeague]=useState<"132277"|"148625">("132277");
  return <div id="league-center">
    <section className="section league-picker"><p className="eyebrow red">Choose a league</p><div>
      <button className={league==="132277"?"active":""} onClick={()=>setLeague("132277")}><small>MONDAY · 6:30 PM</small><strong>Nationals League 26–27</strong></button>
      <button className={league==="148625"?"active":""} onClick={()=>setLeague("148625")}><small>WEDNESDAY · 9:30 PM</small><strong>Wednesday Scratch Draft League</strong></button>
    </div></section>
    {league==="132277"?nationals:<SyncedLeagueDashboard data={wednesday as LeagueSnapshot}/>}
  </div>;
}
