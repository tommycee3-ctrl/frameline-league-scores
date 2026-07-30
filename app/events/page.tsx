import type { Metadata } from "next";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "Events" };
const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const events = [
  {
    day: "01",
    month: "AUG",
    title: "National Spider-Man Day",
    time: "Saturday · Noon–2 PM",
    detail: "Half-price family bowling with $3 games and $3 shoe rental. Meet Spider-Man, Spider-Woman and Black Cat in person while supplies last.",
    extra: "KGOR’s Lucy Chapman will be live with chances to win West Lanes gift certificates, special-screening tickets and free movie posters.",
    highlights: [
      "$3 bowling games",
      "$3 shoe rental",
      "Meet Spider-Man, Spider-Woman and Black Cat",
      "Spin to win free West Lanes gift certificates",
      "Win tickets to a special screening of Spider-Man: Brand New Day at B&B Oak View Plaza 14",
      "Free Spider-Man movie posters while supplies last",
    ],
    featured: true,
  },
  {
    day: "15",
    month: "AUG",
    title: "Cosmic After Dark",
    time: "9 PM–Midnight",
    detail: "Black lights, music, lane effects and a lively late-night atmosphere.",
  },
  {
    day: "03",
    month: "SEP",
    title: "Fall League Meet & Greet",
    time: "6 PM–8 PM",
    detail: "Meet league captains, find teammates and ask questions before the season.",
  },
  {
    day: "12",
    month: "SEP",
    title: "9-Pin No-Tap Tournament",
    time: "Check-in at 10 AM",
    detail: "A fun open tournament for bowlers of all experience levels.",
  },
  {
    day: "24",
    month: "OCT",
    title: "Halloween Cosmic Bowl",
    time: "8 PM–Midnight",
    detail: "Costumes, glow bowling, music and prizes throughout the evening.",
  },
];

export default function Events() {
  return (
    <>
      <PageHeader
        eyebrow="Save the date"
        title="Events at West Lanes"
        intro="Special bowling nights, tournaments, league gatherings and more reasons to get together."
      />
      <section className="section events-page-list">
        {events.map((event) => (
          <article className={event.featured ? "featured-event" : undefined} key={event.title}>
            <div className="event-block"><strong>{event.day}</strong><span>{event.month}</span></div>
            <div className={event.featured ? "featured-event-content" : undefined}>
              {event.featured && (
                <div className="event-photo-grid" aria-label="National Spider-Man Day guests and prizes">
                  <div
                    className="event-photo spider-photo"
                    role="img"
                    aria-label="Spider-Man"
                  ><img src={`${assetBase}/national-spiderman-day.png`} alt="" /></div>
                  <div
                    className="event-photo characters-photo"
                    role="img"
                    aria-label="Spider-Man Day costumed characters"
                  ><img src={`${assetBase}/national-spiderman-day.png`} alt="" /></div>
                  <div
                    className="event-photo kgor-photo"
                    role="img"
                    aria-label="KGOR's Lucy Chapman"
                  ><img src={`${assetBase}/national-spiderman-day.png`} alt="" /></div>
                </div>
              )}
              <div>
                <small>{event.time}</small>
                <h2>{event.title}</h2>
                <p>{event.detail}</p>
                {event.extra && <p className="event-extra">{event.extra}</p>}
                {event.highlights && (
                  <ul className="event-highlights">
                    {event.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <a href="tel:+14025563344">Call for details</a>
          </article>
        ))}
      </section>
      <section className="cta-band">
        <div><p className="eyebrow">Plan something special</p><h2>Bring your group to the lanes.</h2></div>
        <a className="button button-light" href="mailto:new_west_lanes@yahoo.com?subject=West%20Lanes%20group%20event">Ask about a group event</a>
      </section>
    </>
  );
}
