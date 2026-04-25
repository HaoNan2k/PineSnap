import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserIdFromRequest } from "@/lib/supabase/auth";

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'unsafe-inline' https:",
  "img-src * data: blob:",
  "media-src * data: blob:",
  "font-src https: data:",
  "connect-src https:",
  "frame-src https://player.bilibili.com https://www.bilibili.com",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const NOT_FOUND = () => new NextResponse("Not Found", { status: 404 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userId = await getAuthenticatedUserIdFromRequest(request);
  if (!userId) return NOT_FOUND();

  const summary = await prisma.resourceSummary.findUnique({
    where: { id },
    select: { html: true, userId: true },
  });

  if (!summary || summary.userId !== userId) return NOT_FOUND();

  // 不设 X-Frame-Options（会拦跨子域 iframe 嵌入）；允许嵌入由 CSP 之后再加 frame-ancestors 控制
  // Referrer-Policy: 防止 URL 里的 token 通过 Referer 头泄露给 HTML 中的外链
  return new NextResponse(summary.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
