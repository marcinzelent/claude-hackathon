import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export const colors = {
  bg: "#F7F5F2",
  card: "#FFFFFF",
  text: "#1C1B1A",
  muted: "#6B6862",
  border: "#E4E0DA",
  accent: "#5B4BDB",
  accentSoft: "#ECE9FF",
  good: "#1F8A5B",
  mid: "#B7791F",
  low: "#8E8A84",
  error: "#B42318",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#fff" : colors.accent} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? "#fff" : colors.accent }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const scoreColor = (score: number) => (score >= 70 ? colors.good : score >= 40 ? colors.mid : colors.low);

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", marginTop: 10 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  buttonText: { fontSize: 16, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
});
