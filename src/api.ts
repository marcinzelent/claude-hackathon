import Constants from "expo-constants";
import { Platform } from "react-native";

// On web the API routes are same-origin. On a phone (Expo Go) they live on the
// dev server that served the app, unless EXPO_PUBLIC_API_URL says otherwise.
export function apiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  if (Platform.OS === "web") return "";
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : "";
}
