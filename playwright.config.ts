import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Uma tentativa local também: a suíte roda desktop e mobile em paralelo e,
  // sob carga, navegações estouram o tempo sem que nada tenha regredido.
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  // As telas que buscam disponibilidade no cliente dependem de uma ida ao
  // servidor. Com quatro workers contra um servidor frio, o padrão de 5s da
  // asserção estoura sem que nada tenha regredido.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      ROOMLY_INTEGRATION_MODE: "simulator",
      ROOMLY_PAYMENT_MODE: "simulator",
      ROOMLY_ACCESS_MODE: "simulator",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
