// Widely held NSE/BSE companies, with the names and shorthand people say aloud.
// Used twice: the names go into the interviewer's prompt, and match() snaps a
// misheard or abbreviated name ("Infosis", "HUL", "L and T") to the listed company.
// Curated, not the full exchange list; check symbols against NSE before relying on them.
// Row: name | NSE symbol | sector | aliases (comma separated)
const ROWS = `Reliance Industries|RELIANCE|Oil & gas|reliance, ril, jio
HDFC Bank|HDFCBANK|Banks|hdfc
ICICI Bank|ICICIBANK|Banks|icici
State Bank of India|SBIN|Banks|sbi, state bank
Kotak Mahindra Bank|KOTAKBANK|Banks|kotak
Axis Bank|AXISBANK|Banks|axis
IndusInd Bank|INDUSINDBK|Banks|indusind, indus ind
Bank of Baroda|BANKBARODA|Banks|bob, baroda
Punjab National Bank|PNB|Banks|pnb
Canara Bank|CANBK|Banks|canara
Union Bank of India|UNIONBANK|Banks|union bank
IDFC First Bank|IDFCFIRSTB|Banks|idfc first, idfc
Yes Bank|YESBANK|Banks|
AU Small Finance Bank|AUBANK|Banks|au bank, au small finance
Federal Bank|FEDERALBNK|Banks|federal
Bandhan Bank|BANDHANBNK|Banks|bandhan
Bajaj Finance|BAJFINANCE|NBFC|bajaj fin
Bajaj Finserv|BAJAJFINSV|NBFC|finserv
Bajaj Housing Finance|BAJAJHFL|NBFC|bajaj housing
Shriram Finance|SHRIRAMFIN|NBFC|shriram
Cholamandalam Investment and Finance|CHOLAFIN|NBFC|chola, cholamandalam
Muthoot Finance|MUTHOOTFIN|NBFC|muthoot
Jio Financial Services|JIOFIN|NBFC|jio financial, jio finance
REC|RECLTD|NBFC|rural electrification
Power Finance Corporation|PFC|NBFC|pfc
IRFC|IRFC|NBFC|indian railway finance
IREDA|IREDA|NBFC|
HUDCO|HUDCO|NBFC|
Bajaj Holdings|BAJAJHLDNG|NBFC|
LIC|LICI|Insurance|life insurance corporation
SBI Life Insurance|SBILIFE|Insurance|sbi life
HDFC Life Insurance|HDFCLIFE|Insurance|hdfc life
ICICI Prudential Life|ICICIPRULI|Insurance|icici pru, icici prudential
ICICI Lombard|ICICIGI|Insurance|lombard
PB Fintech (Policybazaar)|POLICYBZR|New-age tech|policybazaar, policy bazaar, pb fintech
TCS|TCS|IT services|tata consultancy, tata consultancy services
Infosys|INFY|IT services|infy
HCLTech|HCLTECH|IT services|hcl, hcl tech
Wipro|WIPRO|IT services|
Tech Mahindra|TECHM|IT services|tech m
LTIMindtree|LTIM|IT services|lti, mindtree, lti mindtree
Persistent Systems|PERSISTENT|IT services|persistent
Coforge|COFORGE|IT services|
Mphasis|MPHASIS|IT services|
KPIT Technologies|KPITTECH|IT services|kpit
Tata Elxsi|TATAELXSI|IT services|elxsi
Tata Technologies|TATATECH|IT services|tata tech
Oracle Financial Services Software|OFSS|IT services|ofss
Info Edge (Naukri)|NAUKRI|New-age tech|naukri, info edge
Eternal (Zomato)|ETERNAL|New-age tech|zomato, blinkit, eternal
Swiggy|SWIGGY|New-age tech|instamart
One97 Communications (Paytm)|PAYTM|New-age tech|paytm, one97, one 97
FSN E-Commerce (Nykaa)|NYKAA|New-age tech|nykaa
Delhivery|DELHIVERY|Logistics|
Ola Electric|OLAELEC|Auto|ola
Hindustan Unilever|HINDUNILVR|FMCG|hul, hindustan lever, unilever
ITC|ITC|FMCG|
Nestle India|NESTLEIND|FMCG|nestle
Britannia Industries|BRITANNIA|FMCG|britannia
Tata Consumer Products|TATACONSUM|FMCG|tata consumer, tata tea
Dabur India|DABUR|FMCG|dabur
Marico|MARICO|FMCG|
Godrej Consumer Products|GODREJCP|FMCG|godrej consumer
Colgate-Palmolive India|COLPAL|FMCG|colgate
Varun Beverages|VBL|FMCG|varun, vbl
United Spirits|UNITDSPR|FMCG|mcdowell
United Breweries|UBL|FMCG|ubl, kingfisher
AWL Agri Business (Adani Wilmar)|AWL|FMCG|adani wilmar, fortune
Jubilant FoodWorks|JUBLFOOD|Consumer|jubilant, dominos
Asian Paints|ASIANPAINT|Paints|asian paint
Berger Paints|BERGEPAINT|Paints|berger
Pidilite Industries|PIDILITIND|Chemicals|pidilite, fevicol
Titan Company|TITAN|Consumer|titan, tanishq
Kalyan Jewellers|KALYANKJIL|Consumer|kalyan
Trent|TRENT|Retail|zudio, westside
Avenue Supermarts (DMart)|DMART|Retail|dmart, d mart, avenue supermarts
Page Industries|PAGEIND|Consumer|jockey
Havells India|HAVELLS|Electricals|havells
Polycab India|POLYCAB|Electricals|polycab
Voltas|VOLTAS|Consumer|
Dixon Technologies|DIXON|Electronics|dixon
LG Electronics India|LGEINDIA|Electronics|lg
Maruti Suzuki|MARUTI|Auto|maruti
Mahindra & Mahindra|M&M|Auto|mahindra, m and m, m&m
Tata Motors|TMPV|Auto|tata motors
Bajaj Auto|BAJAJ-AUTO|Auto|
Hero MotoCorp|HEROMOTOCO|Auto|hero, hero honda
Eicher Motors|EICHERMOT|Auto|eicher, royal enfield
TVS Motor|TVSMOTOR|Auto|tvs
Hyundai Motor India|HYUNDAI|Auto|hyundai
Ashok Leyland|ASHOKLEY|Auto|
Bosch|BOSCHLTD|Auto|
MRF|MRF|Auto|
Apollo Tyres|APOLLOTYRE|Auto|
Balkrishna Industries|BALKRISIND|Auto|bkt
Tube Investments of India|TIINDIA|Auto|tube investments
Sun Pharmaceutical|SUNPHARMA|Pharma|sun pharma
Dr. Reddy's Laboratories|DRREDDY|Pharma|dr reddy, dr reddys, reddys
Cipla|CIPLA|Pharma|
Divi's Laboratories|DIVISLAB|Pharma|divis, divi
Lupin|LUPIN|Pharma|
Aurobindo Pharma|AUROPHARMA|Pharma|aurobindo
Zydus Lifesciences|ZYDUSLIFE|Pharma|zydus, cadila
Torrent Pharmaceuticals|TORNTPHARM|Pharma|torrent pharma
Mankind Pharma|MANKIND|Pharma|mankind
Apollo Hospitals|APOLLOHOSP|Healthcare|apollo hospital, apollo
Max Healthcare|MAXHEALTH|Healthcare|max health
Larsen & Toubro|LT|Capital goods|l&t, l and t, larsen, lnt
Siemens|SIEMENS|Capital goods|
ABB India|ABB|Capital goods|abb
BHEL|BHEL|Capital goods|bharat heavy electricals
Cummins India|CUMMINSIND|Capital goods|cummins
Hindustan Aeronautics|HAL|Defence|hal
Bharat Electronics|BEL|Defence|bel
Bharat Dynamics|BDL|Defence|bdl
Mazagon Dock Shipbuilders|MAZDOCK|Defence|mazagon, mazdock
Cochin Shipyard|COCHINSHIP|Defence|cochin
IRCTC|IRCTC|Railways|
Rail Vikas Nigam|RVNL|Railways|rvnl
UltraTech Cement|ULTRACEMCO|Cement|ultratech
Grasim Industries|GRASIM|Cement|grasim
Shree Cement|SHREECEM|Cement|shree
Ambuja Cements|AMBUJACEM|Cement|ambuja
Tata Steel|TATASTEEL|Metals|
JSW Steel|JSWSTEEL|Metals|jsw
Hindalco Industries|HINDALCO|Metals|hindalco
Vedanta|VEDL|Metals|
Hindustan Zinc|HINDZINC|Metals|
Coal India|COALINDIA|Metals|
NMDC|NMDC|Metals|
SAIL|SAIL|Metals|steel authority
Jindal Steel|JINDALSTEL|Metals|jindal
NTPC|NTPC|Power|
Power Grid Corporation|POWERGRID|Power|power grid
Tata Power|TATAPOWER|Power|
Adani Power|ADANIPOWER|Power|
Adani Green Energy|ADANIGREEN|Renewables|adani green
Adani Energy Solutions|ADANIENSOL|Power|adani transmission
JSW Energy|JSWENERGY|Power|
NHPC|NHPC|Power|
SJVN|SJVN|Power|
Suzlon Energy|SUZLON|Renewables|suzlon
Waaree Energies|WAAREEENER|Renewables|waaree
Premier Energies|PREMIERENE|Renewables|
ONGC|ONGC|Oil & gas|oil and natural gas
BPCL|BPCL|Oil & gas|bharat petroleum
Indian Oil Corporation|IOC|Oil & gas|indian oil, ioc
GAIL|GAIL|Oil & gas|
Adani Enterprises|ADANIENT|Infrastructure|
Adani Ports and SEZ|ADANIPORTS|Infrastructure|adani ports
Bharti Airtel|BHARTIARTL|Telecom|airtel, bharti
Vodafone Idea|IDEA|Telecom|vodafone, vi, idea
Indus Towers|INDUSTOWER|Telecom|indus towers
Tata Communications|TATACOMM|Telecom|
InterGlobe Aviation (IndiGo)|INDIGO|Aviation|indigo, interglobe
Indian Hotels|INDHOTEL|Hotels|taj, indian hotels
DLF|DLF|Real estate|
Godrej Properties|GODREJPROP|Real estate|
Macrotech Developers (Lodha)|LODHA|Real estate|lodha, macrotech
Oberoi Realty|OBEROIRLTY|Real estate|oberoi
Prestige Estates|PRESTIGE|Real estate|prestige
SRF|SRF|Chemicals|
PI Industries|PIIND|Chemicals|
UPL|UPL|Chemicals|
Deepak Nitrite|DEEPAKNTR|Chemicals|deepak
Tata Chemicals|TATACHEM|Chemicals|
HDFC AMC|HDFCAMC|Market infrastructure|hdfc asset management
Nippon Life India AMC|NAM-INDIA|Market infrastructure|nippon
CDSL|CDSL|Market infrastructure|central depository
BSE|BSE|Market infrastructure|bombay stock exchange
MCX|MCX|Market infrastructure|multi commodity exchange
Angel One|ANGELONE|Market infrastructure|angel broking, angel
Motilal Oswal|MOTILALOFS|Market infrastructure|motilal
Zee Entertainment|ZEEL|Media|zee
Sun TV Network|SUNTV|Media|sun tv
PVR INOX|PVRINOX|Media|pvr, inox
Adani Group||Group|adani
Tata Group||Group|tata
Bajaj Group||Group|bajaj
Godrej Group||Group|godrej`;

