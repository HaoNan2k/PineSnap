import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TEMP_USER_ID = "default-user"; // 暂时硬编码，后续有了 Auth 再换

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: TEMP_USER_ID,
      },
      orderBy: {
        updatedAt: "desc",
      },
      // 列表页通常不需要加载所有 messages，只加载 id/title/time 即可，省流量
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        // 如果想显示“最后一条消息摘要”，可以 include messages take 1
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: TEMP_USER_ID,
        title: "New Chat",
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

