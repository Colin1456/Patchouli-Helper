// 纯代码合成宣传片配乐：120 BPM，A 小调 Am–F–C–G，16 小节 = 32 秒，
// 与画面对齐（0/3.33/9.93/15.6/20.93/26.53s 是场景切换点，那里加 whoosh）。
//
//   node scripts/make-music.mjs        → public/music.wav
//
// 不采样、不联网：所有声音都是正弦/锯齿/方波 + 噪声 + 一阶滤波算出来的。

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5s
const BAR = BEAT * 4; // 2s
const BARS = 36; // 72 秒，与 72s 版宣传片同长
const DURATION = BAR * BARS; // 72s
const N = Math.round(SR * DURATION);
const CUTS = [4.2, 10.7, 21.3, 29.8, 37.0, 43.0, 49.7, 55.7, 61.4, 68.3]; // 十一个场景的切换点

const left = new Float32Array(N);
const right = new Float32Array(N);

/* ------------------------------------------------------------------ 基础 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 极简伪随机（保证每次生成的文件完全一致）
let seed = 20261115;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

function mix(i, value, pan = 0) {
  if (i < 0 || i >= N) return;
  const l = Math.cos(((pan + 1) / 2) * (Math.PI / 2));
  const r = Math.sin(((pan + 1) / 2) * (Math.PI / 2));
  left[i] += value * l;
  right[i] += value * r;
}

/** 一阶低通的状态 */
const lowpass = (cutoff, sr = SR) => {
  let y = 0;
  return (x) => {
    const a = clamp(1 - Math.exp((-TAU * cutoff) / sr), 0.0001, 1);
    y += a * (x - y);
    return y;
  };
};

/** 一阶高通（用低通做差） */
const highpass = (cutoff) => {
  const lp = lowpass(cutoff);
  return (x) => x - lp(x);
};

/* ---------------------------------------------------------------- 音色 */

function kick(at, gain = 0.9) {
  const len = Math.round(SR * 0.42);
  const start = Math.round(at * SR);
  let phase = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const f = 46 + 108 * Math.exp(-t * 26);
    phase += (TAU * f) / SR;
    const env = Math.exp(-t * 7.5);
    const click = Math.exp(-t * 240) * 0.35;
    mix(start + n, (Math.sin(phase) * env + click) * gain);
  }
}

function snare(at, gain = 0.3) {
  const len = Math.round(SR * 0.22);
  const start = Math.round(at * SR);
  const hp = highpass(1400);
  let phase = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const noise = rand() * 2 - 1;
    phase += (TAU * 185) / SR;
    const env = Math.exp(-t * 26);
    mix(start + n, (hp(noise) * 0.9 + Math.sin(phase) * 0.35) * env * gain, 0.1);
  }
}

function hat(at, gain = 0.12, pan = 0.25) {
  const len = Math.round(SR * 0.07);
  const start = Math.round(at * SR);
  const hp = highpass(7200);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const env = Math.exp(-t * 78);
    mix(start + n, hp(rand() * 2 - 1) * env * gain, pan);
  }
}

function bassNote(at, note, dur, gain = 0.5) {
  const len = Math.round(SR * dur);
  const start = Math.round(at * SR);
  const f = midi(note);
  let phase = 0;
  const lp = lowpass(420);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    phase += f / SR;
    const saw = (phase % 1) * 2 - 1;
    const sq = Math.sin(TAU * f * t) > 0 ? 0.5 : -0.5;
    const env = Math.min(1, t * 90) * Math.exp(-t * 2.2) + 0.12 * Math.exp(-t * 0.7);
    const body = lp(saw * 0.8 + sq * 0.4);
    mix(start + n, body * env * gain);
  }
}

function pluck(at, note, dur = 0.35, gain = 0.22, pan = 0) {
  const len = Math.round(SR * dur);
  const start = Math.round(at * SR);
  const f = midi(note);
  let phase = 0;
  let phase2 = 0;
  const lp = lowpass(3800);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    phase += f / SR;
    phase2 += (f * 2.002) / SR;
    const tri = Math.abs((phase % 1) * 4 - 2) - 1;
    const tri2 = Math.abs((phase2 % 1) * 4 - 2) - 1;
    const env = Math.min(1, t * 320) * Math.exp(-t * 9);
    const value = lp(tri * 0.75 + tri2 * 0.25) * env * gain;
    mix(start + n, value, pan);
    // 对侧 180ms 的回声：廉价但有效的声音宽度
    mix(start + n + Math.round(SR * 0.18), value * 0.34, -pan);
  }
}

function pad(at, notes, dur, gain = 0.12) {
  const len = Math.round(SR * dur);
  const start = Math.round(at * SR);
  // 三个失谐声部分别放到左中右，声场才不是「双层单声道」
  const voices = [
    { detune: -0.09, pan: -1 },
    { detune: 0, pan: 0 },
    { detune: 0.1, pan: 1 },
  ];
  for (const voice of voices) {
    const lp = lowpass(1500);
    const phases = notes.map(() => rand());
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      let sum = 0;
      notes.forEach((note, k) => {
        const f = midi(note) * (1 + voice.detune / 12);
        phases[k] += f / SR;
        sum += (phases[k] % 1) * 2 - 1;
      });
      sum /= notes.length;
      const attack = Math.min(1, t / 0.45);
      const release = Math.min(1, (dur - t) / 0.5);
      mix(start + n, lp(sum) * attack * release * (gain / voices.length), voice.pan);
    }
  }
}

