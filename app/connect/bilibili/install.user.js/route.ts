import { createCaptureToken, revokeCaptureTokensByScopeAndLabel } from "@/lib/db/capture-token";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import fs from "node:fs/promises";
import path from "node:path";

const LABEL = "Bilibili 连接";

export const runtime = "nodejs";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "app",
  "connect",
  "bilibili",
  "install.user.js",
  "script.template.user.js"
);

let cachedTemplate: string | null = null;

async function getTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = await fs.readFile(TEMPLATE_PATH, "utf8");
  return cachedTemplate;
}

async function buildScript(args: { baseUrl: string; token: string }): Promise<string> {
  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  const token = args.token;
  const template = await getTemplate();
  return template
    .replace("__PINESNAP_BASE_URL__", JSON.stringify(baseUrl))
    .replace("__PINESNAP_TOKEN__", JSON.stringify(token));
}

export async function GET(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    const url = new URL(req.url);
    url.pathname = "/chat";
    url.searchParams.set("unauthorized", "true");
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

