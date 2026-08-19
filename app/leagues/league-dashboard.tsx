"use client";

import { useMemo, useState } from "react";

type Bowler = { name:string; avg:number; hcp:number; games:[number,number,number]; team:string; individual?:number };
type Team = { name:string; points:number; lane:number; bowlers:Bowler[] };

const make = (team:string, rows:Array<[string,number,number,number,number,number]>, points:number, lane:number):Team => ({name:team,points,lane,bowlers:rows.map(([name,avg,hcp,g1,g2,g3])=>({name,avg,hcp,games:[g1,g2,g3],team}))});
const teams:Team[] = [
make("Auto Relocation",[["James Hall",163,45,171,179,141],["Matt Gilkerson",169,40,178,128,148],["Kyle Harpster",169,40,131,172,129],["Kevin Dillingham",189,24,159,199,135],["Jeff Hall",181,31,156,169,163]],7,6),
make("Heather's Headache",[["Mark Jensen",172,38,124,160,146],["Sarah Rodabaugh-Kraft",158,49,193,206,162],["Michael Taylor",158,49,151,131,193],["Heather Erdei",196,19,157,206,201],["Victor Cortez",196,19,225,199,166]],35,5),
make("Floor Co.",[["Ryan Colvin",152,54,181,121,154],["Isaiah Williams",124,76,117,138,118],["Luke Dunwoody",140,64,118,123,179],["Anthony Laravie",160,48,155,148,179],["Chandler Scott",147,58,133,128,181]],32,13),
make("Kelley's Pro Sho",[["M Z",160,48,144,152,135],["Jj Morris",184,28,136,117,178],["Adam Lamb",162,46,139,133,151],["Austin Dubrall",181,31,180,133,188],["Tom Kelley Jr",178,33,157,150,169]],9,1),
make("Rotella's Smokers",[["Jason Tye",170,40,166,172,155],["Jeremey James",151,55,128,175,152],["Roland Frazier",164,44,177,218,125],["Missi Rowe",130,72,100,121,132],["Don Rowe Jr",168,41,165,155,166]],33,2),
make("Omaha Bookkeeping",[["Buddy Hogan",159,48,165,177,137],["Rick Frank",169,40,178,176,154],["John Mehok",158,49,154,145,203],["Jerry Fleming",154,52,130,148,145],["Bill Kirshenbauam",178,33,164,203,139]],33,10),
make("Team #9",[["Tom Casella",166,43,148,136,143],["James Casella",167,42,99,181,175],["Laura Behrens-Morris",151,55,178,164,118],["Jaime Thomas",151,55,126,144,126],["David Tramdachs",194,20,197,197,157]],9,9),
make("Misfits",[["Jeff Lutzow",178,33,158,159,222],["Alan Kreutzer",174,36,135,160,144],["Robert Choate",164,44,197,160,145],["Joe Slowinski",182,30,146,159,173],["Jeremiah Johnson",179,32,201,171,189]],31,11),
make("West Lanes Newbi",[["Gavin Giles",163,45,105,105,92],["Allan Swarbrick",175,36,165,165,165],["Bryson Carmichael",138,65,146,133,135],["Brian Shamblen",182,30,172,172,172],["Mark Magistretti",178,33,137,170,185]],10,12),
make("Rosewood Heating",[["Andrew Matthies",167,42,161,157,187],["Elan Redmon",128,73,161,136,106],["Dillon Anderson",141,63,124,135,167],["Maziar Vassighi",176,35,212,162,234],["Tony Desimone",178,33,155,125,136]],30,15),
make("Slap It Out",[["Gunner Bosselman",185,28,160,199,150],["Emily Lewis",172,38,194,194,167],["Tim Klepper",181,31,149,175,141],["Casey Montgomery",189,24,184,170,205],["Jayson Peters",190,24,142,213,193]],23,3),
make("The Lucky Kelley",[["Gerae Novak",149,56,120,117,137],["Patrick Landis",172,38,142,155,186],["Mark Asbach",169,40,172,139,193],["Cole Bartley",172,38,252,169,168],["Sydney Kelley",154,52,119,137,135]],19,4),
make("Ugly Counts",[["Kylie Orr",126,75,136,131,116],["Andrew Richtig",141,63,140,102,115],["Kevin Lee",162,46,135,131,150],["Tiffani Swarbrick",174,36,179,144,168],["Josh Orr",176,35,166,168,144]],12,7),
make("Bowling Store",[["Vu Che",177,34,96,145,156],["The Che",159,48,163,117,127],["Hoa Che",150,56,110,163,147],["Chris Watson",180,32,187,173,213],["Ben Watson",176,35,146,170,203]],29,8),
];

const matchups = [[0,1],[3,4],[5,6],[7,8],[10,11],[12,13]] as const;
for (const [a,b] of matchups) for(let i=0;i<5;i++){
  let ap=0,bp=0; const A=teams[a].bowlers[i], B=teams[b].bowlers[i];
  for(let g=0;g<3;g++){ const av=A.games[g]+A.hcp,bv=B.games[g]+B.hcp; if(av>bv)ap++; else if(bv>av)bp++; else {ap+=.5;bp+=.5;} }
  const as=A.games.reduce((x,y)=>x+y,0)+A.hcp*3, bs=B.games.reduce((x,y)=>x+y,0)+B.hcp*3; if(as>bs)ap++; else if(bs>as)bp++; else {ap+=.5;bp+=.5;}
  A.individual=ap; B.individual=bp;
}

