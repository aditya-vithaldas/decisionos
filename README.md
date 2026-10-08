# Portfolio and presentation

This repository contains the current portfolio homepage, case studies, service pages, and the Toptal presentation.

Run `npm run build` to generate the static site. Run `npm run dev` to preview it locally.

## Git checkpoints and deployment traceability

Follow [AGENTS.md](AGENTS.md) for repository work. During substantial changes,
make coherent checkpoint commits after meaningful, validated milestones. Commit
and push completed, verified task changes to the configured remote on the
applicable existing branch; do not leave deployed implementation only in an
uncommitted working tree. Preserve unrelated user edits, and never commit
credentials, OAuth tokens, private mailbox data, reviewer captures, or generated
build output. Record the source commit and deployed revision/image for releases;
inherited Cloud Run commit labels are not proof of a clean source snapshot.

The root Dockerfile packages the current site and presentation together. Publish from the main branch after checking the homepage, case studies, presentation, and referenced assets. Do not publish an older checkout or the archived application as the current site.

The presentation is available at `/toptal-application.html`; `/toptal-application` redirects to it. The original application remains under `archive/` for reference and is excluded from the production build.

Published pages are registered in `scripts/seo-pages.json`. The build generates page metadata, structured data, a sitemap, and crawler guidance. Contact submissions use the existing configured form provider.

## Google Analytics

Set the Cloud Run environment variable `GOOGLE_ANALYTICS_MEASUREMENT_ID` to the
site's GA4 measurement ID. The server adds the shared Google Analytics script to
every served HTML page, including the interactive applications and future pages.
Without this variable, Analytics is disabled; invalid IDs fail at startup.

The script sends one page view on load and on changes to a browser history route,
including back/forward navigation. Turn off Enhanced Measurement in the GA4 web
stream: page views are sent explicitly to avoid duplicates and to exclude private
query parameters, invitation tokens and URL fragments. Standard UTM campaign
parameters are retained. Form values, app content and custom events are not sent;
Google Signals and advertising personalization are disabled.

## Meridian

Meridian is maintained in this repository under `products/meridian` and served at `/analytics`; its case study remains at `/projects/analytics.html`. `npm run build` now installs the pinned Meridian dependencies, builds the application, and places the generated bundle into `/analytics` before assembling the Decision OS site. Do not edit or commit the generated `/analytics` directory. The DuckDB query service and reproducible demo-data generator live under `products/meridian/server` and deploy separately from the website.
