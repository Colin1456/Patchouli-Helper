import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';

/** 带标题的玻璃面板 */
export const Panel: React.FC<{
  label?: string;
  width?: number | string;
  height?: number | string;
  accent?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ label, width, height, accent = C.accent, children, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      border: `1px solid ${C.line}`,
      background: 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(16,11,26,0.9))',
      boxShadow: '0 26px 60px rgba(0,0,0,0.45)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: FONT,
      ...style,
    }}
  >
    {label ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
        <span style={{ fontSize: 20, color: '#c9bde0', letterSpacing: 1 }}>{label}</span>
      </div>
    ) : null}
    {children}
  </div>
);

/** 代码块：mono 字，行号，可标记错误行 */
export const CodeBlock: React.FC<{
  lines: string[];
  reveal?: number;
  errors?: number[];
  width?: number | string;
}> = ({ lines, reveal = Infinity, errors = [], width }) => (
  <div
    style={{
      width,
      padding: '16px 18px',
      borderRadius: 12,
      background: '#0b0813',
      border: `1px solid ${C.line}`,
      fontFamily: MONO,
      fontSize: 17,
      lineHeight: 1.55,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    {lines.map((line, i) => {
      const shown = i < reveal;
      const bad = errors.includes(i);
      return (
        <div
          key={`${i}-${line}`}
          style={{
            display: 'flex',
            gap: 14,
            opacity: shown ? 1 : 0,
            color: bad ? '#ff9f9f' : /^\s*[/]{2}/.test(line) ? '#6d6086' : '#c6f5e4',
            background: bad ? 'rgba(255,110,110,0.10)' : 'transparent',
            borderRadius: 4,
            translate: shown ? '0px 0px' : '0px 8px',
          }}
        >
          <span style={{ width: 26, textAlign: 'right', color: '#4d4266', flexShrink: 0 }}>{i + 1}</span>
          <span style={{ whiteSpace: 'pre' }}>{line || ' '}</span>
          {bad ? <span style={{ marginLeft: 'auto', color: '#ff6b6b' }}>◀ 这里错了</span> : null}
        </div>
      );
    })}
  </div>
);

/** 小胶囊标签 */
export const Chip: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'accent';
  mono?: boolean;
}> = ({ children, tone = 'default', mono }) => {
  const map = {
    default: { color: C.text, border: C.line, bg: 'rgba(255,255,255,0.045)' },
    ok: { color: C.mint, border: 'rgba(111,211,168,0.45)', bg: 'rgba(111,211,168,0.12)' },
    warn: { color: '#f4c684', border: 'rgba(240,180,95,0.42)', bg: 'rgba(240,180,95,0.12)' },
    accent: { color: C.accent, border: 'rgba(185,140,255,0.42)', bg: 'rgba(185,140,255,0.12)' },
  }[tone];
  return (
    <span
      style={{
        fontSize: 20,
        padding: '7px 16px',
        borderRadius: 999,
        border: `1px solid ${map.border}`,
        background: map.bg,
        color: map.color,
        fontFamily: mono ? MONO : FONT,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

/** 依次淡入的小工具：把「第 n 个元素延迟出现」的常用写法收拢起来 */
export const Stagger: React.FC<{
  index: number;
  delay?: number;
  step?: number;
  children: React.ReactNode;
  y?: number;
}> = ({ index, delay = 0, step = 4, children, y = 18 }) => {
  const frame = useCurrentFrame();
  const start = delay + index * step;
  const p = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity: p,
        translate: interpolate(p, [0, 1], [`0px ${y}px`, '0px 0px']),
        scale: interpolate(p, [0, 1], [0.96, 1]),
      }}
    >
      {children}
    </div>
  );
};
