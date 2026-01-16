import "server-only";

import { prisma } from "@/lib/prisma";
import { createConversation } from "@/lib/db/conversation";
import type { ClarifyPayload } from "@/lib/learn/clarify";

export type LearningAccessResult =
  | { ok: true; learning: Awaited<ReturnType<typeof getLearningWithResources>> }
  | { ok: false; status: 403 | 404 };

export type LearningCreateResult =
  | { ok: true; learning: { id: string } }
  | { ok: false; status: 403 };

export async function createLearningForResources(args: {
  userId: string;
  resourceIds: string[];
}): Promise<LearningCreateResult> {
  const resources = await prisma.resource.findMany({
    where: { id: { in: args.resourceIds }, userId: args.userId },
    select: { id: true },
  });

  if (resources.length !== args.resourceIds.length) {
    return { ok: false, status: 403 as const };
  }

  const learning = await prisma.learning.create({
    data: {
      resources: {
        create: resources.map((resource) => ({
          resource: { connect: { id: resource.id } },
        })),
      },
    },
    select: { id: true },
  });

  return { ok: true, learning };
}

export async function getLearningWithResources(id: string) {
  return prisma.learning.findUnique({
    where: { id },
    include: {
      resources: {
        include: {
          resource: {
            select: {
              id: true,
              userId: true,
              title: true,
              type: true,
              content: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
      conversations: {
        include: {
          conversation: {
            select: { id: true, userId: true, deletedAt: true },
          },
        },
      },
    },
  });
}

export async function getLearningWithAccessCheck(
  id: string,
  userId: string
): Promise<LearningAccessResult> {
  const learning = await getLearningWithResources(id);
  if (!learning || learning.deletedAt) {
    return { ok: false, status: 404 };
  }

  const totalResources = await prisma.learningResource.count({
    where: { learningId: id },
  });
  if (totalResources === 0) {
    return { ok: false, status: 404 };
  }

  const ownedResources = await prisma.learningResource.count({
    where: { learningId: id, resource: { userId } },
  });
  if (ownedResources !== totalResources) {
    return { ok: false, status: 403 };
  }

  return { ok: true, learning };
}

export async function ensureLearningConversation(
  learningId: string,
  userId: string
) {
  const existing = await prisma.learningConversation.findFirst({
    where: {
      learningId,
      conversation: { userId, deletedAt: null },
    },
    include: { conversation: true },
  });

  if (existing?.conversation) {
    return existing.conversation;
  }

  const conversation = await createConversation(userId);
  await prisma.learningConversation.create({
    data: { learningId, conversationId: conversation.id },
  });

  return conversation;
}

export async function updateLearningPlan(args: {
  learningId: string;
  plan: string;
}) {
  return prisma.learning.update({
    where: { id: args.learningId },
    data: { plan: args.plan },
    select: { id: true, plan: true },
  });
}

export async function updateLearningClarify(args: {
  learningId: string;
  clarify: ClarifyPayload;
}) {
  return prisma.learning.update({
    where: { id: args.learningId },
    data: { clarify: args.clarify },
    select: { id: true, clarify: true },
  });
}

export async function updateLearningPlanWithClarify(args: {
  learningId: string;
  plan: string;
  clarify: ClarifyPayload;
}) {
  return prisma.learning.update({
    where: { id: args.learningId },
    data: { plan: args.plan, clarify: args.clarify },
    select: { id: true, plan: true, clarify: true },
  });
}
