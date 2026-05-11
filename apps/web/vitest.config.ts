import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@rcc/contracts": path.resolve(__dirname, "../packages/contracts/src")
    }
  }
});
