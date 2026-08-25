import type { Metadata } from "next";
import { PageHeader } from "../page-header";
import { ManagedRatesAndHours } from "../managed-content";

export const metadata: Metadata = { title: "Open Bowling" };

export default function OpenBowling() {
  return (
    <>
      <PageHeader
        eyebrow="Come roll with us"
        title="Open Bowling"
        intro="No league required. Bring the family, meet some friends, or get a few practice games in."
      />
      <section className="section split-heading">
        <div>
          <p className="eyebrow red">Sample rates</p>
          <h2>Simple plans. Plenty of fun.</h2>
        </div>
        <p>
          Walk-ins are welcome when lanes are available. Call ahead for current
          availability, especially during league hours.
        </p>
      </section>
      <ManagedRatesAndHours />
    </>
  );
}
