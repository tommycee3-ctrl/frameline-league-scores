import Link from "next/link";
import { ArrowRight, Clock3, MapPin } from "./ui";
import { ManagedEventTile, ManagedHomeEvent } from "./managed-content";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  return (
    <div className="social-home">
      <section className="social-hero">
        <div className="social-copy">
          <p className="social-kicker">
            Omaha&apos;s neighborhood lanes since 1955
          </p>
          <h1>
            Good times
            <br />
            <em>roll here.</em>
          </h1>
          <p className="social-lede">
            Bowling, food, leagues, and room for everyone. Come as you are;
            we&apos;ll keep a lane warm.
          </p>
          <ManagedHomeEvent />
          <div className="social-actions">
            <Link className="social-button primary" href="/open-bowling">
              Plan your visit <ArrowRight />
            </Link>
            <Link className="social-button secondary" href="/leagues">
              Find a league
            </Link>
          </div>
        </div>

        <div
          className="social-collage"
          aria-label="Friends and families enjoying West Lanes"
        >
          <div className="social-photo photo-bowlers" />
          <div className="social-logo-card">
            <img
              src={`${assetBase}/west-lanes-logo.jpg`}
              alt="West Lanes Bowlatorium"
            />
            <span>Est. 1955</span>
          </div>
          <div className="social-burst">
            LET&apos;S
            <br />
            BOWL!
          </div>
        </div>
      </section>

      <section className="social-dashboard" aria-label="West Lanes at a glance">
        <article className="social-today">
          <div className="social-card-heading">
            <span>
              <Clock3 /> Today at West Lanes
            </span>
            <Link href="/open-bowling">
              Full hours <ArrowRight />
            </Link>
          </div>
          <div className="today-details">
            <div>
              <small>Open bowling</small>
              <strong>12 PM–11 PM</strong>
            </div>
            <div>
              <small>Tonight</small>
              <strong>Cosmic at 9 PM</strong>
            </div>
            <div>
              <small>Location</small>
              <strong>151 N. 72nd St.</strong>
            </div>
          </div>
        </article>

        <ManagedEventTile />

        <Link href="/food-drinks" className="social-tile tile-coral">
          <span className="tile-icon food-icon">🍔</span>
          <div>
            <small>Food & drinks</small>
            <strong>Never roll hungry</strong>
            <span>See specials & menu</span>
          </div>
          <ArrowRight />
        </Link>

        <Link href="/cosmic-bowling" className="social-tile tile-blue">
          <span className="tile-icon">✦</span>
          <div>
            <small>Friday & Saturday</small>
            <strong>Cosmic Bowling</strong>
            <span>Lights down. Music up.</span>
          </div>
          <ArrowRight />
        </Link>
      </section>

      <div className="social-lower">
        <div>
          <MapPin />
          <span>Omaha, Nebraska</span>
        </div>
        <p>Sample hours and event details are shown for preview.</p>
        <Link href="/events">
          Explore everything happening <ArrowRight />
        </Link>
      </div>
    </div>
  );
}
