import { test, expect } from '@playwright/test';
import { generateOTP } from '@tests/utils/otp';



test('Recapp front page loads', async ({ page }) => {

  const recappEmail = process.env.PLAYWRIGHT_USERNAME;
  const recappPassword = process.env.PLAYWRIGHT_PASSWORD;
  const otpKey = process.env.OTP_KEY;

  await	page.goto('https://c102-238.cloud.gwdg.de');
  await	expect(page).toHaveTitle(/Recapp/i);
  await page.login(recappEmail, recappPassword);
  
  const otpCode = generateOTP(otpKey);

  await page.totp.fill(otpCode);
  await page.verfiyTotp.click();


});
