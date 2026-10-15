import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { generateOTP } from "../utils/otp";
import path from 'path';
import {config as loadDotenv } from 'dotenv';

const envPath = path.resolve(__dirname, '../../.env'); // <-- adjust if your test folder depth changes
loadDotenv({ path: envPath });


test('test', async ({ page }) => {
  const recappEmail = process.env.PLAYWRIGHT_USERNAME;
  const recappPassword = process.env.PLAYWRIGHT_PASSWORD;
  const otpKey = process.env.OTP_KEY;  

  if (!recappEmail || !recappPassword || !otpKey) {
    throw new Error('Missing env vars – check .env');
  }

  await page.goto('https://c102-238.cloud.gwdg.de/activate?quiz=238be342-7829-4401-9c17-a1192a06c1be');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  
  await page.getByRole('textbox', { name: 'Email / Username' }).click();
  await page.getByRole('textbox', { name: 'Email / Username' }).fill(recappEmail);
  await page.getByRole('button', { name: 'Next' }).click();
  
  await page.getByRole('textbox', { name: 'Password' }).fill(recappPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  
  await expect(page.getByRole('button', { name: 'Authenticator App Google' })).toBeVisible();
  await page.getByRole('button', { name: 'Authenticator App Google' }).click();

  const otpCode = generateOTP(otpKey);

  await page.getByRole('textbox', { name: 'Code' }).fill(otpCode);
  await page.getByRole('button', { name: 'Continue' }).click();
  
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.waitForTimeout(5000);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();

});
