import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";
import { filesRouter } from "./routers/files";
import { resourceRouter } from "./routers/resource";

export const appRouter = router({
  conversation: conversationRouter,
  files: filesRouter,
  resource: resourceRouter,
});

export type AppRouter = typeof appRouter;
