import { getUserConversations, createConversation } from "@/lib/db/conversation";
import { logError } from "@/lib/logger";
import { requireUserId } from "@/lib/http/api";

export async function GET() {
  try {
    const auth = await requireUserId();
    if (!auth.ok) return auth.response;

    const conversations = await getUserConversations(auth.userId);
    
    // Transform to match API contract if needed
    // Current DB returns Date objects. Next.js NextResponse.json serializes them to strings.
    // The client expects strings.
    return Response.json(conversations);
  } catch (error) {
    logError("Failed to fetch conversations", error);
    return Response.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const auth = await requireUserId();
    if (!auth.ok) return auth.response;

    const conversation = await createConversation(auth.userId);
    return Response.json(conversation);
  } catch (error) {
    logError("Failed to create conversation", error);
    return Response.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
