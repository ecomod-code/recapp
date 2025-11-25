import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    outputDir: 'test-artifacts',
    use: {
        baseURL: 'https://c102-238.cloud.gwdg.de/',
        trace: 'on-first-retry',
        headless: true,
    },
    reporter: [['list'], ['html', { outputFolder: 'test-report' }]],
});
