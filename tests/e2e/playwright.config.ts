import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    use: {
        baseURL: 'https://c102-238.cloud.gwdg.de/',
        trace: 'on-first-retry',
        headless: true,
    },
    reporter: [['list'], ['html', { outputFolder: 'tests/e2e/test-report' }]],
});
