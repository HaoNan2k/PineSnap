import "server-only";

import {
  Prisma,
  type CaptureArtifactFormat,
  type CaptureArtifactKind,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createCaptureArtifact(args: {
  resourceId: string;
  jobId: string;
  kind: CaptureArtifactKind;
  language?: string | null;
  format?: CaptureArtifactFormat | null;
  qualityScore?: number | null;
  content: unknown;
  isPrimary?: boolean;
}) {
  const content = args.content as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    if (args.isPrimary) {
      await tx.captureArtifact.updateMany({
        where: {
          resourceId: args.resourceId,
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
        resourceId: args.resourceId,
        jobId: args.jobId,
        kind: args.kind,
        language: args.language ?? null,
        format: args.format ?? null,
        qualityScore: args.qualityScore ?? null,
        content,
        isPrimary: args.isPrimary ?? false,
      },
      select: {
        id: true,
        resourceId: true,
        jobId: true,
        kind: true,
        language: true,
        format: true,
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
      resourceId: args.resourceId,
      kind: args.kind,
      isPrimary: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      resourceId: true,
      jobId: true,
      kind: true,
      language: true,
      format: true,
      isPrimary: true,
      qualityScore: true,
      content: true,
      createdAt: true,
    },
  });
}
