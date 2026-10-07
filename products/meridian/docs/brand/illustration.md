# Illustration spec: the people in our videos

Part of the core set, with [design-guide.html](design-guide.html) (look), [animation.md](animation.md) (story and motion) and this file (people). Whenever a video has a person asking a question, they are an **AI-generated editorial illustration**, made with OpenAI **gpt-image-1**, with Gemini image generation as the fallback. Never use stock photos, hand-drawn SVG figures or emoji.

**The feel:** a premium tech-brand illustration (think Stripe, Linear or Notion editorial). The person is a confident professional with natural proportions and refined features, flat shapes with soft shading, and aqua and violet rim light. Warm, but never cartoonish.

Everything lives in **[people/](people/)**: the generator (`gen.mjs`), the prompts (`p_*.txt`) and the finished images.

---

## 1. Style rules (put these in every prompt)

| Rule | Spec |
|---|---|
| Rendering | Modern flat vector illustration with soft shading and smooth gradients, clean shapes, refined facial features and natural proportions. Not cartoonish, and not photo-real |
| Light | A subtle rim light in aqua `#00F5D4` and violet `#8338EC`. Shadow tints come from the Lagoon blues |
| Accents | Coral `#FF6B5B` and warm yellow `#FFC94A` as small accents only, such as a necklace line or earrings |
| Framing | Waist-up, three-quarter view, with the body and gaze **turned toward the text**, which is usually the left of the frame |
| Background | **Fully transparent**, with no frame, no text and no logos |
| Wardrobe | Business: a tailored blazer over a plain top. Keep the colors inside the palette, with navy as the default |
| Never | Real people's likenesses, brand logos on clothing, or different styles within one video |

## 2. How to make a person

1. **Write the base prompt** from the template below, and save it as `people/p_<name>_ask.txt`.
2. **Generate the asking pose** at portrait size 1024 × 1536, high quality, with a transparent background:
   `node people/gen.mjs gen people/<name>_ask.png people/p_<name>_ask.txt`
3. **Make every other expression as an edit of that image**, never as a fresh generation. That keeps the face, outfit and style identical:
   `node people/gen.mjs edit people/<name>_pleased.png people/p_<name>_pleased.txt people/<name>_ask.png`
   (The edit uses `input_fidelity: high`, and its prompt starts with "Same woman/man, same illustration style… change only…")
4. **Crop the avatar** from the asking image: a square around the face, resized to 256 × 256, saved as `people/<name>_avatar.png`.
5. **Check it on the Lagoon gradient** before using it: are the edges clean, does the person face the text, and does the face match across every expression?
6. **Add the person to the cast table** in §4.

The key comes from `~/.claude/secrets/openai-eloquens.env` (`OPENAI_API_KEY`). `gen.mjs` reads it and never prints it.

**Base prompt template**

> Premium editorial illustration for a B2B software presentation. A confident *[age / background]* *[man/woman]*, *[role]*. *[hair]*, *[blazer color]* tailored blazer over an off-white top, *[one small accent]*. Waist-up, three-quarter view, body and gaze turned toward the LEFT side of the frame. *[gesture and expression]*.
> Style: modern flat vector illustration with soft shading and smooth gradients, clean confident shapes, refined facial features, natural proportions, subtle rim light in aqua and violet. Looks like a top-tier tech brand illustration (Stripe, Linear, Notion editorial style), professional and warm, not cartoonish.
> Color palette: navy, aqua #00F5D4, sky blue #00BBF9, blue #3A86FF, violet #8338EC for light and shadow tints, coral #FF6B5B and warm yellow #FFC94A as small accents only.
> Fully transparent background, character only, no frame, no text, no logos.

## 3. Expressions

| File | When | Gesture and expression (for the prompt) |
|---|---|---|
| `<name>_ask.png` | The opening question | One hand raised near the chin, a questioning gesture. Curious, engaged, eyebrows slightly raised, lips parted as if asking |
| `<name>_pleased.png` | "Great, what do we do about that?" | A warm, genuine smile, relaxed brows, and the hand lowered to a small, confident open-palm gesture |

Two expressions per person is the norm. Add more only when the story really needs them, and always as edits of the asking image.

## 4. Cast

| Person | Role | Files | Prompt |
|---|---|---|---|
| **Maya** | Head of Sales (the asker) | `maya_ask.png` · `maya_pleased.png` · `maya_avatar.png` | [p_ask.txt](people/p_ask.txt) · [p_pleased.txt](people/p_pleased.txt) |

Keep one person per role across videos. When the Head of Sales appears again, reuse Maya's files rather than generating a new face.

## 5. Where the person appears

| Placement | Asset | Size (1920 × 1080) |
|---|---|---|
| Story scene (the asker on the gradient) | `<name>_<expr>.png`, bottom-anchored on the right | 680 × 1000 box, right 70 px, with a soft white radial glow behind it. Text stays to its left, at most 1020 px wide |
| Speech bubble | A white rounded bubble beside the head: coral **?** when asking, coral **✓** when pleased | 120 × 104 |
| Story header, speaker cards and reply chips | `<name>_avatar.png` in a circle with a white ring | 92 / 48 / 46 px |

## 6. Motion

This follows [animation.md](animation.md) for curves and timing.

- **Entrance:** rises 90 px out of the bottom edge on Glide over 1.6 beats, starting 0.2 beats into the scene.
- **Alive, not animated:** a slow breathing bob (±3 px) and a scale drift of about 0.6%, anchored at the bottom. Never warp, rotate or puppet the image.
- **Speech bubble:** pops in (Pop curve, 1.1 beats) once the first line of the question has appeared.
- **Changing expression** means a new scene with the other image. Never crossfade between expressions on the same shot.
