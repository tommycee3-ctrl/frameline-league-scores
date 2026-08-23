"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import leagueCatalog from "../../public/data/leagues/all.json";
import { LeagueSnapshot, SyncedLeagueDashboard } from "./synced-league-dashboard";

const snapshots = leagueCatalog as LeagueSnapshot[];

export function LeagueSwitcher({nationals}:{nationals:ReactNode}) {
  const [leagueId,setLeagueId]=useState("132277");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [leagueMenuOpen,setLeagueMenuOpen]=useState(false);
  const leagueMenuRef=useRef<HTMLDivElement|null>(null);
  const pullStart=useRef<number|null>(null);
  const pullDistanceRef=useRef(0);
  const [pullDistance,setPullDistance]=useState(0);
  useEffect(()=>{
    try { setFavorites(JSON.parse(localStorage.getItem("west-lanes-favorite-leagues")||"[]")); } catch { setFavorites([]); }
  },[]);
  useEffect(()=>{
    if(!leagueMenuOpen)return;
    const closeOutside=(event:PointerEvent)=>{
      if(!leagueMenuRef.current?.contains(event.target as Node))setLeagueMenuOpen(false);
    };
    const closeWithEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setLeagueMenuOpen(false);
    };
    document.addEventListener("pointerdown",closeOutside);
    document.addEventListener("keydown",closeWithEscape);
    return()=>{
      document.removeEventListener("pointerdown",closeOutside);
      document.removeEventListener("keydown",closeWithEscape);
    };
  },[leagueMenuOpen]);
  useEffect(()=>{
    const start=(event:TouchEvent)=>{if(window.scrollY<=1){pullStart.current=event.touches[0]?.clientY??null;pullDistanceRef.current=0;}};
    const move=(event:TouchEvent)=>{if(pullStart.current===null)return;const distance=Math.min(120,Math.max(0,((event.touches[0]?.clientY??pullStart.current)-pullStart.current)*.65));pullDistanceRef.current=distance;setPullDistance(distance);};
    const finish=()=>{const refresh=pullDistanceRef.current>=72;pullStart.current=null;pullDistanceRef.current=0;setPullDistance(0);if(refresh){const url=new URL(window.location.href);url.searchParams.set("refresh",Date.now().toString());window.location.assign(url.toString());}};
    window.addEventListener("touchstart",start,{passive:true});
    window.addEventListener("touchmove",move,{passive:true});
    window.addEventListener("touchend",finish,{passive:true});
    window.addEventListener("touchcancel",finish,{passive:true});
    return()=>{window.removeEventListener("touchstart",start);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",finish);window.removeEventListener("touchcancel",finish);};
  },[]);
  const saveFavorites=(next:string[])=>{setFavorites(next);localStorage.setItem("west-lanes-favorite-leagues",JSON.stringify(next));};
  const toggleFavorite=()=>saveFavorites(favorites.includes(leagueId)?favorites.filter(id=>id!==leagueId):[...favorites,leagueId]);
  const selected=snapshots.find(item=>item.id===leagueId)??snapshots[1];
  const favoriteLeagues=favorites.map(id=>snapshots.find(item=>item.id===id)).filter((item):item is LeagueSnapshot=>Boolean(item));
  const hasResults=Object.values(selected.views).some(tables=>tables.some(table=>table.rows.length));
  const week=selected.week?`Week ${selected.week}`:"Awaiting Week 1";
  const schedule=`${selected.bowlsOn} · ${selected.startTime} · ${selected.startDate}.`;

  return <div id="league-center">
    <div className={`pull-refresh ${pullDistance>=72?"ready":""}`} style={{transform:`translate(-50%, ${pullDistance-54}px)`,opacity:pullDistance?1:0}} aria-hidden="true"><span>{pullDistance>=72?"↻":"↓"}</span>{pullDistance>=72?"Release to refresh":"Pull to refresh"}</div>
    <section className="section league-picker">
      <p className="eyebrow red">Choose a league</p>
      {favoriteLeagues.length>0&&<div className="favorite-league-cards">{favoriteLeagues.map(item=><button key={item.id} className={leagueId===item.id?"active":""} onClick={()=>setLeagueId(item.id)}>
        <small>★ {item.bowlsOn?.toUpperCase()} · {item.startTime}</small><strong>{item.displayName}</strong>
      </button>)}</div>}
      <div className="league-select-row"><div className="custom-league-select" ref={leagueMenuRef}><span>All active leagues</span><button className="custom-league-trigger" onClick={()=>setLeagueMenuOpen(open=>!open)} aria-expanded={leagueMenuOpen} aria-haspopup="listbox"><span><small>{selected.bowlsOn} · {selected.startTime}</small><strong>{selected.displayName}</strong></span><b>{leagueMenuOpen?"×":"⌄"}</b></button>{leagueMenuOpen&&<div className="custom-league-menu" role="listbox" aria-label="All active leagues">{snapshots.map(item=><button key={item.id} role="option" aria-selected={item.id===leagueId} className={item.id===leagueId?"selected":""} onClick={()=>{setLeagueId(item.id);setLeagueMenuOpen(false);}}><span><small>{item.bowlsOn} · {item.startTime}</small><strong>{item.displayName}</strong></span>{favorites.includes(item.id)&&<b>★</b>}</button>)}</div>}</div><button className={`favorite-toggle ${favorites.includes(leagueId)?"selected":""}`} onClick={toggleFavorite} aria-pressed={favorites.includes(leagueId)}><span>{favorites.includes(leagueId)?"★":"☆"}</span>{favorites.includes(leagueId)?"Favorited":"Add favorite"}</button></div>
    </section>
    <section className="section nationals-overview league-identity">
      <div className="nationals-title"><p className="eyebrow red">League ID {selected.id}</p><h2>{selected.displayName}</h2><p>{schedule}</p></div>
      <div className="league-facts"><article><small>Current week</small><strong>{week}</strong></article><article><small>Last updated</small><strong>{selected.sourceUpdated||"Awaiting first update"}</strong></article></div>
    </section>
    {leagueId==="132277"?nationals:hasResults?<SyncedLeagueDashboard data={selected}/>:<section className="section league-hub awaiting-league"><p className="eyebrow red">Results coming soon</p><h2>Week 1 has not been posted yet.</h2><p>This league is active and will fill in automatically after its first official upload.</p></section>}
  </div>;
}
