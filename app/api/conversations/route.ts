import { NextResponse } from "next/server";
import { getUserConversations, createConversation } from "@/lib/db/conversation";
import { logError } from "@/lib/logger";

const TEMP_USER_ID = "default-user";

export async function GET() {
  try {
    const conversations = await getUserConversations(TEMP_USER_ID);
    
    // Transform to match API contract if needed
    // Current DB returns Date objects. Next.js NextResponse.json serializes them to strings.
    // The client expects strings.
    return NextResponse.json(conversations);
  } catch (error) {
    logError("Failed to fetch conversations", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const conversation = await createConversation(TEMP_USER_ID);
    return NextResponse.json(conversation);
  } catch (error) {
    logError("Failed to create conversation", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
