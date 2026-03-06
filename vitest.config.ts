/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "tests/e2e"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/utils.ts",
        "src/lib/errors.ts",
        "src/lib/config.ts",
        "src/lib/ai/config.ts",
        "src/lib/ai/context.ts",
        "src/lib/validations/manifest.ts",
        "src/lib/validations/chat.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
