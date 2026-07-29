import type { Metadata } from "next";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Events" };

const events = [
  ["08", "AUG", "Summer Family Bowl", "12 PM – 4 PM", "Two hours of bowling, rental shoes, one-topping pizza and a pitcher of pop."],
  ["15", "AUG", "Cosmic After Dark", "9 PM – Midnight", "Black lights, music, lane effects and a lively late-night atmosphere."],
  ["03", "SEP", "Fall League Meet & Greet", "6 PM – 8 PM", "Meet league captains, find teammates and ask questions before the season."],
  ["12", "SEP", "9-Pin No-Tap Tournament", "Check-in at 10 AM", "A fun open tournament for bowlers of all experience levels."],
  ["24", "OCT", "Halloween Cosmic Bowl", "8 PM – Midnight", "Costumes, glow bowling, music and prizes throughout the evening."],
];

export default function Events() {
  return <>
    <PageHeader eyebrow="Save the date" title="Events at West Lanes" intro="Special bowling nights, tournaments, league gatherings and more reasons to get together."/>
    <section className="section events-page-list">{events.map(([day, month, title, time, detail]) => <article key={title}><div className="event-block"><strong>{day}</strong><span>{month}</span></div><div><small>{time}</small><h2>{title}</h2><p>{detail}</p></div><a href="tel:+14025563344">Call for details</a></article>)}</section>
    <section className="cta-band"><div><p className="eyebrow">Plan something special</p><h2>Bring your group to the lanes.</h2></div><a className="button button-light" href="mailto:new_west_lanes@yahoo.com?subject=West%20Lanes%20group%20event">Ask about a group event</a></section>
  </>;
}
