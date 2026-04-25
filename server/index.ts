import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";
import { debugRouter } from "./routers/debug";
import { filesRouter } from "./routers/files";
import { resourceRouter } from "./routers/resource";
import { learningRouter } from "./routers/learning";

export const appRouter = router({
  conversation: conversationRouter,
  debug: debugRouter,
  files: filesRouter,
  learning: learningRouter,
  resource: resourceRouter,
});

export type AppRouter = typeof appRouter;
