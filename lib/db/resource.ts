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

export async function getUserResources(userId: string) {
  return prisma.resource.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
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

type ResourceAccessResult =
  | { ok: false; status: 404 | 403 }
  | {
      ok: true;
      resource: Awaited<ReturnType<typeof prisma.resource.findUnique>> & {};
    };

export async function getResourceWithAccessCheck(
  id: string,
  userId: string
): Promise<ResourceAccessResult> {
  const resource = await prisma.resource.findUnique({
    where: { id },
  });
  if (!resource) {
    return { ok: false, status: 404 };
  }

  if (resource.userId !== userId) {
    return { ok: false, status: 403 };
  }

  return { ok: true, resource };
}

export async function getResourceForUser(args: { userId: string; id: string }) {
  return prisma.resource.findFirst({
    where: { id: args.id, userId: args.userId },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      externalId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}