# Image quality demo

`/projects/image-object-pipeline.html` uses ten real linked Zalando product images. Recorded results are actual OpenAI Decisions `gpt-6-luna` responses with timestamps, model, predicate text and elapsed time, not mock scores. A live check uses the server-only key and returns fresh provider probabilities. Two recorded deliberate mismatch tests alter color and pattern claims, never probabilities. Texture means visible appearance, not inferred fibre composition. Refusals and unavailable checks remain explicitly unavailable.

The restricted Decisions-only credential is stored locally in macOS Keychain and in the `decisionaxis-openai-decisions` Google Secret Manager secret; never in source, static assets or browser code. The created key expires November 5, 2026 and requires replacement before then. Public checks are bounded to two simultaneous checks and three per minute per observed source IP. These are protective demo limits, not a multi-user capacity benchmark.
