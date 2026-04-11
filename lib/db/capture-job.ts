import "server-only";

import {
  Prisma,
  type CaptureExecutionMode,
  type CaptureJobStage,
  type CaptureJobStatus,
  type CaptureJobType,
  type CaptureSourceType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function findCaptureJobByIdForUser(args: { jobId: string; userId: string }) {
  return prisma.captureJob.findFirst({
    where: {
      id: args.jobId,
      resource: { userId: args.userId },
    },
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
    },
  });
}

export async function findCaptureJobById(args: { jobId: string }) {
  return prisma.captureJob.findUnique({
    where: { id: args.jobId },
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
    },
  });
}

export async function listCaptureJobsForResource(args: { resourceId: string; userId: string }) {
  return prisma.captureJob.findMany({
    where: {
      resourceId: args.resourceId,
      resource: { userId: args.userId },
    },
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
    },
  });
}

export async function markCaptureJobStatus(args: {
  jobId: string;
  status: CaptureJobStatus;
  stage?: CaptureJobStage | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}) {
  return prisma.captureJob.update({
    where: { id: args.jobId },
    data: {
      status: args.status,
      stage: args.stage ?? null,
      errorCode: args.errorCode ?? null,
      errorMessage: args.errorMessage ?? null,
      startedAt: args.startedAt ?? undefined,
      finishedAt: args.finishedAt ?? undefined,
    },
    select: {
      id: true,
      status: true,
      stage: true,
      errorCode: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
    },
  });
}

export async function getActiveCaptureJobForResource(args: {
  userId: string;
  resourceId: string;
}) {
  return prisma.captureJob.findFirst({
    where: {
      resource: { userId: args.userId },
      resourceId: args.resourceId,
      superseded: false,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      stage: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function requeueCaptureJob(args: {
  jobId: string;
  attemptDelta?: number;
  stage?: CaptureJobStage | null;
}) {
  return prisma.captureJob.update({
    where: { id: args.jobId },
    data: {
      status: "PENDING",
      stage: args.stage ?? "QUEUED",
      errorCode: null,
      errorMessage: null,
      finishedAt: null,
      attempt: {
        increment: args.attemptDelta ?? 1,
      },
    },
    select: {
      id: true,
      status: true,
      stage: true,
      attempt: true,
      maxAttempts: true,
      updatedAt: true,
    },
  });
}

export async function claimPendingCaptureJobs(args: {
  limit: number;
  sourceType?: CaptureSourceType;
}) {
  const limit = Math.max(1, Math.min(args.limit, 50));
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.captureJob.findMany({
      where: {
        status: "PENDING",
        sourceType: args.sourceType,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit,
      select: {
        id: true,
      },
    });

    if (candidates.length === 0) return [];

    const claimedIds: string[] = [];
    for (const candidate of candidates) {
      const updated = await tx.captureJob.updateMany({
        where: { id: candidate.id, status: "PENDING" },
        data: {
          status: "RUNNING",
          stage: "CLAIMED",
          startedAt: now,
        },
      });
      if (updated.count === 1) {
        claimedIds.push(candidate.id);
      }
    }

    if (claimedIds.length === 0) return [];

    return tx.captureJob.findMany({
      where: { id: { in: claimedIds } },
      select: {
        id: true,
        resourceId: true,
        sourceType: true,
        jobType: true,
        captureRequestId: true,
        status: true,
        stage: true,
        attempt: true,
        maxAttempts: true,
        inputContext: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });
}

export async function createCaptureResourceAndJobWithIdempotency(args: {
  userId: string;
  sourceType: CaptureSourceType;
  jobType: CaptureJobType;
  executionMode?: CaptureExecutionMode;
  captureRequestId: string;
  inputContext: unknown;
  resource: {
    canonicalUrl: string;
    sourceFingerprint?: string | null;
    title: string;
    thumbnailUrl?: string | null;
    metadata?: unknown;
  };
  initialJob?: {
    status?: CaptureJobStatus;
    stage?: CaptureJobStage | null;
  };
}) {
  const inputContext = args.inputContext as Prisma.InputJsonValue;
  const resourceMetadata = (args.resource.metadata ?? null) as Prisma.InputJsonValue;

  const doCreate = async () => {
    return prisma.$transaction(async (tx) => {
      let resource = await tx.resource.findFirst({
        where: {
          userId: args.userId,
          sourceType: args.sourceType,
          canonicalUrl: args.resource.canonicalUrl,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!resource) {
        resource = await tx.resource.create({
          data: {
            userId: args.userId,
            sourceType: args.sourceType,
            canonicalUrl: args.resource.canonicalUrl,
            sourceFingerprint: args.resource.sourceFingerprint ?? null,
            title: args.resource.title,
            thumbnailUrl: args.resource.thumbnailUrl ?? null,
            metadata: resourceMetadata,
          },
          select: {
            id: true,
            title: true,
          },
        });
      }

      const existing = await tx.captureJob.findUnique({
        where: {
          resourceId_captureRequestId: {
            resourceId: resource.id,
            captureRequestId: args.captureRequestId,
          },
        },
        select: {
          id: true,
          resourceId: true,
          sourceType: true,
          jobType: true,
          executionMode: true,
          status: true,
        },
      });

      if (existing) {
        return {
          idempotent: true,
          resource,
          job: existing,
        };
      }

      const job = await tx.captureJob.create({
        data: {
          resourceId: resource.id,
          sourceType: args.sourceType,
          jobType: args.jobType,
          executionMode: args.executionMode ?? "ASYNC",
          captureRequestId: args.captureRequestId,
          inputContext,
          status: args.initialJob?.status ?? "PENDING",
          stage: args.initialJob?.stage ?? null,
        },
        select: {
          id: true,
          resourceId: true,
          sourceType: true,
          jobType: true,
          executionMode: true,
          status: true,
        },
      });

      return {
        idempotent: false,
        resource,
        job,
      };
    });
  };

  try {
    return await doCreate();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.captureJob.findFirst({
        where: {
          captureRequestId: args.captureRequestId,
          sourceType: args.sourceType,
          resource: { userId: args.userId },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          resourceId: true,
          sourceType: true,
          jobType: true,
          executionMode: true,
          status: true,
        },
      });
      if (existing) {
        const resource = await prisma.resource.findUniqueOrThrow({
          where: { id: existing.resourceId },
          select: { id: true, title: true },
        });
        return { idempotent: true, resource, job: existing };
      }
    }
    throw error;
  }
}
