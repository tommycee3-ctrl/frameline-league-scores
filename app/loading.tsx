export default function Loading() {
  return (
    <div className="lane-loader" role="status" aria-live="polite">
      <div className="loader-stage" aria-hidden="true">
        <div className="loader-lane"/>
        <div className="loader-ball"><i/><i/><i/></div>
        <div className="loader-pins">
          <span/><span/><span/><span/><span/>
        </div>
        <div className="loader-impact"/>
      </div>
      <p>Setting the pins…</p>
    </div>
  );
}
