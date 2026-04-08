import { z } from "zod";
import { getAuthenticatedUserIdFromRequest } from "@/lib/supabase/auth";
import { createCaptureAuthCode } from "@/lib/db/capture-auth-code";

const authRequestSchema = z.object({
  state: z.string().min(12).max(200),
  codeChallenge: z.string().min(32).max(200),
  redirectUri: z
    .string()
    .url()
    .refine(
      (value) => /^https:\/\/[a-z0-9]{32}\.chromiumapp\.org\//i.test(value),
      "redirectUri must be a chromiumapp callback URL"
    ),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isForm = contentType.includes("application/x-www-form-urlencoded");
  const isJson = contentType.includes("application/json");

  let rawBody: unknown;
  if (isForm) {
    const form = await req.formData();
    rawBody = {
      state: String(form.get("state") ?? ""),
      codeChallenge: String(form.get("codeChallenge") ?? ""),
      redirectUri: String(form.get("redirectUri") ?? ""),
    };
  } else if (isJson) {
    rawBody = await req.json();
  } else {
    return Response.json(
      { error: "Unsupported content type" },
      { status: 415 }
    );
  }

  const parsed = authRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { state, codeChallenge, redirectUri } = parsed.data;
  const { code } = await createCaptureAuthCode({
    userId,
    state,
    codeChallenge,
    redirectUri,
  });

  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", state);

  return Response.redirect(callbackUrl.toString(), 302);
}

