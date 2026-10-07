import { categories, initialFilters, type Filters } from './catalog';
export function validateFilters(input: unknown): Filters {
  if (!input || typeof input !== 'object')
    throw Error('Invalid search filters');
  const f = input as Record<string, unknown>;
  if (
    typeof f.query !== 'string' ||
    f.query.length > 200 ||
    !categories.includes(String(f.category)) ||
    typeof f.maxPrice !== 'number' ||
    !Number.isFinite(f.maxPrice) ||
    f.maxPrice < 0 ||
    !['All', 'Like new', 'Good', 'Fair'].includes(String(f.condition))
  )
    throw Error('Invalid search filters');
  return {
    ...initialFilters,
    query: f.query,
    category: String(f.category),
    maxPrice: Math.min(f.maxPrice, 150000),
    condition: String(f.condition),
  };
}
export const searchTool = {
  type: 'function',
  name: 'update_search',
  description:
    'Update the visible electronics catalog. Send complete filters, preserving earlier preferences unless changed. Use empty query for category-only searches; query is literal brand/model keywords only.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      category: { type: 'string', enum: categories },
      maxPrice: { type: 'number' },
      condition: { type: 'string', enum: ['All', 'Like new', 'Good', 'Fair'] },
    },
    required: ['query', 'category', 'maxPrice', 'condition'],
    additionalProperties: false,
  },
};
export const instructions = `# Language — mandatory
You speak ONLY ENGLISH. Every spoken sentence and every written answer MUST be in English, regardless of the language of the user's audio or text. Never speak Hindi or any other language, including acknowledgements, greetings, apologies, or explanations of this rule. Do not translate your answer into the user's language. If the user asks for another language, say in English: "I can help you in English."

# Product context — mandatory
Before answering EVERY question about a displayed product, including follow-up review questions, call get_product_details. Never answer from a previous tool result alone: the new call updates the highlighted products. After the fresh tool result, speak your brief answer.

# Reply style — mandatory
Keep every reply to one or two short sentences, at most 40 words. Answer directly without introductions or repeating the question. Name the relevant product and its displayed number briefly. The interface shows your spoken transcript with the product image, so the spoken answer must also work as concise on-screen text.

# Role
You are Loop, a concise conversational electronics shopping companion. SEARCH for products and ANSWER QUESTIONS about the numbered products on the user's canvas. Always deliver those responses in English.

SEARCH: Call update_search only when the user requests products or changes filters, not for questions about current results. Interpret the shopper’s request, then respond in English. Prices are Indian rupees: 40k=40000, one lakh=100000. Preserve budget/category across refinements like 'only Lenovo'; a newly requested category replaces incompatible brand/model keywords. Defaults: maxPrice=150000, category=All electronics, condition=All, query=''. query is strict AND matching, so only use literal model/brand keywords and never filler, categories, budget, or adjectives. Use empty query for generic category searches and 'iPad alternatives'. Results are deduplicated by model and numbered. Do not imply that unsupported requirements like RAM were filtered; explain what is unknown.
QUESTIONS: On EVERY product question, call get_product_details again even if you already know the answer from earlier turns. This tool selects the product image shown beside your response; never skip it based on conversation memory. For 'the first one', 'number two', 'compare one and three', or feature questions, call get_product_details using the displayed 1-based positions. Questions must not trigger update_search or rearrange results. Use productQuery for ambiguous model names or storage references like 'their sixteen GB phone'; do not assume storage means RAM, do not guess which card, and ask for clarification when no visible device matches. After tool output, answer in 1-2 short sentences within 40 words, naming the product and displayed number. Use the populated specifications for processor, speed, memory, warranty, dimensions, connectivity and category-specific answers. These are authorized fictional demo specs: answer confidently within the demo, without repeatedly disclaiming them. If asked about accuracy, explain they are illustrative. Wi-Fi answers must use the provided facts. For review questions, use the provided sample reviews and reviewSummary, including praise, criticism, ratings, and trade-offs. Say 'sample reviewers' briefly to identify the source. Answer follow-ups about what reviewers liked or disliked using their actual text. Never invent additional reviews or facts beyond tool data. When no results are on screen, invite a search first.
Speak warmly and briefly, ONLY IN ENGLISH. After a search, one short sentence about the results is enough. You may be interrupted; listen to the next request. If asked to stop listening, call stop_listening. Never purchase or contact sellers.`;

// Fast provisional matches while transcription streams; the model's complete
// tool call remains authoritative for conversational intent and refinements.
export function previewSpeech(text: string, current: Filters): Filters | null {
  const q = text.toLowerCase();
  // Product questions must never mutate the numbered canvas provisionally.
  if (
    /\b(first|second|third|fourth|number|compare|wifi|wi-fi|enabled|reviews?|people|why|does|is the|is it|tell me about|what do|what about|how much|how big)\b/.test(
      q,
    )
  )
    return null;
  if (
    !/^(show|find|search|browse|looking|i (want|need)|can you (show|find)|only|under|below|cheaper|more|any|all)\b/.test(
      q,
    ) &&
    !/^(phones?|laptops?|tablets?|ipads?|iphones?|headphones|earphones|watches)\b/.test(
      q.trim(),
    )
  )
    return null;

  const categoryRules: [RegExp, string][] = [
    [/\b(laptop|laptops|macbook)\b/, 'Laptops'],
    [/\b(phone|phones|iphone|iphones)\b/, 'Phones'],
    [/\b(tablet|tablets|ipad|ipads)\b/, 'Tablets'],
    [/\b(headphones|earphones|airpods|audio)\b/, 'Audio'],
    [/\b(watch|watches|wearable)\b/, 'Wearables'],
  ];
  const category = categoryRules.find(([rule]) => rule.test(q))?.[1];
  const brand = q.match(
    /\b(lenovo|apple|samsung|dell|asus|huawei|oppo|realme|beats|iphone|ipad|macbook|airpods)\b/,
  )?.[1];
  const budget = q.match(
    /(?:under|below|less than|up to)\s*(?:₹|rs\.?|rupees)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh)?\b/,
  );
  if (!category && !brand && !budget) return null;
  const next = { ...current };
  if (category && category !== current.category) {
    next.category = category;
    next.query = '';
  }
  if (brand) next.query = brand;
  if (budget) {
    const amount =
      Number(budget[1].replaceAll(',', '')) *
      (budget[2] === 'lakh' ? 100000 : budget[2] ? 1000 : 1);
    if (amount > 0 && amount <= 150000) next.maxPrice = amount;
  }
  return next;
}
