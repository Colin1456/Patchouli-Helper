import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { BookCover } from '../components/book';
import { Fade } from '../components/ui';

export const Hook: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const glow = interpolate(frame, [0, durationInFrames], [0, 1]);

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 110 }}>
          <BookCover
            width={370}
            title="我的模组手册"
            subtitle="PATCHOULI"
            rotate={interpolate(enter, [0, 1], [-14, -6])}
            glow={glow}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 820 }}>
            <div
              style={{
                fontSize: 34,
                letterSpacing: 8,
                color: C.accent,
                fontWeight: 700,
                opacity: enter,
              }}
            >
              PATCHOULI HELPER
            </div>
            <div
              style={{
                fontSize: 116,
                fontWeight: 900,
                color: C.text,
                letterSpacing: -2,
                lineHeight: 1.06,
                translate: interpolate(enter, [0, 1], ['0px 30px', '0px 0px']),
              }}
            >
              帕秋莉手册
              <br />
              可视化编辑
            </div>
            <div style={{ fontSize: 40, color: C.dim, lineHeight: 1.55, opacity: interpolate(enter, [0.3, 1], [0, 1]) }}>
              改一页内容，不该花一晚上写 JSON。
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 8,
                opacity: interpolate(enter, [0.5, 1], [0, 1]),
                fontFamily: MONO,
              }}
            >
              {['单文件 HTML', '双击即用', 'v0.1.4'].map((chip) => (
                <div
                  key={chip}
                  style={{
                    fontSize: 22,
                    color: C.text,
                    padding: '8px 18px',
                    borderRadius: 999,
                    border: `1px solid ${C.line}`,
                    background: 'rgba(185,140,255,0.10)',
                    fontFamily: FONT,
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
