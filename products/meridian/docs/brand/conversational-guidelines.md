# Conversational voice and human-in-the-loop standard

This document defines how people, narration, and the product speak in presentation videos. Use it with [design-guide.html](design-guide.html), [animation.md](animation.md), and [illustration.md](illustration.md).

**The feel:** a capable colleague in a real meeting—observant, calm, emotionally present, and decisive. Never a theatrical commercial voice, a cheerful assistant, or a robotic feature demo.

## 1. The collaboration model

Every product interaction follows this loop:

1. **The product notices or answers.** It presents evidence and no more than three useful next paths.
2. **The human chooses.** A named person selects, narrows, challenges, or reframes one path in their own words.
3. **The product acknowledges the choice.** It briefly says what it understood: “You chose regions.”
4. **The product acts visibly.** The next screen must be the result of that choice, with context preserved.
5. **The human authorizes consequential action.** Assigning work, starting a watch, contacting somebody, or changing a business process requires an explicit human selection in the story.
6. **The product closes the loop.** It confirms what it did, what remains under observation, and when the human will hear from it again.

Do not jump directly from a recommendation to an executed action. The viewer must see or hear the human decision between them. Detection and analysis may be proactive; business action remains human-led.

### Recommended dialogue pattern

> **Meridian:** “I found the gap. We can check region, category, or conversion.”
> **Maya:** “Start with regions. Which market explains most of it?”
> **Meridian:** “You chose regions. Western Europe accounts for the largest fall.”

Later:

> **Meridian:** “This resembles an earlier pattern. I can reopen it or start a watch.”
> **Maya:** “Pull in that case—and watch Western Europe.”
> **Meridian:** “The prior case is open. The daily watch is active.”

## 2. Voice roles

| Role | Job | Delivery |
|---|---|---|
| **Narrator** | Carries the argument and connects scenes | Calm, warm, assured; speaks around dialogue, never repeats it |
| **Human decision-maker** | Brings stakes, doubt, judgment, and authorization | Natural meeting voice; emotion is specific to the moment |
| **Product / analyst** | States evidence, choices, and completed actions | Concise, grounded, quietly confident; never self-congratulatory |

Use one consistent narrator and one consistent voice per recurring character. A character’s voice is part of the cast identity just like their illustration.

## 3. Voice model and generation

**Default production model: ElevenLabs Eleven v4.** Use it for the narrator and character dialogue when available because it supports expressive direction and long-form consistency. Use Eleven v3 only as a fallback when v4 is unavailable in the required API or export workflow; do not mix v3 and v4 takes for the same speaker in one video.

**Production workflow: API first.** Once a voice has been selected, generate takes through the ElevenLabs API with an explicit voice ID, model ID, stability/style settings, and the exact approved text. Save the request settings alongside the exported audio so a take can be recreated. Use the browser UI only to audition voices, compare unfamiliar presets, or diagnose an API/export mismatch—not as the routine rendering path.

- Generate narrator and character dialogue as separate assets.
- Generate important human lines individually so their emotion and timing can be tuned without affecting the narrator.
- Generate two takes for each emotional line. Choose the more natural take, not the more dramatic one.
- Keep the same saved voice for every appearance of a character.
- Do not imitate a real person or celebrity.

### Direction format

Use one restrained direction before a line, or two compatible qualities at most:

- `[controlled frustration]`
- `[curious, decisive]`
- `[concerned recognition]`
- `[quietly confident]`
- `[warm, purposeful]`

Avoid stacked acting instructions, exclamation-heavy writing, and directions such as “extremely excited,” “dramatic,” or “commanding” unless the story genuinely requires them.

## 4. Emotion without artificiality

Emotion comes from **stakes + pause + emphasis**, not volume.

| Moment | Emotion | Vocal behavior |
|---|---|---|
| A result differs from plan | Controlled frustration | Slightly firmer opening; soften at the end into a real question |
| A useful path appears | Decisive curiosity | Short pause before the selected path; lift only on the follow-up |
| A prior problem is recognized | Concerned recognition | Slower first clause, small pause, then a practical instruction |
| Evidence resolves uncertainty | Relief, not celebration | Release tension; do not sound triumphant |
| An action is confirmed | Quiet confidence | Even pace, lower ending, no sales cadence |

Keep emotional intensity around **3–5 out of 10**. If the emotion is obvious with the screen muted, the voice is probably overacted.

Write contractions and spoken punctuation. Prefer “We’ve seen this before. Pull in that case.” over “We have previously encountered a comparable situation.” Lines should usually stay under 12 words; a natural two-clause instruction may extend to 16.

## 5. Narration

Narration should explain why the exchange matters, not read headings or describe visible motion.

- Aim for 115–135 words per minute after pauses.
- Leave 250–450 ms around a meaningful clause and 500–800 ms before a human interruption.
- Stop narration during human and product dialogue unless a deliberate overlap has been storyboarded.
- Give the close more space; the final product line should land rather than rush.
- A 60-second film normally uses 85–115 narrator words plus 2–4 short dialogue lines.

## 6. Audio mix

- Narration is the reference voice level.
- Character dialogue may sit 1–2 dB above narration so it feels present in the meeting.
- Duck music by roughly 6–9 dB under speech with 120–220 ms attack and 350–600 ms release.
- Keep music lower under emotionally important questions; do not add notification pings to manufacture emphasis.
- Use a short musical lift only after the human choice and visible agent action, never before the decision.
- Limit the final mix to prevent peaks; check it on laptop speakers as well as headphones.

## 7. Visual proof of agency

The human choice must be legible even with audio muted:

- Show the product’s recommended paths.
- Show the human’s avatar and choice in a reply chip or story scene.
- Carry the chosen words into the next product response: “You chose regions.”
- Animate the selected path, then reveal the result.
- For consequential actions, show a distinct confirmation state such as **WATCH ACTIVE**, **ASSIGNED**, or **CASE OPENED**.

Never show every recommendation executing simultaneously. Unchosen options remain available but visually quiet.

## 8. Evidence and trust

- The product distinguishes measured evidence, interpretation, and recommendation.
- It says “coincides with” or “is associated with” when causality is not established.
- If confidence is limited, the human hears that before choosing an action.
- Reopening a prior case must not merge its numbers with the current case unless the comparison is explicit.
- The product confirms what context it preserved: period, metric, region, segment, or baseline.

## 9. Review checklist

- Does the human make at least one meaningful choice?
- Does the next screen visibly follow from that exact choice?
- Is every consequential action explicitly authorized?
- Are narrator, human, and product voices distinct and consistent?
- Is emotion specific, restrained, and supported by the business moment?
- Does the narrator avoid repeating on-screen copy and dialogue?
- Does the music duck naturally under every spoken line?
- Can the collaboration be understood with the sound off?
- Does the product confirm the resulting action and ongoing watch?
