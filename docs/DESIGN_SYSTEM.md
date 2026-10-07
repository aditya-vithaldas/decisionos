# Decision Axis · Meridian design standard
Updated 6 October 2026. Canonical reference for product interfaces, including the Gmail workspace at /crm.

## Reference and cascade
Verified live reference: https://decisionaxis.co/analytics. Without a demo parameter this is the Meridian portal; /analytics?demo=1 opens the analytics workspace. These are related surfaces, not identical layouts.
Source: products/meridian/app/portal.css and portal.tsx (portal), analytics.css and experience.tsx (workspace). Read the final matching CSS declarations: analytics.css contains superseded dark/neutral themes before the current light commerce workspace. Do not copy its initial lime/dark palette.
This guide replaces the earlier portfolio-specific cobalt/crayon specification for product UI. Portfolio illustration assets need not be regenerated or mistaken for screenshots.

## Verified palette
| Role | Portal | Analytics workspace |
| --- | --- | --- |
| Ink | #15233d | #17233b |
| Muted copy | #69758a; hero #5c6880 | #6d788d; card copy #758196 |
| Base canvas | gradient below | #f7faff |
| Surface | rgba(255,255,255,.83) | #ffffff |
| Border | rgba(255,255,255,.9) | #e0e8f2 / #dfe7f1 |
| Turquoise | #00f5d4; CTA #00cbae | #00f5d4; practical teal #00bca5 / #008d7a |
| Blue | #3a86ff; CTA #2584f4 | #3a86ff / #2870d7 |
| Violet | #8338ec | #8338ec / #7130d2 |
| Coral | #ff6b5b | #ff6b5b / #e8594d |
| Amber | — | #ffc94a / #9f7100 |

Use teal, blue, violet, coral and amber to differentiate signals, always with text labels. Colors are not evidence of status by themselves. Dark text is used on light surfaces; white labels only on sufficiently dark buttons.

## Typography: verified
Plus Jakarta Sans is the UI family, loaded through Google Fonts with sans-serif fallback. Portal weights 500/600/700/800; DM Mono 500 for small provenance/indices. Grand Hotel is exclusively the portal's handwritten editorial kicker, not functional navigation.
Portal headline: clamp(44px,5.2vw,80px), line-height 1.01, tracking -.058em; below 900px clamp(42px,10vw,64px).
Portal body: 18–23px hero, 14px proof-card copy; proof headings 22px. Analytics signal headings: 700 20px/1.25, tracking -.025em; proactive item titles 17px/1.35, tracking -.015em; body 11–13px; navigation 700 14px.
Product adaptation: no hero-sized headings in task views. One label per navigation item; do not repeat the selected tab as another large heading.

## Background and motion: verified portal
Canvas:
```css
background:
 radial-gradient(circle at 80% 9%,rgba(0,245,212,.34),transparent 23%),
 radial-gradient(circle at 98% 45%,rgba(131,56,236,.24),transparent 34%),
 linear-gradient(135deg,#fbffff 0%,#eef8ff 48%,#f8f1ff 100%);
```
Four decorative SVG paths, viewBox 0 0 1000 700, preserveAspectRatio none, gradient stops turquoise at 0 / blue at .45 / violet at 1. No particle swarm or autonomous looping field is present in the current portal.
Path i uses:
```text
M-40 (130+i*145) C210 (70+i*120),390 (560-i*80),(x*10) (y*7)
S820 (160+i*100),1060 (95+i*150)
```
Initial pointer focus x=78%, y=36%. Source updates focus relative to the portal on pointer move. Path stroke 1.2px, round caps, opacity .23; second path 2px/.17; third .1. CSS d transition .25s ease.
Verified analytics transitions: card entrance answer-in .35s ease (opacity +8px rise); view transitions .3s out / .38s cubic-bezier(.2,.8,.2,1) in; quiet request indicator entrance .22s; spinner 1.1s linear. Voice orb uses conic turquoise/blue/violet field and 12s rotation where active.
Reduced-motion rule in analytics disables animations, transitions and smooth scrolling. Portal CSS removes path transition, but its pointer handler lacks a JavaScript reduced-motion guard. CRM does not render or update decorative background paths: its gradient remains static. Purposeful card sorting respects reduced motion.

