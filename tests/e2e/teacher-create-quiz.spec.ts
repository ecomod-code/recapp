import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://recapp.uni-goettingen.de/activate?quiz=42460a69-3d70-4efa-b4b5-12efe9b985f3');
  await page.getByRole('button', { name: 'Continue without login' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('This is a test question.');
  await page.getByRole('combobox').nth(1).selectOption('SINGLE');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('textbox').nth(2).fill('okay');
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('answer 1');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('textbox').nth(3).fill('answer 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('textbox').nth(4).fill('answer 3');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('textbox').nth(5).fill('answer 4');
  await page.getByRole('checkbox').nth(2).check();
  await page.getByRole('button', { name: 'Save question' }).click();
});
