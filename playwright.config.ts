import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser", workers: 1, fullyParallel: false,
  reporter: [["list"], ["json", { outputFile: "artifacts/browser-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:8790", screenshot: "only-on-failure",
    launchOptions: { executablePath: process.env.PDCAR_CHROMIUM_PATH || undefined }
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ],
  webServer: [
    { command: "node tests/mock-server.mjs", url: "http://127.0.0.1:8789/__state", reuseExistingServer: false },
    {
      command: 'wrangler pages dev out --ip 127.0.0.1 --port 8790 --binding NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8789 --binding NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock --binding NEXT_PUBLIC_ERP_URL=http://127.0.0.1:8789 --binding NEXT_PUBLIC_LINE_URL=https://line.me/ti/p/mock',
      url: "http://127.0.0.1:8790/api/health", reuseExistingServer: false, timeout: 60000,
      env: { WRANGLER_SEND_METRICS: "false", XDG_CONFIG_HOME: "/tmp/pdcar-config" }
    }
  ]
});
