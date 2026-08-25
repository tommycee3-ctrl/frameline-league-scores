import type { Metadata } from "next";
import { LeagueSwitcher } from "./league-switcher";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "League Hub" };

export default function Leagues() {
  return <>
    <PageHeader eyebrow="Your bowling dashboard" title="My Leagues" intro="Your saved leagues stay one tap away. Open a league for standings, bowlers, weekly recaps and lane assignments." action={{ href: "#league-settings", label: "Add a league" }}/>
    <LeagueSwitcher />
  </>;
}
