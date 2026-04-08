import { z } from "zod";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { consumeCaptureAuthCode } from "@/lib/db/capture-auth-code";
import {
  createCaptureToken,
  revokeCaptureTokensByScopeAndLabel,
} from "@/lib/db/capture-token";

const exchangeBodySchema = z.object({
  code: z.string().min(16),
  codeVerifier: z.string().min(32).max(256),
  state: z.string().min(12).max(200),
  redirectUri: z
    .string()
    .url()
    .refine(
      (value) => /^https:\/\/[a-z0-9]{32}\.chromiumapp\.org\//i.test(value),
      "redirectUri must be a chromiumapp callback URL"
    ),
});

const DEFAULT_LABEL = "Bilibili 扩展";

function getExchangeErrorDescription(code: "invalid_request" | "invalid_grant"): string {
  if (code === "invalid_request") {
    return "state or redirectUri mismatch";
  }
  return "authorization code expired, consumed, or verifier mismatch";
}

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCaptureCorsHeaders(req) });
}

export async function POST(req: Request) {
  const corsHeaders = getCaptureCorsHeaders(req);

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parsed = exchangeBodySchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders }
    );
  }

  const { code, codeVerifier, state, redirectUri } = parsed.data;
  const label = DEFAULT_LABEL;

  const consumed = await consumeCaptureAuthCode({
    code,
    codeVerifier,
    state,
    redirectUri,
  });
  if (!consumed.ok) {
    return Response.json(
      {
        error: consumed.code,
        errorDescription: getExchangeErrorDescription(consumed.code),
      },
      { status: consumed.status, headers: corsHeaders }
    );
  }

  await revokeCaptureTokensByScopeAndLabel({
    userId: consumed.userId,
    scope: "capture:bilibili",
    label,
  });

  const { token, record } = await createCaptureToken({
    userId: consumed.userId,
    label,
    scopes: ["capture:bilibili"],
  });

  return Response.json(
    {
      ok: true,
      token,
      tokenId: record.id,
      scopes: record.scopes,
    },
    { status: 200, headers: corsHeaders }
  );
}

