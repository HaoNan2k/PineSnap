import { prisma } from "@/lib/prisma";

export async function createConversation(userId: string, firstClientMessageId?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: "New Chat",
      firstClientMessageId: firstClientMessageId ?? null,
    },
  });
}

export async function ensureConversationById(id: string, userId: string, firstClientMessageId: string) {
    // Optimistic ID creation
    // If it exists, return it. If not, create it with the provided ID.
    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (existing) {
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
                title: "New Chat",
                firstClientMessageId
            }
        });
    } catch (err) {
        // Handle race condition where it was created between find and create
        const retry = await prisma.conversation.findUnique({ where: { id } });
        if (retry) return retry;
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
  if (existing) return existing;

  try {
    return await prisma.conversation.create({
      data: {
        userId,
        title: "New Chat",
        firstClientMessageId,
      },
    });
  } catch (err) {
    // Another concurrent request may have created it.
    const retry = await prisma.conversation.findFirst({
      where: { userId, firstClientMessageId },
    });
    if (retry) return retry;
    throw err;
  }
}

export async function getConversation(id: string, userId: string) {
  return prisma.conversation.findUnique({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function updateConversationTitle(id: string, userId: string, title: string) {
  return prisma.conversation.update({
    where: { id, userId },
    data: { title },
  });
}

export async function touchConversation(id: string, userId: string) {
    return prisma.conversation.update({
        where: { id, userId },
        data: { updatedAt: new Date() }
    });
}

export async function deleteConversation(id: string, userId: string) {
    return prisma.conversation.delete({
        where: { id, userId }
    });
}

export async function getUserConversations(userId: string) {
    return prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
             messages: {
                 take: 1,
                 orderBy: { createdAt: "desc" }
             }
        }
    });
}
