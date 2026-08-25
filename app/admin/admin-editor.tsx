"use client";

import { useEffect, useRef, useState } from "react";
import {
  contentApiUrl,
  defaultSiteContent,
  type SiteContent,
} from "../site-content";

const blankEvent = () => ({
  id: crypto.randomUUID(),
  date: "",
  time: "",
  title: "",
  description: "",
  featured: false,
});

function EventDescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const insert = (before: string, after = before) => {
    const field = textarea.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = value.slice(start, end);
    onChange(
      `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`,
    );
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, end + before.length);
    });
  };
  return (
    <div className="rich-event-editor">
      <div className="rich-event-toolbar">
        <button type="button" onClick={() => insert("**")}>
          Bold selected text
        </button>
        <button type="button" onClick={() => insert("\n\n", "")}>
          Add paragraph space
        </button>
        <span>Tip: blank lines create separate paragraphs.</span>
      </div>
      <textarea
        ref={textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function AdminEditor() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [viewer, setViewer] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [newStaff, setNewStaff] = useState("");

  useEffect(() => {
    fetch(`${contentApiUrl()}?admin=1`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        body: await response.json(),
      }))
      .then(({ ok, body }) => {
        if (body.content) setContent(body.content);
        setViewer(body.viewer ?? "");
        setAuthorized(Boolean(ok && body.authorized));
      })
      .catch(() =>
        setNotice(
          "The editor could not connect. Please refresh and try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const updateList = <K extends "events" | "rates" | "hours">(
    key: K,
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setContent((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(contentApiUrl(), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save");
      setContent(result.content);
      setNotice("Published. The public website has been updated.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <section className="admin-shell">
        <p>Opening the West Lanes site manager…</p>
      </section>
    );
  if (!viewer)
    return (
      <section className="admin-shell admin-access">
        <p className="eyebrow red">Staff access</p>
        <h1>West Lanes Site Manager</h1>
        <p>
          Sign in with the authorized ChatGPT email to edit public website
          information.
        </p>
        <a
          className="button button-dark"
          href="/signin-with-chatgpt?return_to=%2Fadmin"
        >
          Sign in to continue
        </a>
      </section>
    );
  if (!authorized)
    return (
      <section className="admin-shell admin-access">
        <p className="eyebrow red">Access restricted</p>
        <h1>This account is not authorized.</h1>
        <p>
          You are signed in as <strong>{viewer}</strong>. Ask an existing site
          manager to add this email.
        </p>
        <a href="/signout-with-chatgpt?return_to=%2Fadmin">
          Use another account
        </a>
      </section>
    );

  return (
    <section className="admin-shell">
      <header className="admin-heading">
        <div>
          <p className="eyebrow red">Staff only</p>
          <h1>West Lanes Site Manager</h1>
          <p>
            Update the public website without editing code. Changes go live when
            you press Publish.
          </p>
        </div>
        <div>
          <small>Signed in as</small>
          <strong>{viewer}</strong>
          <a href="/signout-with-chatgpt?return_to=%2Fadmin">Sign out</a>
        </div>
      </header>

      <div className="admin-preview banner-editor-preview">
        <span>Live banner preview</span>
        {content.banner.active ? (
          <div className={`managed-banner banner-${content.banner.tone}`}>
            <div>
              <strong>{content.banner.message || "Your announcement"}</strong>
              <span>{content.banner.detail}</span>
            </div>
            <b>{content.banner.linkLabel}</b>
          </div>
        ) : (
          <p>Banner is currently hidden.</p>
        )}
      </div>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <p className="eyebrow red">Announcement banner</p>
            <h2>Closing early, specials and urgent updates</h2>
          </div>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={content.banner.active}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: { ...content.banner, active: event.target.checked },
                })
              }
            />{" "}
            Show banner
          </label>
        </div>
        <div className="admin-form-grid">
          <label>
            Headline
            <input
              value={content.banner.message}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: { ...content.banner, message: event.target.value },
                })
              }
            />
          </label>
          <label>
            Short details
            <input
              value={content.banner.detail}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: { ...content.banner, detail: event.target.value },
                })
              }
            />
          </label>
          <label>
            Button text
            <input
              value={content.banner.linkLabel}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: { ...content.banner, linkLabel: event.target.value },
                })
              }
            />
          </label>
          <label>
            Button destination
            <input
              value={content.banner.linkHref}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: { ...content.banner, linkHref: event.target.value },
                })
              }
            />
          </label>
          <label>
            Banner color
            <select
              value={content.banner.tone}
              onChange={(event) =>
                setContent({
                  ...content,
                  banner: {
                    ...content.banner,
                    tone: event.target.value as SiteContent["banner"]["tone"],
                  },
                })
              }
            >
              <option value="coral">West Lanes red</option>
              <option value="yellow">Attention yellow</option>
              <option value="navy">West Lanes navy</option>
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <p className="eyebrow red">Events</p>
            <h2>Upcoming events</h2>
          </div>
          <button
            onClick={() =>
              setContent({
                ...content,
                events: [...content.events, blankEvent()],
              })
            }
          >
            + Add event
          </button>
        </div>
        <div className="admin-records">
          {content.events.map((event, index) => (
            <article key={event.id}>
              <div className="admin-record-heading">
                <strong>{event.title || "New event"}</strong>
                <button
                  onClick={() =>
                    setContent({
                      ...content,
                      events: content.events.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <div className="admin-form-grid">
                <label>
                  Event name
                  <input
                    value={event.title}
                    onChange={(e) =>
                      updateList("events", index, "title", e.target.value)
                    }
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={event.date}
                    onChange={(e) =>
                      updateList("events", index, "date", e.target.value)
                    }
                  />
                </label>
                <label>
                  Time
                  <input
                    value={event.time}
                    onChange={(e) =>
                      updateList("events", index, "time", e.target.value)
                    }
                  />
                </label>
                <label className="wide-field">
                  Description
                  <EventDescriptionEditor
                    value={event.description}
                    onChange={(value) =>
                      updateList("events", index, "description", value)
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={event.featured}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        events: content.events.map((item, itemIndex) => ({
                          ...item,
                          featured:
                            itemIndex === index
                              ? e.target.checked
                              : e.target.checked
                                ? false
                                : item.featured,
                        })),
                      })
                    }
                  />{" "}
                  Feature on homepage
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <p className="eyebrow red">Pricing</p>
            <h2>Open bowling costs</h2>
          </div>
          <button
            onClick={() =>
              setContent({
                ...content,
                rates: [
                  ...content.rates,
                  { id: crypto.randomUUID(), name: "", price: "", detail: "" },
                ],
              })
            }
          >
            + Add price
          </button>
        </div>
        <div className="admin-records compact-records">
          {content.rates.map((rate, index) => (
            <article key={rate.id}>
              <div className="admin-form-grid">
                <label>
                  Name
                  <input
                    value={rate.name}
                    onChange={(e) =>
                      updateList("rates", index, "name", e.target.value)
                    }
                  />
                </label>
                <label>
                  Price
                  <input
                    value={rate.price}
                    onChange={(e) =>
                      updateList("rates", index, "price", e.target.value)
                    }
                  />
                </label>
                <label>
                  Details
                  <input
                    value={rate.detail}
                    onChange={(e) =>
                      updateList("rates", index, "detail", e.target.value)
                    }
                  />
                </label>
                <button
                  className="remove-inline"
                  onClick={() =>
                    setContent({
                      ...content,
                      rates: content.rates.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <p className="eyebrow red">Hours</p>
            <h2>Regular business hours</h2>
          </div>
          <button
            onClick={() =>
              setContent({
                ...content,
                hours: [
                  ...content.hours,
                  { id: crypto.randomUUID(), days: "", hours: "" },
                ],
              })
            }
          >
            + Add hours
          </button>
        </div>
        <div className="admin-records compact-records">
          {content.hours.map((item, index) => (
            <article key={item.id}>
              <div className="admin-form-grid">
                <label>
                  Days
                  <input
                    value={item.days}
                    onChange={(e) =>
                      updateList("hours", index, "days", e.target.value)
                    }
                  />
                </label>
                <label>
                  Hours
                  <input
                    value={item.hours}
                    onChange={(e) =>
                      updateList("hours", index, "hours", e.target.value)
                    }
                  />
                </label>
                <button
                  className="remove-inline"
                  onClick={() =>
                    setContent({
                      ...content,
                      hours: content.hours.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <p className="eyebrow red">Authorized staff</p>
            <h2>Who can edit this site</h2>
          </div>
        </div>
        <div className="staff-list">
          {content.staffEmails.map((email) => (
            <span key={email}>
              {email}
              {email !== "tommycee3@gmail.com" && (
                <button
                  onClick={() =>
                    setContent({
                      ...content,
                      staffEmails: content.staffEmails.filter(
                        (item) => item !== email,
                      ),
                    })
                  }
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="add-staff">
          <input
            type="email"
            value={newStaff}
            onChange={(e) => setNewStaff(e.target.value)}
            placeholder="staff@example.com"
          />
          <button
            onClick={() => {
              const email = newStaff.trim().toLowerCase();
              if (email && !content.staffEmails.includes(email))
                setContent({
                  ...content,
                  staffEmails: [...content.staffEmails, email],
                });
              setNewStaff("");
            }}
          >
            Add staff email
          </button>
        </div>
      </section>

      <div className="admin-publish-bar">
        <div>
          {notice && <strong>{notice}</strong>}
          <span>
            Review your changes, then publish them to the public site.
          </span>
        </div>
        <button onClick={save} disabled={saving}>
          {saving ? "Publishing…" : "Publish website changes"}
        </button>
      </div>
    </section>
  );
}
