import type { Metadata } from "next";
import { LeagueSwitcher } from "./league-switcher";

export const metadata: Metadata = { title: "League Hub" };

export default function Leagues() {
  return <LeagueSwitcher />;
}
