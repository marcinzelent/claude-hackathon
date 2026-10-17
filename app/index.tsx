import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useStore } from "../src/store";
import { colors } from "../src/ui";

// Start screen: onboarding the first time, your events after that.
export default function Index() {
  const router = useRouter();
  const { ready, profile } = useStore();

  useEffect(() => {
    if (ready) router.replace(profile.goal.trim() ? "/events" : "/onboarding");
  }, [ready, profile.goal, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
