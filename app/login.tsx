import { Stack, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { LUMA_SIGNIN_URL } from "../src/luma/config";
import { useLuma } from "../src/luma/LumaBridge";
import { colors } from "../src/ui";

// Luma's own sign-in page. Luma sets its cookies inside the WebView;
// the app never sees the email code or the session.
export default function Login() {
  const router = useRouter();
  const luma = useLuma();

  const done = () => {
    luma.reload(); // hidden bridge picks up the fresh session
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={done} hitSlop={12}>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <Text style={{ padding: 12, color: colors.muted }}>
        Sign in with the account you registered for the event with, then tap Done and try again.
      </Text>
      <WebView source={{ uri: LUMA_SIGNIN_URL }} sharedCookiesEnabled thirdPartyCookiesEnabled style={{ flex: 1 }} />
    </View>
  );
}
