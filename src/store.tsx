import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { EventPick, Guest, LumaEvent, Match, Profile } from "./types";

// Guests and matches stay in memory only and vanish when the app closes.
// Only the user's own profile is saved on the device.

type Store = {
  /** True once the saved profile has been read from the device. */
  ready: boolean;
  profile: Profile;
  setProfile: (p: Profile) => void;
  eventName: string;
  guests: Guest[];
  setGuests: (eventName: string, guests: Guest[]) => void;
  matches: Match[] | null;
  setMatches: (m: Match[] | null) => void;
  /** The event the user tapped, so its details page can show it right away. */
  selected: { event: LumaEvent; pick?: EventPick } | null;
  setSelected: (s: { event: LumaEvent; pick?: EventPick } | null) => void;
};

const PROFILE_KEY = "roomradar.profile";
const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile>({ goal: "", background: "" });
  const [eventName, setEventName] = useState("");
  const [guests, setGuestsState] = useState<Guest[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Store["selected"]>(null);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then((raw) => raw && setProfileState(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setProfile = (p: Profile) => {
    setProfileState(p);
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)).catch(() => {});
  };

  const setGuests = (name: string, list: Guest[]) => {
    setEventName(name);
    setGuestsState(list);
    setMatches(null);
  };

  return (
    <StoreContext.Provider value={{ ready, profile, setProfile, eventName, guests, setGuests, matches, setMatches, selected, setSelected }}>
      {children}
    </StoreContext.Provider>
  );
}
