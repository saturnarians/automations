import dotenv from 'dotenv';
dotenv.config();

function parseMaxTabs(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const CONFIG = {
  EMAIL: process.env['EMAIL'] || '',
  PASSWORD: process.env['PASSWORD'] || '',
  LISTINGS_FILE: process.env['LISTINGS_FILE'] || '',
  MAX_TABS: parseMaxTabs(process.env['MAX_TABS'], 7)
};
