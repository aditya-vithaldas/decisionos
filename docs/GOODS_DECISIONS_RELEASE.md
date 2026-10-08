# The Goods — image Decisions demo

Public URL: https://decisionaxis.co/goods/

Twelve illustrative product photographs cover tools, a lunch box, office furniture, and summer/winter clothing. Customer questions are evaluated using the actual OpenAI `/v1/decisions` endpoint with `gpt-6-luna`, an image input, and twelve named predicates targeting individual cells of the four-column, three-row product photograph. Yes means probability >= 0.5; refused/missing/invalid probabilities remain undecided. Matching items appear in larger cards above the rest; each card shows its yes probability. Each new question makes a fresh provider request. Runtime errors preserve the prior shelf. API credentials remain server-side in the existing Secret Manager reference.

Implementation: `eda622c916cefbf207a371b0448687ba940a5e36`.
Card percentages: `b87f42a`.
Both implementation commits merged and pushed to main.

Validation: focused handler checks cover image predicates, named cell targeting, the 50% threshold, unknown/refused answers and input validation; JavaScript syntax and diff checks passed. Real provider calls returned winter coat/scarf/gloves as yes. Public browser checks verified winter, summer, and a typed building/repair question that promoted hammer/drill. Source CSS, JS and image bytes matched the deployed versions; HTML matched after the existing analytics tag injection.

First build: `06bb0028-ddf3-4540-9005-6691c34ac669`.
First image: `sha256:e5a8b75ab51d15ad0635d4f9e5a9999da31c43289b195963305b2a0928866e5c`.
Final percentage build: `7299ca67-d83e-4327-ae64-1c83bc1dd069`.
Final image: `sha256:267ac526e6e73a95e6035b466ff4153a19e038bf03c074d3883bc0d111d789b9`.
Final revision: `chatpm-goods-b87f42a`, promoted to 100% traffic. Public winter browser verification showed coat/scarf/gloves each with 100% yes badges and the nine nonmatches below. A screenshot was saved as a user-facing output outside Git.

Release method: targeted layers over the actual previously serving production image `sha256:a98a4cef23a3dc645c62dea04c3b8c31fcc6af595accbe60c4ce744065d6579a`. The first layer adds the committed goods page/assets/API and a guarded minimal insertion of goods routing into the production server. The second layer adds the committed percentage UI files. This is a targeted release, not a full rebuild of all repository applications. Full site build was not used: generated analytics/commerce directories are absent in a fresh worktree until the separate Meridian build runs. Existing production routes are retained; tagged health/CRM/page/image/API checks passed before the first promotion.

Source images are generated illustrative assets, not purchasable listings. Results are model judgements; borderline results can change between calls. Protective limits are two concurrent batches and ten batches per minute per observed source IP. No customer history is stored. The existing Decisions credential expires November 5, 2026 and needs replacement before then.

Unrelated local `docs/JEV_PROFILE_2026-10-07.md` was preserved and excluded.

## 100-product speed experiment — October 9, 2026

Current catalog has 100 distinct products: 25 tools/everyday goods, 25 office products, 25 summer/outdoor products and 25 winter/warmth products. Four generated 5×5 photograph grids supply the image evidence. Each provider request includes all four images and 100 named predicates targeting individual image cells. Product names are included as orientation hints, so this evaluates images with name context, rather than an image-only ablation. No category labels are sent to the provider. Each question makes one fresh `/v1/decisions` call using `gpt-6-luna`; no application result cache is used.

The page displays valid decisions returned, Decisions API time, question-to-updated-shelf time (network and rendering included), and provider call count. Matching cards remain prominent with yes probabilities. Unknown answers remain undecided.

Implementation: `c2f96b44cd89264001a1831d37237dcbcd5c4317`, merged and pushed to main. Build: `4f938278-aa0b-4277-a133-2a6f76946320`. Image: `sha256:957ee81fcf0a4cc0bbc5ba482596a5682bb97cf797223a4155aa226172e2bcb1`. Revision: `chatpm-goods100-c2f96b4`, promoted to 100% traffic at the existing public URL.

Focused checks passed for 100 unique products, four image inputs, all 100 targeted predicates in a single fresh call, threshold/unknown handling, timings and validation. JavaScript syntax and diff checks passed. All six deployed image/CSS/JS files matched committed source. Tagged health, CRM, goods and catalog checks returned 200. Public catalog and browser verification confirmed 100 products and the live timing panel; winter produced 25 prominent matches and 75 nonmatches with percentages.

Observed samples (not a load or capacity benchmark):

| Environment / question | API milliseconds | Total milliseconds | Valid decisions |
| --- | ---: | ---: | ---: |
| Local server / summer | 3232 | 3255 | 100 |
| Local server / winter | 3052 | 3060 | 100 |
| Local server / summer repeat | 2887 | 2891 | 100 |
| Tagged Cloud Run / summer | 1971 | 2132 | 100 |
| Tagged Cloud Run / winter | 1956 | 2144 | 100 |
| Tagged Cloud Run / tools | 1920 | 2136 | 100 |
| Public browser / winter | 1350 (display rounded) | 1440 (display rounded) | 100 |

Local/tagged totals are HTTP roundtrip measurements; public browser total includes shelf rendering. API timings include payload serialization/upload and response reading. Different locations, network conditions, provider variation and possible provider-side prompt reuse can affect timings. The browser sample is not a guaranteed SLA. Application results are never replayed from a cache.

Release is a targeted layer over the previously serving percentage image digest, adding exact committed goods assets, images, API and catalog. It is not a full build of unrelated applications. Existing server routing and other production applications remain in the base image. Unrelated `docs/JEV_PROFILE_2026-10-07.md` remains excluded.
