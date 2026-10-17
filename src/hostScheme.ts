/** Local dev servers (IP, localhost, .local) speak http; tunnels (exp.direct, ngrok, trycloudflare) need https. */
export function hostScheme(host: string): "http" | "https" {
  const name = host.replace(/:\d+$/, "");
  const local = /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:]+\]|.+\.local)$/i.test(name);
  return local ? "http" : "https";
}
