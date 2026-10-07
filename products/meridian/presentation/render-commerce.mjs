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
await page.goto(new URL('./commerce-intelligence.html', ROOT).href);
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
  const beats = [10, 18, 36, 52, 68, 83, 93, 103, 109, 116, 124, 128];
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
    '-vf', 'scale=480:270,tile=4x3', '-frames:v', '1', new URL('./out/commerce-intelligence-contact-sheet.jpg', ROOT).pathname,
  ]);
  console.log(new URL('./out/commerce-intelligence-contact-sheet.jpg', ROOT).pathname);
} else if (mode === 'video') {
  const output = new URL('./out/meridian-commerce-intelligence.mp4', ROOT).pathname;
  const music = new URL('./assets/meridian-instrumental-v2.mp3', ROOT).pathname;
  const voiceDir = new URL('./assets/voice-v2/', ROOT);
  const voices = [
    '01-narrator-opening.mp3', '02-maya-campaign.mp3', '03-narrator-choice.mp3',
    '04-maya-region.mp3', '05-narrator-context.mp3', '06-narrator-memory.mp3',
    '07-maya-action.mp3', '08-narrator-continuity.mp3', '09-maya-closing.mp3',
    '10-narrator-end.mp3',
  ].map(file => new URL(file, voiceDir).pathname);
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(START), '-t', String(DURATION), '-i', music,
    ...voices.flatMap(voice => ['-i', voice]),
    '-filter_complex', [
      `[1:a]volume='if(between(t,0,27.8)+between(t,28.8,34.9)+between(t,39.0,49.9)+between(t,50.9,58.7),0.15,0.50)':eval=frame,afade=t=in:d=0.75,afade=t=out:st=${DURATION - 2.5}:d=2.5[m]`,
      `[2:a]adelay=0|0,volume=1.0[v1]`,
      `[3:a]adelay=6950|6950,volume=1.10[v2]`,
      `[4:a]adelay=10000|10000,volume=1.0[v3]`,
      `[5:a]adelay=16700|16700,volume=1.10[v4]`,
      `[6:a]adelay=21100|21100,volume=1.0[v5]`,
      `[7:a]adelay=29000|29000,volume=1.0[v6]`,
      `[8:a]adelay=39150|39150,volume=1.10[v7]`,
      `[9:a]adelay=44000|44000,volume=1.0[v8]`,
      `[10:a]adelay=51100|51100,volume=1.10[v9]`,
      `[11:a]adelay=55000|55000,volume=1.0[v10]`,
      `[m][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10]amix=inputs=11:duration=longest:normalize=0,alimiter=limit=0.92[a]`,
    ].join(';'),
    '-map', '0:v', '-map', '[a]',
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
