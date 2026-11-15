import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const TREE = [
  ['📦', 'mymod-1.2.0.jar', 0],
  ['📁', 'data/mymod/patchouli_books/', 1],
  ['📄', 'guide/book.json', 2],
  ['📁', 'assets/mymod/patchouli_books/guide/', 1],
  ['📁', 'en_us/  · categories ×3 · entries ×24', 2],
  ['📁', 'zh_cn/  · categories ×3 · entries ×24', 2],
  ['🖼', 'textures/gui/mymod_page.png', 2],
] as Array<[string, string, number]>;

export const Import: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [26, 78], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const found = interpolate(frame, [70, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '62px 110px', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <Headline kicker="一键导入" title="把模组 jar 丢进来，手册、多语言、贴图一起还原" size={56} />

        <div style={{ display: 'flex', gap: 30, alignItems: 'center', flex: 1 }}>
          <Panel label="拖动 jar / zip 到窗口" width={760} height={498}>
            <div
              style={{
                position: 'relative',
                flex: 1,
                background: '#0b0813',
                border: `1px dashed rgba(185,140,255,0.45)`,
                borderRadius: 12,
                padding: 18,
                overflow: 'hidden',
              }}
            >
              {TREE.map(([glyph, text, depth], i) => {
                const o = interpolate(frame, [8 + i * 5, 20 + i * 5], [0, 1], { extrapolateRight: 'clamp' });
                const hit = scan > (i + 1) / (TREE.length + 2);
                return (
                  <div
                    key={text}
                    style={{
                      display: 'flex',
                      gap: 10,
                      paddingLeft: depth * 26,
                      fontSize: 19,
                      fontFamily: MONO,
                      lineHeight: 1.95,
                      color: hit ? C.mint : '#9b8fb5',
                      opacity: o,
                    }}
                  >
                    <span>{glyph}</span>
                    <span>{text}</span>
                    {hit ? <span style={{ marginLeft: 'auto', fontSize: 15, color: C.mint }}>✓</span> : null}
                  </div>
                );
              })}
              {/* 扫描线 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${scan * 100}%`,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
                  boxShadow: `0 0 24px ${C.accent}`,
                  opacity: scan > 0 && scan < 1 ? 1 : 0,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Chip tone="ok">自动识别 patchouli_books</Chip>
              <Chip tone="ok">多语言文件按语言合并</Chip>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, opacity: found }}>
            <Panel label="找到了 1 本书（可选其它）" height={196}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 86,
                    height: 112,
                    borderRadius: 10,
                    background: 'linear-gradient(160deg,#f6e9c9,#d9c393)',
                    border: '2px solid #7a4b2a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    color: '#8a5b33',
                  }}
                >
                  ✦
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>我的模组手册</div>
                  <div style={{ fontSize: 17, color: C.dim, fontFamily: MONO }}>mymod:guide</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Chip tone="accent">3 分类</Chip>
                    <Chip tone="accent">24 条目</Chip>
                    <Chip tone="accent">71 页</Chip>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel label="连同素材一起搬回来" height={286}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['🖼', '贴图 mYmod_page.png', '3 张，路径已修正'],
                  ['🌐', 'zh_cn / en_us', '两套内容按条目合并'],
                  ['✍️', '富文本格式码', '原样保留，不丢转义'],
                  ['📌', '未知页型', '保留但不改，导出时原样写回'],
                ].map(([glyph, title, meta], i) => (
                  <div
                    key={title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      opacity: interpolate(frame, [86 + i * 7, 100 + i * 7], [0, 1], { extrapolateRight: 'clamp' }),
                      fontSize: 19,
                      color: C.text,
                      fontFamily: FONT,
                    }}
                  >
                    <span style={{ width: 26 }}>{glyph}</span>
                    <span style={{ width: 300 }}>{title}</span>
                    <span style={{ color: C.dim, fontSize: 17 }}>{meta}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
