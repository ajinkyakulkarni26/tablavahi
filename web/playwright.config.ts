import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const port = process.env.PLAYWRIGHT_PORT ?? "5174";
const host = "127.0.0.1";
const baseURL = `http://${host}:${port}`;
const blankFirebaseEnv = [
  "VITE_FIREBASE_API_KEY=",
  "VITE_FIREBASE_AUTH_DOMAIN=",
  "VITE_FIREBASE_PROJECT_ID=",
  "VITE_FIREBASE_STORAGE_BUCKET=",
  "VITE_FIREBASE_MESSAGING_SENDER_ID=",
  "VITE_FIREBASE_APP_ID=",
].join(" ");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: isCi ? "dot" : "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: isCi ? {} : { channel: "chrome" },
    },
  ],
  webServer: {
    command: `${blankFirebaseEnv} npm run dev -- --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
