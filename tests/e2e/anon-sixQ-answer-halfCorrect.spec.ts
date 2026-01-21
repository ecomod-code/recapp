import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://recapp.uni-goettingen.de/activate?quiz=42460a69-3d70-4efa-b4b5-12efe9b985f3');
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
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
});
