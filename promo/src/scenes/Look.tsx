import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Chip, Panel } from '../components/panels';
import { Fade, Headline } from '../components/ui';

const COLORS: Array<[string, string, string]> = [
  ['正文', '#000000', 'text_color'],
  ['标题', '#333333', 'header_color'],
  ['名牌', '#FFDD00', 'nameplate_color'],
  ['链接', '#0000EE', 'link_color'],
  ['进度条', '#FFFF55', 'progress_bar_color'],
];

const TEX = [
  ['book_texture', 'mymod:textures/gui/book_custom.png', '#8b5a2b'],
  ['filler_texture', 'patchouli:textures/gui/page_filler.png', '#c9b493'],
  ['crafting_texture', 'patchouli:textures/gui/crafting.png', '#b59f78'],
];

const Toggle: React.FC<{ label: string; json: string; on: number; delay: number }> = ({ label, json, on, delay }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: p }}>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: on > 0.5 ? 'rgba(111,211,168,0.85)' : 'rgba(255,255,255,0.12)',
          border: `1px solid ${on > 0.5 ? C.mint : C.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: on > 0.5 ? 'flex-end' : 'flex-start',
          padding: 3,
        }}
      >
        <div style={{ width: 16, height: 16, borderRadius: 999, background: '#fff', opacity: 0.9 }} />
      </div>
      <span style={{ fontSize: 19, color: C.text, width: 210, fontFamily: FONT }}>{label}</span>
      <span style={{ fontSize: 14, color: C.dim, fontFamily: MONO }}>{json}</span>
    </div>
  );
};

/** 书籍设置：外观 / 行为 / i18n 模式 */
export const Look: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const swatch = (i: number) => interpolate(frame, [24 + i * 9, 32 + i * 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ringIndex = Math.min(4, Math.floor(interpolate(frame, [30, 110], [0, 4.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const i18nOn = interpolate(frame, [168, 186], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <Fade durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ padding: '58px 100px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Headline kicker="书籍设置" title="封面贴图、五种颜色、开合音效、宏 —— 都能点着改" size={52} />

        <div style={{ display: 'flex', gap: 28, flex: 1, alignItems: 'center' }}>
          <Panel label="外观（写入 book.json）" width={880} height={540}>
            <div style={{ display: 'flex', gap: 12 }}>
              {COLORS.map(([label, hex, json], i) => (
                <div
                  key={json}
                  style={{
                    flex: 1,
                    opacity: swatch(i),
                    border: `2px solid ${i === ringIndex ? C.accent : 'transparent'}`,
                    borderRadius: 12,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    alignItems: 'center',
                    boxShadow: i === ringIndex ? `0 0 24px rgba(185,140,255,0.45)` : 'none',
                  }}
                >
                  <div style={{ width: '100%', height: 54, borderRadius: 8, background: hex, border: '1px solid #00000044' }} />
                  <div style={{ fontSize: 17, color: C.text }}>{label}</div>
                  <div style={{ fontSize: 13, color: C.dim, fontFamily: MONO }}>{hex}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {TEX.map(([key, path, tint], i) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: interpolate(frame, [60 + i * 10, 74 + i * 10], [0, 1], { extrapolateRight: 'clamp' }),
                  }}
                >
                  <div style={{ width: 40, height: 52, borderRadius: 6, background: tint, border: '1px solid #6b5636' }} />
                  <span style={{ fontSize: 16, color: C.dim, fontFamily: MONO, width: 150 }}>{key}</span>
                  <span style={{ fontSize: 15, color: '#a99cc4', fontFamily: MONO }}>{path}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
              {['book_open 翻书声', 'book_flip 翻页声'].map((s, i) => (
                <div
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: `1px solid ${C.line}`,
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: 17,
                    color: C.text,
                    opacity: interpolate(frame, [92 + i * 10, 106 + i * 10], [0, 1], { extrapolateRight: 'clamp' }),
                  }}
                >
                  <span style={{ color: C.mint }}>▶</span>
                  {s}
                </div>
              ))}
              <div style={{ marginLeft: 'auto' }}>
                <Chip tone="accent">不用记字段名</Chip>
              </div>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <Panel label="行为开关" height={300}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Toggle label="显示进度条" json="show_progress" on={1} delay={30} />
                <Toggle label="像素字（blocky）" json="use_blocky_font" on={0} delay={38} />
                <Toggle label="打开时暂停游戏" json="pause_game" on={0} delay={46} />
                <Toggle label="i18n 语言键模式" json="i18n" on={i18nOn} delay={54} />
              </div>
            </Panel>

            <Panel label="宏 macros：一处改成处处改" height={222}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: MONO, fontSize: 17 }}>
                <div style={{ color: C.dim }}>"macros": {'{'}</div>
                <div style={{ color: '#c6f5e4', paddingLeft: 18 }}>
                  "modname": "$(l)$(#7a4b2a)艾德模组$()"
                </div>
                <div style={{ color: C.dim }}>{'}'}</div>
                <div style={{ color: '#9b8fb5', fontSize: 15, marginTop: 4 }}>
                  正文里写 $(modname) → 导出时替换成实际内容
                </div>
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  fontSize: 17,
                  color: i18nOn > 0.5 ? C.mint : C.dim,
                  fontFamily: MONO,
                }}
              >
                {i18nOn > 0.5 ? '✓ 导出 assets/<modid>/lang/zh_cn.json，内容 JSON 只有一份' : '○ 关闭：每种语言一套文件夹'}
              </div>
            </Panel>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
