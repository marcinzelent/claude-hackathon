import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { createLumaClient, LumaError, type LumaClient, type LumaResponse, type LumaTransport } from "./client";
import { LUMA_WEB_ORIGIN } from "./config";

export { LumaError } from "./client";

/*
 * The trick that keeps the user's Luma session on their phone:
 * a hidden WebView sits on luma.com and makes the API calls *from inside
 * Luma's own page*, using the cookies set when the user signed in.
 * The app never reads, stores or uploads the session itself.
 * All Luma knowledge (endpoints, paging, errors) lives in ./client.
 */

type Pending = { resolve: (r: LumaResponse) => void; reject: (e: Error) => void };

type LumaApi = LumaClient & {
  /** True where the user can sign in to Luma (the phone app, not web). */
  available: boolean;
  reload: () => void;
};

const LumaContext = createContext<LumaApi | null>(null);

export function useLuma(): LumaApi {
  const ctx = useContext(LumaContext);
  if (!ctx) throw new Error("useLuma must be used inside <LumaBridgeProvider>");
  return ctx;
}

// On web there's no sign-in, but personal ticket links (?tk=) need no cookies.
const webTransport: LumaTransport = async (url) => {
  const r = await fetch(url, { credentials: "omit" });
  return { status: r.status, body: await r.text() };
};

export function LumaBridgeProvider({ children }: { children: ReactNode }) {
  const webview = useRef<WebView<object>>(null);
  const pending = useRef(new Map<string, Pending>());
  const ready = useRef<Promise<void> | null>(null);
  const markReady = useRef<() => void>(() => {});
  const [webviewKey, setWebviewKey] = useState(0);
  const available = Platform.OS !== "web";

  if (!ready.current) {
    ready.current = new Promise((resolve) => (markReady.current = resolve));
  }

  const webviewTransport = useCallback<LumaTransport>(async (url) => {
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
    return new Promise<LumaResponse>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.current.delete(id)) reject(new LumaError("unreachable", "Luma did not answer in time."));
      }, 20000);
      webview.current?.injectJavaScript(script);
    });
  }, []);

  const api = useMemo<LumaApi>(() => {
    const client = createLumaClient(available ? webviewTransport : webTransport);
    return {
      ...client,
      available,
      isSignedIn: async () => (available ? client.isSignedIn() : false),
      reload: () => {
        ready.current = null;
        setWebviewKey((k) => k + 1);
      },
    };
  }, [available, webviewTransport]);

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
