import { prisma } from "@/lib/prisma";
import {
  type Conversation,
  type Message,
  ConversationKind,
  Role,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export type CreateDiscussionMessageInput = {
  chatConversationId: string;
  anchorMessageId: string;
  role: Role;
  parts: Prisma.InputJsonValue;
  clientMessageId?: string;
};

export class AnchorValidationError extends Error {
  constructor(
    public readonly reason:
      | "anchor_not_found"
      | "anchor_soft_deleted"
      | "anchor_wrong_kind"
      | "anchor_wrong_role"
      | "anchor_cross_learning"
      | "chat_conversation_not_found"
      | "chat_conversation_wrong_kind"
  ) {
    super(`Anchor validation failed: ${reason}`);
    this.name = "AnchorValidationError";
  }
}

/**
 * Validate that anchorMessageId points to a valid canvas anchor for the
 * given chat conversation. Throws AnchorValidationError on any violation.
 *
 * Rules (Light Anchor invariants):
 * 1. Anchor message MUST exist and not be soft-deleted
 * 2. Anchor message's conversation MUST be kind=canvas
 * 3. Anchor message's role MUST be assistant
 * 4. Anchor's canvas conversation MUST belong to the same learning as the chat conversation
 * 5. The chat conversation MUST be kind=chat
 */
export async function assertValidAnchor(
  chatConversationId: string,
  anchorMessageId: string
): Promise<void> {
  const [chatConv, anchorMsg] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: chatConversationId },
      select: {
        kind: true,
        learningConnections: { select: { learningId: true } },
      },
    }),
    prisma.message.findUnique({
      where: { id: anchorMessageId },
      select: {
        deletedAt: true,
        role: true,
        conversation: {
          select: {
            kind: true,
            learningConnections: { select: { learningId: true } },
          },
        },
      },
    }),
  ]);

  if (!chatConv) throw new AnchorValidationError("chat_conversation_not_found");
  if (chatConv.kind !== ConversationKind.chat) {
    throw new AnchorValidationError("chat_conversation_wrong_kind");
  }

  if (!anchorMsg) throw new AnchorValidationError("anchor_not_found");
  if (anchorMsg.deletedAt !== null) {
    throw new AnchorValidationError("anchor_soft_deleted");
  }
  if (anchorMsg.conversation.kind !== ConversationKind.canvas) {
    throw new AnchorValidationError("anchor_wrong_kind");
  }
  if (anchorMsg.role !== Role.assistant) {
    throw new AnchorValidationError("anchor_wrong_role");
  }

  const chatLearningIds = chatConv.learningConnections.map((c) => c.learningId);
  const anchorLearningIds = anchorMsg.conversation.learningConnections.map(
    (c) => c.learningId
  );
  const sharedLearning = chatLearningIds.some((id) =>
    anchorLearningIds.includes(id)
  );
  if (!sharedLearning) {
    throw new AnchorValidationError("anchor_cross_learning");
  }
}

/**
 * Create a discussion (chat) message anchored to a canvas step.
 *
 * Pre-validates anchor integrity via assertValidAnchor; throws on any
 * violation. Caller is responsible for catching and translating to HTTP
 * status (typically 400 Bad Request or 5xx).
 */
export async function createDiscussionMessage(
  input: CreateDiscussionMessageInput
): Promise<Message> {
  await assertValidAnchor(input.chatConversationId, input.anchorMessageId);

  return prisma.message.create({
    data: {
      conversationId: input.chatConversationId,
      role: input.role,
      parts: input.parts,
      clientMessageId: input.clientMessageId ?? null,
      anchoredCanvasMessageId: input.anchorMessageId,
    },
  });
}

/**
 * Load the full discussion timeline for a chat conversation.
 *
 * Returns all non-soft-deleted messages ordered by createdAt asc.
 * Does NOT filter by anchor — Light Anchor mode renders the full
 * conversation regardless of which canvas step the user is viewing.
 */
export async function getDiscussionMessages(chatConversationId: string) {
  return prisma.message.findMany({
    where: {
      conversationId: chatConversationId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
}

export type DiscussionConversationContext = {
  chatConversation: Conversation;
  messages: Awaited<ReturnType<typeof getDiscussionMessages>>;
};
