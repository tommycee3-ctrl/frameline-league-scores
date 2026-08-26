import Link from "next/link";

const features = [
  ["01", "Standings", "Sort teams by wins, average, pins or place."],
  ["02", "Bowler scores", "Search every bowler and open their full week."],
  ["03", "Weekly recaps", "See games, series and points in matchup order."],
  ["04", "Lane assignments", "Find the next matchup before league night."],
];

export default function Home() {
  return <div className="frameline-home">
    <section className="frameline-hero">
      <div className="hero-copy">
        <p className="frameline-kicker">YOUR LEAGUES. YOUR SCORES.</p>
        <h1>Every frame.<br/><em>One home.</em></h1>
        <p>Choose your area, bowling center and league once. FrameLine keeps your current leagues ready whenever you come back.</p>
        <div className="frameline-actions">
          <Link className="frameline-primary" href="/leagues">Open My Leagues <span>→</span></Link>
          <Link className="frameline-secondary" href="/manage-leagues">Add / Remove Leagues</Link>
        </div>
      </div>
      <div className="score-preview" aria-label="Example league scorecard">
        <div className="score-preview-top"><span>LIVE LEAGUE VIEW</span><b>WEEK 2</b></div>
        <div className="score-preview-row leader"><b>1</b><strong>Split Happens</strong><span>24 W</span></div>
        <div className="score-preview-row"><b>2</b><strong>Clean Frames</strong><span>22 W</span></div>
        <div className="score-preview-row"><b>3</b><strong>Ten Back</strong><span>19 W</span></div>
        <div className="score-preview-foot"><span>Standings updated</span><strong>2 MIN AGO</strong></div>
      </div>
    </section>
    <section className="frameline-feature-grid" aria-label="League tools">
      {features.map(([number, title, copy]) => <Link href="/leagues" key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p><b>Open My Leagues →</b></Link>)}
    </section>
    <section className="coverage-strip">
      <Link href="/manage-leagues?area=Omaha"><small>IMPORT IN PROGRESS</small><strong>OMAHA</strong><b>Choose area →</b></Link>
      <Link href="/manage-leagues?area=Bellevue"><small>AREA AVAILABLE</small><strong>BELLEVUE</strong><b>Choose area →</b></Link>
      <Link href="/manage-leagues?area=Lincoln"><small>AREA AVAILABLE</small><strong>LINCOLN</strong><b>Choose area →</b></Link>
      <Link href="/manage-leagues?area=Council%20Bluffs"><small>AREA AVAILABLE</small><strong>COUNCIL BLUFFS</strong><b>Choose area →</b></Link>
    </section>
  </div>;
}
