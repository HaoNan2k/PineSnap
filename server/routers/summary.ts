import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { generateSummary } from "@/lib/summary/generate";

export const summaryRouter = router({
  getByResourceId: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const row = await prisma.resourceSummary.findUnique({
        where: { resourceId: input.resourceId },
      });
      if (!row) return null;
      if (row.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return row;
    }),

  generate: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const resource = await prisma.resource.findUnique({
        where: { id: input.resourceId },
        include: {
          captureJobs: {
            where: { superseded: false },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              artifacts: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
      if (resource.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const primaryArtifact = resource.captureJobs[0]?.artifacts[0] ?? null;
      const content = primaryArtifact?.content ?? null;
      if (!content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "素材还没采集到正文，等 capture 完成后再试",
        });
      }

      const result = await generateSummary({
        title: resource.title,
        sourceType: resource.sourceType,
        canonicalUrl: resource.canonicalUrl,
        content,
      });

      await prisma.resourceSummary.upsert({
        where: { resourceId: resource.id },
        create: {
          resourceId: resource.id,
          userId: ctx.user.id,
          markdown: result.markdown,
          oneLineSummary: result.oneLineSummary,
          keyMoments: result.keyMoments,
          model: result.modelId,
          promptVersion: result.promptVersion,
          durationMs: result.durationMs,
        },
        update: {
          markdown: result.markdown,
          oneLineSummary: result.oneLineSummary,
          keyMoments: result.keyMoments,
          model: result.modelId,
          promptVersion: result.promptVersion,
          durationMs: result.durationMs,
          generatedAt: new Date(),
        },
        select: { id: true },
      });

      return { ok: true as const };
    }),
});
