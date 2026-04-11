import "server-only";

import {
  Prisma,
  type CaptureArtifactFormat,
  type CaptureArtifactKind,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createCaptureArtifact(args: {
  jobId: string;
  kind: CaptureArtifactKind;
  language?: string | null;
  format?: CaptureArtifactFormat | null;
  schemaVersion?: number;
  qualityScore?: number | null;
  content: unknown;
  isPrimary?: boolean;
}) {
  const content = args.content as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    const job = await tx.captureJob.findUniqueOrThrow({
      where: { id: args.jobId },
      select: { resourceId: true },
    });

    if (args.isPrimary) {
      await tx.captureArtifact.updateMany({
        where: {
          job: {
            resourceId: job.resourceId,
          },
          kind: args.kind,
          language: args.language ?? null,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const created = await tx.captureArtifact.create({
      data: {
        jobId: args.jobId,
        kind: args.kind,
        language: args.language ?? null,
        format: args.format ?? null,
        schemaVersion: args.schemaVersion ?? 1,
        qualityScore: args.qualityScore ?? null,
        content,
        isPrimary: args.isPrimary ?? false,
      },
      select: {
        id: true,
        jobId: true,
        kind: true,
        language: true,
        format: true,
        schemaVersion: true,
        isPrimary: true,
        qualityScore: true,
        createdAt: true,
      },
    });

    return created;
  });
}

export async function getPrimaryArtifactForResource(args: {
  resourceId: string;
  kind?: CaptureArtifactKind;
}) {
  return prisma.captureArtifact.findFirst({
    where: {
      job: {
        resourceId: args.resourceId,
      },
      kind: args.kind,
      isPrimary: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  });
}
