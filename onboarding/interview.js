// Investor onboarding interview: the question tree, the Live prompt, the tool
// Gemini calls to fill the profile, and the scoring. Gemini only extracts what
// the person said into fields; the risk band is computed here, in code.
import { companyNames } from './companies.js';

export const MODEL = 'gemini-3.8-live';

// Ten main questions. `branch` lists follow-ups the interviewer adds only when
// the condition holds; `probe` is the one depth question to ask if the answer is thin.
export const QUESTIONS = [
  { id: 1, key: 'currently_invests', ask: 'Hey, do you presently invest in stocks?',
    branch: [{ when: 'No, or used to', ask: 'Do you invest in anything else, like mutual funds, SIPs, FDs or gold?', then: 'Skip to question 4' }] },
  { id: 2, key: 'instruments', ask: 'What kind of stocks do you invest in?',
    probe: 'Mostly large caps like Nifty 50 names, or more mid and small caps?',
    branch: [{ when: 'Mentions F&O, options or intraday', ask: 'How often do you trade F&O or intraday, and how has it gone for you?' }] },
  { id: 3, key: 'companies', ask: 'Which companies do you hold or follow most closely?' },
  { id: 4, key: 'interests', ask: 'What do you like? Which sectors or themes interest you?' },
  { id: 5, key: 'interest_reasons', ask: 'Why does that interest you?',
    probe: 'Is that about the growth story, dividends, a business you know well, or something you read or heard?' },
  { id: 6, key: 'risk_appetite', ask: 'How would you describe your risk appetite?' },
  { id: 7, key: 'drawdown_reaction', ask: 'Say your portfolio fell 20% in a month, like March 2020. What would you do?',
    branch: [{ when: 'Answer contradicts question 6', ask: 'Earlier you described your appetite differently. Which feels closer to how you would really act?' }] },
  { id: 8, key: 'will_do', ask: 'What are the things you would absolutely do as an investor?' },
  { id: 9, key: 'avoid', ask: 'And what would you absolutely stay away from?',
    branch: [{ when: 'Conflicts with what they hold or trade today', ask: 'You mentioned you do some of that today. Is that something you want to stop?' }] },
  { id: 10, key: 'horizon', ask: 'How long can this money stay invested, and do you have savings outside the market to fall back on?' },
];

// Which main question each field answers; progress is worked out from these, not from the model's count.
export const FIELD_QUESTION = { currently_invests: 1, instruments: 2, cap_tilt: 2, fno_frequency: 2, fno_outcome: 2, companies: 3, interests: 4, interest_reasons: 5, risk_appetite: 6, drawdown_reaction: 7, will_do: 8, avoid: 9, horizon: 10, emergency_cushion: 10 };

export const BANDS = ['Conservative', 'Moderately conservative', 'Balanced', 'Growth', 'Aggressive'];

const ENUMS = {
  currently_invests: ['yes', 'no', 'used_to'],
  instruments: ['direct_equity', 'mutual_funds_sip', 'etf_index', 'fno', 'intraday', 'ipo', 'sme_ipo', 'bonds_fd', 'gold', 'crypto', 'other'],
  cap_tilt: ['large', 'mid', 'small', 'mixed'],
  fno_frequency: ['never', 'occasionally', 'weekly', 'daily'],
  fno_outcome: ['mostly_gains', 'mixed', 'mostly_losses'],
  risk_appetite: ['low', 'moderate', 'high', 'very_high'],
  drawdown_reaction: ['sell_all', 'sell_some', 'hold', 'buy_more'],
  horizon: ['under_1y', '1_3y', '3_5y', '5_10y', 'over_10y'],
  emergency_cushion: ['yes', 'partly', 'no'],
};

const list = (description, items) => ({ type: 'array', description, items: items ? { type: 'string', enum: items } : { type: 'string' } });
const one = (description, values) => ({ type: 'string', description, enum: values });

export const TOOLS = [
  {
    name: 'update_profile',
    description: 'Record what the person just said. Call after every answer, sending only the fields that answer changed. Use the person\'s meaning, not their exact words, except in quotes.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        currently_invests: one('Do they invest in stocks today?', ENUMS.currently_invests),
        instruments: list('How they invest.', ENUMS.instruments),
        cap_tilt: one('Market-cap tilt of their stocks.', ENUMS.cap_tilt),
        fno_frequency: one('How often they trade F&O or intraday.', ENUMS.fno_frequency),
        fno_outcome: one('How F&O or intraday trading has gone for them overall.', ENUMS.fno_outcome),
        companies: list('Indian listed companies they hold or follow, using the official name from the company list when it matches.'),
        interests: list('Sectors or themes that interest them, short phrases like "IT services" or "defence".'),
        interest_reasons: { type: 'string', description: 'Why those interest them, one short sentence in their words.' },
        risk_appetite: one('Their own description of their risk appetite.', ENUMS.risk_appetite),
        drawdown_reaction: one('What they would do if the portfolio fell 20% in a month.', ENUMS.drawdown_reaction),
        will_do: list('Things they would absolutely do, short phrases like "monthly SIP" or "hold 5+ years".'),
        avoid: list('Things they would absolutely stay away from: instruments, sectors, companies or groups.'),
        horizon: one('How long the money can stay invested.', ENUMS.horizon),
        emergency_cushion: one('Savings outside the market to fall back on.', ENUMS.emergency_cushion),
        quote: { type: 'string', description: 'A short quote of the key words from this answer.' },
      },
    },
  },
  {
    name: 'finish_interview',
    description: 'Call once, only after you have read the summary back, asked if it is right, and heard the person\'s reply. Never call it in the same turn as recording question 10.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        confirmed: { type: 'boolean', description: 'True if the person agreed with the summary.' },
        summary: { type: 'string', description: 'Two or three sentences describing them as an investor.' },
      },
      required: ['confirmed', 'summary'],
    },
  },
];

