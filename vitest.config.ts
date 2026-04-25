import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
