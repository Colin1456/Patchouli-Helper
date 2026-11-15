import React from 'react';
import { C, FONT } from '../theme';

/** 一本合上的帕秋莉手册：羊皮纸封面 + 皮革书脊 + 烫金边框。 */
export const BookCover: React.FC<{
  width?: number;
  title?: string;
  subtitle?: string;
  glyph?: string;
  rotate?: number;
  glow?: number;
}> = ({ width = 360, title = '我的模组手册', subtitle = 'PATCHOULI', glyph = '✦', rotate = 0, glow = 0 }) => {
  const height = width * 1.32;
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        rotate: `${rotate}deg`,
        borderRadius: width * 0.04,
        overflow: 'hidden',
        boxShadow: `0 ${width * 0.08}px ${width * 0.22}px rgba(0,0,0,0.55), 0 0 ${width * 0.35}px rgba(185,140,255,${0.10 + glow * 0.35})`,
        border: `${Math.max(2, width * 0.012)}px solid ${C.leather}`,
        fontFamily: FONT,
      }}
    >
      {/* 书脊 */}
      <div
        style={{
          width: width * 0.11,
          background: `linear-gradient(90deg, #5d3720, ${C.leather} 60%, #9c6337)`,
          boxShadow: 'inset -6px 0 12px rgba(0,0,0,0.45)',
        }}
      />
      {/* 封面 */}
      <div
        style={{
          flex: 1,
          background: `linear-gradient(160deg, ${C.parchment}, ${C.parchment2} 70%, #d9c393)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: width * 0.045,
          padding: width * 0.09,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: width * 0.05,
            border: `${Math.max(1, width * 0.006)}px solid rgba(122,75,42,0.55)`,
            borderRadius: width * 0.015,
          }}
        />
        <div style={{ fontSize: width * 0.13, color: '#8a5b33', lineHeight: 1 }}>{glyph}</div>
        <div
          style={{
            fontSize: width * 0.105,
            fontWeight: 800,
            color: '#5a3a20',
            textAlign: 'center',
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: width * 0.045, letterSpacing: 3, color: '#9b7346', fontWeight: 700 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};

/** 书页展开：左右两页，中间有装订阴影。 */
export const BookSpread: React.FC<{
  width?: number;
  leftTitle?: string;
  leftLines?: string[];
  rightTitle?: string;
  rightLines?: string[];
}> = ({
  width = 660,
  leftTitle = '基础',
  leftLines = ['入门所需的一切'],
  rightTitle = '开始',
  rightLines = ['挖掉一棵树就能开始。', '再合成一张工作台。'],
}) => {
  const page = width / 2;
  const height = width * 0.66;
  const Page = ({ title, lines, right }: { title: string; lines: string[]; right?: boolean }) => (
    <div
      style={{
        width: page,
        height,
        padding: `${page * 0.09}px ${page * 0.09}px`,
        background: right
          ? 'linear-gradient(90deg, #efe0bd, #f8eed3)'
          : 'linear-gradient(90deg, #f8eed3, #efe0bd)',
        boxShadow: right ? 'inset 10px 0 18px rgba(122,75,42,0.18)' : 'inset -10px 0 18px rgba(122,75,42,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: page * 0.05,
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: page * 0.085, fontWeight: 800, color: '#4d3218' }}>{title}</div>
      <div style={{ height: 2, background: 'rgba(122,75,42,0.35)' }} />
      {lines.map((line) => (
        <div key={line} style={{ fontSize: page * 0.058, color: '#5d4526', lineHeight: 1.7 }}>
          {line}
        </div>
      ))}
    </div>
  );
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 26px 60px rgba(0,0,0,0.45)',
        border: '3px solid #8a5f38',
      }}
    >
      <Page title={leftTitle} lines={leftLines} />
      <Page title={rightTitle} lines={rightLines} right />
    </div>
  );
};
