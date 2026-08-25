"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "./ui";
import {
  contentApiUrl,
  defaultSiteContent,
  type SiteContent,
} from "./site-content";

function useManagedContent() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  useEffect(() => {
    fetch(contentApiUrl(), { cache: "no-store", credentials: "include" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result) => setContent(result.content ?? result))
      .catch(() => undefined);
  }, []);
  return content;
}

const plainPreview = (value: string) =>
  value
    .replace(/\*\*/g, "")
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ")
    .trim();

function FormattedEventText({ value }: { value: string }) {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <div className="managed-event-description">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const pieces = paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>
            {pieces.map((piece, pieceIndex) =>
              piece.startsWith("**") && piece.endsWith("**") ? (
                <strong key={pieceIndex}>{piece.slice(2, -2)}</strong>
              ) : (
                <span key={pieceIndex}>{piece}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function ManagedBanner() {
  const { banner } = useManagedContent();
  if (!banner.active || !banner.message) return null;
  const href = banner.linkHref.toLowerCase().includes("event")
    ? "/events"
    : banner.linkHref;
  const motion = banner.motion ?? "static";
  return (
    <aside
      className={`managed-banner banner-${banner.tone} banner-motion-${motion}`}
      aria-label="West Lanes announcement"
    >
      <div className="managed-banner-track">
        <div>
          <strong>{banner.message}</strong>
          {banner.detail && <span>{banner.detail}</span>}
        </div>
        {banner.linkLabel && href && (
          <Link href={href}>
            {banner.linkLabel}
            <ArrowRight />
          </Link>
        )}
      </div>
    </aside>
  );
}

export function ManagedHomeEvent() {
  const content = useManagedContent();
  const event =
    content.events.find((item) => item.featured) ?? content.events[0];
  if (!event) return null;
  const date = new Date(`${event.date}T12:00:00`);
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  return (
    <Link className="home-event-callout" href="/events">
      <span className="home-event-date">
        <b>{month}</b>
        <strong>{day}</strong>
      </span>
      <span className="home-event-copy">
        <small>{event.time}</small>
        <strong>{event.title}</strong>
        <em>{plainPreview(event.description)}</em>
      </span>
      <ArrowRight />
    </Link>
  );
}

export function ManagedEvents() {
  const { events } = useManagedContent();
  return (
    <>
      {events.map((event) => {
        const date = new Date(`${event.date}T12:00:00`);
        return (
          <article
            key={event.id}
            className={
              event.featured
                ? "managed-event featured-managed-event"
                : "managed-event"
            }
          >
            <div className="event-block">
              <strong>
                {date.toLocaleDateString("en-US", { day: "2-digit" })}
              </strong>
              <span>
                {date
                  .toLocaleDateString("en-US", { month: "short" })
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <small>{event.time}</small>
              <h2>{event.title}</h2>
              <FormattedEventText value={event.description} />
            </div>
            <a href="tel:+14025563344">Call for details</a>
          </article>
        );
      })}
    </>
  );
}

export function ManagedEventTile() {
  const content = useManagedContent();
  const event =
    content.events.find((item) => item.featured) ?? content.events[0];
  if (!event) return null;
  const date = new Date(`${event.date}T12:00:00`);
  return (
    <Link href="/events" className="social-tile tile-yellow">
      <span className="tile-icon">
        {date.toLocaleDateString("en-US", { day: "2-digit" })}
      </span>
      <div>
        <small>
          {date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}{" "}
          · {event.time}
        </small>
        <strong>{event.title}</strong>
        <span>All event details</span>
      </div>
      <ArrowRight />
    </Link>
  );
}

export function ManagedRatesAndHours() {
  const { rates, hours } = useManagedContent();
  return (
    <>
      <section className="section rate-grid">
        {rates.map((rate) => (
          <article className="rate-card" key={rate.id}>
            <p>{rate.name}</p>
            <strong>{rate.price}</strong>
            <small>{rate.detail}</small>
          </article>
        ))}
      </section>
      <section className="section info-panel">
        <div>
          <p className="eyebrow red">Open bowling hours</p>
          <h2>Find your lane time.</h2>
        </div>
        <div className="hours-list">
          {hours.map((item) => (
            <p key={item.id}>
              <span>{item.days}</span>
              <strong>{item.hours}</strong>
            </p>
          ))}
          <small>
            Please call to confirm lane availability and current closing time.
          </small>
        </div>
      </section>
    </>
  );
}
