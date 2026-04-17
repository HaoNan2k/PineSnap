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
              sourceType: true,
              canonicalUrl: true,
              thumbnailUrl: true,
              metadata: true,
              captureJobs: {
                where: { superseded: false },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
                select: {
                  id: true,
                  artifacts: {
                    where: { isPrimary: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    take: 1,
                    select: {
                      id: true,
                      kind: true,
                      language: true,
                      content: true,
                      createdAt: true,
                    },
                  },
                },
              },
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

/**
 * Lightweight query for getState: only fetches fields needed by the learn page UI.
 * Skips captureJobs/artifacts/metadata entirely — the page only uses resource.title.
 */
export async function getLearningStateLight(id: string, userId: string) {
  const start = Date.now();
  const learning = await prisma.learning.findUnique({
    where: { id },
    select: {
      id: true,
      plan: true,
      clarify: true,
      deletedAt: true,
      resources: {
        select: {
          resource: {
            select: {
              id: true,
              userId: true,
              title: true,
              sourceType: true,
            },
          },
        },
      },
      conversations: {
        select: {
          conversation: {
            select: { id: true, userId: true, deletedAt: true },
          },
        },
      },
    },
  });

  const fetchMs = Date.now() - start;

  if (!learning || learning.deletedAt) {
    return { ok: false as const, status: 404 as const };
  }

  const totalResources = learning.resources.length;
  if (totalResources === 0) {
    return { ok: false as const, status: 404 as const };
  }

  const ownedCount = learning.resources.filter(
    (lr) => lr.resource.userId === userId
  ).length;

  if (ownedCount !== totalResources) {
    return { ok: false as const, status: 403 as const };
  }

  console.info("[perf] learning.getStateLight", { learningId: id, fetchMs });

  return { ok: true as const, learning };
}

export async function getLearningWithAccessCheck(
  id: string,
  userId: string,
  options?: { includeContent?: boolean }
): Promise<LearningAccessResult> {
  const includeContent = options?.includeContent ?? true;
  const start = Date.now();
  
  // Single query to get learning and its resources (for access check)
  const learning = await prisma.learning.findUnique({
    where: { id },
    include: {
      resources: {
        include: {
          resource: {
            select: {
              id: true,
              userId: true,
              title: true,
              sourceType: true,
              canonicalUrl: true,
              thumbnailUrl: true,
              metadata: true,
              captureJobs: {
                where: { superseded: false },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
                select: {
                  id: true,
                  artifacts: {
                    where: { isPrimary: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    take: 1,
                    select: {
                      id: true,
                      kind: true,
                      language: true,
                      ...(includeContent && { content: true }),
                      createdAt: true,
                    },
                  },
                },
              },
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

  const afterFetch = Date.now();
  
  if (!learning || learning.deletedAt) {
    return { ok: false, status: 404 };
  }

  const totalResources = learning.resources.length;
  if (totalResources === 0) {
    return { ok: false, status: 404 };
  }

  // Check if all resources belong to the user
  const ownedResourcesCount = learning.resources.filter(
    (lr) => lr.resource.userId === userId
  ).length;

  if (ownedResourcesCount !== totalResources) {
    return { ok: false, status: 403 };
  }

  console.info("[perf] learning.accessCheck (optimized)", {
    learningId: id,
    userId,
    fetchMs: afterFetch - start,
    totalMs: Date.now() - start,
    totalResources,
  });

  return { ok: true, learning };
}

export async function ensureLearningConversation(
  learningId: string,
  userId: string
) {
  const start = Date.now();
  const existing = await prisma.learningConversation.findFirst({
    where: {
      learningId,
      conversation: { userId, deletedAt: null },
    },
    include: { conversation: true },
  });
  const afterFind = Date.now();

  if (existing?.conversation) {
    console.info("[perf] learning.ensureConversation", {
      learningId,
      userId,
      findMs: afterFind - start,
      totalMs: afterFind - start,
      created: false,
    });
    return existing.conversation;
  }

  const conversation = await createConversation(userId);
  await prisma.learningConversation.create({
    data: { learningId, conversationId: conversation.id },
  });
  const afterCreate = Date.now();

  console.info("[perf] learning.ensureConversation", {
    learningId,
    userId,
    findMs: afterFind - start,
    createMs: afterCreate - afterFind,
    totalMs: afterCreate - start,
    created: true,
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