function bell(at, note, gain = 0.26) {
  const len = Math.round(SR * 2.2);
  const start = Math.round(at * SR);
  const f = midi(note);
  const partials = [
    [1, 1],
    [2.01, 0.5],
    [3.02, 0.28],
    [5.4, 0.12],
  ];
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    let v = 0;
    for (const [ratio, amp] of partials) {
      v += Math.sin(TAU * f * ratio * t) * amp * Math.exp(-t * (1.6 + ratio * 0.7));
    }
    mix(start + n, v * gain * 0.5, Math.sin(t * 2) * 0.2);
  }
}

/** 场景切换的 whoosh：带通噪声从低扫到高，峰值落在切点上 */
function whoosh(at, gain = 0.18) {
  const len = Math.round(SR * 0.9);
  const start = Math.round(at * SR - Math.round(len * 0.62));
  const lp = lowpass(700);
  const hp = highpass(220);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const swell = Math.pow(Math.sin(Math.PI * clamp(t / 0.9, 0, 1)), 2.2);
    const noise = rand() * 2 - 1;
    mix(start + n, hp(lp(noise)) * swell * gain, Math.sin(t * 9) * 0.35);
  }
}


/** 高频空气层：左右声道噪声互相独立并缓慢起伏，只贡献声场宽度 */
function airLayer(gain = 0.035) {
  const hpL = highpass(6200);
  const hpR = highpass(6200);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lfoL = 0.55 + 0.45 * Math.sin(TAU * 0.07 * t);
    const lfoR = 0.55 + 0.45 * Math.sin(TAU * 0.07 * t + Math.PI * 0.75);
    const fade = Math.min(1, t / 1.2) * Math.min(1, (DURATION - t) / 1.6);
    left[i] += hpL(rand() * 2 - 1) * lfoL * gain * fade;
    right[i] += hpR(rand() * 2 - 1) * lfoR * gain * fade;
  }
}

/* ---------------------------------------------------------------- 编排 */

// Am – F – C – G（A 小调 i–VI–III–VII）
const CHORDS = [
  { root: 45, tones: [57, 60, 64, 69] }, // Am
  { root: 41, tones: [53, 57, 60, 65] }, // F
  { root: 36, tones: [52, 55, 60, 64] }, // C
  { root: 43, tones: [55, 59, 62, 67] }, // G
];

const barStart = (bar) => bar * BAR;

/** 按分镜分段：每段配器不同，切换点落在场景边界附近 */
const sectionOf = (bar) =>
  bar < 2 ? 'intro' : bar < 6 ? 'tension' : bar < 10 ? 'groove' : bar < 14 ? 'main'
    : bar < 18 ? 'light' : bar < 25 ? 'warm' : bar < 28 ? 'build' : bar < 34 ? 'peak' : 'outro';

/** 段落起点（用于 inSection 计算） */
const SECTION_START = { intro: 0, tension: 2, groove: 6, main: 10, light: 14, warm: 18, build: 25, peak: 28, outro: 34 };

const SECTION_PAD = {
  intro: 0.34, tension: 0.2, groove: 0.12, main: 0.1, light: 0.09, warm: 0.11, build: 0.1, peak: 0.1, outro: 0.2,
};

