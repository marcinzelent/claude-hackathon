import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { rankGuests } from "../src/api";
import { useStore } from "../src/store";
import type { Match, RankedGuest } from "../src/types";
import { Button, colors, scoreColor } from "../src/ui";

const LINK_LABELS = { linkedin: "LinkedIn", twitter: "X", instagram: "Instagram", website: "Website" } as const;

export default function Results() {
  const { profile, eventName, guests, matches, setMatches } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMatches(await rankGuests(profile, guests));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ranking failed.");
    } finally {
      setLoading(false);
    }
  }, [profile, guests, setMatches]);

  useEffect(() => {
    if (!matches && guests.length > 0) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked: RankedGuest[] = useMemo(() => {
    const byId = new Map((matches ?? []).map((m) => [m.id, m]));
    return guests
      .map((g) => ({ ...g, match: byId.get(g.id) }))
      .sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1));
  }, [guests, matches]);

  const [copied, setCopied] = useState(false);

  // A plain-text plan for the night: the top people, why, and what to say.
  // Desktop browsers have no share sheet, so on web it's copied to the clipboard instead.
  const sharePlan = async () => {
    const message = [
      `Who to meet at ${eventName}`,
      ...ranked
        .filter((g) => g.match)
        .slice(0, 5)
        .map((g, i) => `\n${i + 1}. ${g.name} (${g.match!.score})\n${g.match!.why}\nSay hi: “${g.match!.opener}”`),
    ].join("\n");
    try {
      if (Platform.OS === "web" && !navigator.share) {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await Share.share({ message });
      }
    } catch {
      // The user closed the share sheet, or the browser blocked the clipboard: nothing to do.
    }
  };

  if (guests.length === 0) {
    return <Text style={styles.center}>No guests loaded yet. Go back and pick an event.</Text>;
  }

  return (
    <FlatList
      contentContainerStyle={styles.page}
      data={ranked}
      keyExtractor={(g) => g.id}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.event}>{eventName}</Text>
          <Text style={styles.meta}>
            {guests.length} guests · ranked for “{profile.goal}”
          </Text>
          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.meta}>Claude is reading {guests.length} profiles…</Text>
            </View>
          )}
          {error && (
            <>
              <Text style={styles.error}>{error}</Text>
              <Button title="Try again" onPress={run} />
            </>
          )}
          {matches && <Button title={copied ? "Copied to clipboard" : "Share my plan"} variant="secondary" onPress={sharePlan} />}
        </View>
      }
      renderItem={({ item }) => <GuestCard guest={item} />}
    />
  );
}

// Headshot from LinkedIn or Luma; initials if there is none or it fails to load (LinkedIn photo links expire).
function Avatar({ name, url }: { name: string; url?: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return <Image source={{ uri: url }} style={styles.avatar} onError={() => setFailed(true)} accessibilityLabel={name} />;
  }
  const initials = name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[styles.avatar, styles.initials]}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );
}

// AI jargon from the guest's profile: tap a term to see what it means before you talk to them.
function Terms({ terms }: { terms: NonNullable<Match["terms"]> }) {
  const [open, setOpen] = useState<string | null>(null);
  const meaning = terms.find((t) => t.term === open)?.meaning;
  return (
    <>
      <Text style={styles.section}>Words to know</Text>
      <View style={styles.chips}>
        {terms.map((t) => (
          <Pressable
            key={t.term}
            onPress={() => setOpen(open === t.term ? null : t.term)}
            style={[styles.chip, open === t.term && styles.chipOpen]}
          >
            <Text style={[styles.chipText, open === t.term && { color: "#fff" }]}>{t.term}</Text>
          </Pressable>
        ))}
      </View>
      {meaning && <Text style={styles.body}>{meaning}</Text>}
    </>
  );
}

function GuestCard({ guest }: { guest: RankedGuest }) {
  const m = guest.match;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar name={guest.name} url={guest.avatarUrl} />
        <Text style={styles.name}>{guest.name}</Text>
        {m && (
          <View style={[styles.score, { backgroundColor: scoreColor(m.score) }]}>
            <Text style={styles.scoreText}>{m.score}</Text>
          </View>
        )}
      </View>
      {guest.bio && <Text style={styles.bio}>{guest.bio}</Text>}
      {m && (
        <>
          <Text style={styles.why}>{m.why}</Text>
          {m.terms && m.terms.length > 0 && <Terms terms={m.terms} />}
          <Text style={styles.section}>Say hi</Text>
          <Text style={styles.body}>“{m.opener}”</Text>
          <Text style={styles.section}>Learn from them</Text>
          <Text style={styles.body}>{m.learn}</Text>
        </>
      )}
      <View style={styles.links}>
        {(Object.keys(LINK_LABELS) as (keyof typeof LINK_LABELS)[]).map((k) =>
          guest.links[k] ? (
            <Pressable key={k} onPress={() => Linking.openURL(guest.links[k]!)}>
              <Text style={styles.link}>{LINK_LABELS[k]}</Text>
            </Pressable>
          ) : null,
        )}
        {guest.lumaUrl && (
          <Pressable onPress={() => Linking.openURL(guest.lumaUrl!)}>
            <Text style={styles.link}>Luma</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { padding: 24, textAlign: "center", color: colors.muted },
  event: { fontSize: 22, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  loading: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12 },
  error: { color: colors.error, marginTop: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft },
  initials: { alignItems: "center", justifyContent: "center" },
  initialsText: { color: colors.accent, fontWeight: "700" },
  name: { fontSize: 17, fontWeight: "700", color: colors.text, flex: 1 },
  score: { borderRadius: 999, minWidth: 40, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center" },
  scoreText: { color: "#fff", fontWeight: "700" },
  bio: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  why: { color: colors.text, marginTop: 10, lineHeight: 21 },
  section: { fontSize: 12, fontWeight: "700", color: colors.accent, marginTop: 10, textTransform: "uppercase" },
  body: { color: colors.text, marginTop: 2, lineHeight: 21 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  link: { color: colors.accent, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipOpen: { backgroundColor: colors.accent },
  chipText: { color: colors.accent, fontWeight: "600", fontSize: 13 },
});
