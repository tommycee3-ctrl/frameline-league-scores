import type { Metadata } from "next";
import { LeagueForm } from "./signup-form";
import { LeagueSwitcher } from "./league-switcher";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "League Hub" };

export default function Leagues() {
  return <>
    <PageHeader eyebrow="West Lanes league center" title="League scores & standings" intro="Choose a league to search bowlers, open team scorecards, compare standings, and review each posted week." action={{ href: "#league-center", label: "Open league center" }}/>
    <LeagueSwitcher />
    <section className="signup-section" id="signup"><div className="signup-copy"><p className="eyebrow">League interest form</p><h2>Interested in league bowling?</h2><p>Complete the form and your email app will open with your answers ready to send to West Lanes.</p></div><LeagueForm/></section>
  </>;
}
