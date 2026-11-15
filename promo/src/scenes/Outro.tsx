import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Fade } from '../components/ui';

export const Outro: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const rise = spring({ frame: frame - 10, fps, config: { damping: 200, mass: 0.8 } });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <div
            style={{
              width: 116,
              height: 116,
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 54,
              color: '#3d2410',
              background: `linear-gradient(160deg, ${C.parchment}, ${C.parchment2})`,
              border: `3px solid ${C.leather}`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 70px rgba(185,140,255,${0.18 + 0.12 * Math.sin(frame / 18)})`,
              scale: interpolate(enter, [0, 1], [0.7, 1]),
              rotate: `${interpolate(enter, [0, 1], [-10, 0])}deg`,
            }}
          >
            ✦
          </div>

          <div style={{ fontSize: 92, fontWeight: 900, color: C.text, letterSpacing: -1, opacity: rise, translate: interpolate(rise, [0, 1], ['0px 24px', '0px 0px']), fontFamily: FONT }}>
            Patchouli Helper
          </div>
          <div style={{ fontSize: 34, color: C.dim, opacity: rise, fontFamily: FONT }}>
            双击即用 · 免安装 · 单文件 HTML
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              color: C.accent,
              fontFamily: MONO,
              padding: '12px 26px',
              borderRadius: 12,
              border: `1px solid rgba(185,140,255,0.36)`,
              background: 'rgba(185,140,255,0.10)',
              opacity: interpolate(frame, [22, 40], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            github.com/Colin1456/Patchouli-Helper
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 10,
              opacity: interpolate(frame, [30, 48], [0, 1], { extrapolateRight: 'clamp' }),
              fontFamily: FONT,
            }}
          >
            {['v0.1.4', 'Forge 1.20.1', 'NeoForge 1.21.1', 'Windows / Linux / macOS'].map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 21,
                  color: C.text,
                  padding: '9px 20px',
                  borderRadius: 999,
                  border: `1px solid ${C.line}`,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