## Navigation and layouts: verified
Portal header 82px, horizontal gutter clamp(24px,5vw,84px); brand 24px/800; icon 34px with 11px radius and turquoise→blue→violet fill. Header background rgba(255,255,255,.48), blur 22px, fine ink .08 dividing rule.
Portal hero max-width 1500px, two columns 1.05fr/.95fr, minimum second column 410px; current top padding 48px. At 900px one column; at 560px navigation height 70px.
Analytics desktop: 60px header, 260px left rail, minmax(0,1fr) main. Rail padding 28px 20px 22px, main 32px clamp(24px,4vw,64px) 100px. Below 900px rail becomes horizontal; below 560px details are hidden and cards use 20px padding.
Selected analytics navigation: radius 16px, padding 13px 12px, color #174965, gradient from rgba(0,245,212,.13) to rgba(58,134,255,.1), inset 1px rgba(58,134,255,.1) border. Inactive text #68758a.
NEW CRM adaptation: five semantic tabs: Sales & CRM, Job Hunting, To-do & Actions, Bills & Finance, Clustering. Two-column tab grid on phones. The CRM gradient is static: no pointer-following background or parallax. Fetch Mail retrieves encrypted account-scoped source snapshots without model calls; subsequent fetches append changed versions with a timestamp overlap. Analyze Mail exclusively uses JEV classification of stored snippets: no Gemini extraction, theme generation or Gmail refetch. Cluster starter topics avoid automatic generation. Source Unsorted cards form a compact side stack; up to six representative transform/opacity flights per completed batch blend into category styling without delaying requests or storage, and reduced motion disables them. Small stage/count/time labels remain secondary; folded details distinguish classification wall time, overlapping provider request time, storage and end-to-end time. Info shows actual returned questions and probabilities. Nonmatching topics disappear from that lens, not from stored mail. Done, Not important and Discard hide that exact mail version across all five tabs, with Undo, never changing Gmail. Reply asks one or two contextual questions, generates a brief editable draft only on explicit request, and Send this reply approves the exact reviewed message without a redundant checkbox.

### Shared mailbox, Live and processing exceptions

One account-scoped fourteen-day encrypted source cache serves all five tabs. Sales, Actions and Finance analyze its seven-day subset; Clustering uses fourteen days. Jobs preserves already grounded older records but does not automatically refetch 180 days. Fetch disables when the shared scan completes; Analyze remains available in every tab. While the signed-in page is visible, a model-free incremental check runs approximately every five minutes, with account-level overlap protection and retry backoff. New versions appear Unsorted; polling never classifies them automatically.

Analyze uses a full-viewport-width, four-pixel top progress bar: actual reviewed / eligible source count, including completed uncertain decisions. Unknown totals remain indeterminate; only true completion fades the bar. It never follows pointer motion or blocks requests. Bills & Finance has a third Payment failures lane; literal source amounts, references, failure dates and retry instructions are shown when available. Missing facts remain unknown; the application never retries a payment.

Fetch, Analyze and Live share the same 42px dark pill controls, 12px labels and 999px radius, including verified 390px layouts. Live starts microphone capture only after an explicit click and stops tracks on Stop/navigation. It uses Gemini 3.8 Live with short-lived server-constrained tokens. Visible-card ordinal/name selection and scrolling are local; ambiguous semantic selection uses one bounded JEV decision and declines uncertain targets. Context is the current viewport or open letter, not the whole mailbox. Reply is brief, editable and explicit; voice never sends email automatically. Provider connection checks are not a physical microphone/voice latency test.

## Cards, buttons, forms: verified values

Live selection is a dedicated visual state, not a synthetic card click. Select / highlight / go to only add a persistent blue outline, turquoise halo and light tinted surface to the exact current actionable card; redraws restore that state. Success is acknowledged only after the target ID, visible bounds and painted outline are verified across animation frames. Missing or stale targets do not receive success acknowledgments. The typed-command test control is local-development only, not part of the public demo. Bare Done, Not important, Reply and this/it/that use the valid selected ID; that pointer advances after confirmed removal. Voice success says only “Done.” A blank reply asks only “What should I say?” Audio is withheld unless its transcription matches the grounded acknowledgment.

Each completed spoken input dispatches once; incremental transcript fragments never mutate cards. A model tool call uses fresh direct ASR, with a bounded spelling repair only for an explicitly heard action on the same selected card; negation and unrelated speech never qualify. If the model omits its tool call, the completed direct transcript still goes through the identical validated UI handler. A result is never reused for a later turn. Exact Gemini acknowledgment audio is preferred; if the model supplies unrelated narration, the client speaks only the verified short phrase using the browser voice rather than injecting additional model turns. The entire Live module/worklet dependency graph is content-versioned so a refreshed entry cannot retain old children.

Live start/context synchronization reads existing account-owned shared metadata and exact saved card versions across all five tabs. An expired Fetch token is not a reason to ask for a manual refresh, Gmail refetch or model classification. Tab changes, redraws, viewport changes, dismissal and opening/closing a letter update the candidate proof automatically; invalid or foreign cards still fail safely.

