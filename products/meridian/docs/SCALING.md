# Scaling the insights dataset

Current deployment: restored to **10,000,000 rows**, 92,286,976 bytes, using scale 1. The 50-million-row results below are retained as a historical benchmark. The default cloud build now uses scale 1 and validates 10 million rows.

The private DuckDB service builds a deterministic 2025 e-commerce database with exactly 50,000,000 rows. The browser downloads aggregated chart results (at most 1,000 groups), not the database. Uploads retain the existing 10 MB demo limit; this change scales the hosted demo dataset.

| Table | Rows |
| --- | ---: |
| regions | 10 |
| categories | 40 |
| calendar | 365 |
| products | 250,000 |
| customers | 750,000 |
| orders | 5,000,000 |
| order_items | 15,000,000 |
| payments | 5,000,000 |
| shipments | 4,250,000 |
| sessions | 19,749,585 |

Products, categories and customers retain fictional readable names. Entity IDs remain the join and grouping keys because names can repeat. The generated schema includes exact types, counts, business rules, and storage metadata.

## Build and runtime

`DEMO_SCALE=5 node server/build-demo.mjs` generates 50 million rows. The default scale remains 1 (10 million); integer scales 1–10 are accepted. Builds require temporary disk and memory headroom. Cloud Build generates the database inside an immutable container image rather than on the user's computer.

Orders and sessions are sorted by date and ID. DuckDB automatically builds min/max indexes (zonemaps), allowing date filters to skip irrelevant row groups. Single-column ART indexes on product/customer IDs and names support selective lookups. Broad aggregations use column scans and hash joins; indexes are not a substitute for these operations. See [DuckDB indexing guidance](https://duckdb.org/docs/current/guides/performance/indexing).

The deployed runtime uses 4 CPUs / 4 GiB, 4 DuckDB threads and a 2 GB DuckDB memory budget, configurable through DUCKDB_THREADS and DUCKDB_MEMORY_LIMIT. The service allows two concurrent requests and retains the existing minimum of one and maximum of two instances. The service container needs additional memory for Node, buffers, and concurrent requests. External access and extension loading remain disabled, configuration is locked, and queries are read-only with an 8-second execution limit.

The Cloud Build validation container is limited to 2 CPUs and 2 GiB. It checks every table count, every documented foreign-key relationship, and reconciles daily, category, and regional revenue. Five analytical queries run once and ten more times; reported times are SQL execution only. First-query timings are not cold-container timings because validation has already read the database. End-to-end model planning and network timings are measured separately.

## Safe deployment scope

Deploy only `liveanalyst-duckdb` in `europe-west1`, initially with no traffic. Preserve IAM authentication. After validation, move its traffic to the new revision. Do not deploy `chatpm`, the storefront, homepage, Sites projects, or other subtrees. The existing gateway refreshes schema metadata every 60 seconds; reload the insights page to refresh its dataset badge.

The prior `liveanalyst-duckdb-named-demo` revision remains available for rollback. Move traffic back to that revision if needed; no website redeployment is required.

## Measured release

The built database is 415,510,528 bytes (415.5 MB decimal), including indexes. Build `a4d8970f-74ce-4988-a56e-b90fb2409c02` validated the full 50 million rows and produced image digest `sha256:e8bbf728764540d22019e26d6a08acef5380905ec9722518908ce3be5547441f`. The live revision is `liveanalyst-duckdb-named-50m-fast` (4 CPUs, 4 GiB). The unchanged homepage revision is `chatpm-analytics-grouping`.

[Container SQL benchmark](benchmark-50m-container.json), [initial 2-CPU hosted benchmark](benchmark-50m-hosted-2cpu.json), and [4-CPU hosted benchmark](benchmark-50m-hosted.json) preserve actual measurements. The 4-CPU repeat queries took 0.08–1.55 seconds end to end with cached SQL plans, while still executing the SQL afresh. This is not a guarantee for arbitrary analyses or simultaneous users. Model planning and cold reads add latency; inspect `planCacheHit` rather than assuming the first request in a benchmark is uncached.

The final [fresh-question benchmark](benchmark-50m-hosted-fresh.json) tested six uncached questions covering daily sales, regions, monthly traffic, customers, a single date, and categories. All completed in **0.93–1.92 seconds** including model planning and network time; repeats took **0.08–0.95 seconds**. These were sequential requests against a warm service, not a concurrency/load guarantee.
