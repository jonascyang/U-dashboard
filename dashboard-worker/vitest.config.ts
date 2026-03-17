import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@worker": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "../src")
    }
  }
});
