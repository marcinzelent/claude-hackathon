import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import sampleGuests from "../data/sample-guests.json";
import { formatEventDate } from "../src/luma/format";
import { LumaError, useLuma } from "../src/luma/LumaBridge";
import { parseEventLink, parsePastedGuests } from "../src/luma/normalize";
import { useStore } from "../src/store";
import type { Guest, LumaEvent } from "../src/types";
import { Button, Label, colors } from "../src/ui";

export default function Home() {
  const router = useRouter();
  const luma = useLuma();
  const { profile, setProfile, setGuests, setMatches, connectSkipped, setConnectSkipped } = useStore();
  const [eventInput, setEventInput] = useState("");
  const [pasteOpen, setPasteOpen] = useState(!luma.available);
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<LumaEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectFailed, setDisconnectFailed] = useState(false);

  const needsGoal = !profile.goal.trim();
  const connected = luma.status === "connected";

  const showError = (e: unknown) => {
    setError(e instanceof LumaError ? e.message : "Something went wrong talking to Luma. Try pasting the list instead.");
    // Signed out in the meantime: re-check, so home sends the user back to connect.
    if (e instanceof LumaError && e.kind === "not-signed-in") luma.refresh();
  };

  // Load the user's upcoming events once Luma is connected. (Hooks stay above the early returns below.)
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setEventsLoading(true);
    luma
      .listMyEvents()
      .then((list) => !cancelled && setEvents(list))
      .catch((e) => !cancelled && showError(e))
      .finally(() => !cancelled && setEventsLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Connect Luma first, unless the user chose to carry on without it.
  if (luma.status === "checking" && !connectSkipped) {
    return (
      <View style={styles.checking}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.status}>Checking your Luma connection…</Text>
      </View>
    );
  }
  if (luma.status !== "connected" && !connectSkipped) return <Redirect href="/connect" />;

  const go = (eventName: string, guests: Guest[]) => {
    setGuests(eventName, guests);
    router.push("/results");
  };

  const loadFromLuma = async () => {
    setError(null);
    const link = parseEventLink(eventInput);
    if (!link) return setError("Paste a Luma event link, like luma.com/my-event.");
    setLoading(true);
    setStatus("Checking your Luma sign-in…");
    try {
      // A personal ticket link (?tk=) unlocks the guest list without a sign-in.
      if (!link.ticketKey && !(await luma.isSignedIn())) {
        setStatus(null);
        router.push("/login");
        return;
      }
      setStatus("Loading guests…");
      const guests = await luma.fetchGuests(eventInput, (n) => setStatus(`Loaded ${n} guests…`));
      go(link.slug, guests);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const loadEvent = async (event: LumaEvent) => {
    setError(null);
    setLoading(true);
    setStatus("Loading guests…");
    try {
      const guests = await luma.fetchGuests(event.slug, (n) => setStatus(`Loaded ${n} guests…`));
      go(event.name, guests);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const disconnect = async () => {
    setError(null);
    setDisconnectFailed(false);
    setDisconnecting(true);
    const result = await luma.disconnect();
    setDisconnecting(false);
    if (result === "connected" || result === "offline") return setDisconnectFailed(true);
    // Signed out: forget everything from the old account; home then redirects to /connect.
    setEvents(null);
    setGuests("", []);
    setMatches(null);
    setConnectSkipped(false);
  };

  const usePasted = () => {
    setError(null);
    const guests = parsePastedGuests(pasted);
    if (guests.length === 0) return setError("Couldn't find any guests in that text.");
    go("Pasted guest list", guests);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Walk into the room knowing who to talk to.</Text>
        <Text style={styles.subtitle}>
          Going to an AI meetup to find your next job? Tell us what you're after. Claude reads the guest list and
          tells you who to meet, why, how to start the conversation, and what you can learn from them.
        </Text>

        <Label>What job are you looking for?</Label>
        <TextInput
          style={styles.input}
          placeholder="e.g. My first job as an ML engineer"
          value={profile.goal}
          onChangeText={(goal) => setProfile({ ...profile, goal })}
        />
        <Label>Your background</Label>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. 4 years as a data analyst, finished an AI bootcamp"
          value={profile.background}
          onChangeText={(background) => setProfile({ ...profile, background })}
          multiline
        />

        {connected && (
          <View style={styles.events}>
            <Label>Your upcoming Luma events</Label>
            {eventsLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.status}>Loading your Luma events…</Text>
              </View>
            )}
            {!eventsLoading && events?.length === 0 && (
              <Text style={styles.hint}>
                No upcoming events with a visible guest list. Paste an event link below, or try the sample event.
              </Text>
            )}
            {events?.map((event) => (
              <Pressable
                key={event.apiId}
                accessibilityRole="button"
                accessibilityLabel={`${event.name}, ${formatEventDate(event.startAt, event.timezone)}`}
                disabled={needsGoal || loading}
                onPress={() => loadEvent(event)}
                style={[styles.eventRow, (needsGoal || loading) && styles.eventDisabled]}
              >
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventDate}>{formatEventDate(event.startAt, event.timezone)}</Text>
              </Pressable>
            ))}
            {loading && status && <Text style={styles.status}>{status}</Text>}
          </View>
        )}

        {luma.available && (
          <>
            <Label>{connected ? "Or paste an event link" : "Luma event link"}</Label>
            <TextInput
              style={styles.input}
              placeholder="luma.com/your-event"
              autoCapitalize="none"
              autoCorrect={false}
              value={eventInput}
              onChangeText={setEventInput}
            />
            <Button title="Find who to meet" onPress={loadFromLuma} loading={loading} disabled={needsGoal} />
            {status && <Text style={styles.status}>{status}</Text>}
            <Text style={styles.hint}>
              Works for events you're registered for, when the host shows the guest list. Your Luma sign-in stays on
              this phone.
            </Text>
          </>
        )}

        <Button
          title="Try with a sample event"
          variant="secondary"
          disabled={needsGoal}
          onPress={() => go("Sample: Berlin AI Meetup", sampleGuests as Guest[])}
        />
        {luma.available && !pasteOpen && (
          <Button title="Paste a guest list instead" variant="secondary" onPress={() => setPasteOpen(true)} />
        )}

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
            <Button title="Rank these guests" onPress={usePasted} disabled={needsGoal || !pasted.trim()} />
          </View>
        )}

        {connected && (
          <View style={styles.disconnect}>
            {disconnectFailed && (
              <>
                <Text style={styles.error}>
                  Couldn't disconnect automatically. Open Luma, use its menu to sign out, then tap Done.
                </Text>
                <Button title="Open Luma" variant="secondary" onPress={() => router.push("/login?mode=signout")} />
              </>
            )}
            <Button title="Disconnect Luma" variant="secondary" onPress={disconnect} loading={disconnecting} />
          </View>
        )}

        {needsGoal && <Text style={styles.hint}>Start by telling us what job you're looking for.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 8, lineHeight: 22 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  paste: { minHeight: 140, textAlignVertical: "top" },
  status: { marginTop: 8, color: colors.muted, textAlign: "center" },
  checking: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  events: { marginBottom: 8 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  eventRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 64,
    justifyContent: "center",
    marginBottom: 10,
  },
  eventDisabled: { opacity: 0.5 },
  eventName: { fontSize: 17, fontWeight: "600", color: colors.text },
  eventDate: { fontSize: 14, color: colors.muted, marginTop: 2 },
  disconnect: { marginTop: 24 },
  hint: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 12, color: colors.error, fontSize: 15 },
});
