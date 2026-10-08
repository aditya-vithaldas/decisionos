# B2B lead generator

The public `/leadgen` page starts with a blank website field. Submitting a public HTTPS website reads its offering, recommends buyer questions, then automatically searches LinkedIn, X and Reddit. No sign-in or company setup is required. Each sourced match explains relevance, suggests a constructive answer and links to the original post.

## Public runtime

POST `/api/leadgen/recommend` accepts `{website}` and returns the inferred company profile and suggested questions. POST `/api/leadgen/search` accepts that profile and the selected platforms. These routes require JSON from an allowed site origin, bound request bodies, rate-limit temporary hashed network addresses and cap concurrent research. Only recommendation and search are exposed publicly. The public flow performs no Firestore reads or writes, uses no session cookies and retains no profiles or leads on the server. Results live in the current page until refresh or navigation. Infrastructure may retain normal request logs.

The existing signed-in CRM leadgen endpoints remain separate. Public requests cannot access saved account state or mutate account-owned leads.

Requires the server's `GEMINI_API_KEY`; `LEADGEN_MODEL` optionally overrides the configured model. API credentials stay on the server.

## Search and evidence

Google Gemini with Google Search reads the submitted public site. Structured extraction recommends relevant questions from cited sources. Platform searches discover individual public posts, then classify relevance and suggest helpful response angles. URLs come from provider citation metadata, with source evidence and individual-platform URL validation. No invented prospects, author names or dates.

Questions that appear unanswered are ranked first only when the classifier provides an exact substring of cited source evidence explicitly describing no replies, answers or comments. Missing reply information stays unknown. These are search-based suggestions; visitors must check the original post for current context. Per-platform counts describe the current search, including zero results and provider failures. Coverage is limited to publicly discoverable posts. Opening the original platform may require that platform's account. The product does not submit replies.

Search suggestions appear in a sandboxed iframe. Source text uses DOM text methods. The page privacy notice explains the public flow.

## Build and release

The root build includes `/leadgen`, its privacy page and versioned assets. The Node server dispatches public leadgen routes before static handling. Publish from a committed snapshot and record revision and image digest. Verify both the public URL-only landing page and provider-backed recommendation/search flow after release.
