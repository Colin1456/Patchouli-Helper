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
      padding: '16px 20px',
      borderRadius: 16,
      border: `1px solid ${C.line}`,
      background: `linear-gradient(150deg, ${accent}1f, rgba(16,11,26,0.92))`,
      opacity: appear,
      translate: interpolate(appear, [0, 1], ['26px 0px', '0px 0px']),
    }}
  >
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        color: accent,
        background: `${accent}1f`,
        border: `1px solid ${accent}55`,
      }}
    >
      {glyph}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
      <div style={{ fontSize: 23, fontWeight: 700, color: C.text, fontFamily: MONO }}>{name}</div>
      {lines.map((line) => (
        <div key={line} style={{ fontSize: 14, color: C.dim, fontFamily: MONO }}>
          {line}
        </div>
      ))}
    </div>
    <div style={{ fontSize: 15, color: accent, fontFamily: FONT, textAlign: 'right', width: 150 }}>{hint}</div>
  </div>
);

const ISSUES: Array<[string, string, string]> = [
  ['id 里含有 en_us', '会被字符串替换吃掉，导出时整份文件失效', 'err', 'error'],
  ['引用不存在的分类', 'mymod:machines 未定义', 'warn', 'warning'],
  ['图片路径缺 textures/ 前缀', '已提示正确写法', 'warn', 'warning'],
];

/** 导出：前半段演「校验怎么用」，后半段演「导出什么」 */
export const Export: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const badge = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const modal = interpolate(frame, [14, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const jumped = interpolate(frame, [40, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const collapse = interpolate(frame, [70, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zipA = interpolate(frame, [84, 102], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zipB = interpolate(frame, [92, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const table = interpolate(frame, [104, 122], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checks = interpolate(frame, [128, 146], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '56px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Headline kicker="导出" title="先校验、再成对导出，pack_format 自动匹配" size={52} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 6, opacity: badge }}>
            <span style={{ fontSize: 17, color: C.dim }}>问题</span>
            <span
              style={{
                minWidth: 34,
                textAlign: 'center',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 800,
                color: '#1b1430',
                background: '#ff8f8f',
              }}
            >
              3
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 26, flex: 1, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 1010 }}>
            {/* 阶段一：校验弹窗（随后收起） */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                opacity: modal * (1 - collapse),
                height: `${(1 - collapse) * 200}px`,
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 18, color: C.dim, letterSpacing: 1 }}>校验结果（3） · 点一条直接跳到出错字段</div>
              {ISSUES.map(([title, detail, tone], i) => {
                const hot = i === 0 ? jumped : 0;
                return (
                  <div
                    key={title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderRadius: 11,
                      border: `1px solid ${hot > 0.5 ? C.accent : C.line}`,
                      background: hot > 0.5 ? 'rgba(185,140,255,0.14)' : 'rgba(255,255,255,0.03)',
                      opacity: interpolate(frame, [18 + i * 7, 32 + i * 7], [0, 1], { extrapolateRight: 'clamp' }),
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
                        color: tone === 'err' ? '#ff8f8f' : '#f4c684',
                        border: `1px solid ${tone === 'err' ? '#ff8f8f66' : '#f4c68466'}`,
                      }}
                    >
                      !
                    </span>
                    <span style={{ fontSize: 19, color: C.text, width: 330 }}>{title}</span>
                    <span style={{ fontSize: 16, color: C.dim }}>{detail}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 15, color: hot > 0.5 ? C.accent : '#6d6086' }}>
                      {hot > 0.5 ? '→ 已跳到「条目 intro · 名称」' : '跳转'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 阶段二：两个包 */}
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
              hint="book.json 在 data 侧，必须成对"
              accent={C.accent2}
              glyph="◨"
              appear={zipB}
              lines={['data/mymod/patchouli_books/guide/book.json']}
            />

            <Panel label="导出前自动修 / 自动补" style={{ opacity: checks }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['图片路径缺 textures/ 前缀', '已自动补全'],
                  ['页型名 campfire_cooking 拼错', '已建议 patchouli:campfire'],
                  ['多语言目录名写错', '已提示 → 会整份回退 en_us'],
                ].map(([title, detail], i) => (
                  <div
                    key={title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 17,
                      opacity: interpolate(frame, [132 + i * 7, 146 + i * 7], [0, 1], { extrapolateRight: 'clamp' }),
                    }}
                  >
                    <span style={{ color: C.mint, width: 18 }}>✓</span>
                    <span style={{ color: C.text, width: 380 }}>{title}</span>
                    <span style={{ color: C.dim, fontSize: 15 }}>{detail}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel label="pack_format 不用自己查" width={640} height={320} style={{ opacity: table }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Forge 1.20.1', '15', '15'],
                ['NeoForge 1.21.1', '34', '48'],
              ].map(([target, res, data]) => (
                <div
                  key={target}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: `1px solid ${C.line}`,
                    background: 'rgba(185,140,255,0.07)',
                  }}
                >
                  <span style={{ fontSize: 20, color: C.text, width: 210, fontFamily: FONT }}>{target}</span>
                  <span style={{ fontSize: 15, color: C.dim }}>资源包</span>
                  <span style={{ fontSize: 24, color: C.accent, fontFamily: MONO }}>{res}</span>
                  <span style={{ fontSize: 15, color: C.dim }}>数据包</span>
                  <span style={{ fontSize: 24, color: C.accent2, fontFamily: MONO }}>{data}</span>
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
