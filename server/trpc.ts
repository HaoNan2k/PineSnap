import { initTRPC, TRPCError } from "@trpc/server";
import { type Context, resolveUserRole } from "./context";
import { ZodError } from "zod";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        code: error.code,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async (opts) => {
  const role = await resolveUserRole(opts.ctx.supabase);
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required" });
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      user: { ...opts.ctx.user, role },
    },
  });
});

