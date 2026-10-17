// Synthesizes the music bed and sound effects for the final video, so we need no third-party audio.
//
//   npm run sounds     writes public/sfx/*.wav
//
// Everything is plain math (sine waves, filtered noise), so tweak freely: tempo, notes and volumes are below.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RATE = 44100;
const OUT = path.resolve("public/sfx");

// Seeded noise, so every run makes the same files.
let seed = 1;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

function wav(samples) {
  const peak = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 1e-9);
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(s * gain * 32767), 44 + i * 2));
  return buf;
}

function render(seconds, fn) {
  return Array.from({ length: Math.round(seconds * RATE) }, (_, i) => fn(i / RATE));
}

// One-pole low-pass over a signal, with a cutoff that can change over time.
function lowpass(samples, cutoffAt) {
  let y = 0;
  return samples.map((x, i) => {
    const a = 1 - Math.exp((-2 * Math.PI * cutoffAt(i / RATE)) / RATE);
    y += a * (x - y);
    return y;
  });
}

// --- Music: 8 bars at 112 BPM, loops seamlessly. Minor-key synth pop: kick, hats, bass, pads, arp.
const BPM = 112;
const BEAT = 60 / BPM;
const BARS = 8;
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];

function music() {
  const len = BARS * 4 * BEAT;
  const out = new Float64Array(Math.round(len * RATE));
  const add = (start, seconds, fn) => {
    const s0 = Math.round(start * RATE);
    for (let i = 0; i < seconds * RATE && s0 + i < out.length; i++) out[s0 + i] += fn(i / RATE);
  };
  for (let bar = 0; bar < BARS; bar++) {
    const chord = CHORDS[bar % 4];
    const t0 = bar * 4 * BEAT;
    // Pad: detuned saws softened with a low-pass later.
    add(t0, 4 * BEAT, (t) => {
      const e = Math.min(1, t / 0.4) * Math.min(1, (4 * BEAT - t) / 0.3);
      return chord.reduce((s, n) => {
        const f = midi(n);
        return s + 0.05 * e * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t + 1));
      }, 0);
    });
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      // Kick: pitch drops from 150 Hz to 45 Hz.
      add(t, 0.4, (x) => 0.9 * Math.exp(-x / 0.12) * Math.sin(2 * Math.PI * (45 * x + 105 * 0.04 * (1 - Math.exp(-x / 0.04)))));
      // Off-beat hat.
      add(t + BEAT / 2, 0.06, (x) => 0.12 * Math.exp(-x / 0.015) * noise());
      // Clap-ish snare on 2 and 4.
      if (b % 2 === 1) add(t, 0.2, (x) => 0.22 * Math.exp(-x / 0.05) * noise());
      // Bass: root an octave down, eighth notes.
      for (const off of [0, BEAT / 2]) {
        const f = midi(chord[0] - 24);
        add(t + off, BEAT / 2, (x) => 0.32 * env(x, 0.005, 0.12) * Math.tanh(2 * Math.sin(2 * Math.PI * f * x)));
      }
      // Arp: chord tones up an octave in sixteenths, only in the second half of the loop for lift.
      if (bar >= 4) {
        for (let k = 0; k < 4; k++) {
          const f = midi(chord[(b * 4 + k) % 3] + 12);
          add(t + (k * BEAT) / 4, BEAT / 4, (x) => 0.07 * env(x, 0.003, 0.05) * Math.sign(Math.sin(2 * Math.PI * f * x)));
        }
      }
    }
  }
  return lowpass(Array.from(out), () => 5000);
}

const SOUNDS = {
  music,
  // Airy swoosh for scene changes: band of noise sweeping up then down.
  whoosh: () =>
    lowpass(
      render(0.7, (t) => Math.sin((Math.PI * t) / 0.7) ** 2 * noise() * 0.8),
      (t) => 300 + 4000 * Math.sin((Math.PI * t) / 0.7),
    ),
  // Bubbly UI pop for captions and cards.
  pop: () => render(0.15, (t) => 0.6 * env(t, 0.002, 0.04) * Math.sin(2 * Math.PI * (900 * t - 2000 * t * t))),
  // Soft tick for bullet points.
  tick: () => render(0.05, (t) => 0.4 * Math.exp(-t / 0.006) * (noise() * 0.5 + Math.sin(2 * Math.PI * 2400 * t))),
  // Bell for the payoff moments.
  ding: () =>
    render(1.4, (t) => {
      const e = env(t, 0.003, 0.45);
      return e * (0.4 * Math.sin(2 * Math.PI * 1318 * t) + 0.2 * Math.sin(2 * Math.PI * 1318 * 2.76 * t) * Math.exp(-t / 0.15));
    }),
  // Two-second build into a big moment.
  riser: () =>
    lowpass(
      render(2, (t) => (t / 2) ** 2 * (0.5 * noise() + 0.5 * Math.sin(2 * Math.PI * (200 * t + 300 * t * t)))),
      (t) => 400 + 6000 * (t / 2) ** 2,
    ),
  // Deep cinematic hit.
  boom: () =>
    render(2, (t) => 0.9 * Math.exp(-t / 0.5) * Math.sin(2 * Math.PI * 42 * t) + 0.4 * Math.exp(-t / 0.03) * noise()),
};

await mkdir(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  await writeFile(path.join(OUT, `${name}.wav`), wav(make()));
  console.log(`public/sfx/${name}.wav`);
}
