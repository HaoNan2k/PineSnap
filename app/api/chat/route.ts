import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const message = body.message ?? "没有收到 message 字段";

  return NextResponse.json({
    reply: `SocraticU 收到了你的消息：${message}`,
    timestamp: Date.now(),
  });
}