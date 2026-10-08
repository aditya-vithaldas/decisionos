FROM node:22-bookworm-slim
WORKDIR /app
COPY server/mcp/package.json server/mcp/package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server/mcp/*.mjs ./
COPY --chown=node:node docs/dashboard/performance.html docs/dashboard/rca.html ./dashboard/
USER node
ENV NODE_ENV=production PORT=8080 DASHBOARD_TEMPLATE_DIR=/app/dashboard
EXPOSE 8080
CMD ["node","server.mjs"]
