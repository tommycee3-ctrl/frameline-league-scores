import type { Metadata } from "next";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Open Bowling" };

const rates = [
  ["Weekday game", "$5.50", "Per person · before 6 PM"],
  ["Evening game", "$7.50", "Per person · after 6 PM"],
  ["Lane by the hour", "$42", "Up to 5 bowlers · before 6 PM"],
  ["Shoe rental", "$4", "Per bowler"],
];

export default function OpenBowling() {
  return <>
    <PageHeader eyebrow="Come roll with us" title="Open Bowling" intro="No league required. Bring the family, meet some friends, or get a few practice games in."/>
    <section className="section split-heading"><div><p className="eyebrow red">Sample rates</p><h2>Simple plans. Plenty of fun.</h2></div><p>Walk-ins are welcome when lanes are available. Call ahead for current availability, especially during league hours.</p></section>
    <section className="section rate-grid">{rates.map(([name, price, detail]) => <article className="rate-card" key={name}><p>{name}</p><strong>{price}</strong><small>{detail}</small></article>)}</section>
    <section className="section info-panel"><div><p className="eyebrow red">Open bowling hours</p><h2>Find your lane time.</h2></div><div className="hours-list"><p><span>Monday – Thursday</span><strong>12 PM – 11 PM</strong></p><p><span>Friday – Saturday</span><strong>12 PM – Midnight</strong></p><p><span>Sunday</span><strong>10 AM – 10 PM</strong></p><small>Preview hours—please call to confirm lane availability and current closing time.</small></div></section>
  </>;
}
