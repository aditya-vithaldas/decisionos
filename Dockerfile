FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/build.mjs scripts/build-meridian.mjs scripts/build-seo.mjs scripts/seo-pages.json ./scripts/
COPY products ./products
COPY index.html design-system.html case-studies.html thanks.html ./
COPY projects ./projects
COPY services ./services
COPY crm ./crm
COPY feedback ./feedback
COPY leadgen ./leadgen
COPY goods ./goods
COPY assets ./assets
COPY images ./images
COPY toptal-application.html toptal-application.css toptal-application.js ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/crm-workspace.mjs ./scripts/
COPY --chown=node:node scripts/crm-workspace-flow.mjs ./scripts/
COPY --chown=node:node scripts/crm-live.mjs ./scripts/
COPY --chown=node:node scripts/leadgen-api.mjs scripts/leadgen-search.mjs scripts/leadgen-urls.mjs scripts/leadgen-dates.mjs ./scripts/
COPY --chown=node:node scripts/goods-api.mjs ./scripts/
COPY --chown=node:node scripts/image-qa-api.mjs scripts/image-qa-catalog.mjs ./scripts/
COPY --chown=node:node scripts/google-analytics.mjs ./scripts/
COPY --chown=node:node scripts/serve.mjs scripts/contact-api.mjs scripts/crm-api.mjs scripts/crm-opportunities.mjs scripts/crm-gmail.mjs scripts/crm-prompts.mjs scripts/feedback-api.mjs scripts/commerce-api.mjs scripts/analytics-api.mjs scripts/generate-analytics.mjs scripts/demo-api.mjs scripts/demo-planner.mjs ./scripts/
USER node
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]
