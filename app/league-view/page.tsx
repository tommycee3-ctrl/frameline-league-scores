import type { Metadata } from "next";
import { LeagueView } from "./league-view";

export const metadata: Metadata = { title: "League View" };

export default function LeagueViewPage() {
  return <LeagueView />;
}
