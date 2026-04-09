import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getUserResources,
  getResourceWithAccessCheck,
} from "@/lib/db/resource";
import { TRPCError } from "@trpc/server";

export const resourceRouter = router({
  list: protectedProcedure
    .input(z.object({ type: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const start = Date.now();
      const resources = await getUserResources(ctx.user.id);
      const afterFetch = Date.now();
      const mapped = resources.map((resource) => ({
        ...resource,
        activeJob: resource.captureJobs[0] ?? null,
        primaryArtifact: resource.artifacts[0] ?? null,
      }));
      if (input?.type) {
        const filtered = mapped.filter((r) => r.type === input.type);
        const afterFilter = Date.now();
        console.info("[perf] resource.list", {
          userId: ctx.user.id,
          filterType: input.type,
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
        resultCount: mapped.length,
      });
      return mapped;
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