for (let bar = 0; bar < BARS; bar++) {
  const t0 = barStart(bar);
  const chord = CHORDS[bar % 4];
  const section = sectionOf(bar);
  const inSection = bar - SECTION_START[section];

  pad(t0, chord.tones, BAR * 0.98, SECTION_PAD[section]);

  if (section === 'outro') continue;

  // ---- 鼓 ----
  if (section === 'intro') {
    // 只有 pad，留白
  } else if (section === 'tension') {
    // 心跳感：只在第 1 拍，后两小节开始加密
    kick(t0, 0.75);
    if (inSection >= 2) kick(t0 + BEAT * 2, 0.55);
    for (let i = 0; i < 16; i++) hat(t0 + (BAR / 16) * i, 0.035, i % 2 ? 0.5 : -0.5);
    if (inSection >= 3) snare(t0 + BEAT * 3, 0.16);
  } else if (section === 'light') {
    kick(t0, 0.8);
    kick(t0 + BEAT * 2, 0.7);
    for (let i = 0; i < 8; i++) hat(t0 + BEAT * 0.5 * i, i % 2 ? 0.06 : 0.09, i % 2 ? 0.4 : -0.4);
  } else {
    kick(t0, 0.95);
    kick(t0 + BEAT * 2, 0.85);
    if (section !== 'groove' || inSection >= 1) {
      kick(t0 + BEAT * 2.5, 0.6);
      snare(t0 + BEAT, 0.26);
      snare(t0 + BEAT * 3, 0.26);
    }
    const hats = section === 'build' && inSection >= 2 ? 16 : 8;
    for (let i = 0; i < hats; i++) {
      hat(t0 + (BAR / hats) * i, i % 2 ? 0.065 : 0.1, i % 2 ? 0.45 : -0.45);
    }
  }

  // ---- 贝斯 ----
  if (section === 'intro') {
    bassNote(t0, chord.root + 12, BAR, 0.28);
  } else if (section === 'tension') {
    bassNote(t0, chord.root, BAR * 0.95, 0.34);
  } else if (section === 'light') {
    bassNote(t0, chord.root, BEAT * 3.4, 0.4);
  } else if (section === 'build' || section === 'peak') {
    for (let i = 0; i < 8; i++) bassNote(t0 + BEAT * 0.5 * i, chord.root, BEAT * 0.45, 0.5);
  } else {
    for (const p of [0, 1.5, 2, 3.5]) bassNote(t0 + BEAT * p, chord.root, BEAT * 0.9, 0.5);
  }

  // ---- 琶音 / 旋律 ----
  if (section === 'intro') {
    pluck(t0 + BEAT * 1.5, chord.tones[2], 0.5, 0.24, -0.5);
    pluck(t0 + BEAT * 3, chord.tones[3], 0.7, 0.2, 0.5);
    bell(t0 + BEAT * 2, chord.tones[3] + 12, 0.12);
  } else if (section === 'tension') {
    pluck(t0 + BEAT * 2.5, chord.tones[1], 0.45, 0.16, 0.6);
    pluck(t0 + BEAT * 3.5, chord.tones[2], 0.4, 0.13, -0.6);
  } else if (section === 'groove' || section === 'light' || section === 'warm') {
    const steps = section === 'groove' && inSection < 2 ? 4 : 8;
    for (let i = 0; i < steps; i++) {
      pluck(t0 + (BAR / steps) * i, chord.tones[i % 4], 0.32, section === 'light' ? 0.2 : 0.14, i % 2 ? 0.9 : -0.9);
    }
    if (section === 'warm') bell(t0 + BEAT * 2.5, chord.tones[3] + 12, 0.16);
  } else if (section === 'main' || section === 'build' || section === 'peak') {
    const steps = section === 'main' && inSection < 3 ? 8 : 16;
    for (let i = 0; i < steps; i++) {
      const octave = section !== 'main' && i % 8 > 5 ? 12 : 0;
      pluck(t0 + (BAR / steps) * i, chord.tones[i % 4] + octave, 0.3, 0.15, i % 2 ? 1 : -1);
    }
    if (section === 'peak') {
      const melody = [[0, 76], [1, 72], [1.5, 74], [2.5, 76], [3, 79]];
      for (const [beat, note] of melody) bell(t0 + BEAT * beat, note, 0.18);
    }
  }
}

// 结尾：主和弦长音 + 铃声
pad(BAR * 34, [57, 60, 64, 69, 72], BAR * 2, 0.24);
bell(BAR * 34.2, 81, 0.3);
bell(BAR * 34.6, 76, 0.18);

/* ------------------------------------------------------------ 母带处理 */

// 软限幅 + 全局淡入淡出
const fadeIn = Math.round(SR * 0.6);
const fadeOut = Math.round(SR * 1.6);
let peak = 0;
for (let i = 0; i < N; i++) {
  const fade =
    Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  left[i] = Math.tanh(left[i] * 1.15) * fade;
  right[i] = Math.tanh(right[i] * 1.15) * fade;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const norm = peak > 0 ? 0.89 / peak : 1; // ≈ -1 dBFS

// 写 16-bit 立体声 WAV
const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0, 'ascii');
bytes.writeUInt32LE(36 + N * 4, 4);
bytes.write('WAVE', 8, 'ascii');
bytes.write('fmt ', 12, 'ascii');
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20); // PCM
bytes.writeUInt16LE(2, 22); // stereo
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36, 'ascii');
bytes.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const l = clamp(Math.round(left[i] * norm * 32767), -32768, 32767);
  const r = clamp(Math.round(right[i] * norm * 32767), -32768, 32767);
  bytes.writeInt16LE(l, 44 + i * 4);
  bytes.writeInt16LE(r, 46 + i * 4);
}

const root = resolveRoot();
const out = join(root, 'public', 'music.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, bytes);

// 报告：分段 RMS，方便确认没有空段 / 没有削波
const rms = (from, to) => {
  let sum = 0;
  for (let i = Math.round(from * SR); i < Math.round(to * SR); i++) {
    sum += left[i] * left[i] + right[i] * right[i];
  }
  return Math.sqrt(sum / (2 * Math.max(1, Math.round((to - from) * SR)))) * norm;
};
console.log(`[ok] ${out}  ${(bytes.length / 1024 / 1024).toFixed(1)} MB  ${DURATION}s @ ${SR}Hz`);
console.log('  峰值:', (peak * norm).toFixed(3), '| 分段 RMS:');
for (let s = 0; s < DURATION; s += 4) {
  console.log(`   ${String(s).padStart(2)}–${String(s + 4).padStart(2)}s  ${rms(s, s + 4).toFixed(3)}`);
}

function resolveRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..');
}
