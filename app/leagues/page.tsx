import type { Metadata } from "next";
import { LeagueForm } from "./signup-form";
import { LeagueDashboard } from "./league-dashboard";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "League Hub" };

export default function Leagues() {
  return <>
    <PageHeader eyebrow="West Lanes league center" title="Nationals League 26–27" intro="Search every posted bowler, compare series, open team scorecards, and see how Week 1 points were earned." action={{ href: "#league-dashboard", label: "Open league hub" }}/>

    <section className="section nationals-overview">
      <div className="nationals-title"><p className="eyebrow red">League ID 132277</p><h2>Monday night league</h2><p>Fall 2026 · 6:30 PM · Started August 17, 2026 · Current through Week 1.</p></div>
      <div className="league-facts"><article><small>Teams</small><strong>16</strong></article><article><small>Posted bowlers</small><strong>70</strong></article><article><small>Weekly points</small><strong>42</strong></article><article><small>Current update</small><strong>Aug. 18</strong></article></div>
    </section>

    <LeagueDashboard />

    <section className="signup-section" id="signup"><div className="signup-copy"><p className="eyebrow">League interest form</p><h2>Interested in league bowling?</h2><p>Complete the form and your email app will open with your answers ready to send to West Lanes.</p></div><LeagueForm/></section>
  </>;
}
