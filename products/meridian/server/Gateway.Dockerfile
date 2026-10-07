FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --chown=node:node principles.md ./principles.md
COPY --chown=node:node server/planner.mjs server/planner-rolling.mjs server/gateway.mjs server/answer-guidance.mjs server/query-api.mjs server/semantic-guard.mjs server/intent-review.mjs ./server/
USER node
CMD ["node","server/query-api.mjs"]
