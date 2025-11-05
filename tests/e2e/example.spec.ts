import { test, expect } from '@playwright/test';

test('Recapp front page loads', async ({ page }) => {
  await page.goto('https://c102-238.cloud.gwdg.de');
  await expect(page).toHaveTitle(/Recapp/i);
});
