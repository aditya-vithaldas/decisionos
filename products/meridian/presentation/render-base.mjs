import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const ROOT = new URL('.', import.meta.url);
const BP = 60 / 132;
const START = 0;
const BEATS = 132;
const FPS = 30;
const DURATION = BEATS * BP;
const mode = process.argv[2] || 'contact';

await fs.mkdir(new URL('./frames/', ROOT), { recursive: true });
await fs.mkdir(new URL('./out/', ROOT), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
await page.goto(new URL('./story.html', ROOT).href);
await page.evaluate(() => window.ready);

const draw = async t => {
  await page.evaluate(time => {
    window.render(time);
    return Promise.all([...document.images].map(image => image.decode().catch(() => null)));
  }, t);
};

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] });
  child.once('error', reject);
  child.once('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});

if (mode === 'contact') {
  const beats = [10, 18, 36, 52, 68, 83, 93, 112, 128];
  for (let i = 0; i < beats.length; i++) {
    await draw(beats[i] * BP);
    await page.screenshot({
      path: new URL(`./frames/contact_${String(i).padStart(2, '0')}_${beats[i]}.jpg`, ROOT).pathname,
      type: 'jpeg',
      quality: 92,
    });
  }
  await run('ffmpeg', [
    '-y', '-v', 'error', '-pattern_type', 'glob', '-i', new URL('./frames/contact_*.jpg', ROOT).pathname,
    '-vf', 'scale=640:360,tile=3x3', '-frames:v', '1', new URL('./out/contact-sheet.jpg', ROOT).pathname,
  ]);
  console.log(new URL('./out/contact-sheet.jpg', ROOT).pathname);
} else if (mode === 'video') {
  const output = new URL('./out/meridian-signal-thread.mp4', ROOT).pathname;
  const music = new URL('./assets/meridian-song-v1.mp3', ROOT).pathname;
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(START), '-t', String(DURATION), '-i', music,
    '-af', `afade=t=in:d=0.25,afade=t=out:st=${DURATION - 2.5}:d=2.5`,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const frames = Math.round(DURATION * FPS);
  for (let i = 0; i < frames; i++) {
    await draw(i / FPS);
    const image = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ffmpeg.stdin.write(image)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
  }
  ffmpeg.stdin.end();
  await new Promise((resolve, reject) => {
    ffmpeg.once('error', reject);
    ffmpeg.once('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
  console.log(output);
} else {
  throw new Error(`Unknown mode: ${mode}`);
}

await browser.close();
