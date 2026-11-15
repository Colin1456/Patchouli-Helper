import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';

/** 场景淡入淡出：全球统一节奏，方便场景之间交叉过渡。 */
export const Fade: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  inFrames?: number;
  outFrames?: number;
  style?: React.CSSProperties;
}> = ({ children, durationInFrames, inFrames = 12, outFrames = 14, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, inFrames, durationInFrames - outFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const translate = interpolate(frame, [0, inFrames], ['0px 24px', '0px 0px'], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity, translate, fontFamily: FONT, ...style }}>{children}</AbsoluteFill>
  );
};

/** 场景标题（左侧对齐，带一条强调短线）。 */
export const Headline: React.FC<{
  kicker?: string;
  title: string;
  color?: string;
  size?: number;
  align?: 'left' | 'center';
}> = ({ kicker, title, color = C.text, size = 76, align = 'left' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
    {kicker ? (
      <div
        style={{
          fontSize: 26,
          letterSpacing: 6,
          color: C.accent,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
    ) : null}
    <div style={{ fontSize: size, fontWeight: 800, color, letterSpacing: -1, lineHeight: 1.12 }}>{title}</div>
  </div>
);

/** 底部说明条：模拟编辑器里的提示条，强化「这是真产品」的感觉。 */
export const NoteBar: React.FC<{ children: React.ReactNode; tone?: 'info' | 'warn' }> = ({
  children,
  tone = 'info',
}) => {
  const info = tone === 'info';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 22px',
        borderRadius: 14,
        background: info ? 'rgba(120,170,255,0.14)' : 'rgba(240,180,95,0.16)',
        border: `1px solid ${info ? 'rgba(120,170,255,0.42)' : 'rgba(240,180,95,0.45)'}`,
        color: info ? '#c3d6ff' : '#f4c684',
        fontSize: 24,
      }}
    >
      {children}
    </div>
  );
};
