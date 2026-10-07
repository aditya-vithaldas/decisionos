import { type Product } from './catalog';

/** One representative listing per model; preserves the chosen search/sort order. */
export function distinctProducts(list: Product[]): Product[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

export function productFacts(p: Product, position: number) {
  const benefits: string[] = [];
  if (p.screen)
    benefits.push(
      `${p.screen}-inch screen${p.screen >= 12 ? ' gives more room for reading, watching, or working' : ''}.`,
    );
  if (p.storage)
    benefits.push(
      `${p.storage} GB of storage for apps and files; this is storage, not RAM.`,
    );
  if (p.weight < 500)
    benefits.push(`Weighs ${p.weight} g, useful when portability matters.`);
  benefits.push(
    `This sample listing is ${p.condition.toLowerCase()}, priced at ₹${p.price}.`,
  );
  return {
    id: p.id,
    position,
    name: p.name,
    category: p.category,
    priceINR: p.price,
    condition: p.condition,
    location: p.location,
    screenInches: p.screen ?? null,
    storageGB: p.storage ?? null,
    ramGB: p.specs.Memory.includes('GB RAM') ? parseInt(p.specs.Memory) : null,
    specifications: p.specs,
    dataNote: 'Fictional demo specifications, intentionally populated for this shopping experience; not verified manufacturer or seller claims.',
    weightGrams: p.weight,
    wifi: p.specs['Wi-Fi'],
    wifiScope: 'Demo specification; not independently verified.',
    featureBenefits: benefits,
    reviews: p.reviews,
    reviewSummary: p.reviewSummary,
    averageRating: p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length,
    reviewNote: 'These are fictional sample reviews for the demo, not verified customers. Use their specific praise and criticisms to answer review questions; do not invent additional sentiment.',
    unknown: ['Individual device testing'],
  };
}

export function resolveProductReferences(args: unknown, visible: Product[]) {
  if (!args || typeof args !== 'object')
    throw Error('Invalid product reference');
  const { positions, productQuery } = args as {
    positions: unknown;
    productQuery: unknown;
  };
  if (
    !Array.isArray(positions) ||
    positions.length > 4 ||
    positions.some((n) => !Number.isInteger(n) || n < 1) ||
    typeof productQuery !== 'string' ||
    productQuery.length > 150
  )
    throw Error(
      'Use up to four displayed product numbers or a short product name.',
    );
  if (positions.some((n) => n > visible.length))
    return {
      items: [],
      error:
        'That product number is not on the canvas. Ask which visible product the shopper means.',
    };
  let matches = positions.length
    ? [...new Set(positions)].map((n) => ({ p: visible[n - 1], n }))
    : [];
  if (!positions.length && productQuery.trim()) {
    const text = productQuery
      .toLowerCase()
      .replace(/\b(please|the|one|gb|gigabyte|gigabytes|storage)\b/g, ' ')
      .trim();
    const tokens = text.split(/\s+/).filter(Boolean);
    matches = visible
      .map((p, i) => ({ p, n: i + 1 }))
      .filter(({ p }) =>
        tokens.every((token) =>
          `${p.name} ${p.category} ${p.storage ?? ''}`
            .toLowerCase()
            .includes(token),
        ),
      );
    if (matches.length > 4)
      return {
        items: [],
        error: 'Several products match. Ask for a displayed number.',
        choices: matches.map(({ p, n }) => ({ position: n, name: p.name })),
      };
  }
  if (!matches.length)
    return {
      items: [],
      error:
        'No visible product matches that reference. Do not guess; ask for the product number. A number of GB may refer to RAM or storage, so clarify that too if needed.',
    };
  return { items: matches.map(({ p, n }) => productFacts(p, n)), error: null };
}

export const productDetailsTool = {
  type: 'function',
  name: 'get_product_details',
  description:
    'Read facts about numbered products currently on the canvas without changing the results. Use for feature questions, comparisons, Wi-Fi, storage, or reasons to choose a device. Positions are the visible 1-based numbers. For a named product use productQuery; never guess a number.',
  parameters: {
    type: 'object',
    properties: {
      positions: { type: 'array', items: { type: 'integer' }, maxItems: 4 },
      productQuery: { type: 'string' },
    },
    required: ['positions', 'productQuery'],
    additionalProperties: false,
  },
};
