import type { Metadata } from "next";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Cosmic Bowling" };

export default function CosmicBowling() {
  return <>
    <PageHeader eyebrow="Lights down. Energy up." title="Cosmic Bowling" intro="Black lights, glowing lanes, music and the most electric frames of the week."/>
    <section className="cosmic-stage"><div className="cosmic-orbit one"/><div className="cosmic-orbit two"/><div><p className="eyebrow">Sample weekend schedule</p><h2>Friday & Saturday<br/>9 PM – Midnight</h2><p>$20 per bowler · shoes included · two hours</p><a className="button button-light" href="tel:+14025563344">Call for availability</a></div></section>
    <section className="section feature-grid"><article><span>01</span><h3>Glow mode</h3><p>Black lights, lane effects and neon details transform the entire room.</p></article><article><span>02</span><h3>Big sound</h3><p>A high-energy playlist keeps the night moving between every frame.</p></article><article><span>03</span><h3>All ages</h3><p>A late-night bowling experience for friends, dates and family groups.</p></article></section>
  </>;
}
