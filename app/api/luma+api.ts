import { proxyLumaRequest } from "../../src/luma/proxy";

// GET /api/luma?path=/url?url=my-event  → Luma's answer, relayed. Used by the web version only.
export async function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  const { status, body } = await proxyLumaRequest(path);
  return new Response(body, { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