Default demo cards show the source subject/title and at most three lines of source excerpt, with muted integrated actions. Classification explanations live behind the info icon. Hide prompt-library and shared-cache explanations from the main canvas. Normal destination cards never overlap or move across each other. Unsorted is one muted grey non-interactive top card with three decorative, aria-hidden, pointer-inert paper edges and a compact count; it is not a list of hundreds of rows. Retain every source item for full classification, but never include Unsorted in Live candidates or keyboard actions. Representative sorting ghosts are capped at three, clipped in a pointer-inert layer, and removed on completion/cancellation.

Explicit Reply opens a blank editable outgoing panel immediately alongside the original sender, subject and plain-text letter (stacked on mobile). The incoming source remains readable while the draft is prepared. Minimal owner guidance is expanded into a concise natural Gemini 3.8 Live draft; never require exact full-message dictation. Source context is provided to Live only after explicit reply. Final Send remains a reviewed UI action, never a voice tool.

Reply, Done and Not important form a muted integrated bottom action row inside each card surface, not detached floating pills; touch targets remain at least 42px on phones. After confirmed Done/removal or an actually sent reply, highlight the next surviving item in the prior visible order. Do not advance for an unsent draft or a failed action; at the last visible item clear selection without wrapping. The same processing event serves manual and voice actions. Voice acknowledgment follows actual API persistence and rendered removal, not a model's unsupported claim.
Portal proof cards: 26px radius, rgba(255,255,255,.83), 1px rgba(255,255,255,.9), 22px 24px padding, shadow 0 24px 70px rgba(54,70,111,.12), blur 20px.
Analytics signal cards: white, 23px radius, 1px #e0e8f2, 22px padding, shadow 0 18px 50px rgba(47,67,104,.07); soft accent glow 180px circle at right:-85/top:-95, blur4px, opacity.2.
Analytics proactive cards: radius20px, border #dfe7f1, 22px 24px padding, shadow 0 15px 45px rgba(43,64,100,.06), 3px accent top rule.
Portal primary CTA: gradient 100deg #00cbae/#2584f4/#8338ec, 18px radius, 17px 22px padding, 800 weight, shadow 0 18px 42px rgba(58,134,255,.2). Dark secondary/demo action #15233d with white text. Quiet actions are small, not giant marketing CTAs.
CRM currently adapts portal cards with analytics-style accent top rules. Job statuses Open/Inactive/Closed and sales Hot/Moderate/Cold always appear in text.
Forms: retain clear labels, editable values, focus states, and explicit approval. Do not replace real controls with screenshot placeholders. Advanced prompt forms are hidden from the default demo.

## Interaction and accessibility
Verified analytics focus outline: 2px #7589a7, offset4px. CRM adaptation uses 3px #3a86ff, offset3px. Preserve visible keyboard focus; minimum usable targets even where visual labels are small.
New product requirements: semantic tablist/tab/tabpanel, arrow-key/Home/End navigation, card action via normal click/keyboard as well as right-click. Right-click is never the only way to label a card. Dialog Escape dismissal, focus return and a contained Tab loop. Decorative SVG is aria-hidden and ignores pointer events.
Card movement/status labeling never sends mail. Draft edits reset approval; each exact outgoing message requires an explicit reviewed approval. Loading/error messages must remain truthful but brief; detailed provider/privacy explanation belongs in privacy documentation, not the default workspace.

## Paper stacks: new CRM pattern, not claimed as existing Meridian
Theme buttons use the same white/translucent card family. Two rotated paper layers (-3deg/+3deg), offsets5px/9px, .25s transform transition; hover rises4px. Expanded email cards enter over .25s with10px rise. Reduced motion disables transitions and animation. On phones stack grid has two columns and expanded emails one column. All expanded email text uses textContent, not HTML; no private remote tracking images or scripts.

## Reusable implementation mappings
| Intent | Existing Meridian source | CRM adaptation |
| --- | --- | --- |
| Portal field and brand | .meridian-home, .mh-threads, .mh-brand | body, .workspace-threads, .brand-mark |
| Navigation | .an-sidebar active / .mh-actions | .workspace-tabs [aria-selected=true] |
| Task/signal card | .pr-unit-grid > article / .mh-proof article | .workspace-lanes .lane > .lead-card |
| Quiet progress | .an-request-toast | .app-status, .scan-progress |
| Expandable evidence | .pr-drivers | .lead-panel |
| Theme exploration | new pattern | .paper-stack, .email-paper |

Avoid selector collisions: .lane > button in the legacy CRM stylesheet also styles the Cold toggle; task cards must use the more specific .workspace-lanes .lane > .lead-card rule so they do not turn into a horizontal flex strip.

## Screenshots and verification
Screenshots must show an actual rendered UI. Use sanitized fixture accounts and label example data. No owner email contents in public screenshots. A capability illustration is not a product screenshot. Save a desktop and a verified390px mobile view; check document width, loaded images, cards, menu/keyboard flow and reduced motion. Do not claim actual provider operation based on fixtures: separately verify authenticated read-only mailbox processing and the named live model.
