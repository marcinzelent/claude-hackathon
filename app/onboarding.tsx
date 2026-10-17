import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useStore } from "../src/store";
import { Button, Label, colors } from "../src/ui";

// First run: who you are and what you're looking for. Saved on the device only.
export default function Onboarding() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const needsGoal = !profile.goal.trim();

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

        <Button
          title="Continue"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/events"))}
          disabled={needsGoal}
        />
        {needsGoal && <Text style={styles.hint}>Start by telling us what job you're looking for.</Text>}
        <Text style={styles.hint}>This stays on your device.</Text>
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
  hint: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 18 },
});
