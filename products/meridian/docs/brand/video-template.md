# Video prompt: reusable template

Paste this into a new session and fill in the brackets.

```text
Make a 60–90 second presentation video that sells [PRODUCT NAME] ([PRODUCT URL]) to [TARGET BUYER], told as a real business conversation.

Follow the brand core set exactly. Read all four before starting:
- design-guide.html: fonts (Plus Jakarta Sans, Grand Hotel script kicker, DM Mono), the Lagoon palette (aqua #00F5D4 → sky #00BBF9 → blue #3A86FF → violet #8338EC) with contrast colors coral #FF6B5B and sun #FFC94A
- animation.md: the story arc, answer-first hierarchy, transitions (editorial wipe as house style, depth stack only at the 2 chapter breaks), text reveal through a mask, one-at-a-time reasoning traces, and callouts (pull-out card by default, pointer / leader line for multiple spots, stat takeover optional and at most once)
- illustration.md: people are generated with gpt-image-1 (Gemini as fallback), using the base prompt template. Transparent background, the asking pose first, then other expressions as edits of it, and an avatar cropped from the face. Reuse existing cast members from people/ when the role matches.
- conversational-guidelines.md: use Eleven v4 by default; separate narrator, human and product voices; keep emotion restrained and specific; show the product recommend paths, the human select one, and the product acknowledge and visibly carry out that choice before any consequential action.

Story
- Asker: [NAME], [TITLE]. Opening question in their words: "[THE QUESTION]"
- Arc, one question per step: the ask → size it → locate → explain → check it (like for like / is it noise) → "Great. What do we do about that?" → act → end card with product name and URL.
- Each answer screen: the real product visual and the answer/insight are the heroes. The insight gets the largest type and strongest contrast. "Why it matters" is the second read. "How [PRODUCT] got there" is a quiet supporting trace: 2–3 steps of 2–6 words, shown one at a time in one fixed slot rather than stacked.
- Reasoning steps replace one another 1–2 seconds apart (default 1.4 seconds). Fade the outgoing step, leave a brief clean handoff, then reveal the next. Keep the trace smaller and lower contrast than the insight. At most one number appears in the left column.
- Dialogue lines are 12 words or fewer, spoken tone, no jargon.

Evidence rules (non-negotiable)
- Every answer on screen is real product output. Drive the live product with Playwright (API-first, not the Chrome extension), ask the questions in ONE continuous session so context carries, and capture 2x screenshots: 6 loading frames plus the finished frame per answer, plus bounding boxes of the elements to call out.
- Before writing the script, probe the product to find what it can really answer. If the data doesn't support a line, change the line, not the data. Never claim cause. Only claim actions the product really supports.
- If you compute anything yourself (e.g. per-day figures), label it on screen as calculated from the product's numbers.
- Tell me up front about anything the product couldn't do and how you handled it.

Build
- One HTML composition at 1920×1080 with one DOM per scene and a deterministic window.render(t). Render frame-by-frame with Playwright into ffmpeg at 30 fps, H.264 CRF 18, with the selected music track cut to the beat, fading in and out.
- Screen changes land on downbeats. Hold each finished screen for at least 3 beats.
- Workflow: storyboard and script first → show me the script and the list of real answers for sign-off → generate people → capture → build → render a contact sheet of stills and fix anything clipped or misaligned → render the full MP4 → send it to me.

Deliverables: the composition HTML, captures, final MP4, and a short note listing every number shown and where it came from.
```
