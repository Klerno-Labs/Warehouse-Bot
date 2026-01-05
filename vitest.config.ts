import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
    ],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server/**/*.ts", "app/api/**/*.ts", "shared/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./server"),
      "@app": path.resolve(__dirname, "./app"),
      "@/server": path.resolve(__dirname, "./server"),
      "@": path.resolve(__dirname, "./"),
    },
  },
});
