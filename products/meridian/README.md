# LiveAnalyst / Meridian

Conversational analytics with Gemini 3.8 Live, an on-page `show_analytics` tool, CSV/Excel uploads, and a cloud-hosted DuckDB e-commerce demo.

## Experience

- Blank initial canvas; each question replaces it with the answer.
- Neutral gray/white theme, voice orb, and optional example questions.
- Time-series charts by default; a specific date produces a large numeric widget unless a breakdown is requested.
- Multiple CSV, XLSX, XLS files or a folder. **10 MB maximum total**, checked before reading. Over-limit batches are rejected, never truncated or compressed.
- Uploaded rows stay in browser memory for the session. Gemini receives schemas and query context; a constrained query plan is evaluated against all local rows. Arbitrary joins and calculated-column expressions are not currently supported for uploads.
- Demo mode uses a persistent synthetic rolling-year database through 29 September 2026, not newly invented model answers. It contains 10,000,000 rows and 150,000 customers, with seasonal patterns plus small weekly business events. The UI reports the actual hosted database size.
- Charts: line, area, bar, horizontal/stacked bar, pie, donut, scatter, funnel, heatmap, histogram, radar. SQL result shape: `label`, `value`, optional `secondary`.

## Local development

Node 22+. `npm install`, then configure `GEMINI_API_KEY` in ignored `.dev.vars` for the Sites runtime. Never put it in browser code. `npm run dev` starts the website. The portfolio build uses `npx vite build --config vite.portfolio.config.ts` and base `/analytics/`.

The demo backend is separate: `DEMO_SCALE=1 node server/build-demo.mjs` creates `data/ecommerce.duckdb` and `data/schema.json`; run `node server/api.mjs` for the private SQL service. Database files are ignored by Git. `server/Dockerfile` reproducibly builds the dataset and serves it read-only on Cloud Run. The website gateway uses the existing server-side Gemini Secret Manager reference. The private DuckDB service has no Gemini key and requires Cloud Run IAM authentication. `server/gateway.mjs` is the gateway handler integrated into the existing website server.

## Schema and query contract

See [docs/demo-schema.json](docs/demo-schema.json), [docs/AGENT_SCHEMA.md](docs/AGENT_SCHEMA.md), and the live `/schema` endpoint. The website gateway includes the complete schema and semantic rules in the model prompt, gets SQL, validates a single SELECT statement, and executes DuckDB with external access and extension loading disabled. Query execution is capped at 8 seconds; results above 1,000 groups require a narrower query and are not silently truncated.

The service keeps a small query-plan cache; it still executes SQL on every request. The response identifies cache hits. Each cloud instance has its own immutable database copy baked into the versioned image, avoiding a remote-file scan on every query.

## Measurements

The same five browser-observed metrics as the shopping demo: first audio, first action, tool RTT, visible action, and barge-in. Voice baselines use local VAD; typed requests use submission time. Unobserved metrics remain blank. SQL and AI planning are shown separately. The 1–2 second goal applies to database queries; AI planning and network time can make total response time longer. See benchmark reports in `docs/` for measured values and environment.

## Checks

- `npx tsc --noEmit`
- `node --experimental-strip-types scripts/check-analytics.mjs`
- `node --experimental-strip-types scripts/check-uploads.mjs`
- `node scripts/benchmark-demo.mjs`
- `npm run build`

## Contributing

This project is open to contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for
setup, checks, and the pull-request process. [Aditya Vithaldas](https://github.com/aditya-vithaldas)
is the maintainer and code owner for all contributions.

## License

[MIT](LICENSE) — Copyright (c) 2026 Aditya Vithaldas. Third-party dependencies
and vendored components retain their own license notices.

See [the 50-million-row deployment notes](docs/SCALING.md) for capacity, indexing, validation, and rollback.

## Conversation principles

[principles.md](principles.md) is the shared policy for SQL planning, uploaded-data planning, and live voice. It defines ten concise rules and six driver families. Follow-ups preserve the selected answer and five-question history. Ambiguity is answered with a short assumption/clarification; same-scope numeric conflicts are flagged as low confidence. Open-ended why questions compute a baseline and offer three selectable investigations, retaining the existing graph until a driver is chosen.

The dedicated `liveanalyst-query` gateway isolates future query-policy deployments from the homepage. `server/Gateway.Dockerfile` and `server/gateway-cloudbuild.yaml` build it without rebuilding the DuckDB dataset. It uses the existing Secret Manager reference, never a key in source. The gateway and Sites interface version 13 were published on September 18, 2026. The DuckDB service remains private. Only Insights was released; the homepage and other subtrees were not redeployed.

Checks: `node scripts/check-principles.mjs`, `node scripts/check-analytics.mjs`, `npx tsc --noEmit`, and the normal site build.

See [grounding controls](docs/GROUNDING.md) for single-call planning, local schema checks, supported definitions and limitations. The hosted demo has returned to 10 million rows (92.3 MB including indexes).
