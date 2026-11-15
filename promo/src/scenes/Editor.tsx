import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import { EditorWindow } from '../components/editor-window';
import { Fade, Headline, NoteBar } from '../components/ui';

const WIN_W = 1300;
const WIN_H = 612;
const PANES = [
  { x: 0, w: 250, label: '结构树', desc: '分类 / 条目 / 多语言标记' },
  { x: 250, w: 480, label: '表单', desc: '按页型生成，必填项打星' },
  { x: 730, w: WIN_W - 730, label: '书页', desc: '拟真预览，翻页与游戏一致' },
];

export const Editor: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const reveal = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: 'clamp' });

  // 三段高亮：结构树 → 表单 → 书页
  const windowFor = (i: number) => {
    const start = 42 + i * 62;
    return interpolate(frame, [start - 10, start + 8, start + 54, start + 70], [0, 1, 1, 0.25], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '60px 110px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ opacity: reveal }}>
          <Headline kicker="编辑器" title="左边选、中间填、右边看 —— 三栏并排，纯横向" size={56} />
        </div>

        <div
          style={{
            position: 'relative',
            alignSelf: 'center',
            width: WIN_W,
            height: WIN_H,
            translate: interpolate(enter, [0, 1], ['0px 44px', '0px 0px']),
            scale: interpolate(enter, [0, 1], [0.955, 1]),
            opacity: interpolate(enter, [0, 1], [0, 1]),
          }}
        >
          <EditorWindow width={WIN_W} height={WIN_H} />

          {PANES.map((pane, i) => {
            const o = windowFor(i);
            return (
              <div
                key={pane.label}
                style={{
                  position: 'absolute',
                  left: pane.x + 3,
                  top: 46 + 3,
                  width: pane.w - 6,
                  height: WIN_H - 46 - 6,
                  border: `2px solid ${C.accent}`,
                  borderRadius: 10,
                  boxShadow: `0 0 0 3px rgba(185,140,255,${0.18 * o}), inset 0 0 40px rgba(185,140,255,${0.10 * o})`,
                  opacity: o,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: 12,
                    transform: 'translateY(-100%)',
                    padding: '6px 14px',
                    borderRadius: 9,
                    background: 'linear-gradient(180deg,#d7b7ff,#b98cff)',
                    color: '#1b1430',
                    fontSize: 18,
                    fontWeight: 800,
                    fontFamily: FONT,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pane.label} · {pane.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <NoteBar>改表单 → 书页立刻同步；两条分隔条可拖动调列宽，双击复位</NoteBar>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {['Ctrl+S 保存', 'Ctrl+Z 撤销', 'Ctrl+E 导出'].map((k) => (
              <div
                key={k}
                style={{
                  fontSize: 18,
                  color: C.dim,
                  padding: '7px 14px',
                  borderRadius: 9,
                  border: `1px solid ${C.line}`,
                  fontFamily: FONT,
                }}
              >
                {k}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
