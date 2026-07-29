import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin } from "./ui";

const events = [
  { date: "AUG 08", title: "Summer Family Bowl", detail: "Two hours of bowling, shoes, pizza & pop.", tag: "Family" },
  { date: "AUG 15", title: "Cosmic After Dark", detail: "Black lights, music, lane effects and late-night bowling.", tag: "Cosmic" },
  { date: "SEP 03", title: "Fall League Meet & Greet", detail: "Meet captains, find a team and reserve your spot.", tag: "Leagues" },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Omaha&apos;s neighborhood lanes since 1955</p>
          <h1>Good times<br/><span>roll here.</span></h1>
          <p className="hero-lede">Classic lanes, friendly competition, and room for everyone—from first frames to league night.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/open-bowling">Plan your visit <ArrowRight /></Link>
            <Link className="button button-ghost" href="/leagues">Find a league</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="lane-lines"><i/><i/><i/><i/><i/></div>
          <div className="ball"><b/><b/><b/></div>
          <div className="pin pin-one"/>
          <div className="pin pin-two"/>
          <div className="pin pin-three"/>
          <div className="hero-stamp">EST.<strong>1955</strong></div>
        </div>
      </section>

      <section className="quick-strip">
        <div><Clock3/><span><small>Today&apos;s sample hours</small><strong>12 PM – 11 PM</strong></span></div>
        <div><MapPin/><span><small>Find us</small><strong>151 N. 72nd St.</strong></span></div>
        <div><CalendarDays/><span><small>Coming up</small><strong>Cosmic Saturday</strong></span></div>
      </section>

      <section className="section intro-grid">
        <div>
          <p className="eyebrow red">Welcome to West Lanes</p>
          <h2>Bowling with a little history.</h2>
        </div>
        <div className="body-copy">
          <p>West Lanes has been part of Omaha since 1955. Today, it is still a place to meet friends, celebrate milestones, compete in a league, and make the kind of memories that only happen at the lanes.</p>
          <p className="sample-note">This preview uses sample pricing, schedules and event details until West Lanes confirms the current information.</p>
        </div>
      </section>

      <section className="section activity-grid">
        <Link href="/open-bowling" className="activity-card cream"><span>01</span><h3>Open Bowling</h3><p>Walk in, grab a lane and make a day of it.</p><ArrowRight/></Link>
        <Link href="/leagues" className="activity-card navy"><span>02</span><h3>League Bowling</h3><p>Find your people and compete all season.</p><ArrowRight/></Link>
        <Link href="/cosmic-bowling" className="activity-card red-card"><span>03</span><h3>Cosmic Bowling</h3><p>Turn down the lights and turn up the fun.</p><ArrowRight/></Link>
      </section>

      <section className="section events-section">
        <div className="section-heading">
          <div><p className="eyebrow red">What&apos;s happening</p><h2>Upcoming events</h2></div>
          <Link href="/events" className="text-link">See all events <ArrowRight/></Link>
        </div>
        <div className="event-list">
          {events.map((event) => (
            <article className="event-row" key={event.title}>
              <div className="event-date">{event.date.split(" ").map((part) => <span key={part}>{part}</span>)}</div>
              <div><small>{event.tag}</small><h3>{event.title}</h3><p>{event.detail}</p></div>
              <ArrowRight/>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div><p className="eyebrow">Ready when you are</p><h2>Meet us at the lanes.</h2></div>
        <a className="button button-light" href="tel:+14025563344">Call (402) 556-3344 <ArrowRight/></a>
      </section>
    </>
  );
}
