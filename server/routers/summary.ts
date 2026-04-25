import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  buildResourceContentFromCapture,
  hasTranscriptLines,
} from "@/lib/learn/resource-context";
import { generateSummary } from "@/lib/summary/generate";
import { validateArtifactHtml } from "@/lib/summary/validate";

export const summaryRouter = router({
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

      const content = buildResourceContentFromCapture(resource);
      if (!hasTranscriptLines(content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Resource 还没采集到 transcript，等 capture 完成后再试",
        });
      }

      const result = await generateSummary({
        title: resource.title,
        sourceType: resource.sourceType,
        canonicalUrl: resource.canonicalUrl,
        content,
      });

      const validation = validateArtifactHtml(result.html);
      if (!validation.valid) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: `AI output 无效：${validation.reason}`,
        });
      }

      const row = await prisma.resourceSummary.create({
        data: {
          resourceId: resource.id,
          userId: ctx.user.id,
          html: result.html,
          model: result.modelId,
          promptVersion: result.promptVersion,
          durationMs: result.durationMs,
        },
        select: { id: true },
      });

      return { summaryId: row.id };
    }),

  listByResource: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // userId filter 保证只返回自己的 summary；不存在则返回 []，
      // 不需要额外 access check（空列表对非 owner 也是合理响应）
      const rows = await prisma.resourceSummary.findMany({
        where: { resourceId: input.resourceId, userId: ctx.user.id },
        orderBy: { generatedAt: "asc" },
        select: {
          id: true,
          generatedAt: true,
          model: true,
        },
      });

      return rows.map((row, i) => ({
        id: row.id,
        index: i + 1,
        generatedAt: row.generatedAt,
        model: row.model,
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const row = await prisma.resourceSummary.findUnique({
        where: { id: input.id },
      });
      if (!row || row.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return row;
    }),
});