export const COMPANIES = ROWS.split('\n').map(row => {
  const [name, symbol, sector, aliases] = row.split('|');
  return { name, symbol, sector, aliases: aliases ? aliases.split(',').map(a => a.trim()).filter(Boolean) : [] };
});

export const companyNames = () => COMPANIES.filter(c => c.symbol).map(c => c.name.replace(/ \(.*\)$/, ''));

const norm = s => s.toLowerCase().replace(/&/g, ' and ').replace(/\b(ltd|limited|the|ltd\.)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Every way of naming a company, normalised, pointing back to it.
const KEYS = [];
for (const c of COMPANIES) {
  const base = c.name.replace(/ \((.*)\)$/, '');
  const inner = /\((.*)\)/.exec(c.name)?.[1];
  for (const k of [base, inner, c.symbol, ...c.aliases].filter(Boolean)) KEYS.push({ key: norm(k), company: c });
}
const EXACT = new Map();
for (const { key, company } of KEYS) if (!EXACT.has(key)) EXACT.set(key, company);

function jaroWinkler(a, b) {
  if (a === b) return 1;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = true; matches++; break; }
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++) if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

// Returns { name, symbol, sector, heard, matched }.
// Words that name a sector or the market, never one company.
const GENERIC = new Set(['bank', 'banks', 'banking', 'pharma', 'power', 'energy', 'steel', 'finance', 'financial', 'insurance', 'cement', 'auto', 'autos', 'it', 'tech', 'psu', 'psu banks', 'metal', 'metals', 'oil', 'gas', 'infra', 'realty', 'real estate', 'defence', 'railway', 'railways', 'india', 'nifty', 'sensex', 'fmcg', 'chemicals', 'telecom', 'stocks', 'shares', 'mutual funds', 'gold', 'crypto']);

export function match(heard) {
  const n = norm(String(heard || ''));
  if (!n) return null;
  if (GENERIC.has(n)) return { name: String(heard).trim(), symbol: '', sector: '', heard, matched: false };
  const exact = EXACT.get(n);
  if (exact) return { ...exact, heard, matched: true };
  let best = null, bestScore = 0;
  for (const { key, company } of KEYS) {
    if (key.length < 3) continue;
    // Compare with the whole name and with its first words, so "Mazgaon dock" finds "Mazagon Dock Shipbuilders".
    const head = key.split(' ').slice(0, n.split(' ').length).join(' ');
    const s = Math.max(jaroWinkler(n, key), head !== key && n.length >= 5 ? jaroWinkler(n, head) - 0.02 : 0) + (n.length >= 4 && key.startsWith(n) ? 0.05 : 0) - Math.abs(n.length - key.length) * 0.004;
    if (s > bestScore) { bestScore = s; best = company; }
  }
  if (best && bestScore >= 0.9) return { ...best, heard, matched: true };
  return { name: String(heard).trim(), symbol: '', sector: '', heard, matched: false };
}
