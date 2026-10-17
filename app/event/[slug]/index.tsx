import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { lookupEvent } from "../../../src/api";
import { NeedsLumaLogin, loadEventGuests } from "../../../src/eventGuests";
import { LumaError, useLuma } from "../../../src/luma/LumaBridge";
import { FEATURED_EVENT } from "../../../src/luma/featured";
import { parseEventLink } from "../../../src/luma/normalize";
import { useStore } from "../../../src/store";
import type { LumaEvent } from "../../../src/types";
import { Button, Label, colors, scoreColor } from "../../../src/ui";

// Details of one event: when, where, who hosts it, Claude's reason, and the full description.
// Shows what the events list already knew right away, then fills in the rest from Luma.
export default function EventDetails() {
  const router = useRouter();
  const luma = useLuma();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile, selected, setGuests } = useStore();
  const known = selected?.event.slug === slug ? selected : null;
  const pick = known?.pick;
  const [event, setEvent] = useState<LumaEvent | null>(known?.event ?? null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Web only: Luma gives every guest a personal ticket link (?tk=...), which unlocks the guest list without a sign-in.
  const [ticketLink, setTicketLink] = useState("");
  // Our own event also works without one (the configured teammates), so there it's optional.
  const showTicketLink = !luma.available;
  const needsTicketLink = showTicketLink && slug !== FEATURED_EVENT.slug;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    lookupEvent(slug)
      .then((fresh) => !cancelled && setEvent((prev) => ({ ...prev, ...fresh })))
      .catch(() => !cancelled && setLookupFailed(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const findPeople = async () => {
    if (!event) return;
    setError(null);
    setOpening(true);
    try {
      const ticketKey = showTicketLink ? parseEventLink(ticketLink)?.ticketKey : undefined;
      if (needsTicketLink && !ticketKey) {
        throw new LumaError("Paste the full ticket link from your Luma confirmation email (it contains ?tk=).");
      }
      const { guests, warning } = await loadEventGuests(event, profile, luma, setStatus, ticketKey);
      if (warning) setError(warning);
      setGuests(event.name, guests);
      router.push({ pathname: "/event/[slug]/people", params: { slug: event.slug } });
    } catch (e) {
      if (e instanceof NeedsLumaLogin) return router.push("/login");
      const team = event.slug === FEATURED_EVENT.slug;
      const fallback = team
        ? "Couldn't load the team's profiles."
        : "Something went wrong talking to Luma. Try pasting the list instead.";
      setError(e instanceof LumaError || (team && e instanceof Error) ? e.message : fallback);
    } finally {
      setOpening(false);
      setStatus(null);
    }
  };

  if (!event) {
    return (
      <View style={styles.page}>
        {lookupFailed ? (
          <>
            <Text style={styles.error}>Couldn't load this event from Luma.</Text>
            <Button title="Back to events" variant="secondary" onPress={() => router.replace("/events")} />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  const going = event.guestCount !== undefined ? `${event.guestCount} going` : null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {event.coverUrl ? (
        <Image source={{ uri: event.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, { backgroundColor: colors.accentSoft }]} />
      )}
      <Text style={styles.name}>{event.name}</Text>

      <View style={styles.facts}>
        {event.startAt && <Fact label="When" value={formatWhen(event.startAt, event.endAt)} />}
        <Fact label="Where" value={event.address ?? event.city ?? "Shown on Luma after you register"} />
        {(event.hosts?.length || event.hostName) && (
          <Fact label="Hosted by" value={event.hosts?.length ? event.hosts.join(", ") : event.hostName!} />
        )}
        {going && <Fact label="Guests" value={going} />}
      </View>

      {pick && (
        <View style={styles.pick}>
          <View style={styles.row}>
            <View style={[styles.score, { backgroundColor: scoreColor(pick.score) }]}>
              <Text style={styles.scoreText}>{pick.score}</Text>
            </View>
            <Text style={styles.pickTitle}>Why it fits your goal</Text>
          </View>
          <Text style={styles.body}>{pick.why}</Text>
        </View>
      )}

      {showTicketLink && (
        <>
          <Label>{needsTicketLink ? "Your Luma ticket link" : "Your Luma ticket link (optional)"}</Label>
          <TextInput
            style={styles.input}
            value={ticketLink}
            onChangeText={setTicketLink}
            placeholder="https://luma.com/…?tk=…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>On the web the guest list unlocks with the personal link from your Luma confirmation email.</Text>
        </>
      )}
      <Button title="Find who to meet" onPress={findPeople} loading={opening} />
      {status && <Text style={styles.hint}>{status}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title="View on Luma"
        variant="secondary"
        onPress={() => Linking.openURL(`https://luma.com/${event.slug}`)}
      />

      <Label>About this event</Label>
      {event.description ? (
        <Text style={styles.body}>{event.description}</Text>
      ) : lookupFailed ? (
        <Text style={styles.hint}>Couldn't load the description. Open the event on Luma to read it.</Text>
      ) : (
        <ActivityIndicator color={colors.accent} style={{ alignSelf: "flex-start" }} />
      )}
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function formatWhen(startAt: string, endAt?: string): string {
  const start = new Date(startAt);
  const day = start.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time(start)}${endAt ? ` – ${time(new Date(endAt))}` : ""}`;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  cover: { width: "100%", aspectRatio: 1, maxHeight: 320, borderRadius: 16, alignSelf: "center" },
  name: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: 16 },
  facts: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  fact: { flexDirection: "row", gap: 12 },
  factLabel: { width: 80, color: colors.muted, fontWeight: "600" },
  factValue: { flex: 1, color: colors.text, lineHeight: 20 },
  pick: { backgroundColor: colors.accentSoft, borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 4 },
  pickTitle: { fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  score: { borderRadius: 999, minWidth: 36, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" },
  scoreText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  body: { color: colors.text, lineHeight: 22, fontSize: 15 },
  hint: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    fontSize: 15,
  },
  error: { marginTop: 12, color: colors.error, fontSize: 15 },
});
