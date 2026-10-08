FROM europe-west1-docker.pkg.dev/striking-loop-447915-q3/cloud-run-source-deploy/liveanalyst-duckdb@sha256:0a66b006ddf6937aaa9c1f5202e02dc60fd0eff1bf95799ffef7bdbaf5afbe87
COPY --chown=node:node server/snapshot-store.mjs server/daily-scenarios.mjs server/append-day.mjs server/generate-daily.mjs server/database.mjs server/api.mjs ./server/
CMD ["node","server/api.mjs"]
