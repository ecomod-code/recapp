import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["test/**/*.test.ts?(x)", "src/**/*.test.ts?(x)"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
  },
});