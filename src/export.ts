import { Platform, Share } from "react-native";

/**
 * Hands JSON to the user. Phone: the share sheet. Web: copy to the clipboard,
 * or download a file if copying isn't allowed. Returns a note to show, if any.
 */
export async function exportJson(json: string, mode: "copy" | "download" = "copy"): Promise<string | null> {
  if (Platform.OS !== "web") {
    await Share.share({ message: json });
    return null;
  }
  if (mode === "copy") {
    try {
      await navigator.clipboard.writeText(json);
      return "Copied JSON to clipboard";
    } catch {
      // fall through to a download
    }
  }
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "guests.json";
  link.click();
  URL.revokeObjectURL(url);
  return "Downloaded guests.json";
}
