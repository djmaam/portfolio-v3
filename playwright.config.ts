import { defineConfig, devices } from '@playwright/test'

// The static build, served exactly as it ships. `astro preview` defaults to this port
// and the tests never hardcode it anywhere else.
const PORT = 4321
const baseURL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Locally a retry would hide a flake, and a flake here is a bug. CI gets one, because
  // a cold runner can lose a frame to something that is not this site.
  retries: isCI ? 1 : 0,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry' },
  // Chromium only: the design targets evergreen browsers and a second engine doubles
  // CI time for very little here (spec 17, "out of scope").
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: 'bun run preview',
    url: baseURL,
    reuseExistingServer: !isCI,
    // Astro 7 daemonizes `preview` when it auto-detects a coding-agent environment, and
    // Playwright needs a process that stays in the foreground — it treats an exit as the
    // server dying. This variable is the "the caller decided" switch: set, Astro skips
    // the auto-detection, and with no `--background` flag that means foreground.
    env: { ASTRO_PREVIEW_BACKGROUND: 'false' },
  },
})
