import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/MyAIActivity/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    passWithNoTests: true,
  },
});
