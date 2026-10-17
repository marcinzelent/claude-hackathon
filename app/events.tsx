import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import sampleGuests from "../data/sample-guests.json";
import { useLuma } from "../src/luma/LumaBridge";
import { discoverEvents, lookupEvent, type Discovery } from "../src/api";
import { loadLinkedEvents, saveLinkedEvents } from "../src/luma/events";
import { FEATURED_EVENT, FEATURED_PICK } from "../src/luma/featured";
import { mergeEvents, parsePastedGuests } from "../src/luma/normalize";
import { useStore } from "../src/store";
import type { EventPick, Guest, LumaEvent } from "../src/types";
import { Button, Label, colors, scoreColor } from "../src/ui";

type LumaState = "loading" | "signedOut" | "ready" | "error" | "unavailable";

export default function Events() {
  const router = useRouter();
  const luma = useLuma();
  const { profile, setProfile, setGuests, setSelected } = useStore();
  const [lumaState, setLumaState] = useState<LumaState>(luma.available ? "loading" : "unavailable");
  const [myEvents, setMyEvents] = useState<LumaEvent[]>([]);
  const [linked, setLinked] = useState<LumaEvent[]>([]);
  const [featured, setFeatured] = useState<LumaEvent>(FEATURED_EVENT);
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const discoverKey = useRef("");

  // Ask Claude for public events in the user's city, but only when the profile actually changed.
  const loadDiscovery = useCallback(async (force = false) => {
    const key = JSON.stringify([profile.goal, profile.background, profile.city]);
    if (!force && key === discoverKey.current) return;
    discoverKey.current = key;
    setDiscovery(null);
    setDiscoverError(null);
    try {
      const result = await discoverEvents(profile);
      if (discoverKey.current === key) setDiscovery(result);
    } catch (e) {
      if (discoverKey.current === key) setDiscoverError(e instanceof Error ? e.message : "Couldn't load suggestions.");
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadDiscovery();
    }, [loadDiscovery]),
  );

  // Reload on every focus, so coming back from the Luma sign-in shows your events.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadLinkedEvents().then((list) => !cancelled && setLinked(list));
      // Keep the pinned event's details (guest count) fresh; the hardcoded ones stay if Luma doesn't answer.
      lookupEvent(FEATURED_EVENT.slug)
        .then((fresh) => !cancelled && setFeatured({ ...FEATURED_EVENT, ...fresh }))
        .catch(() => {});
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

  // Tapping an event opens its details page; guests are loaded from there.
  const openEvent = (event: LumaEvent, pick?: EventPick) => {
    setSelected({ event, pick });
    router.push({ pathname: "/event/[slug]", params: { slug: event.slug } });
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

  // Our event is pinned to the top of "Picked for you", so it's left out of every other list.
  const events = mergeEvents(myEvents, linked).filter((e) => e.id !== featured.id);
  const mine = new Set([featured.id, ...events.map((e) => e.id)]);
  const byId = new Map((discovery?.events ?? []).map((e) => [e.id, e]));
  const picks = (discovery?.picks ?? [])
    .filter((p) => !mine.has(p.id) && byId.has(p.id))
    .map((p) => ({ pick: p, event: byId.get(p.id)! }));
  const city = profile.city?.trim() || "Berlin";

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
      {/* Clears the saved profile (goal, background, LinkedIn link) and starts again from onboarding. */}
      <Pressable
        onPress={() => {
          setProfile({ goal: "", background: "" });
          router.replace("/onboarding");
        }}
        hitSlop={8}
      >
        <Text style={styles.startOver}>Start over</Text>
      </Pressable>

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
        <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />
      ))}

      <Label>Picked for you in {discovery?.city || city}</Label>
      {!discovery && !discoverError && (
        <View style={styles.row}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.hint}>Claude is reading this week's events in {city}…</Text>
        </View>
      )}
      {discoverError && (
        <>
          <Text style={styles.error}>{discoverError}</Text>
          <Button title="Try again" variant="secondary" onPress={() => loadDiscovery(true)} />
        </>
      )}
      {discovery && picks.length === 0 && (
        <Text style={styles.hint}>
          Nothing in the {discovery.events.length} upcoming public events fits your goal right now. Check back in a few days.
        </Text>
      )}
      {discovery && picks.length > 0 && (
        <Text style={styles.hint}>
          {picks.length} of {discovery.events.length} upcoming public events on Luma fit your goal.
        </Text>
      )}
      {/* Our event shows up with Claude's picks, not before them. */}
      {discovery && (
        <EventCard
          event={featured}
          pick={FEATURED_PICK}
          onPress={() => openEvent(featured, FEATURED_PICK)}
        />
      )}
      {picks.map(({ pick, event }) => (
        <EventCard
          key={event.id}
          event={event}
          pick={pick}
          onPress={() => openEvent(event, pick)}
        />
      ))}

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

function EventCard({
  event,
  pick,
  onPress,
}: {
  event: LumaEvent;
  pick?: EventPick;
  onPress: () => void;
}) {
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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      {event.coverUrl ? (
        <Image source={{ uri: event.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, { backgroundColor: colors.accentSoft }]} />
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={[styles.name, { flex: 1 }]} numberOfLines={2}>
            {event.name}
          </Text>
          {pick && (
            <View style={[styles.score, { backgroundColor: scoreColor(pick.score) }]}>
              <Text style={styles.scoreText}>{pick.score}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {[when, event.hostName, event.guestCount ? `${event.guestCount} going` : event.guestCount === 0 ? "0 going" : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {pick && <Text style={styles.why}>{pick.why}</Text>}
        <Text style={styles.cta}>See details →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  headerLink: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  startOver: { color: colors.accent, fontWeight: "600", marginTop: 6 },
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
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  why: { color: colors.text, marginTop: 6, lineHeight: 20 },
  score: { borderRadius: 999, minWidth: 36, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" },
  scoreText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
