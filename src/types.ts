export type GuestLinks = {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
};

export type Guest = {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  lumaUrl?: string;
  links: GuestLinks;
};

export type LumaEvent = {
  id: string; // "evt-..."
  slug: string; // luma.com/<slug>
  name: string;
  startAt?: string; // ISO date
  endAt?: string;
  city?: string;
  hostName?: string; // the Luma calendar that runs it
  coverUrl?: string;
  guestCount?: number;
};

/** Claude's pick of a public event for this job seeker. */
export type EventPick = { id: string; score: number; why: string };

export type Profile = {
  goal: string; // e.g. "Land my first job as an ML engineer"
  background: string; // e.g. "Bootcamp grad, 3 years as a data analyst"
  city?: string; // for event suggestions, e.g. "Berlin"
};

export type Match = {
  id: string;
  score: number; // 0-100
  why: string;
  opener: string;
  learn: string;
};

export type RankedGuest = Guest & { match?: Match };
