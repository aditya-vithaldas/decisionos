# Voice discovery case-study release

The homepage and case-studies index feature eCommerce Discovery Live Concept. The article lives at `/projects/commerce.html` and links to `https://ecommerce-storefront.decisionos.me/`.

Other case-study pages remain in source but are excluded from the build and SEO registry. Re-add entries to `scripts/seo-pages.json` and the visible project list to publish them later.

## Validation

- Static build passes.
- All built HTML local links, fragment targets, and image references resolve.
- Each built page has exactly one H1, unique IDs, and descriptive image alt text.
- Only `projects/commerce.html` is published under `dist/projects`.
- Removed case studies are absent from the homepage, index, sitemap, and llms.txt.
- Desktop (1280px) and mobile (390px) article and case-study layouts checked in-browser; no persistent horizontal overflow.
- Keyboard entry and skip-to-content flow checked in-browser.
- Screenshots inspected: storefront, budget-filtered results, product page, illustrative review panel, and saved shortlist.
- A microphone session was not recorded or tested during this editorial change. Budget screenshot was captured using the storefront's catalog filter tool. No generated screenshot is presented as voice-session evidence.

## Accessibility follow-up

No critical or serious accessibility issue was found in the changed static content. The index feature now uses H2 beneath its H1; the homepage feature uses H3 beneath its section H2. Existing focus styling, responsive behavior, and motion controls are retained. No new client script is required.

Before declaring full accessibility compliance, please check the pages with your screen reader, keyboard, zoom settings, and actual mobile device, and report any issues. Static/browser checks alone do not establish full WCAG compliance. No skill changes are proposed.

## Publishing

Cloud Build ID: `dd820269-8161-44e8-a6be-5af359aa9a60`.
Image tag: `voice-discovery-04dea96d7547`.
Target: Google Cloud Run `chatpm`, `europe-west1`, project `striking-loop-447915-q3`.

Published successfully as revision `chatpm-00101-rtj`, serving 100% of traffic. Public verification passed for the homepage, case-study index, article, sitemap, and llms.txt. All five deployed screenshot files match the local assets byte-for-byte. The paralegal, employee, and Berlin Combat case-study URLs return HTTP 404. The published article and homepage were also verified in-browser.
