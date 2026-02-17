import { chromium } from 'playwright';
import type { BrowserContext, Locator, Page } from 'playwright';
import { CONFIG } from './config.js';
import { readListings } from './utils/excelReader.js';
import { transform } from './utils/transformer.js';

const AUTH_FILE = 'state.json';

function firstVisible(locator: Locator) {
  return locator.first();
}

async function loginAndConfirm(context: BrowserContext) {
  if (!CONFIG.EMAIL || !CONFIG.PASSWORD) {
    throw new Error('Missing EMAIL or PASSWORD in .env');
  }

  const page = await context.newPage();
  await page.goto('https://2clicks.ng/auth', { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/auth') || page.url().includes('/login')) {
    const emailInput = firstVisible(
      page.locator('input[name="email"], input[type="email"], input[id*="email" i]')
    );
    const passwordInput = firstVisible(
      page.locator('input[name="password"], input[type="password"], input[id*="password" i]')
    );

    await emailInput.waitFor({ state: 'visible', timeout: 45000 });
    await emailInput.fill(CONFIG.EMAIL);

    await passwordInput.waitFor({ state: 'visible', timeout: 45000 });
    await passwordInput.fill(CONFIG.PASSWORD);

    const submitButton = firstVisible(
      page.locator(
        'button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")'
      )
    );

    await submitButton.waitFor({ state: 'visible', timeout: 30000 });
    await submitButton.click();

    await page.waitForFunction(() => !location.pathname.includes('/auth') && !location.pathname.includes('/login'), {
      timeout: 60000
    });
  }

  await page.goto('https://2clicks.ng/selling', { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/auth') || page.url().includes('/login')) {
    throw new Error('Login not confirmed. Still redirected to auth/login page.');
  }

  await context.storageState({ path: AUTH_FILE });
  console.log('Login confirmed. Keeping this tab open and continuing with new tabs.');
}

async function ensureSellingForm(page: Page) {
  await page.goto('https://2clicks.ng/selling', { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/auth') || page.url().includes('/login')) {
    throw new Error('Session expired: redirected to auth/login page.');
  }

  await page.getByText('Properties', { exact: true }).click({ timeout: 20000 });
  await page.getByText('Houses & Flats for Rent', { exact: true }).click({ timeout: 20000 });
  await page.getByText('Continue', { exact: true }).click({ timeout: 20000 });
  await page.waitForSelector('input[name="name"]', { timeout: 45000 });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  await loginAndConfirm(context);

  const listings = readListings();
  const targetListings = listings.slice(0, CONFIG.MAX_TABS);

  console.log(`Preparing ${targetListings.length} listing tab(s).`);

  for (const [index, raw] of targetListings.entries()) {
    const page = await context.newPage();

    try {
      const data = transform(raw);
      await ensureSellingForm(page);

      await page.fill('input[name="name"]', data.title);
      await page.fill('textarea[name="description"]', data.description);
      await page.fill('input[name="price"]', data.price.toString());

      await page.getByText('per year', { exact: true }).click();

      await page.getByText('Select', { exact: true }).first().click();
      await page.getByText(data.state, { exact: true }).first().click({ timeout: 15000 });

      await page.getByText('Property Type', { exact: false }).first().click();
      await page.getByText(data.propertyType, { exact: false }).first().click({ timeout: 15000 });

      await page.getByText('Number of Bedrooms', { exact: false }).first().click();
      await page.getByText(String(data.bedrooms), { exact: false }).first().click({ timeout: 15000 });

      await page.getByText('Number of Bathrooms', { exact: false }).first().click();
      await page.getByText(String(data.bathrooms), { exact: false }).first().click({ timeout: 15000 });

      await page.getByText('Number of Toilets', { exact: false }).first().click();
      await page.getByText(String(data.toilets), { exact: false }).first().click({ timeout: 15000 });

      await page.fill('input[name="agencyFee"]', '10');
      await page.fill('input[name="legalFees"]', '10');
      await page.fill('input[name="cautionFee"]', '10');

      console.log(`Tab ${index + 1}/${targetListings.length} ready: ${data.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Tab ${index + 1}/${targetListings.length} failed: ${message}`);
      console.error('Leaving this tab open for manual correction.');
    }
  }

  console.log('All tabs processed. Upload media and click Post my Ad manually in each tab.');
  console.log('Browser will stay open. Press Ctrl+C in terminal when done.');

  await new Promise(() => {
    // Keep the process alive so tabs remain open for manual actions.
  });
})();


