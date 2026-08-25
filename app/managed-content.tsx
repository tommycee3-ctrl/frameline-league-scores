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

export function ManagedBanner() {
  const { banner } = useManagedContent();
  if (!banner.active || !banner.message) return null;
  return (
    <aside
      className={`managed-banner banner-${banner.tone}`}
      aria-label="West Lanes announcement"
    >
      <div>
        <strong>{banner.message}</strong>
        {banner.detail && <span>{banner.detail}</span>}
      </div>
      {banner.linkLabel && banner.linkHref && (
        <Link href={banner.linkHref}>
          {banner.linkLabel}
          <ArrowRight />
        </Link>
      )}
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
        <em>{event.description}</em>
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
              <p>{event.description}</p>
            </div>
            <a href="tel:+14025563344">Call for details</a>
          </article>
        );
      })}
    </>
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
