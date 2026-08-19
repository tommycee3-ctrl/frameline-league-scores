import type { Metadata } from "next";
import { LeagueForm } from "./signup-form";
import { LeagueDashboard } from "./league-dashboard";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "League Hub" };

const leagueSecretary = "https://www.leaguesecretary.com/bowling-centers/west-lanes/bowling-leagues/nationals-league-2627";

const leagueLinks = [
  ["Official dashboard", `${leagueSecretary}/dashboard/132277`],
  ["Official standings", `${leagueSecretary}/league/standings/132277`],
  ["Weekly recaps", `${leagueSecretary}/league/recaps/132277`],
  ["Season schedule", `${leagueSecretary}/league/schedule-png/132277`],
  ["Lane assignments", `${leagueSecretary}/league/lane-assignments/132277`],
] as const;

export default function Leagues() {
  return <>
    <PageHeader eyebrow="West Lanes league center" title="Nationals League 26–27" intro="Search every posted bowler, compare series, open team scorecards, and see how Week 1 points were earned." action={{ href: "#league-dashboard", label: "Open league hub" }}/>

    <section className="section nationals-overview">
      <div className="nationals-title"><p className="eyebrow red">League ID 132277</p><h2>Monday night league</h2><p>Fall 2026 · 6:30 PM · Started August 17, 2026 · Current through Week 1.</p></div>
      <div className="league-facts"><article><small>Teams</small><strong>16</strong></article><article><small>Posted bowlers</small><strong>70</strong></article><article><small>Weekly points</small><strong>42</strong></article><article><small>Current update</small><strong>Aug. 18</strong></article></div>
    </section>

    <section className="nationals-links" aria-label="Official league resources">
      {leagueLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer"><span>{label}</span><b aria-hidden="true">↗</b></a>)}
    </section>

    <LeagueDashboard />

    <section className="signup-section" id="signup"><div className="signup-copy"><p className="eyebrow">League interest form</p><h2>Interested in league bowling?</h2><p>Complete the form and your email app will open with your answers ready to send to West Lanes.</p></div><LeagueForm/></section>
  </>;
}
