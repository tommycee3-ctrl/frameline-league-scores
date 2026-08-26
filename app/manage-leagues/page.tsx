import type { Metadata } from "next";
import { LeagueSwitcher } from "../leagues/league-switcher";

export const metadata: Metadata = { title: "Add or Remove Leagues" };

export default function ManageLeagues() {
  return <LeagueSwitcher manageOnly />;
}
