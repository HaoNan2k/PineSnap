import { getConversationWithAccessCheck, updateConversationTitle, deleteConversation } from "@/lib/db/conversation";
import { logError } from "@/lib/logger";
import { jsonError, requireUserId } from "@/lib/http/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireUserId();
    if (!auth.ok) return auth.response;

    const result = await getConversationWithAccessCheck(id, auth.userId);

    if (!result.ok) {
      return jsonError(
        result.status,
        result.status === 403 ? "Forbidden" : "Conversation not found"
      );
    }

    return Response.json(result.conversation);
  } catch (error) {
    logError("Failed to fetch conversation", error);
    return Response.json(
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
    const auth = await requireUserId();
    if (!auth.ok) return auth.response;

    const access = await getConversationWithAccessCheck(id, auth.userId);
    if (!access.ok) {
      return jsonError(
        access.status,
        access.status === 403 ? "Forbidden" : "Conversation not found"
      );
    }

    const body = await request.json();
    const { title } = body;

    const conversation = await updateConversationTitle(id, auth.userId, title);
    if (!conversation) {
      return jsonError(404, "Conversation not found");
    }

    return Response.json(conversation);
  } catch (error) {
    logError("Failed to update conversation", error);
    return Response.json(
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
    const auth = await requireUserId();
    if (!auth.ok) return auth.response;

    const access = await getConversationWithAccessCheck(id, auth.userId);
    if (!access.ok) {
      return jsonError(
        access.status,
        access.status === 403 ? "Forbidden" : "Conversation not found"
      );
    }

    const deleted = await deleteConversation(id, auth.userId);
    if (!deleted) {
      return jsonError(404, "Conversation not found");
    }
    return Response.json({ success: true });
  } catch (error) {
    logError("Failed to delete conversation", error);
    return Response.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
