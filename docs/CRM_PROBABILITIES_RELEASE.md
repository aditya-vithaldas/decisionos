# CRM probabilities and finance categories release

Implementation commit: `ebe96229130df08e044e55e8eb17614282487c23`, merged and pushed to main.

Cards show the selected category probability, alternative probabilities, and original JEV request duration with its batch size. Processing details distinguish browser-to-CRM API time from server processing time. Missing probabilities/timings remain unavailable. Cached decisions retain original call timing.

Finance uses Amount, Payment failures, General information and the excluded Other choice. Finance analysis cache version changed so earlier binary classifications are not reused.

Validation: all 32 CRM tests passed, browser rendering of the card metadata verified with fictional sample data, tagged revision returned HTTP 200, and both changed public assets matched committed source bytes before promotion and on decisionaxis.co after promotion.

Cloud Build: `e2e72b0a-d754-4c76-8186-9a5cd0ea3850`.
Revision: `chatpm-crm-prob-cache-ebe9622`, promoted to 100% traffic.
Image digest: `sha256:a98a4cef23a3dc645c62dea04c3b8c31fcc6af595accbe60c4ce744065d6579a`.

The release image layers the five changed runtime files plus crm/index.html with generated asset hash references from implementation commit ebe9622 onto the existing production image `sha256:4fda553f28c6ee793d631f2533cce317a454e76ba8d6a2931dc9b7bf0b17c925`. This is a targeted CRM release, not a full build of main. Other main changes were not deployed. The unrelated local file docs/JEV_PROFILE_2026-10-07.md was excluded.

One real JEV call with fictional payment-failure input returned model jev-1.13.0, Payment failures 97%, Amount 2%, General information 0%, Other 1%, confidence 96%, request duration 396 ms. Request/response and slide image were delivered outside Git; no credentials or mailbox content were committed.

The first deployment retained old immutable asset query strings in the built CRM HTML. Browser verification caught this; the final release regenerated the CRM JS/CSS references from their content hashes. Public HTML and versioned asset bytes were verified before promotion.
