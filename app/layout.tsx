import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { MobileNav } from "./mobile-nav";
import { ArrowRight, FacebookMark, MailMark, PhoneMark } from "./ui";

export const metadata: Metadata = {
  metadataBase: process.env.GITHUB_ACTIONS === "true"
    ? new URL("https://tommycee3-ctrl.github.io/west-lanes-bowling/")
    : undefined,
  title: { default: "West Lanes Bowlatorium", template: "%s | West Lanes" },
  description: "Omaha bowling, leagues, cosmic bowling and events at West Lanes Bowlatorium, established 1955.",
  openGraph: {
    title: "West Lanes Bowlatorium",
    description: "Omaha's neighborhood lanes since 1955.",
    type: "website",
    images: [{ url: "/og.png", width: 1747, height: 909, alt: "West Lanes Bowlatorium" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "West Lanes Bowlatorium",
    description: "Omaha's neighborhood lanes since 1955.",
    images: ["/og.png"],
  },
};

const links = [
  ["/open-bowling", "Open Bowling"],
  ["/leagues", "Leagues"],
  ["/cosmic-bowling", "Cosmic Bowling"],
  ["/events", "Events"],
] as const;
const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="West Lanes home">
            <img src={`${assetBase}/west-lanes-logo.jpg`} alt="West Lanes Bowlatorium" />
            <span>WEST LANES<small>BOWLATORIUM · EST. 1955</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <MobileNav links={links} />
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="footer-main">
            <div className="footer-brand">
              <img src={`${assetBase}/west-lanes-logo.jpg`} alt="" />
              <p>A striking Omaha tradition since 1955.</p>
              <a className="facebook-link" href="https://www.facebook.com/share/199TAZEkJ6/?mibextid=wwXIfr" target="_blank" rel="noreferrer"><FacebookMark/> Follow West Lanes</a>
            </div>
            <div><h3>Visit</h3><p>151 N. 72nd St.<br/>Omaha, NE 68114</p><a href="https://maps.google.com/?q=151+N+72nd+St+Omaha+NE+68114" target="_blank" rel="noreferrer">Get directions <ArrowRight/></a></div>
            <div><h3>Contact</h3><a href="tel:+14025563344"><PhoneMark/> (402) 556-3344</a><a href="mailto:new_west_lanes@yahoo.com"><MailMark/> new_west_lanes@yahoo.com</a></div>
            <div><h3>Explore</h3>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</div>
          </div>
          <div className="footer-bottom"><span>© 2026 West Lanes Bowlatorium</span><span>Sample schedules and pricing are for preview only.</span></div>
        </footer>
      </body>
    </html>
  );
}
