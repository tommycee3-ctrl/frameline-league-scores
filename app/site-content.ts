export type AnnouncementBanner = {
  active: boolean;
  message: string;
  detail: string;
  linkLabel: string;
  linkHref: string;
  tone: "coral" | "yellow" | "navy";
};

export type ManagedEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  featured: boolean;
};

export type ManagedRate = {
  id: string;
  name: string;
  price: string;
  detail: string;
};
export type ManagedHours = { id: string; days: string; hours: string };

export type SiteContent = {
  banner: AnnouncementBanner;
  events: ManagedEvent[];
  rates: ManagedRate[];
  hours: ManagedHours[];
  staffEmails: string[];
};

export const initialAdminEmail = "tommycee3@gmail.com";

export const defaultSiteContent: SiteContent = {
  banner: {
    active: true,
    message: "Saturday hours update",
    detail: "Open bowling begins at noon. Call ahead for lane availability.",
    linkLabel: "View hours",
    linkHref: "/open-bowling",
    tone: "coral",
  },
  events: [
    {
      id: "spider-man-day",
      date: "2026-08-01",
      time: "Noon–2 PM",
      title: "National Spider-Man Day",
      description: "$3 games, $3 shoes, character visits and family fun.",
      featured: true,
    },
    {
      id: "cosmic-after-dark",
      date: "2026-08-15",
      time: "9 PM–Midnight",
      title: "Cosmic After Dark",
      description: "Black lights, music, lane effects and late-night bowling.",
      featured: false,
    },
  ],
  rates: [
    {
      id: "weekday",
      name: "Weekday game",
      price: "$5.50",
      detail: "Per person · before 6 PM",
    },
    {
      id: "evening",
      name: "Evening game",
      price: "$7.50",
      detail: "Per person · after 6 PM",
    },
    {
      id: "hour",
      name: "Lane by the hour",
      price: "$42",
      detail: "Up to 5 bowlers · before 6 PM",
    },
    { id: "shoes", name: "Shoe rental", price: "$4", detail: "Per bowler" },
  ],
  hours: [
    { id: "mon-thu", days: "Monday – Thursday", hours: "12 PM – 11 PM" },
    { id: "fri-sat", days: "Friday – Saturday", hours: "12 PM – Midnight" },
    { id: "sun", days: "Sunday", hours: "10 AM – 10 PM" },
  ],
  staffEmails: [initialAdminEmail],
};

export const contentApiUrl = () =>
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("github.io")
    ? "https://west-lanes-bowling.tommycee3.chatgpt.site/api/site-content"
    : "/api/site-content";
