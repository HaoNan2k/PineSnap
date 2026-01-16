import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLearningForResources } from "@/lib/db/learning";

export const learningRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        resourceIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createLearningForResources({
        userId: ctx.user.id,
        resourceIds: input.resourceIds,
      });

      if (!result.ok) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return { id: result.learning.id };
    }),
});
