import { chromium } from 'playwright';
import type { Page } from 'playwright';
import fs from 'node:fs';
import { CONFIG } from './config.js';
import { readListings } from './utils/excelReader.js';
import { transform } from './utils/transformer.js';

async function ensureSellingForm(page: Page) {
  await page.goto('https://2clicks.ng/selling', { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/login')) {
    throw new Error('Redirected to login. Run `npx tsx auth.ts` to refresh state.json.');
  }

  await page.getByText('Properties', { exact: true }).click({ timeout: 20000 });
  await page.getByText('Houses & Flats for Rent', { exact: true }).click({ timeout: 20000 });
  await page.getByText('Continue', { exact: true }).click({ timeout: 20000 });

  await page.waitForSelector('input[name="name"]', { timeout: 45000 });
}

(async () => {
  const browser = await chromium.launch({ headless: false });

  const authFile = 'state.json';
  const hasState = fs.existsSync(authFile) && fs.statSync(authFile).size > 0;

  const context = await browser.newContext(
    hasState ? { storageState: authFile } : {}
  );

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

