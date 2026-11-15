import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import { Fade, Headline, NoteBar } from '../components/ui';

const LANGS: Array<{ short: string; code: string; ratio: string; full: boolean }> = [
  { short: 'EN', code: 'en_us', ratio: '12/12', full: true },
  { short: '简中', code: 'zh_cn', ratio: '12/12', full: true },
  { short: '繁中', code: 'zh_tw', ratio: '0/12', full: false },
];

const Ring: React.FC<{ value: number }> = ({ value }) => {
  const size = 330;
  const r = 138;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(185,140,255,0.16)" strokeWidth={18} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.mint}
          strokeWidth={18}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 78, fontWeight: 900, color: C.text }}>{Math.round(value * 100)}%</div>
        <div style={{ fontSize: 22, color: C.dim }}>zh_cn · 12 / 12 条目</div>
      </div>
    </div>
  );
};

export const I18n: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const progress = interpolate(frame, [10, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '78px 120px', display: 'flex', flexDirection: 'column', gap: 44 }}>
        <Headline kicker="多语言" title="中文写到哪了，一眼看得出来" size={62} />

        <div style={{ display: 'flex', gap: 90, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {/* 左：语言按钮 + 提示条 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: 780 }}>
            <div style={{ display: 'flex', gap: 14, padding: 10, borderRadius: 16, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.03)', width: 'fit-content' }}>
              {LANGS.map((lang, i) => {
                const appear = spring({ frame: frame - 6 - i * 4, fps, config: { damping: 200, mass: 0.6 } });
                return (
                  <div
                    key={lang.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '11px 20px',
                      borderRadius: 11,
                      fontSize: 25,
                      color: i === 1 ? C.text : '#b7a8d0',
                      background: i === 1 ? 'rgba(185,140,255,0.18)' : 'transparent',
                      border: `1px solid ${i === 1 ? 'rgba(185,140,255,0.42)' : 'transparent'}`,
                      opacity: appear,
                      fontFamily: FONT,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 999,
                        background: lang.full ? C.mint : 'transparent',
                        border: lang.full ? 'none' : `1.5px dashed ${C.accent2}`,
                      }}
                    />
                    {lang.short}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: interpolate(frame, [16, 34], [0, 1], { extrapolateRight: 'clamp' }) }}>
              {LANGS.map((lang) => (
                <div key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 25, color: '#c9bde0', fontFamily: FONT }}>
                  <span style={{ width: 118, color: C.text }}>{lang.code}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(lang.full ? 1 : 0) * progress * 100}%`,
                        height: '100%',
                        background: lang.full ? C.mint : C.accent2,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span style={{ width: 96, textAlign: 'right', color: lang.full ? C.mint : C.accent2 }}>{lang.ratio}</span>
                </div>
              ))}
            </div>

            <div style={{ opacity: interpolate(frame, [26, 44], [0, 1], { extrapolateRight: 'clamp' }) }}>
              <NoteBar tone="warn">繁中：0/12 个条目有译文，未译的在游戏里整份回退 en_us · 查看明细（12）</NoteBar>
            </div>
          </div>

          {/* 右：完成度环 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, opacity: enter }}>
            <Ring value={progress} />
            <div style={{ fontSize: 24, color: C.dim, textAlign: 'center', lineWidth: 1 }}>
              统计口径 = 会导出哪个文件
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
