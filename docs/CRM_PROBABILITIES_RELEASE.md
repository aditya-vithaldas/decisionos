# CRM probabilities and finance categories release

Implementation commit: `ebe96229130df08e044e55e8eb17614282487c23`, merged and pushed to main.

Cards show the selected category probability, alternative probabilities, and original JEV request duration with its batch size. Processing details distinguish browser-to-CRM API time from server processing time. Missing probabilities/timings remain unavailable. Cached decisions retain original call timing.

Finance uses Amount, Payment failures, General information and the excluded Other choice. Finance analysis cache version changed so earlier binary classifications are not reused.

Validation: all 32 CRM tests passed, browser rendering of the card metadata verified with fictional sample data, tagged revision returned HTTP 200, and both changed public assets matched committed source bytes before promotion and on decisionaxis.co after promotion.

Cloud Build: `af3fe3b8-c6c8-4768-a26c-11bec6f76e15`.
Revision: `chatpm-crm-prob-ebe9622`, promoted to 100% traffic.
Image digest: `sha256:c4487effc999952a9706523252695391c30ff840ef0010f768f9d3dce5b36ea6`.

The release image layers the five changed runtime files from implementation commit ebe9622 onto the existing production image `sha256:4fda553f28c6ee793d631f2533cce317a454e76ba8d6a2931dc9b7bf0b17c925`. This is a targeted CRM release, not a full build of main. Other main changes were not deployed. The unrelated local file docs/JEV_PROFILE_2026-10-07.md was excluded.

One real JEV call with fictional payment-failure input returned model jev-1.13.0, Payment failures 97%, Amount 2%, General information 0%, Other 1%, confidence 96%, request duration 396 ms. Request/response and slide image were delivered outside Git; no credentials or mailbox content were committed.
