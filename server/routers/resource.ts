import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getUserResources,
  getResourceWithAccessCheck,
} from "@/lib/db/resource";
import { TRPCError } from "@trpc/server";

export const resourceRouter = router({
  list: protectedProcedure
    .input(z.object({ sourceType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const start = Date.now();
      const resources = await getUserResources(ctx.user.id);
      const afterFetch = Date.now();
      if (input?.sourceType) {
        const filtered = resources.filter((r) => r.sourceType === input.sourceType);
        const afterFilter = Date.now();
        console.info("[perf] resource.list", {
          userId: ctx.user.id,
          filterSourceType: input.sourceType,
          fetchMs: afterFetch - start,
          filterMs: afterFilter - afterFetch,
          totalMs: afterFilter - start,
          resultCount: filtered.length,
        });
        return filtered;
      }
      const afterNoFilter = Date.now();
      console.info("[perf] resource.list", {
        userId: ctx.user.id,
        fetchMs: afterFetch - start,
        totalMs: afterNoFilter - start,
        resultCount: resources.length,
      });
      return resources;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await getResourceWithAccessCheck(input.id, ctx.user.id);
      if (!result.ok) {
        if (result.status === 404) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return result.resource;
    }),
});
