import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
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
      <AbsoluteFill style={{ position: 'relative', padding: '78px 120px', display: 'flex', flexDirection: 'column', gap: 44 }}>
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              opacity: enter * interpolate(frame, [104, 130], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <Ring value={progress} />
            <div style={{ fontSize: 24, color: C.dim, textAlign: 'center', lineWidth: 1 }}>
              统计口径 = 会导出哪个文件
            </div>
          </div>
        </div>

        {/* 「查看明细」弹窗：列出到底哪几条没译，点一条能跳过去 */}
        <div
          style={{
            position: 'absolute',
            right: 92,
            bottom: 104,
            width: 760,
            opacity: interpolate(frame, [112, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            translate: interpolate(frame, [112, 140], ['0px 40px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.line}`,
              background: '#120d1e',
              boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 20px',
                borderBottom: `1px solid ${C.line}`,
                background: '#0d0916',
              }}
            >
              <span style={{ fontSize: 21, color: C.text, fontWeight: 700 }}>zh_tw 未翻译清单（3）</span>
              <span style={{ marginLeft: 'auto', fontSize: 15, color: C.dim }}>点一条直接跳过去改</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                ['条目「intro」', 'entries/intro.json'],
                ['条目「second」', 'entries/second.json'],
                ['分类「machines」', 'categories/machines.json'],
              ].map(([label, path], i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    borderTop: i ? `1px solid rgba(255,255,255,0.05)` : 'none',
                    opacity: interpolate(frame, [124 + i * 8, 140 + i * 8], [0, 1], { extrapolateRight: 'clamp' }),
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: C.accent2 }} />
                  <span style={{ fontSize: 19, color: C.text, width: 240 }}>{label}</span>
                  <span style={{ fontSize: 15, color: C.dim, fontFamily: MONO }}>assets/…/zh_tw/{path}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 14, color: '#f4c684' }}>未译</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
