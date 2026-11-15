import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const Zip: React.FC<{
  name: string;
  hint: string;
  accent: string;
  glyph: string;
  appear: number;
  lines: string[];
}> = ({ name, hint, accent, glyph, appear, lines }) => (
  <div
    style={{
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      padding: '18px 22px',
      borderRadius: 16,
      border: `1px solid ${C.line}`,
      background: `linear-gradient(150deg, ${accent}1f, rgba(16,11,26,0.92))`,
      opacity: appear,
      translate: interpolate(appear, [0, 1], ['26px 0px', '0px 0px']),
    }}
  >
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        color: accent,
        background: `${accent}1f`,
        border: `1px solid ${accent}55`,
      }}
    >
      {glyph}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <div style={{ fontSize: 25, fontWeight: 700, color: C.text, fontFamily: MONO }}>{name}</div>
      <div style={{ fontSize: 15, color: C.dim, fontFamily: MONO }}>{lines[0]}</div>
      <div style={{ fontSize: 15, color: C.dim, fontFamily: MONO }}>{lines[1]}</div>
    </div>
    <div style={{ fontSize: 16, color: accent, fontFamily: FONT, textAlign: 'right', width: 150 }}>{hint}</div>
  </div>
);

export const Export: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const zipA = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zipB = interpolate(frame, [22, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const table = interpolate(frame, [34, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checks = interpolate(frame, [58, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '62px 110px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Headline kicker="导出" title="资源包 + 数据包成对导出，pack_format 自动匹配" size={56} />

        <div style={{ display: 'flex', gap: 30, flex: 1, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 1040 }}>
            <Zip
              name="mymod-guide-resourcepack.zip"
              hint="丢进 src/main/resources"
              accent={C.mint}
              glyph="◧"
              appear={zipA}
              lines={['assets/mymod/patchouli_books/guide/en_us/…', 'assets/mymod/patchouli_books/guide/zh_cn/…']}
            />
            <Zip
              name="mymod-guide-datapack.zip"
              hint="Patchouli 的 book.json 在 data 侧"
              accent={C.accent2}
              glyph="◨"
              appear={zipB}
              lines={['data/mymod/patchouli_books/guide/book.json', '（资源包无法声明新书，所以必须成对）']}
            />

            <Panel label="导出前自动校验" style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: checks }}>
                {[
                  ['id 里含有 en_us', '已拦截：会被 Patchouli 的字符串替换吃掉', 'err'],
                  ['引用不存在的分类', '已提示：mymod:machines 未定义', 'warn'],
                  ['图片路径缺 textures/ 前缀', '已自动补全', 'ok'],
                  ['页型名拼错 campfire_cooking', '已建议 patchouli:campfire', 'ok'],
                ].map(([title, detail, tone], i) => (
                  <div
                    key={title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 18,
                      opacity: interpolate(frame, [62 + i * 7, 76 + i * 7], [0, 1], { extrapolateRight: 'clamp' }),
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        color: tone === 'err' ? '#ff8f8f' : tone === 'warn' ? '#f4c684' : C.mint,
                        border: `1px solid ${tone === 'err' ? '#ff8f8f66' : tone === 'warn' ? '#f4c68466' : '#6fd3a866'}`,
                      }}
                    >
                      {tone === 'ok' ? '✓' : '!'}
                    </span>
                    <span style={{ color: C.text, width: 420 }}>{title}</span>
                    <span style={{ color: C.dim, fontSize: 16 }}>{detail}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel label="pack_format 不用自己查" width={620} height={330} style={{ opacity: table }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Forge 1.20.1', '15', '15'],
                ['NeoForge 1.21.1', '34', '48'],
              ].map(([target, res, data]) => (
                <div
                  key={target}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: `1px solid ${C.line}`,
                    background: 'rgba(185,140,255,0.07)',
                  }}
                >
                  <span style={{ fontSize: 21, color: C.text, width: 230, fontFamily: FONT }}>{target}</span>
                  <span style={{ fontSize: 16, color: C.dim }}>资源包</span>
                  <span style={{ fontSize: 26, color: C.accent, fontFamily: MONO }}>{res}</span>
                  <span style={{ fontSize: 16, color: C.dim }}>数据包</span>
                  <span style={{ fontSize: 26, color: C.accent2, fontFamily: MONO }}>{data}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Chip tone="ok">两版 JSON 格式一致</Chip>
              <Chip tone="accent">切 Profile 即可</Chip>
            </div>
          </Panel>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
