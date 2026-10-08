# B2B lead generator

`/leadgen` researches a B2B company, recommends editable buyer questions, searches public LinkedIn, Reddit and X posts, and links to the original conversation for manual replies. The homepage B2B carousel links to it.

## Runtime and account data

Uses the established Node server and identity-only Google OAuth flow: `/crm/api/oauth/start?identity=1&return=leadgen`. The existing callback redirects to `/leadgen`. All private endpoints are under `/crm/api/leadgen/`, covered by the existing HttpOnly `/crm` session cookie. No OAuth redirect URI or social app credentials are added. Gmail and Sheets permissions are unnecessary. The established Gmail/Sheets flows retain their destinations and permissions.

Requires the existing CRM Google OAuth, session, token encryption and Firestore configuration, plus `GEMINI_API_KEY`. `LEADGEN_MODEL` optionally overrides the default `gemini-3.8-flash`. API credentials stay on the server.

GET `/state` returns the account's profile, results and statuses. POST `/recommend` researches company/website and proposes questions. POST `/search` accepts a reviewed profile and selected platforms. POST `/status` changes an existing account-owned result to new, saved, dismissed or replied. Every mutation checks the established exact-origin JSON requirement. State lives encrypted in the user's `leadgenCipher` Firestore field. Existing record update-time preconditions protect against concurrent cross-instance overwrites. Account mutation locks and bounded hourly/global daily budgets protect research calls within each instance; these are not distributed quotas.

## Search and evidence

Research uses Google Gemini's Interactions API with Google Search. A second structured extraction step creates recommendations or classifies cited post evidence. Result URLs come only from provider `url_citation` metadata with valid cited text ranges. Server validation accepts individual Reddit comment threads, LinkedIn posts/activity updates and X/Twitter status URLs on exact platform domains; unknown hosts, non-HTTPS URLs and model-generated URLs are excluded. Duplicate post URLs are collapsed. Cards explicitly label paraphrased questions, search summaries and inferred fit; no author, timestamp, numerical lead score or verified buying intent is invented.

Per-platform counts cover fresh verified matches in that search, including zero matches. Coverage is limited to publicly discoverable posts, not direct social APIs or private/authenticated feeds. Search suggestions are displayed in a sandboxed iframe. Source text is untrusted data and rendered with DOM text methods. Source links open the original platform; the service never posts replies. Mark replied is a manual workspace record. Saved and replied results survive repeat searches of the same company; another company starts a distinct latest workspace. Previous full search history is not retained. Recommendation refresh starts a new question plan and clears prior results.

Example mode is illustrative recommendations only, requires no sign-in, does not call providers or persist data, and contains no fake prospects. A signed-in user can search with those editable questions.

## Build and release

`npm run build` compiles the complete site. The lead generator directory and versioned assets are included in the root build, Docker image and upload allowlists. `/leadgen` and `/leadgen/` serve the same page. The SEO registry includes the public landing page; account API paths remain excluded by the existing robots rules. `/leadgen/privacy.html` explains storage and providers.

Deployment requires a separate authorized release. Do not claim live social search or live sign-in verification based on fixtures; verify provider citations and identity callback on the deployed environment before advertising coverage.
