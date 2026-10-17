import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { lookupEvent } from "../../../src/api";
import { NeedsLumaLogin, loadEventGuests } from "../../../src/eventGuests";
import { useLuma } from "../../../src/luma/LumaBridge";
import { FEATURED_EVENT } from "../../../src/luma/featured";
import { useStore } from "../../../src/store";
import { Button, colors } from "../../../src/ui";
import Results from "../../results";

// The people going to one event, ranked: same screen as /results, under the event's URL.
// Opened directly (e.g. after a page refresh) the guest list is empty, so it loads the event's guests itself.
export default function EventPeople() {
  const router = useRouter();
  const luma = useLuma();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { ready, profile, guests, setGuests } = useStore();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !slug || guests.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const event = slug === FEATURED_EVENT.slug ? FEATURED_EVENT : await lookupEvent(slug);
        const loaded = await loadEventGuests(event, profile, luma, (s) => !cancelled && setStatus(s));
        if (!cancelled) setGuests(event.name, loaded.guests);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof NeedsLumaLogin) return router.push("/login");
        setError(e instanceof Error ? e.message : "Couldn't load who's going to this event.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, slug]);

  if (guests.length > 0) return <Results />;

  return (
    <View style={styles.page}>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Button title="Back to the event" variant="secondary" onPress={() => router.replace({ pathname: "/event/[slug]", params: { slug: slug! } })} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.hint}>{status ?? "Loading who's going…"}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, maxWidth: 640, width: "100%", alignSelf: "center", alignItems: "center", gap: 12 },
  hint: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  error: { color: colors.error, textAlign: "center" },
});
