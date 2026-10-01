import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "arc-local-browser-test-public-key",
    },
    timeout: 120000,
  },
});
