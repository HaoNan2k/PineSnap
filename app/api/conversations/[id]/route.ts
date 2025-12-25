import { NextResponse } from "next/server";
import { getConversation, updateConversationTitle, deleteConversation } from "@/lib/db/conversation";
import { logError } from "@/lib/logger";

const TEMP_USER_ID = "default-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const conversation = await getConversation(id, TEMP_USER_ID);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    logError("Failed to fetch conversation", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title } = body;

    const conversation = await updateConversationTitle(id, TEMP_USER_ID, title);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    logError("Failed to update conversation", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = await deleteConversation(id, TEMP_USER_ID);
    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Failed to delete conversation", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
