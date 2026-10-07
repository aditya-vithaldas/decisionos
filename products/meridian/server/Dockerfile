FROM node:22-bookworm-slim AS database
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/build-demo.mjs ./server/build-demo.mjs
ARG DEMO_SCALE=1
RUN DEMO_SCALE=$DEMO_SCALE BUILD_MEMORY_LIMIT=4GB node server/build-demo.mjs
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/app/data
COPY --from=database --chown=node:node /app/node_modules ./node_modules
COPY --from=database --chown=node:node /app/data ./data
COPY --chown=node:node server/*.mjs ./server/
USER node
EXPOSE 8080
CMD ["node","server/api.mjs"]
