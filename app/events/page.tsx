import type { Metadata } from "next";
import { ManagedEvents } from "../managed-content";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Events" };

export default function Events() {
  return (
    <>
      <PageHeader
        eyebrow="Save the date"
        title="Events at West Lanes"
        intro="Special bowling nights, tournaments, league gatherings and more reasons to get together."
      />
      <section className="section events-page-list">
        <ManagedEvents />
      </section>
      <section className="cta-band">
        <div>
          <p className="eyebrow">Plan something special</p>
          <h2>Bring your group to the lanes.</h2>
        </div>
        <a
          className="button button-light"
          href="mailto:new_west_lanes@yahoo.com?subject=West%20Lanes%20group%20event"
        >
          Ask about a group event
        </a>
      </section>
    </>
  );
}
