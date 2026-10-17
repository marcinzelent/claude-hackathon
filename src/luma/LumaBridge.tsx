import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { LUMA_API_BASES, LUMA_WEB_ORIGIN, MAX_GUEST_PAGES, lumaPaths } from "./config";
import { findEventApiId, mergeEvents, parseEventPage, parseGuestPage } from "./normalize";
import type { Guest, LumaEvent } from "../types";

/*
 * The trick that keeps the user's Luma session on their phone:
 * a hidden WebView sits on luma.com and makes the API calls *from inside
 * Luma's own page*, using the cookies set when the user signed in.
 * The app never reads, stores or uploads the session itself.
 */

type BridgeResponse = { status: number; body: string };
type Pending = { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void };

type LumaApi = {
  available: boolean;
  isSignedIn: () => Promise<boolean>;
  fetchMyEvents: () => Promise<LumaEvent[]>;
  /** Accepts an event slug or an "evt-..." id. */
  fetchGuests: (slugOrId: string, onProgress?: (count: number) => void) => Promise<Guest[]>;
  reload: () => void;
};

const LumaContext = createContext<LumaApi | null>(null);

export function useLuma(): LumaApi {
  const ctx = useContext(LumaContext);
  if (!ctx) throw new Error("useLuma must be used inside <LumaBridgeProvider>");
  return ctx;
}

export class LumaError extends Error {}

export function LumaBridgeProvider({ children }: { children: ReactNode }) {
  const webview = useRef<WebView<object>>(null);
  const pending = useRef(new Map<string, Pending>());
  const ready = useRef<Promise<void> | null>(null);
  const markReady = useRef<() => void>(() => {});
  const [webviewKey, setWebviewKey] = useState(0);
  const available = Platform.OS !== "web";

  const resetReady = () => {
    ready.current = new Promise((resolve) => (markReady.current = resolve));
  };
  if (!ready.current) resetReady();

  const request = useCallback(async (url: string): Promise<BridgeResponse> => {
    await ready.current;
    const id = Math.random().toString(36).slice(2);
    const script = `
      (async () => {
        try {
          const r = await fetch(${JSON.stringify(url)}, { credentials: "include" });
          const body = await r.text();
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(id)}, status: r.status, body }));
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(id)}, error: String(e) }));
        }
      })();
      true;`;
    return new Promise<BridgeResponse>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.current.delete(id)) reject(new LumaError("Luma did not answer in time."));
      }, 20000);
      webview.current?.injectJavaScript(script);
    });
  }, []);

  // Tries each known API host until one returns 2xx JSON.
  const getJson = useCallback(
    async (path: string): Promise<unknown> => {
      let last = "";
      for (const base of LUMA_API_BASES) {
        try {
          const res = await request(base + path);
          if (res.status === 401 || res.status === 403) throw new LumaError("Please sign in to Luma first.");
          if (res.status >= 200 && res.status < 300) return JSON.parse(res.body);
          last = `HTTP ${res.status}`;
        } catch (e) {
          if (e instanceof LumaError) throw e;
          last = String(e);
        }
      }
      throw new LumaError(`Could not reach Luma (${last}).`);
    },
    [request],
  );

  const api = useMemo<LumaApi>(
    () => ({
      available,
      reload: () => {
        // New promise before the remount, so requests wait for the fresh page instead of the old one.
        resetReady();
        setWebviewKey((k) => k + 1);
      },
      isSignedIn: async () => {
        if (!available) return false;
        try {
          await getJson(lumaPaths.myEvents("future"));
          return true;
        } catch {
          return false;
        }
      },
      fetchMyEvents: async () => {
        if (!available) throw new LumaError("Your Luma events only load in the mobile app.");
        const { events: upcoming } = parseEventPage(await getJson(lumaPaths.myEvents("future")));
        // Today's events can already count as "past" once they've started, so include recent ones.
        const { events: past } = parseEventPage(await getJson(lumaPaths.myEvents("past")));
        const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        return mergeEvents(upcoming, past.filter((e) => (e.startAt ?? "") >= dayAgo));
      },
      fetchGuests: async (slugOrId, onProgress) => {
        if (!available) throw new LumaError("Live Luma loading only works in the mobile app.");
        const eventId = slugOrId.startsWith("evt-")
          ? slugOrId
          : findEventApiId(await getJson(lumaPaths.resolveSlug(slugOrId)));
        if (!eventId) throw new LumaError("Could not find that event on Luma.");

        const guests: Guest[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_GUEST_PAGES; page++) {
          const { guests: batch, nextCursor } = parseGuestPage(await getJson(lumaPaths.guestList(eventId, cursor)));
          guests.push(...batch);
          onProgress?.(guests.length);
          if (!nextCursor) break;
          cursor = nextCursor;
        }
        if (guests.length === 0) {
          throw new LumaError("No guests visible. The host may have hidden the guest list.");
        }
        return guests;
      },
    }),
    [available, getJson],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { id?: string; status?: number; body?: string; error?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const waiter = msg.id ? pending.current.get(msg.id) : undefined;
    if (!waiter || !msg.id) return;
    pending.current.delete(msg.id);
    if (msg.error) waiter.reject(new Error(msg.error));
    else waiter.resolve({ status: msg.status ?? 0, body: msg.body ?? "" });
  };

  return (
    <LumaContext.Provider value={api}>
      {children}
      {available && (
        <View style={{ width: 1, height: 1, position: "absolute", opacity: 0 }} pointerEvents="none">
          <WebView
            key={webviewKey}
            ref={webview}
            source={{ uri: LUMA_WEB_ORIGIN }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            onLoadEnd={() => markReady.current()}
            onMessage={onMessage}
          />
        </View>
      )}
    </LumaContext.Provider>
  );
}
