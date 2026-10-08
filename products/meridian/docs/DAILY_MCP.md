# Continuous synthetic commerce data

Meridian's private DuckDB service and the Sales Intelligence Dashboard use one daily dataset. All records are fictional sample data; money is USD. The morning job appends the previous complete Berlin calendar day, with catch-up from the last stored day. It never invents intraday figures.

## Daily generation

`liveanalyst-daily-data` is a Cloud Run job scheduled at 08:00 Europe/Berlin. Gemini 3.5 Flash-Lite generates bounded daily scenario parameters in one small structured-output call. Ordinary deterministic SQL expands those parameters into orders, items, payments, shipments, sessions, calendar rows and scenario context. The model cannot execute SQL. The actual model and token usage are recorded in the schema and each date's scenario is recorded in `generation_runs`.

Data lives in the private bucket `meridian-commerce-data-648674198172`. Versioned DuckDB snapshots are checksum verified, and an atomic generation-guarded `latest.json` pointer publishes the database and its schema together. Duplicate daily runs do not append another day. A concurrent writer cannot overwrite a newer publication. Failed generation or validation preserves the previous snapshot. Reader instances reload within 60 seconds; restarts restore persisted data.

## Read access

`meridian-commerce-mcp` is a separate public HTTPS service exposing only this synthetic demo. It has no Gemini key or bucket write permission. Its service identity can invoke the existing private `liveanalyst-duckdb` service, which remains protected by Cloud Run IAM. It supports stateless MCP Streamable HTTP at `/mcp` with these read-only tools:

- `get_schema`: columns, relationships, metric rules, dates and generation provenance.
- `query_sales`: one bounded SELECT or CTE, 1,000 result rows, 8-second database limit.
- `get_sales_intelligence`: the dashboard's current complete-day evidence and reconciled decomposition.
- `search` and `fetch`: citable dataset and analysis documentation.

The same service exposes `/schema`, `/dashboard` and `/source/{id}` as readable JSON sources. No authentication is needed for these deliberately synthetic public read tools. Do not load customer or private production data into this public demo endpoint.

## Dashboard analysis

The Page embeds contain saved results read from `/dashboard`; the Page sandbox does not perform network requests. Its morning refresh reads the data source after generation and replaces the two embeds. Local interactions inspect those results; they do not generate new sales.

The latest complete day is compared with the same weekday one week earlier. Revenue equals completed orders' net amount, excluding tax, shipping, cancelled orders and returns. A sequential traffic → completed conversion → average-order-value decomposition reconciles to the revenue change. Category, region and channel changes reconcile independently; they overlap and must not be added together. Synthetic scenario events provide context, not evidence of an external causal effect. Inventory availability and payment errors are unmeasured and cannot be claimed as findings.

## Checks

Run `scripts/check-daily.mjs` with `BASE_DATA_DIR` pointing to an existing demo dataset and `TEST_DATA_DIR` pointing to a scratch directory. Run `server/mcp/test.mjs` with `BASE_DATA_DIR`. The checks cover duplicate generation, date validation and DST, foreign keys, item/order/payment totals, session dates, RCA reconciliation, MCP transport and every tool, unchanged row counts after rejected writes, and rejected cross-origin requests.

## Deployment and recovery

`server/Daily.Dockerfile` extends the exact previously deployed base image, retaining the existing 10-million-row seed. `server/daily-cloudbuild.yaml` builds the reader/writer image. `server/mcp/cloudbuild.yaml` builds the separate MCP proxy. Deploy the job with `node server/generate-daily.mjs`, with the bucket name, the low-cost model and the existing Secret Manager key reference. The reader only needs object read permission; the writer needs bucket object permission and access to that one key. The scheduler identity only needs permission to run the job.

Reader rollback can move Cloud Run traffic back to its previous revision. Data rollback requires deliberately replacing the manifest with a verified historical snapshot; do not remove stored data. Inspect the job execution and schema date before claiming the daily refresh succeeded.

## Deployed release — 8 October 2026

- Committed API and generator source: `09a0bb9` on `main`; both Cloud Builds used that clean source snapshot.
- GCP project `striking-loop-447915-q3`, region `europe-west1`.
- Reader revision `liveanalyst-duckdb-00009-p5c`, image digest `sha256:a9f985c1cc492a246736d7a3fe5a2c3a7215309f7e05df6146a05ad8127eab67`.
- Writer job `liveanalyst-daily-data` uses the same image. Scheduler `meridian-daily-data` runs at 08:00 Europe/Berlin with a job-specific invoker identity.
- MCP revision `meridian-commerce-mcp-00002-nq4`, image digest `sha256:2911651e60defbc79e129ac0303736dbe4842c141a4331279737c48b10a1f902`.
- Public MCP URL: `https://meridian-commerce-mcp-648674198172.europe-west1.run.app/mcp`.
- ChatGPT plugin **Meridian Commerce** installed with read-only tools and no authentication for synthetic data. Connector ID `plugin_connector_68df33b1a2d081918778431a9cfca8ba`.
- Dashboard Page `page_6ac7509720108191985006c81c108f71`; its existing hosted task `6ac750d8b190819188ea3a2d39ff1377` now reads this source at 08:30 Europe/Berlin.

The initial catch-up appended 30 September–7 October: 10,215,426 total records, 1,022,116 orders. Its Flash-Lite call used 317 prompt tokens and 881 output tokens. An immediate scheduler-triggered rerun reported `alreadyCurrent: true`, with no additional generation. Remote SDK verification initialized Streamable HTTP, exercised all five tools, rejected writes and external reads, and reconciled all driver and segment totals.

Cloud Run had traffic pinned to an older revision. After updating the image, explicitly moving traffic to the latest revision was required; check the actual serving image rather than relying on the deployment command's printed revision.

The versioned Page templates are in `docs/dashboard/`. `node scripts/render-dashboard.mjs snapshot.json output-directory` validates a database response and embeds the same JSON into both fragments. The hosted refresh can replace only the `commerce-snapshot` script data while retaining the existing layout. The saved fragments perform no network requests and no random generation.
