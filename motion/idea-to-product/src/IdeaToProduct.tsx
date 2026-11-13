import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';

const C = {
  ink: '#1F2125',
  mute: '#9AA0A8',
  wire: '#C8CDD4',
  hair: '#E4E7EC',
  blue: '#2F5BEA',
  pale: '#EAF1FF',
  paleMid: '#CFDDFB',
  paper: '#FFFFFF',
};
const SANS = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const EASE = Easing.bezier(0.45, 0, 0.2, 1);

// 0..1 eased progress between two frames
const p = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {...CLAMP, easing: EASE});

// One shape travels through every stage: note -> wireframe -> interface -> product -> note
const KEYS = [0, 130, 200, 248, 296, 368, 408, 506, 530];
const kf = (f: number, v: number[]) => interpolate(f, KEYS, v, {...CLAMP, easing: EASE});

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const ln = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}`;

type Part = [string, string];
const ROWS = ['Draft onboarding brief', 'Review homepage copy', 'Ship client portal'];
const WIRE_W = [190, 150, 165];
const CHECK = [336, 424, 456];
const CODE: {indent: number; parts: Part[]}[] = [
  {indent: 0, parts: [['const ', C.blue], ['tasks = useTasks();', C.ink]]},
  {indent: 0, parts: [['<List ', C.blue], ['items={tasks}>', C.ink]]},
  {indent: 16, parts: [['<Check ', C.blue], ['onDone={save} />', C.ink]]},
  {indent: 0, parts: [['</List>', C.blue]]},
];
const HEADLINES = [
  ['Start with', 'an idea.'],
  ['Make the', 'experience clear.'],
  ['Bring it', 'to life.'],
  ['Build something', 'people use.'],
];
const STAGES = ['Idea', 'Design', 'Code', 'In use'];
const MARKS = [
  'M912 352Q922 338 938 342',
  'M1040 350C1048 344 1054 354 1062 348S1074 352 1080 346',
  'M1028 456Q1042 462 1054 452',
];
const NOTE_1 = "Clients can't see";
const NOTE_2 = "what's due this week.";
const ARROW = 'M0 0L0 18L4.8 13.6L8.2 21L11 19.8L7.6 12.6L13.6 12.6Z';

const Draw: React.FC<{d: string; t: number; stroke?: string; w?: number; o?: number}> = ({
  d,
  t,
  stroke = C.ink,
  w = 1.5,
  o = 1,
}) => (
  <path
    d={d}
    pathLength={1}
    strokeDasharray="1 1"
    strokeDashoffset={1 - t}
    fill="none"
    stroke={stroke}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    filter="url(#rough)"
    opacity={t > 0.002 ? o : 0}
  />
);

const Person: React.FC<{cx: number; cy: number; r: number; bg: string; fg: string; o: number}> = ({
  cx,
  cy,
  r,
  bg,
  fg,
  o,
}) => (
  <g opacity={o}>
    <circle cx={cx} cy={cy} r={r} fill={bg} stroke={C.paper} strokeWidth={2} />
    <circle cx={cx} cy={cy - r * 0.22} r={r * 0.3} fill={fg} />
    <path
      d={`M${cx - r * 0.55} ${cy + r * 0.62}Q${cx} ${cy + r * 0.05} ${cx + r * 0.55} ${cy + r * 0.62}`}
      stroke={fg}
      strokeWidth={1.4}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

const typed = (parts: Part[], n: number) => {
  let left = n;
  return parts.map(([s, c], i) => {
    const shown = s.slice(0, Math.max(0, left));
    left -= s.length;
    return (
      <tspan key={i} fill={c}>
        {shown}
      </tspan>
    );
  });
};

export const IdeaToProduct: React.FC = () => {
  const f = useCurrentFrame();
  const early = f < 300;

  // Shared frame geometry
  const fx = kf(f, [860, 860, 760, 760, 900, 900, 740, 740, 860]);
  const fy = kf(f, [320, 320, 240, 240, 240, 240, 230, 230, 320]);
  const fw = kf(f, [240, 240, 440, 440, 420, 420, 520, 520, 240]);
  const fh = kf(f, [160, 160, 330, 330, 330, 330, 340, 340, 160]);
  const frameDraw = p(f, 46, 86);
  const frameO = 1 - p(f, 520, 536);
  const contentO = 1 - p(f, 502, 516);

  // Spark: travels to become the note's pin, returns for the loop
  const toPin = early ? p(f, 36, 66) : 0;
  const sx = interpolate(toPin, [0, 1], [980, fx + 22]);
  const sy = interpolate(toPin, [0, 1], [400, fy + 24]);
  const rs = early ? 1 - p(f, 30, 60) : p(f, 512, 538);
  const r0 = 12 + 3 * (early ? p(f, 8, 30) * (1 - toPin) : 0);
  const dotO = early ? 1 - p(f, 126, 142) : p(f, 514, 534);
  const dotR = interpolate(toPin, [0, 1], [5, 4]);
  const rays = Array.from({length: 8}, (_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const len = (i % 2 ? 7 : 14) * rs;
    return `M${sx + Math.cos(a) * r0} ${sy + Math.sin(a) * r0}L${sx + Math.cos(a) * (r0 + len)} ${sy + Math.sin(a) * (r0 + len)}`;
  }).join('');

  const thO = early ? 1 - p(f, 26, 50) : p(f, 512, 538);
  const drift = early ? p(f, 0, 50) : 1 - p(f, 512, 538);

  // Note
  const noteOut = p(f, 124, 140);
  const noteO = early ? p(f, 80, 94) * (1 - noteOut) : 0;
  const typedN = Math.floor(interpolate(f, [90, 116], [0, NOTE_1.length + NOTE_2.length], CLAMP));

  // Wire -> real conversions, driven by the code lines
  const lineStart = (i: number) => 262 + i * 16;
  const hlO = (i: number) => p(f, lineStart(i), lineStart(i) + 4) * (1 - p(f, lineStart(i) + 20, lineStart(i) + 30));
  const titleReal = p(f, 270, 282);
  const labelReal = p(f, 286, 298);
  const boxReal = p(f, 302, 314);
  const trackReal = p(f, 318, 330);
  const boxStroke = interpolateColors(boxReal, [0, 1], [C.mute, C.blue]);
  const trackStroke = interpolateColors(trackReal, [0, 1], [C.wire, C.hair]);

  const checks = CHECK.map((s) => p(f, s, s + 12));
  const sum = checks.reduce((a, b) => a + b, 0);
  const done = checks.filter((c) => c > 0.99).length;
  const ty = fy + fh - 40;

  const highlights = [
    [fx + 16, fy + 46, 190, 34],
    [fx + 50, fy + 92, Math.min(250, fw - 110), 132],
    [fx + 20, fy + 92, 32, 132],
    [fx + 16, fy + fh - 76, fw - 32, 52],
  ];

  // Code pane
  const paneIn = p(f, 244, 262);
  const paneOut = p(f, 366, 384);
  const px = 610 + (1 - paneIn) * 16 - paneOut * 16;
  const py = 280;

  // Pointer: one meaningful click on the last open task
  const pm = p(f, 430, 452);
  const ptx = interpolate(pm, [0, 1], [fx + fw - 40, fx + 37]);
  const pty = interpolate(pm, [0, 1], [fy + fh + 30, fy + 202]) - Math.sin(pm * Math.PI) * 24;
  const press = interpolate(f, [452, 455, 460], [0, 1, 0], CLAMP);
  const pO = p(f, 426, 436) * (1 - p(f, 478, 492));
  const rip = interpolate(f, [454, 474], [0, 1], CLAMP);

  // Headlines and stage motif
  const hOp = [
    early ? 1 - p(f, 104, 120) : p(f, 516, 536),
    interpolate(f, [124, 140, 226, 240], [0, 1, 1, 0], CLAMP),
    interpolate(f, [244, 260, 346, 360], [0, 1, 1, 0], CLAMP),
    interpolate(f, [364, 380, 500, 514], [0, 1, 1, 0], CLAMP),
  ];
  const prog = interpolate(f, [0, 108, 128, 228, 248, 348, 368, 502, 530], [0, 0, 1, 1, 2, 2, 3, 3, 0], {
    ...CLAMP,
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.paper, fontFamily: SANS}}>
      <svg width={1440} height={810} viewBox="0 0 1440 810" style={{position: 'absolute', inset: 0}} fontFamily={SANS}>
        <defs>
          <filter id="rough" filterUnits="userSpaceOnUse" x={0} y={0} width={1440} height={810}>
            <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={2} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Thought marks */}
        <g opacity={thO} transform={`translate(980 400) scale(${1 + drift * 0.08}) translate(-980 -400)`}>
          {MARKS.map((d) => (
            <Draw key={d} d={d} t={1} w={1.4} />
          ))}
          <circle cx={1062} cy={412} r={2.2} fill={C.ink} />
          <circle cx={944} cy={326} r={2} fill={C.blue} />
          <circle cx={1004} cy={470} r={1.8} fill={C.mute} />
        </g>

        {/* The continuous frame */}
        <g opacity={frameO}>
          <path d={rr(fx, fy, fw, fh, 12)} fill={C.paper} opacity={frameDraw} />
          <Draw d={rr(fx, fy, fw, fh, 12)} t={frameDraw} w={1.5} />

          {/* Note */}
          <g opacity={noteO}>
            <text x={fx + 36} y={fy + 29} fontSize={11} fontWeight={600} letterSpacing={1.4} fill={C.blue}>
              CUSTOMER NOTE
            </text>
            <text x={fx + 22} y={fy + 76} fontSize={18} fill={C.ink}>
              {NOTE_1.slice(0, Math.min(typedN, NOTE_1.length))}
            </text>
            <text x={fx + 22} y={fy + 102} fontSize={18} fill={C.ink}>
              {NOTE_2.slice(0, Math.max(0, typedN - NOTE_1.length))}
            </text>
          </g>
          <Draw d={ln(fx + 22, fy + 114, fx + 190, fy + 113)} t={early ? p(f, 116, 128) : 0} stroke={C.blue} w={1.6} o={1 - noteOut} />

          {/* Wireframe that becomes the product */}
          <g opacity={contentO}>
            {highlights.map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx={6} fill={C.pale} opacity={hlO(i)} />
            ))}

            <Draw d={ln(fx, fy + 32, fx + fw, fy + 32)} t={p(f, 150, 176)} w={1} o={0.55} />
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={fx + 18 + i * 13}
                cy={fy + 16}
                r={3.2}
                fill="none"
                stroke={C.ink}
                strokeWidth={1}
                opacity={p(f, 160 + i * 4, 174 + i * 4) * 0.6}
              />
            ))}

            <Draw d={ln(fx + 28, fy + 64, fx + 168, fy + 64)} t={p(f, 166, 188)} stroke={C.wire} w={7} o={1 - titleReal} />
            <text x={fx + 28} y={fy + 71} fontSize={19} fontWeight={600} fill={C.ink} opacity={titleReal}>
              This week
            </text>

            {ROWS.map((label, i) => {
              const y = fy + 100 + i * 46;
              const s = 178 + i * 10;
              return (
                <g key={label}>
                  <Draw d={rr(fx + 28, y, 16, 16, 4)} t={p(f, s, s + 16)} stroke={boxStroke} />
                  <rect x={fx + 28} y={y} width={16} height={16} rx={4} fill={C.blue} opacity={checks[i]} />
                  <Draw
                    d={`M${fx + 32} ${y + 8.5}L${fx + 35} ${y + 11.5}L${fx + 40.5} ${y + 5}`}
                    t={p(f, CHECK[i] + 3, CHECK[i] + 12)}
                    stroke={C.paper}
                    w={2}
                  />
                  <Draw d={ln(fx + 56, y + 8, fx + 56 + WIRE_W[i], y + 8)} t={p(f, s + 4, s + 24)} stroke={C.wire} w={5} o={1 - labelReal} />
                  <text x={fx + 56} y={y + 13.5} fontSize={15} fill={C.ink} opacity={labelReal * (1 - 0.5 * checks[i])}>
                    {label}
                  </text>
                </g>
              );
            })}

            <Draw d={ln(fx + 28, ty, fx + fw - 28, ty)} t={p(f, 206, 228)} stroke={trackStroke} w={4} />
            {sum > 0.01 && (
              <path
                d={ln(fx + 28, ty, fx + 28 + ((fw - 56) * sum) / 3, ty)}
                stroke={C.blue}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={trackReal}
              />
            )}
            <Draw d={ln(fx + 28, fy + fh - 62, fx + 98, fy + fh - 62)} t={p(f, 212, 230)} stroke={C.wire} w={4} o={1 - trackReal} />
            <text x={fx + 28} y={fy + fh - 58} fontSize={13} fill={C.mute} opacity={p(f, 348, 360) * (1 - p(f, 466, 476))}>
              {`${done} of 3 done`}
            </text>
            <g opacity={p(f, 470, 482)}>
              <circle cx={fx + 32} cy={fy + fh - 62} r={3} fill={C.blue} />
              <text x={fx + 42} y={fy + fh - 58} fontSize={13} fill={C.ink}>
                All done for this week
              </text>
            </g>

            {/* Design annotation: one clear next step */}
            <Draw
              d={`M${fx + 42} ${fy + 80}C${fx + 65} ${fy + 80} ${fx + 65} ${fy + 228} ${fx + 36} ${fy + 228}C${fx + 6} ${fy + 228} ${fx + 7} ${fy + 76} ${fx + 48} ${fy + 86}`}
              t={p(f, 214, 238)}
              stroke={C.blue}
              w={1.5}
              o={1 - p(f, 244, 258)}
            />

            {/* People using it */}
            <Person cx={fx + fw - 48} cy={fy + 16} r={9} bg={C.blue} fg={C.paper} o={p(f, 388, 404)} />
            <Person cx={fx + fw - 32} cy={fy + 16} r={9} bg={C.paleMid} fg={C.blue} o={p(f, 392, 408)} />
            <Person cx={fx + fw - 40} cy={fy + 154} r={9} bg={C.paleMid} fg={C.blue} o={p(f, 408, 420)} />

            {f >= 454 && (
              <circle cx={fx + 36} cy={fy + 200} r={6 + rip * 16} fill="none" stroke={C.blue} strokeWidth={1.2} opacity={(1 - rip) * 0.6} />
            )}
          </g>
        </g>

        {/* Code pane */}
        <g opacity={paneIn * (1 - paneOut)}>
          <path d={rr(px, py, 260, 170, 10)} fill="#FAFBFD" stroke={C.ink} strokeWidth={1.2} />
          <text x={px + 18} y={py + 22} fontSize={11} fill={C.mute} fontFamily={MONO}>
            tasks.tsx
          </text>
          <path d={ln(px, py + 34, px + 260, py + 34)} stroke={C.hair} strokeWidth={1} />
          {CODE.map((line, i) => {
            const s = lineStart(i);
            const total = line.parts.reduce((a, [t]) => a + t.length, 0);
            const n = Math.floor(interpolate(f, [s, s + 14], [0, total], CLAMP));
            const by = py + 62 + i * 28;
            return (
              <g key={i}>
                <rect x={px + 10} y={by - 17} width={240} height={24} rx={4} fill={C.pale} opacity={hlO(i)} />
                <text x={px + 18 + line.indent} y={by} fontFamily={MONO} fontSize={13.5} style={{whiteSpace: 'pre'}}>
                  {typed(line.parts, n)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Pointer */}
        <g opacity={pO} transform={`translate(${ptx} ${pty}) scale(${1 - press * 0.12})`}>
          <path d={ARROW} fill={C.ink} stroke={C.paper} strokeWidth={1.2} strokeLinejoin="round" />
        </g>

        {/* Spark */}
        <path d={rays} stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" fill="none" filter="url(#rough)" opacity={rs > 0.02 ? 1 : 0} />
        <circle cx={sx} cy={sy} r={dotR} fill={C.blue} opacity={dotO} />
      </svg>

      {/* Wordmark */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 15,
          fontWeight: 600,
          color: C.ink,
          letterSpacing: '0.01em',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M1 8H15M8 1V15" stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" />
          <circle cx={8} cy={8} r={2.4} fill={C.blue} />
        </svg>
        Decision Axis
      </div>

      {/* Headlines */}
      <div style={{position: 'absolute', left: 120, top: 300}}>
        <div style={{width: 24, height: 2, background: C.blue, marginBottom: 28}} />
        <div style={{position: 'relative', height: 120}}>
          {HEADLINES.map((h, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                opacity: hOp[i],
                transform: `translateY(${(1 - hOp[i]) * 10}px)`,
                fontSize: 50,
                fontWeight: 500,
                letterSpacing: '-0.025em',
                lineHeight: 1.08,
                color: C.ink,
                whiteSpace: 'nowrap',
              }}
            >
              {h[0]}
              <br />
              {h[1]}
            </div>
          ))}
        </div>
      </div>

      {/* Stage progress */}
      <div style={{position: 'absolute', left: 120, top: 700, width: 380, height: 30}}>
        {STAGES.map((s, i) => (
          <div
            key={s}
            style={{
              position: 'absolute',
              left: i * 112,
              top: 0,
              fontSize: 13,
              color: C.ink,
              letterSpacing: '0.02em',
              opacity: 0.36 + 0.64 * interpolate(Math.abs(prog - i), [0, 1], [1, 0], CLAMP),
            }}
          >
            {s}
          </div>
        ))}
        <div style={{position: 'absolute', left: 0, top: 26, width: 3 * 112 + 44, height: 1, background: C.hair}} />
        <div style={{position: 'absolute', left: prog * 112, top: 25.5, width: 28, height: 2, background: C.blue}} />
      </div>
    </AbsoluteFill>
  );
};
