import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../src/store";
import type { GuestLinks } from "../src/types";
import { Button, colors } from "../src/ui";

const LINK_LABELS: Record<keyof GuestLinks, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  website: "Website",
};

// The import result: every guest with their connected profiles. A test screen; on main the list goes straight to ranking.
export default function Guests() {
  const router = useRouter();
  const { eventName, guests, profile } = useStore();
  const withProfiles = guests.filter((g) => Object.keys(g.links).length > 0).length;

  if (guests.length === 0) {
    return <Text style={styles.center}>No guests loaded yet. Go back and import an event.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.event}>{eventName}</Text>
      <Text style={styles.meta}>
        {guests.length} guests · {withProfiles} with connected profiles
      </Text>

      <View style={{ marginTop: 16 }}>
        {guests.map((g) => (
          <View key={g.id} style={styles.card}>
            <Text style={styles.name}>{g.name}</Text>
            {g.bio && <Text style={styles.bio}>{g.bio}</Text>}
            <View style={styles.links}>
              {(Object.keys(LINK_LABELS) as (keyof GuestLinks)[]).map((k) =>
                g.links[k] ? (
                  <Pressable key={k} onPress={() => Linking.openURL(g.links[k]!)}>
                    <Text style={styles.link}>{LINK_LABELS[k]}</Text>
                  </Pressable>
                ) : null,
              )}
              {g.lumaUrl && (
                <Pressable onPress={() => Linking.openURL(g.lumaUrl!)}>
                  <Text style={styles.link}>Luma</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>

      <Button
        title="Rank with Claude"
        variant="secondary"
        disabled={!profile.goal.trim()}
        onPress={() => router.push("/results")}
      />
      {!profile.goal.trim() && (
        <Text style={styles.note}>To rank these guests with Claude, add the job you're looking for on the home screen.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { padding: 24, textAlign: "center", color: colors.muted },
  event: { fontSize: 22, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted, marginTop: 4, marginBottom: 4 },
  note: { color: colors.muted, marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  bio: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  link: { color: colors.accent, fontWeight: "600" },
});
