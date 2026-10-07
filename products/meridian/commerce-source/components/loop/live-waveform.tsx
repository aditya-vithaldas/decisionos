'use client';
import { useEffect, useRef } from 'react';

/** Visualises the already-authorised mic stream. Never requests microphone access. */
export function LiveWaveform({
  stream,
  active,
  speaking,
}: {
  stream: MediaStream | null;
  active: boolean;
  speaking: boolean;
}) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!active || !stream || !host.current) return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    let context: AudioContext;
    try {
      context = new AudioContextClass();
    } catch {
      return;
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.76;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    void context.resume().catch(() => {});
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const bars = Array.from(host.current.children) as HTMLElement[];
    let frame = 0;
    let lastPaint = 0;
    const draw = (now: number) => {
      if (now - lastPaint > 45) {
        analyser.getByteFrequencyData(samples);
        bars.forEach((bar, i) => {
          const energy = samples[2 + Math.floor(i * 1.4)] / 255;
          bar.style.setProperty('--bar-size', `${3 + energy * 27}px`);
        });
        lastPaint = now;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close().catch(() => {});
      bars.forEach((bar) => bar.style.removeProperty('--bar-size'));
    };
  }, [stream, active]);
  return (
    <span
      ref={host}
      className={`live-waveform ${active ? 'is-active' : ''} ${speaking ? 'is-speaking' : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: 17 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
