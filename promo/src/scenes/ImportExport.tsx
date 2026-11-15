import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Fade, Headline } from '../components/ui';

const Card: React.FC<{
  title: string;
  meta: string;
  glyph: string;
  accent: string;
  appear: number;
  width?: number;
}> = ({ title, meta, glyph, accent, appear, width = 400 }) => (
  <div
    style={{
      width,
      height: 190,
      borderRadius: 20,
      border: `1px solid ${C.line}`,
      background: `linear-gradient(160deg, ${accent}22, rgba(18,13,29,0.92))`,
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      padding: '0 26px',
      opacity: appear,
      translate: interpolate(appear, [0, 1], ['0px 30px', '0px 0px']),
      scale: interpolate(appear, [0, 1], [0.92, 1]),
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        color: accent,
        background: `${accent}1f`,
        border: `1px solid ${accent}55`,
      }}
    >
      {glyph}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 27, fontWeight: 700, color: C.text, fontFamily: MONO }}>{title}</div>
      <div style={{ fontSize: 17, color: C.dim, lineHeight: 1.5 }}>{meta}</div>
    </div>
  </div>
);

export const ImportExport: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const jar = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 0.7 } });
  const zipA = spring({ frame: frame - 26, fps, config: { damping: 200, mass: 0.7 } });
  const zipB = spring({ frame: frame - 34, fps, config: { damping: 200, mass: 0.7 } });
  const arrow = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '78px 120px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <Headline kicker="导入 / 导出" title="模组 jar 丢进来，资源包+数据包成对导出" size={58} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 62 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, justifyContent: 'center' }}>
          <Card title="mymod-1.2.0.jar" meta="自动找 patchouli_books · 多语言与图片一并还原" glyph="▤" accent={C.accent} appear={jar} />

          <div style={{ width: 150, height: 90, position: 'relative' }}>
            <svg width={150} height={90} viewBox="0 0 150 90">
              <line
                x1={6}
                y1={45}
                x2={6 + 138 * arrow}
                y2={45}
                stroke={C.accent2}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray="16 12"
              />
              <polygon
                points="118,28 144,45 118,62"
                fill={C.accent2}
                opacity={arrow}
              />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card title="resourcepack.zip" meta="assets/<modid>/patchouli_books/<book>/<lang>/…" glyph="◧" accent={C.mint} appear={zipA} width={470} />
            <Card title="datapack.zip" meta="data/<modid>/patchouli_books/<book>/book.json" glyph="◨" accent={C.accent2} appear={zipB} width={470} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: interpolate(frame, [40, 58], [0, 1], { extrapolateRight: 'clamp' }),
            fontFamily: FONT,
          }}
        >
          {['Forge 1.20.1', 'NeoForge 1.21.1', 'pack_format 自动匹配'].map((chip) => (
            <div
              key={chip}
              style={{
                fontSize: 23,
                color: C.text,
                padding: '10px 22px',
                borderRadius: 999,
                border: `1px solid ${C.line}`,
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              {chip}
            </div>
          ))}
          <div style={{ fontSize: 23, color: C.dim, marginLeft: 10 }}>解压到 src/main/resources 即可</div>
        </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
