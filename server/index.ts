import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";

export const appRouter = router({
  conversation: conversationRouter,
});

export type AppRouter = typeof appRouter;

