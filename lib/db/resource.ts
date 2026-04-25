import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma, type CaptureSourceType } from "@/generated/prisma/client";

export async function createResource(args: {
  userId: string;
  sourceType?: CaptureSourceType;
  canonicalUrl: string;
  sourceFingerprint?: string | null;
  title: string;
  thumbnailUrl?: string | null;
  metadata?: unknown;
}) {
  return prisma.resource.create({
    data: {
      userId: args.userId,
      sourceType: args.sourceType ?? "bilibili",
      canonicalUrl: args.canonicalUrl,
      sourceFingerprint: args.sourceFingerprint ?? null,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl ?? null,
      metadata: (args.metadata ?? null) as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      userId: true,
      sourceType: true,
      canonicalUrl: true,
      sourceFingerprint: true,
      title: true,
      thumbnailUrl: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getUserResources(userId: string) {
  const resources = await prisma.resource.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      canonicalUrl: true,
      sourceType: true,
      sourceFingerprint: true,
      title: true,
      thumbnailUrl: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      summary: {
        select: { oneLineSummary: true },
      },
      captureJobs: {
        where: { superseded: false },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          resourceId: true,
          sourceType: true,
          jobType: true,
          executionMode: true,
          captureRequestId: true,
          status: true,
          stage: true,
          attempt: true,
          maxAttempts: true,
          errorCode: true,
          errorMessage: true,
          superseded: true,
          supersededByJobId: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          updatedAt: true,
          artifacts: {
            where: { isPrimary: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: {
              id: true,
              jobId: true,
              kind: true,
              language: true,
              format: true,
              schemaVersion: true,
              isPrimary: true,
              qualityScore: true,
              content: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  return resources.map((resource) => {
    const activeJob = resource.captureJobs[0] ?? null;
    const primaryArtifact = activeJob?.artifacts[0] ?? null;
    return {
      ...resource,
      activeJob,
      primaryArtifact,
    };
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
  const resource = await prisma.resource.findFirst({
    where: { id: args.id, userId: args.userId },
    select: {
      id: true,
      userId: true,
      canonicalUrl: true,
      sourceType: true,
      sourceFingerprint: true,
      title: true,
      thumbnailUrl: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      captureJobs: {
        where: { superseded: false },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          resourceId: true,
          sourceType: true,
          jobType: true,
          executionMode: true,
          captureRequestId: true,
          status: true,
          stage: true,
          attempt: true,
          maxAttempts: true,
          errorCode: true,
          errorMessage: true,
          superseded: true,
          supersededByJobId: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          updatedAt: true,
          artifacts: {
            where: { isPrimary: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: {
              id: true,
              jobId: true,
              kind: true,
              language: true,
              format: true,
              schemaVersion: true,
              isPrimary: true,
              qualityScore: true,
              content: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!resource) return null;
  const activeJob = resource.captureJobs[0] ?? null;
  const primaryArtifact = activeJob?.artifacts[0] ?? null;
  return {
    ...resource,
    activeJob,
    primaryArtifact,
  };
}

export async function getResourceMetaForUser(args: { userId: string; id: string }) {
  return prisma.resource.findFirst({
    where: { id: args.id, userId: args.userId },
    select: {
      id: true,
      userId: true,
      sourceType: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}