import type { Metadata } from "next";
import { LeagueForm } from "./signup-form";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Leagues" };

const leagues = [
  ["Monday Mixers", "Mixed · 4 person teams", "Mondays · 6:30 PM"],
  ["Tuesday Classic", "Open scratch league", "Tuesdays · 7:00 PM"],
  ["Wednesday Women", "Women · 3 person teams", "Wednesdays · 6:15 PM"],
  ["Thursday Social", "Any skill level", "Thursdays · 7:00 PM"],
  ["Sunday Seniors", "Ages 55+", "Sundays · 11:00 AM"],
];

export default function Leagues() {
  return <>
    <PageHeader eyebrow="Better together" title="League Bowling" intro="Weekly bowling, friendly competition and a reason to look forward to league night." action={{ href: "#signup", label: "Join a league" }}/>
    <section className="section split-heading"><div><p className="eyebrow red">Sample fall lineup</p><h2>There&apos;s a league for your style.</h2></div><p>Already have a team? Great. Need teammates? Tell us about yourself and West Lanes can help match you with the right group.</p></section>
    <section className="section league-list">{leagues.map((league, i) => <article key={league[0]}><span>{String(i + 1).padStart(2, "0")}</span><div><h3>{league[0]}</h3><p>{league[1]}</p></div><strong>{league[2]}</strong></article>)}</section>
    <section className="signup-section" id="signup"><div className="signup-copy"><p className="eyebrow">League interest form</p><h2>Let&apos;s find your league.</h2><p>Complete the form and your email app will open with your answers ready to send to West Lanes.</p></div><LeagueForm/></section>
  </>;
}
