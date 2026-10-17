import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import sampleGuests from "../data/sample-guests.json";
import { LumaError, useLuma } from "../src/luma/LumaBridge";
import { loadLinkedEvents, lookupEvent, saveLinkedEvents } from "../src/luma/events";
import { mergeEvents, parsePastedGuests } from "../src/luma/normalize";
import { useStore } from "../src/store";
import type { Guest, LumaEvent } from "../src/types";
import { Button, Label, colors } from "../src/ui";

type LumaState = "loading" | "signedOut" | "ready" | "error" | "unavailable";

export default function Events() {
  const router = useRouter();
  const luma = useLuma();
  const { profile, setGuests } = useStore();
  const [lumaState, setLumaState] = useState<LumaState>(luma.available ? "loading" : "unavailable");
  const [myEvents, setMyEvents] = useState<LumaEvent[]>([]);
  const [linked, setLinked] = useState<LumaEvent[]>([]);
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reload on every focus, so coming back from the Luma sign-in shows your events.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadLinkedEvents().then((list) => !cancelled && setLinked(list));
      if (luma.available) {
        setLumaState("loading");
        (async () => {
          try {
            if (!(await luma.isSignedIn())) return !cancelled && setLumaState("signedOut");
            const events = await luma.fetchMyEvents();
            if (!cancelled) {
              setMyEvents(events);
              setLumaState("ready");
            }
          } catch {
            if (!cancelled) setLumaState("error");
          }
        })();
      }
      return () => {
        cancelled = true;
      };
    }, [luma]),
  );

  const go = (eventName: string, guests: Guest[]) => {
    setGuests(eventName, guests);
    router.push("/results");
  };

  const openEvent = async (event: LumaEvent) => {
    setError(null);
    if (!luma.available) {
      return setError("Loading a guest list needs the phone app (Expo Go). On web, use the sample event or paste the list.");
    }
    setOpeningId(event.id);
    try {
      if (!(await luma.isSignedIn())) return router.push("/login");
      const guests = await luma.fetchGuests(event.id, (n) => setStatus(`Loaded ${n} guests…`));
      go(event.name, guests);
    } catch (e) {
      setError(e instanceof LumaError ? e.message : "Something went wrong talking to Luma. Try pasting the list instead.");
    } finally {
      setOpeningId(null);
      setStatus(null);
    }
  };

  const addByLink = async () => {
    setError(null);
    setAdding(true);
    try {
      const event = await lookupEvent(link);
      const next = mergeEvents(linked, [event]);
      setLinked(next);
      await saveLinkedEvents(next);
      setLink("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that event.");
    } finally {
      setAdding(false);
    }
  };

  const usePasted = () => {
    setError(null);
    const guests = parsePastedGuests(pasted);
    if (guests.length === 0) return setError("Couldn't find any guests in that text.");
    go("Pasted guest list", guests);
  };

  const events = mergeEvents(myEvents, linked);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push("/onboarding")} hitSlop={12}>
              <Text style={styles.headerLink}>Edit profile</Text>
            </Pressable>
          ),
        }}
      />
      <Text style={styles.meta}>Looking for: {profile.goal}</Text>

      <Label>Your Luma events</Label>
      {lumaState === "loading" && <Text style={styles.hint}>Checking your Luma events…</Text>}
      {lumaState === "signedOut" && (
        <>
          <Text style={styles.hint}>Sign in to Luma to see the events you're going to. Your sign-in stays on this phone.</Text>
          <Button title="Sign in to Luma" onPress={() => router.push("/login")} />
        </>
      )}
      {lumaState === "error" && (
        <Text style={styles.hint}>Couldn't load your Luma events. Add one by link below, or try again later.</Text>
      )}
      {lumaState === "unavailable" && (
        <Text style={styles.hint}>Your own Luma events show up in the phone app. On web, add an event by link.</Text>
      )}
      {lumaState === "ready" && events.length === 0 && (
        <Text style={styles.hint}>No upcoming events on your Luma account. Add one by link below.</Text>
      )}

      {events.map((event) => (
        <EventCard key={event.id} event={event} loading={openingId === event.id} onPress={() => openEvent(event)} />
      ))}
      {status && <Text style={styles.hint}>{status}</Text>}

      <Label>Add an event by link</Label>
      <TextInput
        style={styles.input}
        placeholder="luma.com/your-event"
        autoCapitalize="none"
        autoCorrect={false}
        value={link}
        onChangeText={setLink}
        onSubmitEditing={addByLink}
      />
      <Button title="Add event" variant="secondary" onPress={addByLink} loading={adding} disabled={!link.trim()} />

      <Label>Just trying it out?</Label>
      <Button
        title="Try with a sample event"
        variant="secondary"
        onPress={() => go("Sample: Berlin AI Meetup", sampleGuests as Guest[])}
      />
      {!pasteOpen && <Button title="Paste a guest list instead" variant="secondary" onPress={() => setPasteOpen(true)} />}
      {pasteOpen && (
        <View>
          <Label>Paste a guest list</Label>
          <TextInput
            style={[styles.input, styles.paste]}
            placeholder={"One name per line, or Luma's guest-list JSON"}
            value={pasted}
            onChangeText={setPasted}
            multiline
          />
          <Button title="Rank these guests" onPress={usePasted} disabled={!pasted.trim()} />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function EventCard({ event, loading, onPress }: { event: LumaEvent; loading: boolean; onPress: () => void }) {
  const when = event.startAt
    ? new Date(event.startAt).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      {event.coverUrl ? (
        <Image source={{ uri: event.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, { backgroundColor: colors.accentSoft }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>
          {event.name}
        </Text>
        <Text style={styles.meta}>
          {[when, event.guestCount !== undefined ? `${event.guestCount} going` : null].filter(Boolean).join(" · ")}
        </Text>
        <Text style={styles.cta}>{loading ? "Loading guests…" : "Find who to meet →"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  headerLink: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  meta: { color: colors.muted, marginTop: 4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  paste: { minHeight: 140, textAlignVertical: "top" },
  hint: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 12, color: colors.error, fontSize: 15 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
  },
  cover: { width: 64, height: 64, borderRadius: 10 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  cta: { color: colors.accent, fontWeight: "600", marginTop: 6 },
});
