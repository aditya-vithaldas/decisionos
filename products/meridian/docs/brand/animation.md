# Animation and story spec: presentation videos

The core set has four documents, and every video in this folder follows all four:

| Document | Fixes |
|---|---|
| [design-guide.html](design-guide.html) | The look: fonts, the Lagoon palette and its two contrast colors |
| **animation.md** (this file) | How a video tells its story, and how things move |
| [illustration.md](illustration.md) | How people are drawn: AI-generated editorial illustrations (gpt-image-1), stored in [people/](people/) |
| [conversational-guidelines.md](conversational-guidelines.md) | How narration, emotion, voice models, and human-in-the-loop choices work |
| [video-template.md](video-template.md) | The reusable prompt that carries this hierarchy and timing into new videos |

You can watch the motion options that were considered, looping, in [motion-options.html](motion-options.html).

**The feel:** calm, confident and editorial, the way a business broadcast is. Screens hand over with a clean wipe. The one fact that matters lifts off the screen or gets pointed at, so the viewer never has to hunt for it.

---

## 0. Tell it as a conversation

Every video is a short, real-feeling business conversation, not a feature tour. The product appears only as the way each question gets answered.

**Cast**
- **The asker** is a named business owner with a real title, for example *Head of Sales*. They ask the question and say the closing line.
- **The analyst** is the product. It answers on screen, with evidence.
- Give the asker a name and title on first appearance, then just the first name. Generate them per [illustration.md](illustration.md): the full illustration on story scenes, and the avatar crop in speaker cards and reply chips. Their lines go in chat bubbles.

**Arc.** Always in this order, with one question per step:

| Beat | What happens | Example (sales) |
|---|---|---|
| 1. The ask | The asker states the problem in their own words | "Why did our sales go down?" |
| 2. Size it | Confirm the drop, with the period and the amount | "November was down $X from October." |
| 3. Locate it | Break it down by one dimension to find where it came from | "Most of it is one region." |
| 4. Explain it | Drill into that segment to the driver | "Three product lines account for most of the gap." |
| 5. Check it | Show it's not noise: compare against the baseline and state the confidence | "Outside the normal range. These are measured contributions, not proof of cause." |
| 6. The turn | The asker is satisfied and moves to action | "Great. What do we do about that?" |
| 7. Act | Concrete next steps from the product: watch it, assign it, ask the follow-up | "Meridian will check it every morning." |

**Every answer screen has three parts.** These videos sell the software, so a screen shows how the product thinks, not just what it found.

| Part | Where | What it holds |
|---|---|---|
| **The visual** | The app window, which is the biggest thing on screen | The real chart or answer. The camera settles on it, and the callout points into it |
| **How it got there** | Left column, a quiet trace slot under the insight | 2–3 short steps, shown one at a time: what the product compared, split or checked |
| **Why it matters** | Left column, a sun-tinted card | One buyer-facing line: the benefit to the person watching, such as speed, context or confidence |

- The numbers live in the visual. The left column holds **at most one number**, and never a table of figures.
- "Why it matters" talks about the buyer's day ("An answer in the meeting, not a ticket for next week"), never about features ("Uses DuckDB").
- The stat takeover (C7) is optional. Skip it when the story is about reasoning rather than one figure.

### Insight first; reasoning second

- The answer/insight is the headline. Give it the largest type, strongest contrast and most stable position after the product visual.
- "Why it matters" is the second read. Keep it short, buyer-facing and visually stronger than the reasoning trace.
- "How Meridian got there" is supporting evidence, not a competing content block: smaller type, quieter color and no large stacked list.
- Use **one fixed trace slot**. Show one short reasoning step at a time; the next step replaces the previous one in the same place.
- Keep step arrivals **1–2 seconds apart** (about 2.2–4.4 beats at 132 BPM; default 3.1 beats / 1.4 seconds). Fade the outgoing step, leave a brief clean handoff, then reveal the next. Never let two full steps remain stacked.
- A trace step should be 2–6 words where possible ("Compared with October", "Split by region", "Normalized by days"). If it needs a sentence, it belongs in the insight or narration instead.

**Rules**
- Each screen answers the line just before it. If a screen doesn't answer a line of dialogue, cut it.
- Dialogue is short and spoken: 12 words or fewer per line, and no jargon the asker wouldn't use.
- Every answer on screen is real product output with real numbers. Never stage a result the product can't produce. If the data can't support a line of the script, change the line, not the data.
- The analyst never claims cause. It quantifies contributions and says so. "What do we do" is answered with actions the product really supports.
- When the analyst recommends paths or actions, the asker explicitly selects one before the product proceeds. Follow [conversational-guidelines.md](conversational-guidelines.md) for the reusable human-in-the-loop pattern.
- Close on the action, then the product name and link. No feature list at the end.
- Target 60–90 seconds, and about 10 seconds per beat.

---

## 1. Curves

| Name | Cubic-bezier | Character | Use |
|---|---|---|---|
| **Glide** | `0.22, 1, 0.36, 1` | Fast start, long soft landing | Anything arriving: text, cards, labels |
| **Swipe** | `0.65, 0, 0.35, 1` | Smooth in and out | Wipes, camera pans and zooms, pointer lines |
| **Pop** | `0.34, 1.56, 0.64, 1` | Small overshoot | Pointer dots, avatar rings. Never on text |

