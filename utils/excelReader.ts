import * as XLSX from 'xlsx';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CONFIG } from '.././config.js';

function normalizeCandidate(candidate: string) {
  const trimmed = candidate.trim();

  // Allow values copied with wrapping quotes in .env files.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function resolveListingsPath() {
  const envPath = CONFIG.LISTINGS_FILE?.trim();
  const cwd = process.cwd();
  const home = os.homedir();

  const candidates = [
    envPath,
    path.join(cwd, 'listings.xlsx'),
    path.join(cwd, 'listingfile.xlsx'),
    path.join(home, 'Downloads', 'listings.xlsx'),
    path.join(home, 'Downloads', 'listingfile.xlsx')
  ].filter((value): value is string => Boolean(value));

  for (const rawCandidate of candidates) {
    const candidate = normalizeCandidate(rawCandidate);

    if (!candidate) {
      continue;
    }

    const absolutePath = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(cwd, candidate);

    try {
      const stats = fs.statSync(absolutePath);

      if (!stats.isFile()) {
        continue;
      }

      fs.accessSync(absolutePath, fs.constants.R_OK);
      return absolutePath;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Listings file not found or not readable. Checked: ${candidates.join(', ')}. ` +
      'Set LISTINGS_FILE to a readable full path if your file has a different name.'
  );
}

export function readListings() {
  const listingsPath = resolveListingsPath();

  let workbook: XLSX.WorkBook;
  try {
    const fileBuffer = fs.readFileSync(listingsPath);
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read listings Excel file at ${listingsPath}: ${message}`);
  }

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(`No sheets found in Excel file: ${listingsPath}`);
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet!);
}
