import type { Metadata } from "next";
import { LeagueForm } from "./signup-form";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Leagues" };

const leagueSecretary = "https://www.leaguesecretary.com/bowling-centers/west-lanes/bowling-leagues/nationals-league-2627";

const standings = [
  [1, "Heather's Headache", 35, 7, "83%", 876, 2620],
  [2, "Omaha Bookkeeping", 33, 9, "79%", 814, 2418],
  [3, "Rotella's Smokers", 33, 9, "79%", 769, 2307],
  [4, "Floor Co.", 32, 10, "76%", 756, 2173],
  [5, "Misfits", 31.5, 10.5, "75%", 659, 2519],
  [6, "Rosewood Heating", 30, 12, "71%", 793, 2358],
  [7, "Bowling Store", 29.5, 12.5, "70%", 761, 2316],
  [8, "Slap It Out", 23, 19, "55%", 876, 2636],
  [9, "The Lucky Kelley", 19, 23, "45%", 764, 2341],
  [10, "Ugly Counts", 12.5, 29.5, "30%", 698, 2125],
  [11, "West Lanes Newbi", 10.5, 31.5, "25%", 759, 2219],
  [12, "Team #9", 9, 33, "21%", 785, 2289],
  [13, "Kelley's Pro Sho", 9, 33, "21%", 752, 2262],
  [14, "Auto Relocation", 7, 35, "17%", 807, 2358],
  [15, "Team 17", 0, 17, "0%", 851, 0],
  [16, "Casper & Co.", 12, 30, "29%", 0, 0],
] as const;

const leagueLinks = [
  ["Official dashboard", `${leagueSecretary}/dashboard/132277`],
  ["Full standings", `${leagueSecretary}/league/standings/132277`],
  ["Season schedule", `${leagueSecretary}/league/schedule-png/132277`],
  ["Weekly recaps", `${leagueSecretary}/league/recaps-png/132277`],
  ["Lane assignments", `${leagueSecretary}/league/lane-assignments/132277`],
] as const;

export default function Leagues() {
  return <>
    <PageHeader eyebrow="Monday nights at West Lanes" title="Nationals League 26–27" intro="Current league information and standings, converted from the official LeagueSecretary listing for West Lanes." action={{ href: "#standings", label: "View standings" }}/>

    <section className="section nationals-overview">
      <div className="nationals-title">
        <p className="eyebrow red">League ID 132277</p>
        <h2>Fall 2026 league</h2>
        <p>Handicap adult mixed league bowling Monday evenings at West Lanes. Official results remain available through LeagueSecretary.</p>
      </div>
      <div className="league-facts">
        <article><small>Bowls on</small><strong>Monday</strong></article>
        <article><small>Start time</small><strong>6:30 PM</strong></article>
        <article><small>Started</small><strong>Aug. 17, 2026</strong></article>
        <article><small>Current update</small><strong>Week 1 · Aug. 18</strong></article>
      </div>
    </section>

    <section className="nationals-links" aria-label="Official league resources">
      {leagueLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer"><span>{label}</span><b aria-hidden="true">↗</b></a>)}
    </section>

    <section className="section nationals-standings" id="standings">
      <div className="section-heading"><div><p className="eyebrow red">Fall 2026 · Week 1</p><h2>Team standings</h2></div><p>Updated August 18, 2026</p></div>
      <div className="nationals-table-wrap">
        <table className="nationals-table">
          <thead><tr><th>Place</th><th>Team</th><th>Won</th><th>Lost</th><th>Win %</th><th>Average</th><th>Pins</th></tr></thead>
          <tbody>{standings.map(([place, team, won, lost, percent, average, pins]) => <tr key={team}><td><span className="standing-place">{place}</span></td><td><strong>{team}</strong></td><td>{won}</td><td>{lost}</td><td>{percent}</td><td>{average}</td><td>{pins.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="league-source-note">Standings are a snapshot from LeagueSecretary. Use the official links above for the latest live information.</p>
    </section>

    <section className="signup-section" id="signup"><div className="signup-copy"><p className="eyebrow">League interest form</p><h2>Interested in league bowling?</h2><p>Complete the form and your email app will open with your answers ready to send to West Lanes.</p></div><LeagueForm/></section>
  </>;
}
