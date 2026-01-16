import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";
import { filesRouter } from "./routers/files";
import { resourceRouter } from "./routers/resource";
import { learningRouter } from "./routers/learning";

export const appRouter = router({
  conversation: conversationRouter,
  files: filesRouter,
  learning: learningRouter,
  resource: resourceRouter,
});

export type AppRouter = typeof appRouter;
