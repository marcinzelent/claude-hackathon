import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LumaBridgeProvider } from "../src/luma/LumaBridge";
import { StoreProvider } from "../src/store";
import { colors } from "../src/ui";

export default function RootLayout() {
  return (
    <StoreProvider>
      <LumaBridgeProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: "RoomRadar" }} />
          <Stack.Screen name="login" options={{ title: "Sign in to Luma", presentation: "modal" }} />
          <Stack.Screen name="results" options={{ title: "Who to meet" }} />
        </Stack>
      </LumaBridgeProvider>
    </StoreProvider>
  );
}
