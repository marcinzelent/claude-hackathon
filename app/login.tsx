import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { LUMA_HOME_URL, LUMA_SIGNIN_URL } from "../src/luma/config";
import { useLuma } from "../src/luma/LumaBridge";
import { useStore } from "../src/store";
import { colors } from "../src/ui";

type Phase = "signing-in" | "checking" | "connected" | "not-yet" | "offline";

// Luma's own sign-in page. Luma sets its cookies inside the WebView;
// the app never sees the email code or the session.
export default function Login() {
  const router = useRouter();
  const luma = useLuma();
  const { forgetLumaAccount } = useStore();
  // ?mode=signout opens Luma's home page so the user can sign out by hand, then tap Done.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const signingOut = mode === "signout";
  const [phase, setPhase] = useState<Phase>("signing-in");
  const checking = useRef(false);

  const confirm = async () => {
    if (checking.current) return;
    checking.current = true;
    setPhase("checking");
    const status = await luma.refresh(); // hidden bridge picks up the fresh session
    checking.current = false;
    if (signingOut) {
      if (status === "signed-out") {
        // Same cleanup as the automatic disconnect on home.
        forgetLumaAccount();
        router.dismissTo("/");
      } else if (status === "offline") setPhase("offline");
      else setPhase("not-yet");
    } else if (status === "connected") {
      setPhase("connected");
      setTimeout(() => router.dismissTo("/"), 900);
    } else {
      setPhase("not-yet");
    }
  };

  // Luma leaves its sign-in page once you're in, so check then without waiting for "Done".
  const onNavigation = (nav: WebViewNavigation) => {
    if (signingOut) return; // wait for Done
    if (!nav.loading && phase !== "connected" && !/\/signin/.test(nav.url) && /luma\.com/.test(nav.url)) confirm();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirm} hitSlop={12}>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        {phase === "checking" && <ActivityIndicator color={colors.accent} />}
        <Text style={{ flex: 1, color: phase === "not-yet" || phase === "offline" ? colors.error : phase === "connected" ? colors.good : colors.muted }}>
          {signingOut && phase !== "checking" && phase !== "not-yet" && phase !== "offline" && "Open Luma's menu, tap Sign out, then tap Done."}
          {signingOut && phase === "offline" && "Couldn't reach Luma. Check your connection, then tap Done again."}
          {signingOut && phase === "not-yet" && "You're still signed in. Use Luma's menu to sign out, then tap Done."}
          {!signingOut && phase === "signing-in" && "Sign in with the account you registered for your events with."}
          {phase === "checking" && "Checking your Luma sign-in…"}
          {!signingOut && phase === "connected" && "✓ Luma is connected."}
          {!signingOut && phase === "not-yet" && "You're not signed in yet. Finish signing in below, then tap Done."}
        </Text>
      </View>
      <WebView
        source={{ uri: signingOut ? LUMA_HOME_URL : LUMA_SIGNIN_URL }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onNavigationStateChange={onNavigation}
        style={{ flex: 1 }}
      />
    </View>
  );
}
