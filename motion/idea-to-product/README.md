# Idea to product

An original, silent Decision Axis hero film, designed with Claude Code and rendered with Remotion. The four stages show an idea becoming a sketch, working code and a product that people use. All example tasks and people are fictional.

The homepage autoplays a muted loop without player chrome, with an accessible pause/play button. It starts paused for visitors who prefer reduced motion and pauses outside the viewport or in a hidden tab.

## Render

Use Node.js and npm from this directory:

```sh
npm ci
npm run render
npm run poster
```

The composition is 18 seconds at 30 fps, 1440 × 810. Copy the rendered MP4 and poster from `out/` into the root `assets/` directory. Remotion's browser helper may download its official Chrome Headless Shell on the first render. Source is frame-driven and uses no network assets or audio.

If Chrome Headless Shell stalls loading the root on macOS, use the installed Google Chrome renderer (in a separate temporary profile):

```sh
npm run render -- --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npm run poster -- --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

The published film was rendered this way.

## Web optimisation

The served clip is 800 × 450 at 24 fps (18 seconds), with no audio, encoded for immediate playback:

```sh
ffmpeg -i out/idea-to-product.mp4 -vf 'crop=800:450:580:190,fps=24' -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -an -movflags +faststart ../../assets/idea-to-product.mp4
```

The website shows the conceptual objects without the film’s duplicate wordmark and headlines. Extract a matching poster with:

```sh
ffmpeg -ss 14 -i out/idea-to-product.mp4 -vf 'crop=800:450:580:190' -frames:v 1 ../../assets/idea-to-product-poster.png
```
