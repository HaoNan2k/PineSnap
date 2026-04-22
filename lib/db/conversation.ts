import { prisma } from "@/lib/prisma";
import { logWarn } from "@/lib/logger";
import { type Conversation, ConversationKind } from "@/generated/prisma/client";

export async function createConversation(
  userId: string,
  firstClientMessageId?: string,
  kind: ConversationKind = ConversationKind.canvas
) {
  return prisma.conversation.create({
    data: {
      userId,
      kind,
      title: "新对话",
      firstClientMessageId: firstClientMessageId ?? null,
    },
  });
}

/**
 * Get the canvas conversation for a learning + user pair.
 * Returns null if not found.
 */
export async function getCanvasConversation(learningId: string, userId: string) {
  const link = await prisma.learningConversation.findFirst({
    where: {
      learningId,
      conversation: {
        userId,
        kind: ConversationKind.canvas,
        deletedAt: null,
      },
    },
    include: { conversation: true },
  });
  return link?.conversation ?? null;
}

/**
 * Get-or-create the chat conversation for a learning + user pair.
 *
 * Uses pg_advisory_xact_lock to prevent race conditions: two concurrent
 * requests from the same user (e.g. multi-tab) cannot both create
 * separate chat conversations.
 *
 * Returns the existing chat conversation if one already exists, otherwise
 * creates a new one inside the same transaction.
 */
export async function getOrCreateChatConversation(
  learningId: string,
  userId: string
): Promise<Conversation> {
  return prisma.$transaction(async (tx) => {
    // Acquire advisory lock keyed on (learningId, userId, 'chat').
    // hashtext() returns int4; pg_advisory_xact_lock(int4) is the right overload.
    // Lock is released automatically on transaction end.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${learningId}|${userId}|chat`}))`;

    const existing = await tx.learningConversation.findFirst({
      where: {
        learningId,
        conversation: {
          userId,
          kind: ConversationKind.chat,
          deletedAt: null,
        },
      },
      include: { conversation: true },
    });
    if (existing?.conversation) return existing.conversation;

    const created = await tx.conversation.create({
      data: {
        userId,
        kind: ConversationKind.chat,
        title: "学习讨论",
      },
    });
    await tx.learningConversation.create({
      data: { learningId, conversationId: created.id },
    });
    return created;
  });
}

export type ConversationAccessResult =
  | { ok: true; conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>> }
  | { ok: false; status: 403 | 404 };

export async function getConversationWithAccessCheck(
  id: string,
  userId: string
): Promise<ConversationAccessResult> {
  const meta = await prisma.conversation.findUnique({
    where: { id },
    select: { userId: true, deletedAt: true },
  });

  if (!meta || meta.deletedAt) return { ok: false, status: 404 };
  if (meta.userId !== userId) return { ok: false, status: 403 };

  const conversation = await getConversation(id, userId);
  if (!conversation) return { ok: false, status: 404 };
  return { ok: true, conversation };
}

export type EnsureConversationByIdResult =
  | { ok: true; conversation: Conversation }
  | { ok: false; status: 403 | 404 };

export async function ensureConversationById(
  id: string,
  userId: string,
  firstClientMessageId: string
): Promise<EnsureConversationByIdResult> {
    // Optimistic ID creation
    // If it exists, return it. If not, create it with the provided ID.
    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (existing) {
        // Deleted conversations are treated as not found.
        if (existing.deletedAt) return { ok: false, status: 404 };

        // Ownership check: this change intentionally returns 403 (leaks existence) per spec.
        if (existing.userId !== userId) {
            logWarn(`Conversation id collision or unauthorized access attempt for id=${id}`);
            return { ok: false, status: 403 };
        }
        return { ok: true, conversation: existing };
    }

    try {
        const created = await prisma.conversation.create({
            data: {
                id, // Use the client-provided UUID
                userId,
                title: "新对话",
                firstClientMessageId
            }
        });
        return { ok: true, conversation: created };
    } catch (err) {
        // Handle race condition where it was created between find and create
        const retry = await prisma.conversation.findUnique({ where: { id } });
        if (retry) {
            if (retry.deletedAt) return { ok: false, status: 404 };
            if (retry.userId !== userId) return { ok: false, status: 403 };
            return { ok: true, conversation: retry };
        }
        throw err;
    }
}

export async function ensureConversationForFirstMessage(userId: string, firstClientMessageId: string) {
  // Idempotent: one conversation per (userId, firstClientMessageId)
  // We avoid `upsert(where: compoundUnique)` here because the generated client
  // may not expose the compound unique selector at runtime in some environments.
  const existing = await prisma.conversation.findFirst({
    where: { userId, firstClientMessageId },
  });
  if (existing) return existing.deletedAt ? null : existing;

  try {
    return await prisma.conversation.create({
      data: {
        userId,
        title: "新对话",
        firstClientMessageId,
      },
    });
  } catch (err) {
    // Another concurrent request may have created it.
    const retry = await prisma.conversation.findFirst({
      where: { userId, firstClientMessageId },
    });
    if (retry) return retry.deletedAt ? null : retry;
    throw err;
  }
}

export async function getConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateConversationTitle(id: string, userId: string, title: string) {
  const existing = await prisma.conversation.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!existing) return null;

  return prisma.conversation.update({
    where: { id },
    data: { title },
  });
}

export async function touchConversation(id: string, userId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) return null;

    return prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
    });
}

export async function deleteConversation(id: string, userId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) return null;

    const deletedAt = new Date();

    await prisma.$transaction([
      prisma.message.updateMany({
        where: { conversationId: id, deletedAt: null },
        data: { deletedAt },
      }),
      prisma.conversation.update({
        where: { id },
        data: { deletedAt },
      }),
    ]);

    return { ...existing, deletedAt };
}

export async function getUserConversations(userId: string) {
    return prisma.conversation.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
             messages: {
                 where: { deletedAt: null },
                 take: 1,
                 orderBy: { createdAt: "desc" }
             }
        }
    });
}
