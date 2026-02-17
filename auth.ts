// auth.ts
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { CONFIG } from './config.js';

dotenv.config();

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://2clicks.ng/auth');

  await page.fill('input[name="email"]', CONFIG.EMAIL);
  await page.fill('input[name="password"]', CONFIG.PASSWORD);
  await page.click('button[type="submit"]');
  

  await page.waitForTimeout(5000);

  await context.storageState({ path: 'state.json' });
  await browser.close();

  console.log('Login saved to state.json');
})();

