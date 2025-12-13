import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const conversations = await prisma.conversation.findMany();
  const messages = await prisma.message.findMany();
  return NextResponse.json({ conversations, messages });
}
