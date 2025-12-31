import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { fileStorage } from "@/lib/storage";
import { TRPCError } from "@trpc/server";

function getTtlSeconds(): number {
  const raw = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS ?? "300");
  if (!Number.isFinite(raw) || raw <= 0) return 300;
  return raw;
}

export const filesRouter = router({
  getUrl: protectedProcedure
    .input(z.object({ ref: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Ownership enforcement via object key prefix: users/<userId>/...
      if (!input.ref.startsWith(`users/${ctx.user.id}/`)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const ttlSeconds = getTtlSeconds();
        const url = await fileStorage.resolveUrl(input.ref);
        return { url, expiresAt: Date.now() + ttlSeconds * 1000 };
      } catch (error) {
        console.error("Failed to resolve file URL", error);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not resolve file URL",
        });
      }
    }),
});
