import { router } from "./trpc";
import { conversationRouter } from "./routers/conversation";
import { debugRouter } from "./routers/debug";
import { filesRouter } from "./routers/files";
import { resourceRouter } from "./routers/resource";
import { learningRouter } from "./routers/learning";
import { summaryRouter } from "./routers/summary";

export const appRouter = router({
  conversation: conversationRouter,
  debug: debugRouter,
  files: filesRouter,
  learning: learningRouter,
  resource: resourceRouter,
  summary: summaryRouter,
});

export type AppRouter = typeof appRouter;
