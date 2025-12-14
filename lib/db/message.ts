import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@/generated/prisma/client";
import { ChatPart } from "@/lib/chat/types";

export async function createMessage(
  conversationId: string,
  role: Role,
  parts: ChatPart[],
  clientMessageId?: string
) {
  // Compute fallback content
  const content = parts
    .filter(p => p.type === 'text')
    .map(p => p.text)
    .join('\n');

  if (clientMessageId) {
    // Idempotent for user messages (and any caller-provided key):
    // unique on (conversationId, clientMessageId)
    const existing = await prisma.message.findFirst({
      where: { conversationId, clientMessageId },
    });
    if (existing) return existing;
    try {
      return await prisma.message.create({
        data: {
          conversationId,
          role,
          clientMessageId,
          parts: parts as unknown as Prisma.InputJsonValue,
          content,
        },
      });
    } catch (err) {
      const retry = await prisma.message.findFirst({
        where: { conversationId, clientMessageId },
      });
      if (retry) return retry;
      throw err;
    }
  }

  return prisma.message.create({
    data: {
      conversationId,
      role,
      parts: parts as unknown as Prisma.InputJsonValue, // Safe cast to Json compatible type
      content, 
    },
  });
}
