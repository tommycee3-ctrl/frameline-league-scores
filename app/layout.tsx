import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { MobileNav } from "./mobile-nav";
import { PwaRegister } from "./pwa-register";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: process.env.GITHUB_ACTIONS === "true"
    ? new URL("https://tommycee3-ctrl.github.io/frameline-league-scores/")
    : undefined,
  title: { default: "FrameLine", template: "%s | FrameLine" },
  description: "Local bowling league standings, scores, recaps, bowlers and lane assignments in one easy-to-use app.",
  manifest: `${assetBase}/manifest.webmanifest`,
  icons: {
    icon: `${assetBase}/frameline-mark.svg`,
    shortcut: `${assetBase}/icon-192.png`,
    apple: `${assetBase}/icon-192.png`,
  },
  applicationName: "FrameLine",
  appleWebApp: { capable: true, title: "FrameLine", statusBarStyle: "black-translucent" },
};

const links = [["/leagues", "My Leagues"]] as const;

function FrameLineMark() {
  return <span className="frameline-mark" aria-hidden="true"><span>9</span><span>/</span><span>X</span><em>FRAME 10</em></span>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="frameline-app">
        <PwaRegister />
        <header className="site-header frameline-header">
          <Link href="/" className="brand frameline-brand" aria-label="FrameLine home">
            <FrameLineMark />
            <span>FRAMELINE<small>LOCAL LEAGUE SCORES</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/leagues">My Leagues</Link>
            <Link href="/leagues#league-settings">Add a League</Link>
          </nav>
          <MobileNav links={links} />
        </header>
        <main>{children}</main>
        <footer className="site-footer frameline-footer">
          <div>
            <Link href="/" className="footer-wordmark"><FrameLineMark /> <strong>FRAMELINE</strong></Link>
            <p>Local bowling scores, without the runaround.</p>
          </div>
          <div>
            <strong>Independent league hub</strong>
            <p>Not affiliated with any bowling center or scoring provider.</p>
          </div>
          <div>
            <Link href="/leagues">My Leagues</Link>
            <Link href="/leagues#league-settings">Add a League</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
