export type GuestLinks = {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
};

// One of the signed-in user's upcoming Luma events.
export type LumaEvent = {
  apiId: string;
  name: string;
  slug: string;
  startAt: string; // ISO date
  timezone?: string;
};

export type Guest = {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  lumaUrl?: string;
  links: GuestLinks;
  /** A LinkedIn profile found by name search for a guest who didn't connect one. Always a possible match. */
  linkedinGuess?: LinkedinGuess;
};

export type LinkedinGuess = {
  url: string;
  reason: string; // why the profile looks like this guest, e.g. "Same name, and both mention Acme AI in Berlin"
};

export type Profile = {
  goal: string; // e.g. "Land my first job as an ML engineer"
  background: string; // e.g. "Bootcamp grad, 3 years as a data analyst"
};

export type Match = {
  id: string;
  score: number; // 0-100
  why: string;
  opener: string;
  learn: string;
};

export type RankedGuest = Guest & { match?: Match };
