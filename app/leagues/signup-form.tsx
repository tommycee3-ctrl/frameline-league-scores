"use client";

import { FormEvent, useState } from "react";

export function LeagueForm() {
  const [status, setStatus] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = [
      `Name: ${form.get("name")}`, `Email: ${form.get("email")}`, `Phone: ${form.get("phone")}`,
      `Interested league: ${form.get("league")}`, `Experience: ${form.get("experience")}`,
      `Joining as: ${form.get("joining")}`, `Notes: ${form.get("notes") || "None"}`,
    ];
    const mailto = `mailto:new_west_lanes@yahoo.com?subject=${encodeURIComponent("West Lanes league interest")}&body=${encodeURIComponent(lines.join("\n"))}`;
    setStatus("Your email app is opening. Review the message, then press Send.");
    window.location.href = mailto;
  }
  return (
    <form className="signup-form" onSubmit={submit}>
      <label>Full name<input name="name" required autoComplete="name"/></label>
      <label>Email address<input name="email" required type="email" autoComplete="email"/></label>
      <label>Phone number<input name="phone" required type="tel" autoComplete="tel"/></label>
      <label>League interest<select name="league" defaultValue="Nationals League 26–27"><option>Nationals League 26–27</option><option>Any West Lanes league</option><option>Mixed league</option><option>Scratch league</option><option>Women&apos;s league</option><option>Social league</option><option>Senior league</option></select></label>
      <label>Bowling experience<select name="experience" defaultValue="Casual bowler"><option>New bowler</option><option>Casual bowler</option><option>League bowler</option><option>Competitive bowler</option></select></label>
      <label>Joining as<select name="joining" defaultValue="Individual"><option>Individual</option><option>Pair</option><option>Full team</option></select></label>
      <label className="full-field">Anything else?<textarea name="notes" rows={4} placeholder="Preferred night, teammates, questions..."/></label>
      <button className="button button-primary full-field" type="submit">Prepare my league request</button>
      {status && <p className="form-status full-field" role="status">{status}</p>}
    </form>
  );
}
