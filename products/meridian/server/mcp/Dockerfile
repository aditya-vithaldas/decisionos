FROM node:22-bookworm-slim
WORKDIR /app
COPY server/mcp/package.json server/mcp/package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server/mcp/*.mjs ./
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","server.mjs"]
