import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, CodeBlock, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const JSON_LINES = [
  '{',
  '  "name": "My Mod Guide",',
  '  "landing_text": "Welcome to $(thing)My Mod$().",',
  '  "use_resource_pack": true,',
  '  "creative_tab": "minecraft:tools_and_utilities"',
  '}',
];

const ENTRY_LINES = [
  '{',
  '  "name": "Getting Started",',
  '  "category": "mymod:basics",',
  '  "icon": "minecraft:crafting_table",',
  '  "pages": [',
  '    { "type": "patchouli:campfire_cooking", ... }',
  '  ]',
  '}',
];

/** 痛点场景：手写 JSON 的四个典型错误 */
export const Problem: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const bad = interpolate(frame, [30, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const right = interpolate(frame, [62, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '64px 110px', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <Headline kicker="以前的做法" title="一本手册几千行 JSON，错一个逗号全盘不加载" size={54} />

        <div style={{ display: 'flex', gap: 34, alignItems: 'center', flex: 1 }}>
          <Panel label="data/mymod/patchouli_books/guide/book.json" width={790} height={548}>
            <CodeBlock
              lines={JSON_LINES}
              reveal={Math.floor(interpolate(frame, [4, 34], [0, JSON_LINES.length], { extrapolateRight: 'clamp' }))}
            />
            <CodeBlock
              lines={ENTRY_LINES}
              errors={bad > 0.5 ? [5] : []}
              reveal={Math.floor(interpolate(frame, [16, 46], [0, ENTRY_LINES.length], { extrapolateRight: 'clamp' }))}
            />
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 840, opacity: right }}>
            <Panel label="游戏里的结果" height={230}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 14,
                    border: `2px solid #ff6b6b`,
                    background: 'rgba(255,107,107,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    color: '#ff8f8f',
                  }}
                >
                  ✕
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 30, color: '#ffb3b3', fontWeight: 700 }}>手册打不开</div>
                  <div style={{ fontSize: 17, color: '#8d7fa8', fontFamily: MONO }}>
                    Couldn't parse patchouli_books/guide/entries/intro.json
                  </div>
                </div>
              </div>
            </Panel>

            <Panel label="踩过的坑（每个都要去翻文档）" height={282}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {[
                  '页型名记错：campfire_cooking ≠ patchouli:campfire',
                  'book.json 必须在 data/ 侧，不在 assets/',
                  'id 里不能出现 en_us（会被字符串替换掉）',
                  '图片路径要带 textures/ 前缀',
                  '字段必填忘了写 → 整份文件丢弃',
                  '多语言目录名写错 → 全回退英文',
                ].map((text, i) => (
                  <div
                    key={text}
                    style={{
                      opacity: interpolate(frame, [70 + i * 6, 84 + i * 6], [0, 1], { extrapolateRight: 'clamp' }),
                    }}
                  >
                    <Chip tone="warn">{text}</Chip>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: 14 }}>
                <Chip tone="accent">所以才有这个工具 →</Chip>
              </div>
            </Panel>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
