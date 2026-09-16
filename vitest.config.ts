import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["features/annytrade/server/testing/vitest.setup.ts"],
    include: [
      "features/annytrade/server/**/*.test.ts",
      "features/annytrade/lib/**/*.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
