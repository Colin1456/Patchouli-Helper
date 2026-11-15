import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { EditorWindow } from '../components/editor-window';
import { Fade, Headline, NoteBar } from '../components/ui';

export const Editor: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const reveal = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '74px 110px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ opacity: reveal }}>
          <Headline kicker="编辑器" title="结构 · 表单 · 书页，三栏并排" size={62} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            translate: interpolate(enter, [0, 1], ['0px 46px', '0px 0px']),
            scale: interpolate(enter, [0, 1], [0.955, 1]),
            opacity: interpolate(enter, [0, 1], [0, 1]),
          }}
        >
          <EditorWindow width={1300} height={612} />
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 2 }}>
          <NoteBar>改左边表单，右边书页立刻同步 —— 所见即游戏所见</NoteBar>
          <div style={{ fontSize: 24, color: C.dim, whiteSpace: 'nowrap' }}>
            两条分隔条可拖动调列宽 · 纯横向三栏，不堆叠
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
