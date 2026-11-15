import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import { EditorWindow } from '../components/editor-window';
import { Fade, Headline, NoteBar } from '../components/ui';

const WIN_W = 1300;
const WIN_H = 612;

export const Editor: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const reveal = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: 'clamp' });

  // 拖动分隔条：240 → 330
  const sidebarWidth = interpolate(frame, [150, 196], [250, 330], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dragging = interpolate(frame, [146, 156, 194, 206], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 翻页
  const page = frame >= 232 ? 1 : 0;
  const pageFlip = interpolate(frame, [228, 240], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 条目操作高亮
  const flashAdd = interpolate(frame, [258, 268, 286, 296], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flashDuplicate = interpolate(frame, [286, 296, 306, 316], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panes = [
    { x: 0, w: sidebarWidth, label: '结构树', desc: '分类 / 条目 / 未译标记' },
    { x: sidebarWidth, w: 480, label: '表单', desc: '按页型生成，必填打星' },
    { x: sidebarWidth + 480, w: WIN_W - sidebarWidth - 480, label: '书页', desc: '拟真预览，翻页同游戏' },
  ];
  const windowFor = (i: number) => {
    const start = 44 + i * 34;
    return interpolate(frame, [start - 8, start + 6, start + 26, start + 38], [0, 1, 1, 0.2], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '52px 110px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ opacity: reveal }}>
          <Headline kicker="编辑器" title="左边选、中间填、右边看 —— 还能拖动、翻页、随手加条目" size={52} />
        </div>

        <div
          style={{
            position: 'relative',
            alignSelf: 'center',
            width: WIN_W,
            height: WIN_H,
            translate: interpolate(enter, [0, 1], ['0px 40px', '0px 0px']),
            scale: interpolate(enter, [0, 1], [0.955, 1]),
            opacity: interpolate(enter, [0, 1], [0, 1]),
          }}
        >
          <EditorWindow
            width={WIN_W}
            height={WIN_H}
            sidebarWidth={sidebarWidth}
            page={page}
            spreadTitle={page ? '合成' : '开始'}
            spreadLines={page ? ['工作台 = 4 木板。', '右键打开配方书。'] : ['挖掉一棵树就能开始。', '再合成一张工作台。']}
            flashAdd={flashAdd}
            flashDuplicate={flashDuplicate}
          />

          {panes.map((pane, i) => {
            const o = windowFor(i);
            return (
              <div
                key={pane.label}
                style={{
                  position: 'absolute',
                  left: pane.x + 3,
                  top: 49,
                  width: pane.w - 6,
                  height: WIN_H - 49 - 3,
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
                    top: -14,
                    left: 10,
                    transform: 'translateY(-100%)',
                    padding: '5px 13px',
                    borderRadius: 9,
                    background: 'linear-gradient(180deg,#d7b7ff,#b98cff)',
                    color: '#1b1430',
                    fontSize: 17,
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

          {/* 拖动分隔条的游标提示 */}
          <div
            style={{
              position: 'absolute',
              left: sidebarWidth - 34,
              top: WIN_H / 2 - 18,
              width: 68,
              height: 36,
              borderRadius: 999,
              background: 'linear-gradient(180deg,#d7b7ff,#b98cff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              fontWeight: 800,
              color: '#1b1430',
              fontFamily: FONT,
              opacity: dragging,
              boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
            }}
          >
            ⇔ 拖动
          </div>

          {/* 翻页提示 */}
          <div
            style={{
              position: 'absolute',
              right: 24,
              bottom: -16,
              padding: '6px 14px',
              borderRadius: 9,
              background: '#1b1430',
              border: `1px solid ${C.accent}`,
              color: C.text,
              fontSize: 16,
              opacity: pageFlip,
              fontFamily: FONT,
            }}
          >
            翻到第 {page + 1} 页
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <NoteBar>改表单 → 书页立刻同步；两条分隔条可拖动调列宽，双击复位</NoteBar>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {['Ctrl+S 保存', 'Ctrl+Z/Y 撤销重做', 'Ctrl+E 导出'].map((k) => (
              <div
                key={k}
                style={{
                  fontSize: 17,
                  color: C.dim,
                  padding: '7px 13px',
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
