import { createCaptureToken, revokeCaptureTokensByScopeAndLabel } from "@/lib/db/capture-token";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { SCRIPT_TEMPLATE } from "./script.template";

const LABEL = "Bilibili 连接";
const LEGACY_ENABLED = process.env.CAPTURE_ENABLE_USERSCRIPT_LEGACY === "true";

export const runtime = "nodejs";

async function buildScript(args: { baseUrl: string; token: string }): Promise<string> {
  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  const token = args.token;
  return SCRIPT_TEMPLATE
    .replace("__PINESNAP_BASE_URL__", JSON.stringify(baseUrl))
    .replace("__PINESNAP_TOKEN__", JSON.stringify(token));
}

export async function GET(req: Request) {
  if (!LEGACY_ENABLED) {
    return new Response("Legacy userscript flow is disabled", { status: 410 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    const url = new URL(req.url);
    url.pathname = "/login";
    url.searchParams.set("returnUrl", "/connect/bilibili");
    return Response.redirect(url);
  }

  // Rotate the previous connector authorization to keep the surface small.
  await revokeCaptureTokensByScopeAndLabel({
    userId,
    scope: "capture:bilibili",
    label: LABEL,
  });

  const origin = new URL(req.url).origin;
  const { token } = await createCaptureToken({
    userId,
    label: LABEL,
    scopes: ["capture:bilibili"],
  });

  const script = await buildScript({ baseUrl: origin, token });
  return new Response(script, {
    status: 200,
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // Prevent caching; each install rotates a new authorization token.
      "cache-control": "no-store",
    },
  });
}
