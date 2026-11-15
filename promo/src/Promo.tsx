import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { C, FONT } from './theme';
import { Hook } from './scenes/Hook';
import { Editor } from './scenes/Editor';
import { PageTypes } from './scenes/PageTypes';
import { I18n } from './scenes/I18n';
import { ImportExport } from './scenes/ImportExport';
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

const SCENES = [
  { from: 0, dur: 108, Comp: Hook },
  { from: 100, dur: 206, Comp: Editor },
  { from: 298, dur: 170, Comp: PageTypes },
  { from: 460, dur: 176, Comp: I18n },
  { from: 628, dur: 176, Comp: ImportExport },
  { from: 796, dur: 164, Comp: Outro },
];

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
    <Backdrop />
    {SCENES.map(({ from, dur, Comp }) => (
      <Sequence key={from} from={from} durationInFrames={dur} name={Comp.name || `scene-${from}`}>
        <Comp durationInFrames={dur} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
