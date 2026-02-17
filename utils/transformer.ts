function toText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) {
      return value;
    }
  }

  return '';
}

function extractNumber(value: unknown) {
  const text = toText(value);
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function parsePrice(value: unknown) {
  const text = toText(value);
  const digits = text.replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizePropertyType(type: string) {
  const value = type.toLowerCase();

  if (value.includes('terrace')) return 'Terraced';
  if (value.includes('semi')) return 'semi-detached';
  if (value.includes('fully')) return 'fully-detached';
  if (value.includes('bungalow')) return 'bungalow';
  return 'apartment';
}

function extractState(value: string) {
  // Some exports store "State, Area" in one field like "Lagos, Lekki".
  return value.split(',')[0]?.trim() || value;
}

export function transform(rawRow: unknown) {
  const row = (rawRow ?? {}) as Record<string, unknown>;

  const title = pick(row, ['Title', 'title', 'name', 'name_1']);
  const description = pick(row, ['Description', 'description', 'description_1', 'description_2']);
  const priceText = pick(row, ['Price', 'price', 'price_1', 'price_4']);
  const stateText = pick(row, ['State', 'state', 'data', 'data_1']);
  const propertyTypeText = pick(row, ['Property Type', 'Property_Type', 'property_type', 'propertyType']);

  if (!title) {
    throw new Error('Missing title column value. Expected one of: Title, title, name, name_1.');
  }

  const price = parsePrice(priceText);
  if (!Number.isFinite(price)) {
    throw new Error(`Invalid or missing price for listing "${title}".`);
  }

  const bathrooms = extractNumber(pick(row, ['Bathrooms', 'bathrooms', 'Bathrooms_2']));
  const bedrooms = extractNumber(pick(row, ['Bedrooms', 'bedrooms']));
  const toiletsFromSheet = extractNumber(pick(row, ['Toilets', 'toilets']));

  return {
    title,
    description,
    price,

    pricePeriod: 'per year',

    state: extractState(stateText),
    propertyType: normalizePropertyType(propertyTypeText),

    bedrooms,
    bathrooms,
    toilets: toiletsFromSheet || bathrooms + 1,

    agencyFee: 10,
    legalFee: 10,
    cautionFee: 10
  };
}
