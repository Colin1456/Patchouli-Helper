import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Hook } from './scenes/Hook';
import { Problem } from './scenes/Problem';
import { Editor } from './scenes/Editor';
import { PageTypes } from './scenes/PageTypes';
import { RichText } from './scenes/RichText';
import { I18n } from './scenes/I18n';
import { Import } from './scenes/Import';
import { Export } from './scenes/Export';
import { Outro } from './scenes/Outro';

/** 全片共用的背景：深紫夜色 + 缓慢漂移的紫色光晕 + 极淡网格。 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 960], [0, -160]);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${28 + Math.sin(frame / 150) * 6}% 18%, rgba(185,140,255,0.20), transparent 70%),
                       radial-gradient(50% 45% at ${74 + Math.cos(frame / 170) * 5}% 78%, rgba(111,211,168,0.12), transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          translate: `0px ${drift * 0.15}px`,
          opacity: 0.5,
        }}
      />
      <AbsoluteFill
        style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))' }}
      />
      {/* 片名水印 */}
      <div
        style={{
          position: 'absolute',
          left: 56,
          bottom: 34,
          fontSize: 18,
          letterSpacing: 3,
          color: 'rgba(239,233,255,0.35)',
          fontFamily: FONT,
        }}
      >
        PATCHOULI HELPER · v0.1.4
      </div>
    </AbsoluteFill>
  );
};

// 60 秒版：9 个场景，相邻场景重叠 8 帧做交叉淡入
const SCENES = [
  { from: 0, dur: 135, Comp: Hook }, //        0.0–4.5s  开场
  { from: 127, dur: 203, Comp: Problem }, //   4.2–11.0s 手写 JSON 的痛
  { from: 322, dur: 278, Comp: Editor }, //    10.7–20.0s 三栏编辑器 + 三段高亮
  { from: 592, dur: 278, Comp: PageTypes }, // 19.7–29.0s 16 页型 + 3 个细看
  { from: 862, dur: 218, Comp: RichText }, //  28.7–36.0s 富文本
  { from: 1072, dur: 263, Comp: I18n }, //     35.7–44.5s 多语言 + 未译清单
  { from: 1327, dur: 203, Comp: Import }, //   44.2–51.0s jar 导入
  { from: 1522, dur: 188, Comp: Export }, //   50.7–57.0s 成对导出 + 校验
  { from: 1702, dur: 98, Comp: Outro }, //     56.7–60.0s 片尾
];

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
    {/* 配乐：scripts/make-music.mjs 纯代码合成（120BPM，A 小调，32s 与画面对齐） */}
    <Audio src={staticFile('music.wav')} volume={1} />
    <Backdrop />
    {SCENES.map(({ from, dur, Comp }) => (
      <Sequence key={from} from={from} durationInFrames={dur} name={Comp.name || `scene-${from}`}>
        <Comp durationInFrames={dur} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