const allBowlers=teams.flatMap(t=>t.bowlers).map(b=>({...b,series:b.games.reduce((a,c)=>a+c,0),high:Math.max(...b.games)}));
const standingPoints:Record<string,number>={"Heather's Headache":35,"Omaha Bookkeeping":33,"Rotella's Smokers":33,"Floor Co.":32,"Misfits":31.5,"Rosewood Heating":30,"Bowling Store":29.5,"Slap It Out":23,"The Lucky Kelley":19,"Ugly Counts":12.5,"West Lanes Newbi":10.5,"Team #9":9,"Kelley's Pro Sho":9,"Auto Relocation":7,"Team 17":0,"Casper & Co.":12};

export function LeagueDashboard(){
 const [tab,setTab]=useState<"bowlers"|"teams"|"points">("bowlers"),[query,setQuery]=useState(""),[sort,setSort]=useState<"series"|"average"|"high"|"points">("series"),[selected,setSelected]=useState<Bowler|null>(null),[openTeam,setOpenTeam]=useState<string|null>(null);
 const filtered=useMemo(()=>allBowlers.filter(b=>(b.name+" "+b.team).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==="average"?b.avg-a.avg:sort==="high"?b.high-a.high:sort==="points"?(b.individual??-1)-(a.individual??-1):b.series-a.series),[query,sort]);
 return <section className="section league-hub" id="league-dashboard">
  <div className="section-heading"><div><p className="eyebrow red">Week 1 · August 17</p><h2>League results hub</h2></div><p>Scratch scores · handicap used for points</p></div>
  <div className="league-hub-tabs" role="tablist" aria-label="League views">{([['bowlers','Bowlers'],['teams','Teams'],['points','Points breakdown']] as const).map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
  {tab==='bowlers'&&<><div className="league-tools"><label><span>Search</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Bowler or team name"/></label><label><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="series">Series</option><option value="high">High game</option><option value="average">Average</option><option value="points">Individual points</option></select></label></div><div className="bowler-results"><div className="result-head"><span>Bowler</span><span>Games</span><span>Series</span><span>Avg</span><span>Pts</span></div>{filtered.map(b=><button className="bowler-row" key={b.team+b.name} onClick={()=>setSelected(b)}><span><strong>{b.name}</strong><small>{b.team}</small></span><span>{b.games.join(' · ')}</span><b>{b.series}</b><span>{b.avg}</span><span>{b.individual??'—'}</span></button>)}</div></>}
  {tab==='teams'&&<div className="team-card-grid">{[...teams].sort((a,b)=>(standingPoints[b.name]??0)-(standingPoints[a.name]??0)).map(t=><article className="team-result-card" key={t.name}><button onClick={()=>setOpenTeam(openTeam===t.name?null:t.name)} aria-expanded={openTeam===t.name}><span><small>Lane {t.lane}</small><strong>{t.name}</strong></span><b>{standingPoints[t.name]??t.points} pts</b><i>{openTeam===t.name?'−':'+'}</i></button>{openTeam===t.name&&<div className="team-roster">{t.bowlers.map(b=><button key={b.name} onClick={()=>setSelected(b)}><span>{b.name}<small>{b.games.join(' · ')}</small></span><b>{b.games.reduce((a,c)=>a+c,0)}</b></button>)}</div>}</article>)}</div>}
  {tab==='points'&&<div className="points-explainer"><div className="points-key"><article><b>4</b><span>Individual points available per bowler</span></article><article><b>22</b><span>Team points available across games and series</span></article><article><b>42</b><span>Total matchup points available</span></article></div>{matchups.map(([a,b])=><article className="matchup-card" key={teams[a].name}><div><span><strong>{teams[a].name}</strong><b>{teams[a].points}</b></span><span><strong>{teams[b].name}</strong><b>{teams[b].points}</b></span></div><table><thead><tr><th>Position</th><th>{teams[a].name}</th><th>Individual pts</th><th>{teams[b].name}</th><th>Individual pts</th></tr></thead><tbody>{teams[a].bowlers.map((x,i)=><tr key={x.name}><td>{i+1}</td><td><button onClick={()=>setSelected(x)}>{x.name}</button></td><td>{x.individual}</td><td><button onClick={()=>setSelected(teams[b].bowlers[i])}>{teams[b].bowlers[i].name}</button></td><td>{teams[b].bowlers[i].individual}</td></tr>)}</tbody></table></article>)}</div>}
  <p className="league-source-note">Week 1 scores are converted from the official LeagueSecretary recap. Team totals marked 31/10 and 29/12 are displayed there as rounded whole numbers in the recap; official standings retain the half-point.</p>
  {selected&&<div className="bowler-modal-backdrop" onClick={()=>setSelected(null)}><article className="bowler-modal" role="dialog" aria-modal="true" aria-label={`${selected.name} scorecard`} onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close">×</button><p className="eyebrow red">Week 1 scorecard</p><h2>{selected.name}</h2><p>{selected.team}</p><div className="bowler-stats"><span><small>Average</small><b>{selected.avg}</b></span><span><small>Handicap</small><b>+{selected.hcp}</b></span><span><small>Scratch series</small><b>{selected.games.reduce((a,c)=>a+c,0)}</b></span><span><small>Individual pts</small><b>{selected.individual??'—'} / 4</b></span></div><div className="game-cards">{selected.games.map((g,i)=><span key={i}><small>Game {i+1}</small><b>{g}</b><em>{g+selected.hcp} with HDCP</em></span>)}</div></article></div>}
 </section>
}
