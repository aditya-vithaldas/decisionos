import fs from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required');

const outDir = new URL('./assets/voice-v2/', import.meta.url);
await fs.mkdir(outDir, { recursive: true });

// Brian is a clear, internationally legible English narrator. Sarah remains
// distinct as Maya without pushing either performance into an ad-like read.
const voices = {
  narrator: { name: 'Brian', id: 'nPczCjzI2devNBz1zQrb' },
  maya: { name: 'Sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
};

const takes = [
  { file: '01-narrator-opening.mp3', voice: 'narrator', direction: '[calm] [assured]', text: 'Commerce teams rarely suffer from too little data. The harder problem is knowing which signal deserves attention.' },
  { file: '02-maya-campaign.mp3', voice: 'maya', direction: '[mildly frustrated] [curious]', text: 'Did Halloween finish differently from plan?' },
  { file: '03-narrator-choice.mp3', voice: 'narrator', direction: '[thoughtful] [quietly confident]', text: 'Meridian notices the change before the review begins, then gives the team three clear paths to investigate.' },
  { file: '04-maya-region.mp3', voice: 'maya', direction: '[curious] [decisive]', text: 'Start with regions. Which market explains most of the drop?' },
  { file: '05-narrator-context.mp3', voice: 'narrator', direction: '[measured] [precise]', text: 'Every follow-up keeps the original evidence attached: region, category, and a like-for-like calendar check.' },
  { file: '06-narrator-memory.mp3', voice: 'narrator', direction: '[warm] [quietly confident]', text: 'When Maya recognizes an earlier pattern, Meridian reopens it without mixing the evidence.' },
  { file: '07-maya-action.mp3', voice: 'maya', direction: '[concerned] [decisive]', text: 'We saw this before. Pull in that case—and watch Western Europe.' },
  { file: '08-narrator-continuity.mp3', voice: 'narrator', direction: '[warm] [purposeful]', text: 'The analyst joins the call, continues in Slack, and keeps working after the meeting ends.' },
  { file: '09-maya-closing.mp3', voice: 'maya', direction: '[genuinely pleased] [lightly relieved]', text: 'Thanks, Meridian. You did good.' },
  { file: '10-narrator-end.mp3', voice: 'narrator', direction: '[assured] [concise]', text: 'Meridian. Commerce intelligence for what comes next.' },
];

const model = 'eleven_v3';
const settings = {
  stability: 0.46,
  similarity_boost: 0.76,
  style: 0.24,
  use_speaker_boost: true,
};

for (const take of takes) {
  const voice = voices[take.voice];
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        model_id: model,
        text: `${take.direction} ${take.text}`,
        voice_settings: settings,
      }),
    },
  );
  if (!response.ok) throw new Error(`${take.file}: ${response.status} ${await response.text()}`);
  await fs.writeFile(new URL(take.file, outDir), Buffer.from(await response.arrayBuffer()));
  process.stdout.write(`${take.file}\n`);
}

await fs.writeFile(new URL('manifest.json', outDir), JSON.stringify({
  provider: 'ElevenLabs',
  model,
  voices,
  settings,
  delivery: 'Neutral international English; natural, restrained emotion; conversational rather than promotional.',
  takes,
}, null, 2));

console.log(path.resolve(new URL('.', outDir).pathname));
