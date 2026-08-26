import type { Metadata } from "next";
import { BowlerSearchPanel } from "../bowler-search-panel";

export const metadata: Metadata = { title: "Bowler Search" };

export default function BowlerSearch() {
  return <main className="welcome-home public-bowler-search"><BowlerSearchPanel heading="Bowler Search" intro="Look up any bowler to see every imported league, bowling center, and team connected to their name." /></main>;
}
