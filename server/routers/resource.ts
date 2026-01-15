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
      const resources = await getUserResources(ctx.user.id);
      if (input?.type) {
        return resources.filter((r) => r.type === input.type);
      }
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
