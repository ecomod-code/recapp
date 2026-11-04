import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { generateOTP } from "../utils/otp";
import path from 'path';
import {config as loadDotenv } from 'dotenv';

const fs = require('fs');
//const envPath = path.resolve(__dirname, '../../.env'); // <-- adjust if your test f>
//loadDotenv({ path: envPath });


test('test', async ({ page }) => {
  const recappEmail = process.env.PLAYWRIGHT_USERNAME;
  const recappPassword = process.env.PLAYWRIGHT_PASSWORD;
  const otpKey = process.env.PLAYWRIGHT_OTP_KEY;

  if (!recappEmail || !recappPassword || !otpKey) {
    throw new Error('Missing env vars – check .env');
  }

  await page.goto('https://c102-238.cloud.gwdg.de/');
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  await page.getByRole('textbox', { name: 'Email / Username' }).click();
  await page.getByRole('textbox', { name: 'Email / Username' }).fill(recappEmail);
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('textbox', { name: 'Password' }).fill(recappPassword);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('button', { name: 'Authenticator App Google' })).toBe>
  await page.getByRole('button', { name: 'Authenticator App Google' }).click();

  const otpCode = generateOTP(otpKey);

  await page.getByRole('textbox', { name: 'Code' }).fill(otpCode);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'New quiz' }).click();
  await page.getByRole('textbox', { name: 'Title' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Test Quiz');
  await page.getByRole('button', { name: 'Create quiz' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 1');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByRole('combobox').nth(0).selectOption('SINGLE');
  await page.getByRole('textbox', { name: 'Question' }).click();
  await page.getByRole('textbox', { name: 'Question' }).fill('question 2');
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('button', { name: 'Add answer' }).click();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('1');
  await page.getByRole('textbox').nth(3).click();
  await page.getByRole('textbox').nth(3).fill('2');
  await page.getByRole('textbox').nth(4).click();
  await page.getByRole('textbox').nth(4).fill('3');
  await page.getByRole('textbox').nth(5).click();
  await page.getByRole('textbox').nth(5).fill('4');
  await page.getByRole('button', { name: 'Save question' }).click();

  await page.getByRole('button', { name: 'Show QR code' }).click();
  const url = await page.locator('a[href^="https://c102-238.cloud.gwdg.de/activate"]').getAttribute('href');
  
   if (!url || !url.startsWith('https://')) {
    throw new Error('Failed to extract valid URL');
  }

  console.log('✅ Extracted URL:', url);

//  const envContent = fs.readFileSync(envPath, 'utf8');
//  const updatedContent = envContent
//    .replace(/PLAYWRIGHT_SHARE_URL=.*/, `PLAYWRIGHT_SHARE_URL=${url}`)
//    .replace(/# PLAYWRIGHT_SHARE_URL=.*/, `PLAYWRIGHT_SHARE_URL=${url}`);
  

  // Write back to .env file
  fs.writeFileSync(quiz-link.txt, updatedContent);

});
