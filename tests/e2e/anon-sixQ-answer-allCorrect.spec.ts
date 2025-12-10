import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://recapp.uni-goettingen.de/activate?quiz=0d245a55-c334-4b4a-90be-f04f8ba40bb0');
  await page.getByRole('button', { name: 'Continue without login' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Login' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
});
