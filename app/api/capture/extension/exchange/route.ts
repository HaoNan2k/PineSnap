import { z } from "zod";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { consumeCaptureAuthCode } from "@/lib/db/capture-auth-code";
import {
  createCaptureToken,
  revokeCaptureTokensByLabel,
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

// Phase B：扩展从单源（bilibili）演进为多源采集，token 不再绑定单一 scope。
// 旧 label "Bilibili 扩展" 仍兼容，但新 label 描述实际用途。
const DEFAULT_LABEL = "PineSnap Capture 扩展";
const LEGACY_LABEL = "Bilibili 扩展";

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

  // 撤销同一用户在新 / 旧 label 下任何未撤销的扩展 token
  await revokeCaptureTokensByLabel({ userId: consumed.userId, label });
  await revokeCaptureTokensByLabel({ userId: consumed.userId, label: LEGACY_LABEL });

  // 通配符 scope，覆盖 bilibili / youtube / web_page / wechat_article 等所有当前与未来源
  const { token, record } = await createCaptureToken({
    userId: consumed.userId,
    label,
    scopes: ["capture:*"],
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