Nothing runs linear except progress bars.

## 2. Timing

At the house track (132 BPM), 1 beat is about 455 ms. Frame counts are at 30 fps.

| Token | Beats | ms | Frames | Use |
|---|---|---|---|---|
| wipe | 1.4 | 640 | 19 | Editorial wipe across the frame |
| depth-change | 1.8 | 820 | 25 | Chapter break only (§3) |
| text-line | 1.3 | 590 | 18 | One line sliding up from its mask |
| line-stagger | 0.26 | 120 | 4 | Gap between lines |
| row-stagger | 0.6 | 270 | 8 | Gap between rows, cards and tags |
| pull-out | 1.4 | 640 | 19 | Callout card lifting off the screenshot |
| pointer | 1.2 | 550 | 16 | Dot, then line, then tag (§5) |
| crossfade | 0.4 | 180 | 5 | Loading frame to answer frame inside the app window |
| camera-move | 1.6 | 730 | 22 | Zoom or pan inside the app window |
| hold | ≥ 3 | ≥ 1,360 | ≥ 41 | A finished screen sits still before it leaves |

Screen changes land on a downbeat. A chapter break lands at the start of a new musical phrase.

## 3. Transitions

**House style: editorial wipe.** Used for every change within a story beat.
- A 4 px **coral** edge travels right to left across the frame over the wipe token, on Swipe.
- The new screen is revealed behind the edge (`clip-path: inset(0 0 0 100%) → inset(0)`). The old screen stays put underneath and is simply covered. There is no blur, fade or scale.
- The edge fades out over 0.2 beats once it reaches the left side.
- Content on the new screen starts about 0.4 beats after the edge passes it.

**Chapter breaks: depth stack.** Used only between the arc's big sections, for example from "the ask" into the investigation, and from "the turn" into "act".
- The outgoing screen slides out to the left (`translateX 0 → -100%`, `scale 1 → 0.97`) on Swipe, with a soft shadow on its right edge.
- The incoming screen rises from the back (`scale 0.86 → 1`, `blur 14px → 0`, `brightness 0.6 → 1`) on Glide.

Never use more than two chapter breaks in a 90-second video. Everything else is a wipe.

## 4. Text

- Headlines and dialogue reveal **line by line through a mask**: each line slides up from `translateY 105%` to 0, on Glide, with line-stagger between lines. There is no blur on text in the house style, so it stays crisp.
- Chat bubbles (the asker's lines) pop in as a whole bubble (scale 0.94 → 1 on Pop, 30 px rise), then the text inside types out at about 30 characters per second.
- Supporting lines (eyebrows, table rows, notes) rise 20 px and fade in, with row-stagger.
- Reasoning traces replace one another in a single reserved slot. They do not accumulate vertically. Use a restrained 0.3–0.5 second crossfade/rise and 1–2 seconds between step arrivals.
- Typed questions to the analyst type out with a coral caret, which stops blinking once the answer is on screen.
- Text never scales, spins or bounces.

## 5. Callouts: how the key fact is shown

Every answer screen gets exactly one callout treatment. Pick it by what you're pointing at:

| Situation | Callout | Recipe |
|---|---|---|
| One number or line is the point | **C5 pull-out card** *(default)* | The page dims to 55% black. The target region lifts off as a floating card (scale up to about 1.45, rise, 30px 60px shadow, 2 px white outline) over the pull-out token on Glide. A white caption chip with the key figure in coral follows 0.3 beats later |
| Several points on one screen, or pointing to a spot in a chart | **C6 pointer (leader line)** | A coral dot pops onto the target. A line draws out from it (`stroke-dashoffset` on Swipe), with an elbow, not a diagonal only. A dark label pill with the figure in sun appears at the end of the line. Space up to three pointers row-stagger apart. Lines never cross each other or the figure they point to |
| The single headline number of the whole video | **C7 stat takeover** | The target region expands to fill the frame (`clip-path` from its box to full frame on Swipe) and becomes a clean hero number in gradient type, with one context line. **Once per video** |

- Callouts arrive only after the answer has finished loading and the camera has settled. Hold them for at least 3 beats.
- Coral marks what to look at. Sun marks the value itself. Cyan is never used for callouts, because it disappears on light screenshots.
- The ring (outline box) is retired, except as a fallback on very dense screens where a pull-out would cover other context.

## 6. Order inside each scene

1. The wipe reveals the screen.
2. Speaker label or eyebrow.
3. The line of dialogue or the question.
4. The evidence: app window, chart or number.
5. Camera settles on the part that matters.
6. Callout (§5).
7. Hold for at least 3 beats.
8. The next wipe.

Only one thing arrives at a time. Before a second thing starts, the first should be at least 60% of the way through its move.

## 7. Don'ts

- No feature tours: every screen answers a line of dialogue.
- No hard cuts and no fades through black, except the final fade-out.
- No blur on text, and no scale on text.
- No more than one callout treatment per screen, and no more than three pointers.
- No stat takeover more than once.
- Nothing bounces more than once.
- Every finished screen holds for at least 3 beats.
