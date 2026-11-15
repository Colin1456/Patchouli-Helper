import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Hook } from './scenes/Hook';
import { Problem } from './scenes/Problem';
import { Look } from './scenes/Look';
import { Project } from './scenes/Project';
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
  const drift = interpolate(frame, [0, 2160], [0, -260]);
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

// 72 秒版：11 个场景，相邻场景重叠 8 帧做交叉淡入
const SCENES = [
  { from: 0, dur: 135, Comp: Hook }, //        0.0–4.5s   开场
  { from: 127, dur: 203, Comp: Problem }, //   4.2–11.0s  手写 JSON 的痛
  { from: 322, dur: 318, Comp: Editor }, //    10.7–21.3s 三栏 + 拖动 + 翻页 + 条目操作
  { from: 632, dur: 270, Comp: Look }, //      21.1–30.1s 外观 / 颜色 / 音效 / 宏 / i18n 模式
  { from: 894, dur: 226, Comp: PageTypes }, // 29.8–37.3s 16 页型 + 4 个细看
  { from: 1112, dur: 188, Comp: RichText }, // 37.1–43.3s 富文本全工具栏
  { from: 1292, dur: 208, Comp: I18n }, //     43.1–50.0s 多语言 + 未译清单
  { from: 1492, dur: 188, Comp: Project }, //  49.7–56.0s .phbook 工程 + JSON 预览
  { from: 1672, dur: 178, Comp: Import }, //   55.7–61.7s jar 导入
  { from: 1842, dur: 216, Comp: Export }, //   61.4–68.6s 校验联动 + 成对导出
  { from: 2050, dur: 110, Comp: Outro }, //    68.3–72.0s 片尾
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
