import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Guest, Match, Profile } from "./types";

// Guests and matches stay in memory only and vanish when the app closes.
// Only the user's own profile is saved on the device.

type Store = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  eventName: string;
  guests: Guest[];
  setGuests: (eventName: string, guests: Guest[]) => void;
  matches: Match[] | null;
  setMatches: (m: Match[] | null) => void;
  // The user chose "continue without Luma" on the connect screen (this app session only).
  connectSkipped: boolean;
  setConnectSkipped: (skipped: boolean) => void;
};

const PROFILE_KEY = "roomradar.profile";
const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>({ goal: "", background: "" });
  const [eventName, setEventName] = useState("");
  const [guests, setGuestsState] = useState<Guest[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [connectSkipped, setConnectSkipped] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then((raw) => raw && setProfileState(JSON.parse(raw)))
      .catch(() => {});
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
    <StoreContext.Provider
      value={{ profile, setProfile, eventName, guests, setGuests, matches, setMatches, connectSkipped, setConnectSkipped }}
    >
      {children}
    </StoreContext.Provider>
  );
}