export function systemPrompt() {
  const tree = QUESTIONS.map(q => {
    const lines = [`${q.id}. ${q.ask}`];
    if (q.probe) lines.push(`   If the answer is thin, probe once: ${q.probe}`);
    for (const b of q.branch || []) lines.push(`   If ${b.when.toLowerCase()}: ${b.ask}${b.then ? ` (${b.then.toLowerCase()})` : ''}`);
    return lines.join('\n');
  }).join('\n');
  return `You are a warm, sharp interviewer onboarding a retail investor in India for DecisionAxis. Your job is to understand their risk appetite, what they like and what they avoid. You never recommend stocks, funds or trades and never give investment advice; if asked, say this conversation only builds their profile.

How to speak: one question at a time, short sentences, natural spoken English. If they speak Hindi or Hinglish, reply in the same mix. Acknowledge each answer in a few words before moving on. Go deeper with one follow-up when an answer is vague, then move on. Do not read out question numbers.

Follow this tree in order, adding a branch only when its condition holds:
${tree}

After the answer to question 10, do not finish yet. Read back a short summary of what you heard (how they invest, the companies they named, what they like and why, their risk appetite, what they always do and never do, their horizon) and ask "Did I get that right?" Then stop and wait for their reply. If they correct something, call update_profile with the fix. Only after they reply, call finish_interview and thank them in one sentence.

After every answer, call update_profile with the fields that answer gives you. Never drop a company, sector or exclusion the person mentions. Record companies with their names from this list of NSE and BSE companies when the person clearly means one of them, for example "Infosis" is Infosys, "HUL" is Hindustan Unilever and "Zomato" is Eternal (Zomato). If a company is not in the list, record it as they said it: ${companyNames().join(', ')}.

Start now: greet them in one sentence, say you will ask about ten short questions about how they invest, then ask question 1.`;
}

// Scoring: willingness from what they say and do, capacity from horizon and
// cushion. The profile band is the lower of the two, so neither is overstated.
const SCORE = {
  risk_appetite: { low: 0, moderate: 2, high: 3, very_high: 4 },
  drawdown_reaction: { sell_all: 0, sell_some: 1, hold: 3, buy_more: 4 },
  horizon: { under_1y: 0, '1_3y': 1, '3_5y': 2, '5_10y': 3, over_10y: 4 },
};

export function score(p) {
  const w = [SCORE.risk_appetite[p.risk_appetite], SCORE.drawdown_reaction[p.drawdown_reaction]].filter(v => v !== undefined);
  let willingness = w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
  if (willingness !== null && ['weekly', 'daily'].includes(p.fno_frequency)) willingness = Math.min(4, willingness + 0.5);
  let capacity = SCORE.horizon[p.horizon] ?? null;
  if (capacity !== null && p.emergency_cushion === 'no') capacity = Math.max(0, capacity - 1.5);
  else if (capacity !== null && p.emergency_cushion === 'partly') capacity = Math.max(0, capacity - 0.5);
  const band = willingness !== null && capacity !== null ? BANDS[Math.round(Math.min(willingness, capacity))] : null;
  return { willingness, capacity, band };
}

export const LABELS = {
  currently_invests: { yes: 'Yes', no: 'No', used_to: 'Used to' },
  instruments: { direct_equity: 'Direct stocks', mutual_funds_sip: 'Mutual funds / SIP', etf_index: 'ETFs and index funds', fno: 'F&O', intraday: 'Intraday', ipo: 'IPOs', sme_ipo: 'SME IPOs', bonds_fd: 'Bonds / FDs', gold: 'Gold', crypto: 'Crypto', other: 'Other' },
  cap_tilt: { large: 'Large caps', mid: 'Mid caps', small: 'Small caps', mixed: 'Mixed' },
  fno_frequency: { never: 'Never', occasionally: 'Occasionally', weekly: 'Weekly', daily: 'Daily' },
  fno_outcome: { mostly_gains: 'Mostly gains', mixed: 'Mixed', mostly_losses: 'Mostly losses' },
  risk_appetite: { low: 'Low', moderate: 'Moderate', high: 'High', very_high: 'Very high' },
  drawdown_reaction: { sell_all: 'Sell everything', sell_some: 'Sell some', hold: 'Hold', buy_more: 'Buy more' },
  horizon: { under_1y: 'Under 1 year', '1_3y': '1–3 years', '3_5y': '3–5 years', '5_10y': '5–10 years', over_10y: 'Over 10 years' },
  emergency_cushion: { yes: 'Yes', partly: 'Partly', no: 'No' },
};
