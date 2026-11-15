import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

/** 工程文件 .phbook + JSON 预览 / 复制 */
export const Project: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const save = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const drop = interpolate(frame, [46, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dropY = interpolate(frame, [46, 70], [-220, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const jsonTab = interpolate(frame, [96, 116], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '60px 100px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Headline kicker="工程文件" title="进度不会丢：存成 .phbook，下次拖回来继续编" size={54} />

        <div style={{ display: 'flex', gap: 28, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 620 }}>
            <Panel label="Ctrl+S 保存工程" height={180} style={{ opacity: save }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 76,
                    borderRadius: 10,
                    border: `2px solid ${C.accent}`,
                    background: 'rgba(185,140,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    color: C.accent,
                    fontFamily: MONO,
                  }}
                >
                  .phbook
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 22, color: C.text, fontFamily: MONO }}>mymod-guide.phbook</div>
                  <div style={{ fontSize: 16, color: C.dim }}>整个工程（含素材、多语言、页型）打包成一个文件</div>
                </div>
              </div>
            </Panel>

            <Panel label="拖进窗口就能打开" height={230}>
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  borderRadius: 12,
                  border: `2px dashed ${drop > 0.9 ? C.mint : 'rgba(185,140,255,0.45)'}`,
                  background: drop > 0.9 ? 'rgba(111,211,168,0.08)' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    translate: `0px ${dropY}px`,
                    opacity: interpolate(frame, [40, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: '#1b1430',
                    border: `1px solid ${C.accent}`,
                    fontFamily: MONO,
                    fontSize: 18,
                    color: C.text,
                  }}
                >
                  📄 mymod-guide.phbook
                </div>
                <div style={{ position: 'absolute', bottom: 12, fontSize: 16, color: drop > 0.9 ? C.mint : C.dim }}>
                  {drop > 0.9 ? '✓ 已载入工程，继续编辑' : '把 .phbook 拖到窗口任意位置'}
                </div>
              </div>
            </Panel>
          </div>

          <Panel label="JSON 预览：想手改也随时能抠" width={880} height={470}>
            <div style={{ display: 'flex', gap: 10 }}>
              {['书页', 'JSON'].map((tab, i) => (
                <div
                  key={tab}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9,
                    fontSize: 18,
                    fontFamily: FONT,
                    color: (i === 1) === jsonTab > 0.5 ? '#1b1430' : C.dim,
                    background: (i === 1) === jsonTab > 0.5 ? 'linear-gradient(180deg,#d7b7ff,#b98cff)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${(i === 1) === jsonTab > 0.5 ? '#c9a6ff' : C.line}`,
                  }}
                >
                  {tab}
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Chip tone="accent">复制当前页</Chip>
                <Chip>整书导出</Chip>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                borderRadius: 12,
                background: '#0b0813',
                border: `1px solid ${C.line}`,
                padding: 18,
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.6,
                color: '#c6f5e4',
                whiteSpace: 'pre',
                opacity: interpolate(jsonTab, [0, 1], [0.35, 1]),
              }}
            >
              {`{
  "name": "Getting Started",
  "category": "mymod:basics",
  "icon": "minecraft:crafting_table",
  "pages": [
    {
      "type": "patchouli:text",
      "title": "开始",
      "text": "挖掉一棵 $(l)树$() 就能开始。"
    },
    { "type": "patchouli:crafting", "recipe": "mymod:axe" }
  ]
}`}
            </div>
            <div style={{ fontSize: 16, color: C.dim }}>
              预览里的内容与导出文件逐字节一致 —— 想手贴进模组、或对比 diff 都行
            </div>
          </Panel>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
