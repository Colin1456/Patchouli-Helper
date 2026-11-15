import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Fade, Headline } from '../components/ui';

const PAGES: Array<[string, string, string]> = [
  ['文本', 'patchouli:text', '✎'],
  ['合成', 'patchouli:crafting', '▤'],
  ['熔炼', 'patchouli:smelting', '△'],
  ['高炉', 'patchouli:blasting', '▲'],
  ['烟熏', 'patchouli:smoking', '◍'],
  ['营火', 'patchouli:campfire', '✹'],
  ['切石', 'patchouli:stonecutting', '◧'],
  ['锻造', 'patchouli:smithing', '⚒'],
  ['图片', 'patchouli:image', '▣'],
  ['聚光', 'patchouli:spotlight', '◎'],
  ['实体', 'patchouli:entity', '☗'],
  ['多方块', 'patchouli:multiblock', '⬒'],
  ['链接', 'patchouli:link', '↗'],
  ['关系', 'patchouli:relations', '⇄'],
  ['进度', 'patchouli:quest', '✓'],
  ['空白', 'patchouli:empty', '·'],
];

const Card: React.FC<{ name: string; id: string; glyph: string; index: number }> = ({ name, id, glyph, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame: frame - index * 3, fps, config: { damping: 200, mass: 0.6 } });
  return (
    <div
      style={{
        width: 268,
        height: 132,
        borderRadius: 16,
        border: `1px solid ${C.line}`,
        background: 'linear-gradient(160deg, rgba(185,140,255,0.14), rgba(20,15,32,0.9))',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        opacity: appear,
        translate: interpolate(appear, [0, 1], ['0px 26px', '0px 0px']),
        scale: interpolate(appear, [0, 1], [0.9, 1]),
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: C.accent,
          background: 'rgba(185,140,255,0.14)',
          border: '1px solid rgba(185,140,255,0.32)',
        }}
      >
        {glyph}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 27, fontWeight: 700, color: C.text }}>{name}</div>
        <div style={{ fontSize: 13, color: C.dim, fontFamily: MONO }}>{id.replace('patchouli:', '')}</div>
      </div>
    </div>
  );
};

export const PageTypes: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '70px 120px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', opacity: reveal }}>
          <Headline kicker="16 种内置页型" title="合成、熔炼、聚光、多方块… 全是表单" size={58} />
          <div style={{ fontSize: 26, color: C.dim, fontFamily: MONO, paddingBottom: 12 }}>1.20.1 · 1.21.1 全支持</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignContent: 'center',
            justifyContent: 'center',
          }}
        >
          {PAGES.map(([name, id, glyph], index) => (
            <Card key={id} name={name} id={id} glyph={glyph} index={index} />
          ))}
        </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
