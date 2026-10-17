import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useLuma } from "../src/luma/LumaBridge";
import { useStore } from "../src/store";
import { Button, colors } from "../src/ui";

// First screen when Luma isn't connected: connect it, or carry on without it.
export default function Connect() {
  const router = useRouter();
  const luma = useLuma();
  const { setConnectSkipped } = useStore();

  const continueWithout = () => {
    setConnectSkipped(true);
    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Connect your Luma account</Text>
      <Text style={styles.body}>
        RoomRadar reads the guest lists of Luma events you're registered for, so Claude can tell you who to meet. You
        sign in on Luma's own page. Your sign-in stays on your device and never reaches our server.
      </Text>

      {luma.available ? (
        <>
          {luma.sessionExpired && (
            <Text style={styles.expired}>Your Luma session expired. Connect again to see your events.</Text>
          )}
          <Button title="Connect Luma" onPress={() => router.push("/login")} />
          {luma.status === "offline" && (
            <Text style={styles.error}>Could not reach Luma. Check your connection, or try the sample event.</Text>
          )}
        </>
      ) : (
        <Text style={styles.note}>
          Connecting Luma needs the RoomRadar phone app. On the web you can try the sample event or paste a guest list
          copied from Luma.
        </Text>
      )}

      <Button title="Try the sample event" variant="secondary" onPress={continueWithout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.muted, marginTop: 8, marginBottom: 8, lineHeight: 22 },
  note: { fontSize: 15, color: colors.text, marginTop: 8, lineHeight: 21 },
  expired: { fontSize: 15, color: colors.text, marginVertical: 8, lineHeight: 21, fontWeight: "600" },
  error: { marginTop: 12, color: colors.error, fontSize: 15 },
});
