import type { EventPick, LumaEvent } from "../types";

// Our own event, always pinned to the top of "Picked for you" (https://luma.com/noyhvgai).
// It appears together with Claude's picks. These details are the fallback; the events screen
// refreshes them (e.g. guest count) from Luma.
export const FEATURED_EVENT: LumaEvent = {
  id: "evt-T3Uts4RWMmuJtgU",
  slug: "noyhvgai",
  name: "RoomRead Presentation",
  startAt: "2026-10-17T18:00:00.000Z",
  endAt: "2026-10-17T19:00:00.000Z",
  coverUrl: "https://images.lumacdn.com/gallery-images/ni/6dead781-4636-44be-80bb-c348ca463a5b",
};

// Fixed score and reason for our event, written by us (not by Claude), shown in the same style as Claude's picks.
export const FEATURED_PICK: EventPick = {
  id: FEATURED_EVENT.id,
  score: 96,
  why: "A live intro to RoomRead: learn how to choose who to talk to at events, then put it to use in the room.",
};
