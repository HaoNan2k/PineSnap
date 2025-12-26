import { prisma } from "@/lib/prisma";
import { logWarn } from "@/lib/logger";
import type { Conversation } from "@/generated/prisma/client";

export async function createConversation(userId: string, firstClientMessageId?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: "新对话",
      firstClientMessageId: firstClientMessageId ?? null,
    },
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
