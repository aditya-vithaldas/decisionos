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
