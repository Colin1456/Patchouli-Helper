import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const PAGES: Array<[string, string, string]> = [
  ['文本', 'text', '✎'],
  ['合成', 'crafting', '▤'],
  ['熔炼', 'smelting', '△'],
  ['高炉', 'blasting', '▲'],
  ['烟熏', 'smoking', '◍'],
  ['营火', 'campfire', '✹'],
  ['切石', 'stonecutting', '◧'],
  ['锻造', 'smithing', '⚒'],
  ['图片', 'image', '▣'],
  ['聚光', 'spotlight', '◎'],
  ['实体', 'entity', '☗'],
  ['多方块', 'multiblock', '⬒'],
  ['链接', 'link', '↗'],
  ['关系', 'relations', '⇄'],
  ['进度', 'quest', '✓'],
  ['空白', 'empty', '·'],
];

const Card: React.FC<{ name: string; id: string; glyph: string; index: number }> = ({ name, id, glyph, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame: frame - 14 - index * 3, fps, config: { damping: 200, mass: 0.6 } });
  return (
    <div
      style={{
        width: 250,
        height: 106,
        borderRadius: 14,
        border: `1px solid ${C.line}`,
        background: 'linear-gradient(160deg, rgba(185,140,255,0.13), rgba(20,15,32,0.9))',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '0 16px',
        opacity: appear,
        translate: interpolate(appear, [0, 1], ['0px 22px', '0px 0px']),
        scale: interpolate(appear, [0, 1], [0.9, 1]),
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: C.accent,
          background: 'rgba(185,140,255,0.14)',
          border: '1px solid rgba(185,140,255,0.32)',
        }}
      >
        {glyph}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{name}</div>
        <div style={{ fontSize: 12, color: C.dim, fontFamily: MONO }}>{id}</div>
      </div>
    </div>
  );
};

const slot = (bg: string, glyph = '') => (
  <div
    style={{
      width: 46,
      height: 46,
      borderRadius: 8,
      background: bg,
      border: '1px solid #6b5636',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      color: '#4a3a22',
    }}
  >
    {glyph}
  </div>
);

const MiniDemo: React.FC<{ index: number; title: string; children: React.ReactNode }> = ({ index, title, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [46 + index * 12, 62 + index * 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity: p,
        translate: interpolate(p, [0, 1], ['18px 0px', '0px 0px']),
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.035)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 17, color: C.dim, letterSpacing: 1 }}>{title}</div>
      {children}
    </div>
  );
};

export const PageTypes: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '58px 100px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', opacity: reveal }}>
          <Headline kicker="16 种内置页型" title="每张卡片背后，都是几行表单" size={54} />
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
            <Chip tone="accent">Forge 1.20.1</Chip>
            <Chip tone="accent">NeoForge 1.21.1</Chip>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 34, alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, width: 1048 }}>
            {PAGES.map(([name, id, glyph], i) => (
              <Card key={id} name={name} id={id} glyph={glyph} index={i} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 620 }}>
            <MiniDemo index={0} title="合成页：3×3 配方直接填格子">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gap: 6, background: '#c9b493', padding: 8, borderRadius: 10 }}>
                  {Array.from({ length: 9 }).map((_, i) => slot(i === 4 ? '#8a6b40' : '#b59f78', i === 4 ? '✦' : ''))}
                </div>
                <div style={{ fontSize: 26, color: C.dim }}>→</div>
                {slot('#5d7a52', '▣')}
              </div>
            </MiniDemo>

            <MiniDemo index={1} title="聚光页：一个物品撑满一页">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 16,
                    background: 'linear-gradient(145deg,#8f7bff,#2a2140)',
                    border: '1px solid rgba(185,140,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    color: '#e7dcff',
                  }}
                >
                  ✦
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>钻石镐</div>
                  <div style={{ fontSize: 16, color: C.dim }}>minecraft:diamond_pickaxe</div>
                  <div style={{ fontSize: 15, color: '#9b8fb5' }}>可翻页看说明文字 · 自动生成 1 页</div>
                </div>
              </div>
            </MiniDemo>

            <MiniDemo index={2} title="多方块页：方块结构可视化">
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[0, 1, 2, 3].map((col) => (
                      <div
                        key={col}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          background: (row + col) % 3 === 0 ? '#7f6b45' : '#3c3348',
                          border: '1px solid #55492f',
                          opacity: interpolate(frame, [70 + row * 3 + col * 2, 82 + row * 3 + col * 2], [0.15, 1], {
                            extrapolateRight: 'clamp',
                          }),
                        }}
                      />
                    ))}
                  </div>
                ))}
                <div style={{ marginLeft: 14, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  <div style={{ fontSize: 15, color: C.dim }}>对称 / 镜像 / 旋转</div>
                  <div style={{ fontSize: 15, color: C.dim }}>自动校验结构合法性</div>
                </div>
              </div>
            </MiniDemo>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
