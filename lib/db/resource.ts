import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function createResource(args: {
  userId: string;
  type: string;
  title: string;
  externalId?: string | null;
  content: unknown;
}) {
  return prisma.resource.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      externalId: args.externalId ?? null,
      content: args.content as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      externalId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

