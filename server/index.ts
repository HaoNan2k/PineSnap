import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";
import { filesRouter } from "./routers/files";

export const appRouter = router({
  conversation: conversationRouter,
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
