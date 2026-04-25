import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_CAP = 500;

export const debugRouter = router({
  searchByQuery: adminProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ input }) => {
      const q = input.q.trim();

      if (UUID_REGEX.test(q)) {
        const learning = await prisma.learning.findUnique({
          where: { id: q },
          select: { id: true },
        });
        if (learning) return { type: "learning" as const, id: learning.id };
        // UUID but no learning — fall through to user lookup as fallback
        return { type: "none" as const };
      }

      if (EMAIL_REGEX.test(q)) {
        const supabaseAdmin = createSupabaseAdminClient();
        // listUsers + filter by email (Supabase admin API doesn't expose
        // getUserByEmail; for ≤ 100 users a single page is fine).
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }
        const match = data.users.find(
          (u) => u.email?.toLowerCase() === q.toLowerCase()
        );
        if (match) return { type: "user" as const, id: match.id };
        return { type: "none" as const };
      }

      return { type: "none" as const };
    }),

  getLearningDetail: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const learning = await prisma.learning.findUnique({
        where: { id: input.id },
        include: {
          resources: { include: { resource: true } },
          conceptsCovered: true,
          conversations: {
            include: {
              conversation: {
                include: {
                  messages: {
                    orderBy: { createdAt: "asc" },
                    take: MESSAGE_CAP + 1, // fetch +1 to detect truncation
                  },
                },
              },
            },
          },
        },
      });

      if (!learning) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Learning not found" });
      }

      // Count messages across both conversations to determine truncation.
      let totalMessages = 0;
      for (const lc of learning.conversations) {
        totalMessages += lc.conversation.messages.length;
      }
      const truncated = totalMessages > MESSAGE_CAP;

      // If truncated, trim each conversation proportionally to keep total <= cap.
      // Simpler: just slice each to MESSAGE_CAP — caller can see truncated flag.
      if (truncated) {
        for (const lc of learning.conversations) {
          if (lc.conversation.messages.length > MESSAGE_CAP) {
            lc.conversation.messages = lc.conversation.messages.slice(
              0,
              MESSAGE_CAP
            );
          }
        }
      }

      // Resolve userId via first resource (Learning has no direct userId column).
      const ownerUserId =
        learning.resources[0]?.resource.userId ?? null;

      let user: { id: string; email: string | null } | null = null;
      if (ownerUserId) {
        const supabaseAdmin = createSupabaseAdminClient();
        const { data } = await supabaseAdmin.auth.admin.getUserById(
          ownerUserId
        );
        if (data?.user) {
          user = { id: data.user.id, email: data.user.email ?? null };
        } else {
          user = { id: ownerUserId, email: null };
        }
      }

      return {
        learning,
        user,
        truncated,
        messageCap: MESSAGE_CAP,
      };
    }),

  listLearningsByUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      // Learning has no direct userId, so go through resource ownership.
      const learnings = await prisma.learning.findMany({
        where: {
          resources: { some: { resource: { userId: input.userId } } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          plan: true,
          conversations: {
            select: {
              conversation: {
                select: { _count: { select: { messages: true } } },
              },
            },
          },
        },
      });

      const supabaseAdmin = createSupabaseAdminClient();
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
        input.userId
      );
      const user = userData?.user
        ? { id: userData.user.id, email: userData.user.email ?? null }
        : { id: input.userId, email: null };

      return {
        user,
        learnings: learnings.map((l) => ({
          id: l.id,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          deletedAt: l.deletedAt,
          hasPlan: !!l.plan,
          messageCount: l.conversations.reduce(
            (sum, lc) => sum + lc.conversation._count.messages,
            0
          ),
        })),
      };
    }),
});
