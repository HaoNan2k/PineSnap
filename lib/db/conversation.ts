import { prisma } from "@/lib/prisma";

export async function createConversation(userId: string, firstClientMessageId?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: "新对话",
      firstClientMessageId: firstClientMessageId ?? null,
    },
  });
}

export async function ensureConversationById(
  id: string,
  userId: string,
  firstClientMessageId: string
) {
    // Optimistic ID creation
    // If it exists, return it. If not, create it with the provided ID.
    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (existing) {
        // Deleted conversations are treated as not found.
        if (existing.deletedAt) return null;

        // Simple ownership check
        if (existing.userId !== userId) {
            // In a real app with auth, this should probably be a 403 or handled gracefully
            // For now with default-user, this branch is unlikely unless collision
            console.warn(`Conversation ${id} exists but userId mismatch. Expected ${userId}, got ${existing.userId}`);
        }
        return existing;
    }

    try {
        return await prisma.conversation.create({
            data: {
                id, // Use the client-provided UUID
                userId,
                title: "新对话",
                firstClientMessageId
            }
        });
    } catch (err) {
        // Handle race condition where it was created between find and create
        const retry = await prisma.conversation.findUnique({ where: { id } });
        if (retry) return retry.deletedAt ? null : retry;
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
