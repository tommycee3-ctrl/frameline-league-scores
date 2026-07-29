import Link from "next/link";

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro: string; action?: { href: string; label: string } }) {
  return (
    <section className="page-hero">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>
      <div className="page-hero-art" aria-hidden="true"><div className="big-ball"><i/><i/><i/></div></div>
      {action && <Link className="button button-light" href={action.href}>{action.label}</Link>}
    </section>
  );
}
