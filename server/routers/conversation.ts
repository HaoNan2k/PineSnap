import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  getConversationWithAccessCheck,
} from "@/lib/db/conversation";
import { TRPCError } from "@trpc/server";

export const conversationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserConversations(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await updateConversationTitle(
        input.id,
        ctx.user.id,
        input.title
      );
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await deleteConversation(input.id, ctx.user.id);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      return result;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await getConversationWithAccessCheck(input.id, ctx.user.id);
      if (!result.ok) {
        if (result.status === 404) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return result.conversation;
    }),
});

