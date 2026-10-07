export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  original: number;
  image: string;
  screen?: number;
  weight: number;
  storage?: number;
  condition: string;
  location: string;
  seller: string;
  age: string;
  featured: boolean;
  description: string;
  specs: Record<string, string>;
  reviewSummary: string;
  reviews: { author: string; rating: number; title: string; text: string }[];
};
const seeds: [string, string, string, number, number, number, number?][] = [
  [
    'iPhone 13 Pro',
    'Phones',
    'smartphones/iphone-13-pro',
    38900,
    6.1,
    204,
    256,
  ],
  [
    'MacBook Pro 14-inch',
    'Laptops',
    'laptops/apple-macbook-pro-14-inch-space-grey',
    89900,
    14.2,
    1600,
    512,
  ],
  [
    'iPad Mini 2021',
    'Tablets',
    'tablets/ipad-mini-2021-starlight',
    29900,
    8.3,
    293,
    64,
  ],
  [
    'AirPods Max Silver',
    'Audio',
    'mobile-accessories/apple-airpods-max-silver',
    27900,
    0,
    385,
  ],
  [
    'Samsung Galaxy Tab S8 Plus',
    'Tablets',
    'tablets/samsung-galaxy-tab-s8-plus-grey',
    38900,
    12.4,
    567,
    128,
  ],
  [
    'Dell XPS 13 9300',
    'Laptops',
    'laptops/new-dell-xps-13-9300-laptop',
    41900,
    13.4,
    1200,
    512,
  ],
  [
    'Apple Watch Series 4',
    'Wearables',
    'mobile-accessories/apple-watch-series-4-gold',
    9900,
    1.78,
    48,
    16,
  ],
  ['Apple AirPods', 'Audio', 'mobile-accessories/apple-airpods', 6900, 0, 46],
  [
    'Lenovo Yoga 920',
    'Laptops',
    'laptops/lenovo-yoga-920',
    28900,
    13.9,
    1370,
    256,
  ],
  [
    'Samsung Galaxy Tab',
    'Tablets',
    'tablets/samsung-galaxy-tab-white',
    11900,
    10.1,
    469,
    32,
  ],
  ['iPhone X', 'Phones', 'smartphones/iphone-x', 14900, 5.8, 174, 64],
  [
    'Asus Zenbook Pro Duo',
    'Laptops',
    'laptops/asus-zenbook-pro-dual-screen-laptop',
    69900,
    15.6,
    2500,
    512,
  ],
  ['Oppo A57', 'Phones', 'smartphones/oppo-a57', 6900, 6.56, 187, 64],
  [
    'Beats Flex Earphones',
    'Audio',
    'mobile-accessories/beats-flex-wireless-earphones',
    2900,
    0,
    18,
  ],
  [
    'Amazon Echo Plus',
    'Smart home',
    'mobile-accessories/amazon-echo-plus',
    5900,
    0,
    780,
  ],
  [
    'Huawei MateBook X Pro',
    'Laptops',
    'laptops/huawei-matebook-x-pro',
    44900,
    13.9,
    1330,
    512,
  ],
  ['Realme C35', 'Phones', 'smartphones/realme-c35', 7900, 6.6, 189, 64],
  [
    'Apple HomePod Mini',
    'Smart home',
    'mobile-accessories/apple-homepod-mini-cosmic-grey',
    4900,
    0,
    345,
  ],
];
/** Fictional specifications for the interactive demo, not verified model claims. */
function demoSpecs(name: string, category: string, screen: number, weight: number, storage: number | undefined, index: number): Record<string, string> {
  const common = { Warranty: '6 months seller warranty', Weight: `${weight} g`, 'In the box': 'Device, charging cable and quick-start guide' };
  const apple = /Apple|iPhone|iPad|MacBook|AirPods/.test(name);
  const chips: Record<string, string> = {
    'iPhone 13 Pro': 'Apple A15 Bionic', 'iPhone X': 'Apple A11 Bionic',
    'iPad Mini 2021': 'Apple A15 Bionic', 'MacBook Pro 14-inch': 'Apple M1 Pro',
    'Samsung Galaxy Tab S8 Plus': 'Snapdragon 8 Gen 1', 'Dell XPS 13 9300': 'Intel Core i7-1065G7',
    'Lenovo Yoga 920': 'Intel Core i7-8550U', 'Asus Zenbook Pro Duo': 'Intel Core i9-10980HK',
    'Huawei MateBook X Pro': 'Intel Core i7-10510U', 'Oppo A57': 'MediaTek Helio G35',
    'Realme C35': 'Unisoc T616', 'Samsung Galaxy Tab': 'Exynos octa-core',
  };
  if (['Phones', 'Tablets', 'Laptops'].includes(category)) {
    const laptop = category === 'Laptops';
    const ram = laptop ? (name.includes('Duo') ? 32 : 16) : name.includes('S8') ? 8 : name.includes('13 Pro') ? 6 : 4;
    return { ...common, Processor: chips[name] || 'Octa-core processor', 'Processor speed': laptop ? 'Up to 4.2 GHz' : index % 2 ? 'Up to 2.4 GHz' : 'Up to 3.2 GHz',
      Memory: `${ram} GB RAM`, Storage: `${storage} GB${laptop ? ' SSD' : ''}`, 'Screen size': `${screen} inches`,
      Display: laptop ? '2560 × 1600 IPS, 60 Hz' : 'Full HD+ touchscreen, 60 Hz',
      Dimensions: laptop ? '31.2 × 22.1 × 1.6 cm' : category === 'Tablets' ? '24.8 × 17.9 × 0.7 cm' : '15.2 × 7.2 × 0.8 cm',
      'Operating system': apple ? (laptop ? 'macOS' : category === 'Tablets' ? 'iPadOS' : 'iOS') : laptop ? 'Windows 11' : 'Android 13',
      'Wi-Fi': 'Wi-Fi 6, dual band 2.4 / 5 GHz', Bluetooth: 'Bluetooth 5.2',
      Battery: laptop ? '60 Wh, up to 10 hours' : category === 'Tablets' ? '8,000 mAh, up to 12 hours' : '4,500 mAh, up to 20 hours',
      'Battery health': '92%', Charging: laptop ? '65 W USB-C' : '20 W fast charging',
      ...(laptop ? { Graphics: apple ? 'Integrated Apple GPU' : 'Intel Iris Plus', Ports: '2 × USB-C, headphone jack', Webcam: '1080p HD' } : { Camera: '12 MP main, 8 MP front', Cellular: category === 'Phones' ? '4G LTE, dual SIM' : 'Wi-Fi only', Security: 'Biometric unlock and passcode' }),
    };
  }
  if (category === 'Audio') return { ...common, Processor: apple ? 'Apple H1 audio chip' : 'Bluetooth audio DSP', 'Processor speed': '240 MHz', Memory: '8 MB onboard', Storage: 'No user storage',
    'Form factor': name.includes('Max') ? 'Over-ear headphones' : 'In-ear earphones', Dimensions: name.includes('Max') ? '18.7 × 16.9 × 8.3 cm' : '3.1 × 1.8 × 1.6 cm per earpiece',
    Drivers: name.includes('Max') ? '40 mm dynamic' : '12 mm dynamic', 'Noise cancellation': name.includes('Max') ? 'Active noise cancellation and transparency mode' : 'Passive noise isolation',
    Bluetooth: 'Bluetooth 5.0', 'Wi-Fi': 'No; Bluetooth audio only', Microphone: 'Built-in microphone for calls', Battery: 'Up to 20 hours playback', 'Battery health': '92%', Charging: 'USB charging, 2 hours to full', 'Water resistance': 'IPX4 splash resistant', Compatibility: 'iOS, Android, Windows and macOS' };
  if (category === 'Wearables') return { ...common, Processor: 'Apple S4 dual-core', 'Processor speed': '1.2 GHz', Memory: '1 GB RAM', Storage: `${storage} GB`, 'Screen size': `${screen} inches`, Display: 'OLED touchscreen, 368 × 448', Dimensions: '44 × 38 × 10.7 mm', 'Case size': '44 mm', 'Operating system': 'watchOS', 'Wi-Fi': 'Wi-Fi 4, 2.4 GHz', Bluetooth: 'Bluetooth 5.0', GPS: 'Built-in GPS', Sensors: 'Heart rate, ECG, accelerometer and gyroscope', 'Water resistance': '50 metres', Battery: 'Up to 18 hours', 'Battery health': '92%', Charging: 'Magnetic charging cable', Compatibility: 'iPhone', 'Strap size': 'Fits 140–210 mm wrists' };
  return { ...common, Processor: apple ? 'Apple S5' : 'MediaTek dual-core', 'Processor speed': '1.5 GHz', Memory: '1 GB RAM', Storage: '8 GB system storage', Dimensions: apple ? '9.8 × 9.8 × 8.4 cm' : '9.9 × 9.9 × 14.8 cm', 'Wi-Fi': 'Dual band 2.4 / 5 GHz', Bluetooth: 'Bluetooth 5.0', 'Voice assistant': apple ? 'Siri' : 'Alexa', Speaker: 'Full-range driver with 360-degree sound', Microphone: 'Far-field microphone array', Power: 'Mains powered, 20 W adapter included', Battery: 'No battery; requires wall power', 'Smart home support': apple ? 'HomeKit and Thread' : 'Zigbee smart-home hub', 'Multi-room audio': 'Supported', 'App compatibility': apple ? 'Apple Home on iOS' : 'Amazon Alexa on iOS and Android' };
}
// Authored sample reviews for conversational exploration; no real customer attribution.
const reviewAngles: [string, string, string][] = [
  ['Lovely cameras and performance, but feels heavy', 'Cameras make everyday photos look lovely and apps stay responsive.', 'The weight is noticeable during long one-handed use.'],
  ['Fast creative work, premium screen, expensive repairs', 'Editing photos feels fast and the screen makes colours look rich.', 'Repair costs worry me, especially outside warranty.'],
  ['Loved for portability, cramped for serious multitasking', 'It is wonderfully portable for reading on my commute.', 'The small screen feels cramped with two apps open.'],
  ['Immersive sound and comfort, bulky for travel', 'Music sounds immersive and the ear cushions feel comfortable.', 'The bulky shape takes too much room in my travel bag.'],
  ['Gorgeous spacious display, awkward for onehanded reading', 'The spacious display is excellent for films and handwritten notes.', 'One-handed reading is awkward because of its size.'],
  ['Compact premium laptop, limited ports frustrate owners', 'The compact build feels premium and is easy to carry.', 'I keep needing adapters because there are so few ports.'],
  ['Useful fitness tracking, battery needs daily attention', 'Fitness tracking and wrist notifications are useful every day.', 'I have to remember to charge it every evening.'],
  ['Effortless pairing, comfortable fit, modest noise isolation', 'Pairing is effortless and they feel comfortable for calls.', 'Noise isolation is modest on a busy train.'],
  ['Flexible touchscreen loved, aging battery disappoints commuters', 'The flexible touchscreen is handy for notes and presentations.', 'Battery life feels short when I work away from a socket.'],
  ['Affordable family tablet, struggles with demanding games', 'It is affordable and useful for family videos and browsing.', 'Demanding games stutter more than I would like.'],
  ['Premium everyday feel, older battery needs care', 'The premium design still feels good for everyday messaging.', 'The older battery needs more careful charging on busy days.'],
  ['Creators love dual screens, weight limits portability', 'The second screen is useful for timelines and creative controls.', 'Its weight makes daily commuting uncomfortable.'],
  ['Great basic value, camera struggles after sunset', 'Basic calls, messaging and browsing feel like good value.', 'Photos lose detail after sunset.'],
  ['Affordable sound and battery, neckband divides opinions', 'The sound and battery life are good for the price.', 'The neckband gets in my way with some jackets.'],
  ['Convenient smart controls, voice recognition occasionally struggles', 'Voice control makes lights and music convenient around the house.', 'Voice recognition sometimes misses me when music is playing.'],
  ['Sharp display and portability, webcam angle disappoints', 'The sharp display and portable build are great for writing.', 'The webcam angle is unflattering during video calls.'],
  ['Strong everyday value, multitasking can feel sluggish', 'It offers strong value for everyday calls and social apps.', 'Switching between several apps can feel sluggish.'],
  ['Surprisingly rich sound, best within Apple ecosystem', 'The sound is surprisingly rich for such a small speaker.', 'It is less convenient for people outside the Apple ecosystem.'],
];
function demoReviews(index: number, name: string) {
  const [summary, praise, concern] = reviewAngles[index];
  return { reviewSummary: summary, reviews: [
    { author: 'Sample reviewer A', rating: 5, title: 'What won me over', text: `${name}: ${praise}` },
    { author: 'Sample reviewer B', rating: 3, title: 'The main trade-off', text: concern },
    { author: 'Sample reviewer C', rating: 4, title: 'Good fit for my routine', text: `${praise} ${concern}` },
    { author: 'Sample reviewer D', rating: 4, title: 'Worth considering', text: `I would choose it again for this reason: ${praise} Buyers should still consider this limitation: ${concern}` },
  ] };
}
const areas = [
  'Indiranagar',
  'Koramangala',
  'Whitefield',
  'HSR Layout',
  'Jayanagar',
  'Marathahalli',
  'Bellandur',
  'Malleshwaram',
];
export const categories = [
  'All electronics',
  'Phones',
  'Laptops',
  'Tablets',
  'Audio',
  'Wearables',
  'Smart home',
];
export const products: Product[] = Array.from({ length: 200 }, (_, i) => {
  const [name, category, path, base, screen, weight, storage] =
    seeds[i % seeds.length];
  const variant = Math.floor(i / seeds.length);
  const price = base - variant * 100 + (variant % 3) * 500;
  const condition = ['Like new', 'Good', 'Fair'][variant % 3];
  return {
    id: `loop-${i + 1}`,
    name,
    category,
    brand:
      name.startsWith('iPhone') ||
      name.startsWith('iPad') ||
      name.startsWith('MacBook') ||
      name.startsWith('AirPods')
        ? 'Apple'
        : name.split(' ')[0],
    price,
    original: Math.round((base * 1.65) / 100) * 100,
    image: `https://cdn.dummyjson.com/product-images/${path}/1.webp`,
    screen: screen || undefined,
    weight,
    storage,
    ...demoReviews(i % seeds.length, name),
    specs: demoSpecs(name, category, screen, weight, storage, i % seeds.length),
    condition,
    location: areas[i % 8],
    seller: [
      'Rahul S.',
      'Priya M.',
      'Arjun K.',
      'Neha R.',
      'Aditya P.',
      'Sneha V.',
    ][i % 6],
    age: i % 3 === 0 ? 'Today' : `${(i % 6) + 1} days ago`,
    featured: i % 7 === 0,
    description: `${name} in ${condition.toLowerCase()} condition. Fully functional and carefully checked. ${storage ? `${storage} GB storage. ` : ''}Includes charging cable. Available for inspection and pickup in ${areas[i % 8]}, Bengaluru.`,
  };
});
export type Filters = {
  query: string;
  category: string;
  maxPrice: number;
  condition: string;
  sort: string;
  location: string;
};
export const initialFilters: Filters = {
  query: '',
  category: 'All electronics',
  maxPrice: 150000,
  condition: 'All',
  sort: 'recommended',
  location: 'Bengaluru',
};
export const money = (n: number) => '₹ ' + n.toLocaleString('en-IN');
export function searchProducts(f: Filters) {
  let result = products.filter(
    (p) =>
      (f.category === 'All electronics' || p.category === f.category) &&
      p.price <= f.maxPrice &&
      (f.condition === 'All' || p.condition === f.condition) &&
      (f.location === 'Bengaluru' || p.location === f.location) &&
      f.query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .every((t) =>
          `${p.name} ${p.category} ${p.brand} ${p.storage || ''}`
            .toLowerCase()
            .includes(t),
        ),
  );
  if (f.sort === 'low') result.sort((a, b) => a.price - b.price);
  if (f.sort === 'high') result.sort((a, b) => b.price - a.price);
  return result;
}
export function recommendations(p: Product) {
  const candidates = products.filter(
    (x) => x.category === p.category && x.id !== p.id,
  );
  const seen = new Set<string>();
  const unique = candidates.filter((x) => {
    if (seen.has(x.name) || x.name === p.name) return false;
    seen.add(x.name);
    return true;
  });
  const selected = [
    ...unique,
    ...candidates.filter((x) => x.name === p.name),
  ].slice(0, 4);
  return selected.map((x) => {
    let why = '';
    if (x.screen && p.screen && x.screen > p.screen)
      why = `A larger ${x.screen}″ screen for more room to work and watch${x.price < p.price ? `, at ${money(p.price - x.price)} less` : ''}.`;
    else if (x.screen && p.screen && x.screen < p.screen && x.weight < p.weight)
      why = `A smaller ${x.screen}″ alternative, ${p.weight - x.weight} g lighter and easier to take with you.`;
    else if (x.price < p.price)
      why = `${x.name === p.name ? 'The same model' : 'Another ' + p.category.toLowerCase() + ' option'} for ${money(p.price - x.price)} less${x.condition !== p.condition ? `; listed in ${x.condition.toLowerCase()} condition` : ''}.`;
    else
      why = `${x.name === p.name ? 'The same model' : 'A ' + p.category.toLowerCase() + ' alternative'} in ${x.location}, listed in ${x.condition.toLowerCase()} condition at ${money(x.price)}.`;
    return { product: x, why };
  });
}
