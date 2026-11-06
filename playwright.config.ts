import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "**/*.spec.ts", use: { browserName: "chromium", headless: true },
  webServer: { command: "node tests/editor-preview.mjs", port: 4173, reuseExistingServer: !process.env.CI },
});
