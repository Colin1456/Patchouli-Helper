import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const SOURCE = '挖掉一棵 $(l)树$() 就能开始，\n再用 $(item)工作台$() 合成 $(l:intro)下一节$()，\n按键 $(k:key.jump) 跳跃看 $(t:提示)。';

const TOOLS = ['$(l) 粗体', '$(n) 下划线', '$(item) 物品', '$(l:条目) 内链', '$(k:按键)', '$(t:悬停)', '调色板'];

export const RichText: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const typed = Math.round(
    interpolate(frame, [26, 108], [0, SOURCE.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const rendered = interpolate(frame, [96, 122], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const toolGlow = (i: number) => {
    const start = 14 + i * 9;
    return interpolate(frame, [start, start + 8, start + 30, start + 42], [0, 1, 1, 0.4], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '62px 110px', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <Headline kicker="富文本" title="格式不用背语法：点工具栏，实时看到结果" size={56} />

        <div style={{ display: 'flex', gap: 12 }}>
          {TOOLS.map((tool, i) => {
            const o = toolGlow(i);
            return (
              <div
                key={tool}
                style={{
                  fontSize: 20,
                  fontFamily: MONO,
                  color: o > 0.6 ? '#1b1430' : C.text,
                  background: o > 0.6 ? 'linear-gradient(180deg,#d7b7ff,#b98cff)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${o > 0.6 ? '#c9a6ff' : C.line}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                }}
              >
                {tool}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 30, flex: 1, alignItems: 'center' }}>
          <Panel label="你写的（源码）" width={880} height={520}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 25,
                lineHeight: 1.75,
                color: '#c6f5e4',
                whiteSpace: 'pre-wrap',
                background: '#0b0813',
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                padding: 22,
                flex: 1,
              }}
            >
              {SOURCE.slice(0, typed)}
              <span style={{ opacity: frame % 30 < 15 ? 1 : 0, color: C.accent }}>▌</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Chip tone="ok">输入即渲染</Chip>
              <Chip tone="warn">写错格式码会标红提示</Chip>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, opacity: rendered }}>
            <Panel label="玩家看到的（书里）" height={318}>
              <div
                style={{
                  background: 'linear-gradient(160deg,#f8eed3,#e7d6ae)',
                  borderRadius: 12,
                  padding: '22px 26px',
                  color: '#4d3218',
                  fontSize: 27,
                  lineHeight: 1.85,
                  fontFamily: FONT,
                  boxShadow: 'inset 0 0 0 2px rgba(122,75,42,0.35)',
                }}
              >
                挖掉一棵 <b>树</b> 就能开始，
                <br />
                再用{' '}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '1px 10px',
                    borderRadius: 6,
                    background: 'rgba(122,75,42,0.16)',
                    border: '1px solid rgba(122,75,42,0.4)',
                  }}
                >
                  ▣ 工作台
                </span>{' '}
                合成{' '}
                <span style={{ color: '#0a58c2', textDecoration: 'underline' }}>下一节</span>，
                <br />
                按键 <span style={{ padding: '0 8px', borderRadius: 5, background: 'rgba(0,0,0,0.12)' }}>空格</span> 跳跃看{' '}
                <span style={{ borderBottom: '1px dashed #7a4b2a' }}>提示</span>。
              </div>
            </Panel>

            <Panel label="同一套格式码，代码里也认" height={186}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['$(l)=粗体', '$(n)=下划线', '$(item)=物品名', '$(l:id)=内链跳转', '$(k:key)=按键', '$(t:)=悬停说明'].map((t) => (
                  <Chip key={t} mono>
                    {t}
                  </Chip>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
