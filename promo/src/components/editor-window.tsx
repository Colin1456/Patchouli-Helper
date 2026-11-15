import React from 'react';
import { C, FONT, MONO } from '../theme';
import { BookSpread } from './book';

const Field: React.FC<{ label: string; value: string; hint?: string; mono?: boolean; warn?: boolean }> = ({
  label,
  value,
  hint,
  mono,
  warn,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ fontSize: 15, color: C.dim, display: 'flex', gap: 6, alignItems: 'center' }}>
      {label}
      <span
        style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 5,
          color: C.accent,
          background: 'rgba(185,140,255,0.14)',
          border: '1px solid rgba(185,140,255,0.35)',
        }}
      >
        i18n
      </span>
    </div>
    <div
      style={{
        padding: '9px 12px',
        borderRadius: 8,
        border: `1px solid ${C.line}`,
        background: '#1b1429',
        color: C.text,
        fontSize: 17,
        fontFamily: mono ? MONO : FONT,
      }}
    >
      {value}
    </div>
    {hint ? <div style={{ fontSize: 13, color: warn ? '#f4c684' : C.dim }}>{hint}</div> : null}
  </div>
);

export type EditorWindowProps = {
  width?: number;
  height?: number;
  /** 左栏宽度（可动画，用来演「拖动分隔条」） */
  sidebarWidth?: number;
  /** 中栏宽度 */
  formWidth?: number;
  /** 预览页：页码与左右页内容 */
  page?: number;
  spreadTitle?: string;
  spreadLines?: string[];
  /** 高亮「+ 条目」按钮 */
  flashAdd?: number;
  /** 高亮复制页图标 */
  flashDuplicate?: number;
};

/** 编辑器的三栏界面模拟：结构树 / 表单 / 拟真书页。 */
export const EditorWindow: React.FC<EditorWindowProps> = ({
  width = 1400,
  height = 720,
  sidebarWidth = 250,
  formWidth = 480,
  page = 0,
  spreadTitle = '开始',
  spreadLines = ['挖掉一棵树就能开始。', '再合成一张工作台。'],
  flashAdd = 0,
  flashDuplicate = 0,
}) => {
  const navItem = (text: string, opts: { active?: boolean; indent?: boolean; tag?: string } = {}) => (
    <div
      key={text}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        marginLeft: opts.indent ? 16 : 0,
        borderRadius: 7,
        fontSize: 16,
        color: opts.active ? C.text : '#b7a8d0',
        background: opts.active ? 'rgba(185,140,255,0.16)' : 'transparent',
        border: `1px solid ${opts.active ? 'rgba(185,140,255,0.38)' : 'transparent'}`,
      }}
    >
      <span style={{ color: C.accent, fontSize: 11 }}>{opts.indent ? '▸' : '◆'}</span>
      <span style={{ flex: 1 }}>{text}</span>
      {opts.tag ? (
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 5,
            color: '#f4c684',
            background: 'rgba(240,180,95,0.14)',
            border: '1px solid rgba(240,180,95,0.4)',
          }}
        >
          {opts.tag}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        background: C.ink2,
        border: `1px solid ${C.line}`,
        boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 窗口顶栏 */}
      <div
        style={{
          height: 46,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          background: '#120d1e',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c, opacity: 0.85 }} />
        ))}
        <div
          style={{
            marginLeft: 14,
            fontSize: 13,
            color: C.dim,
            fontFamily: MONO,
            background: '#0d0a16',
            padding: '4px 12px',
            borderRadius: 7,
            border: `1px solid ${C.line}`,
          }}
        >
          Patchouli-Helper-v0.1.4.html
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#1b1430',
              background: 'linear-gradient(180deg,#d7b7ff,#b98cff)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            v0.1.4
          </span>
          <span style={{ fontSize: 12, color: C.dim }}>校验 0</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 左：结构树 */}
        <div
          style={{
            width: sidebarWidth,
            padding: 14,
            background: '#150f22',
            borderRight: `1px solid ${C.line}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontSize: 13, color: C.dim, letterSpacing: 2, marginBottom: 6 }}>书籍结构</div>
          {navItem('基础', { tag: undefined })}
          {navItem('简介', { indent: true, active: true })}
          {navItem('第二步', { indent: true, tag: '未译' })}
          {navItem('进阶', {})}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, fontSize: 12, color: C.dim, border: `1px dashed ${C.line}`, borderRadius: 7, padding: '7px 0', textAlign: 'center' }}>
              + 分类
            </div>
            <div
              style={{
                flex: 1,
                fontSize: 12,
                color: flashAdd > 0.5 ? '#1b1430' : C.dim,
                background: flashAdd > 0.5 ? 'linear-gradient(180deg,#d7b7ff,#b98cff)' : 'transparent',
                border: `1px ${flashAdd > 0.5 ? 'solid' : 'dashed'} ${flashAdd > 0.5 ? '#c9a6ff' : C.line}`,
                borderRadius: 7,
                padding: '7px 0',
                textAlign: 'center',
              }}
            >
              + 条目
            </div>
          </div>
        </div>

        {/* 中：表单 */}
        <div
          style={{
            width: formWidth,
            padding: 18,
            borderRight: `1px solid ${C.line}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>简介</span>
            <span style={{ fontSize: 12, color: C.dim }}>条目</span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 8,
                fontSize: 13,
                color: flashDuplicate > 0.5 ? '#1b1430' : C.dim,
              }}
            >
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: flashDuplicate > 0.5 ? 'linear-gradient(180deg,#d7b7ff,#b98cff)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${flashDuplicate > 0.5 ? '#c9a6ff' : C.line}`,
                }}
              >
                复制页
              </span>
              <span style={{ padding: '3px 9px', borderRadius: 6, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.05)' }}>
                上移
              </span>
            </span>
          </div>
          <Field label="条目 id（即文件路径）" value="intro" mono />
          <Field label="条目名 name" value="简介" />
          <Field label="图标 icon" value="minecraft:paper" mono />
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${C.line}`,
              background: '#1b1429',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.dim }}>
              <span style={{ color: C.accent }}>①</span> 第 1 页 · 文本（patchouli:text）
            </div>
            <div style={{ fontSize: 16, color: C.text, lineHeight: 1.6 }}>
              挖掉一棵树就能开始。
              <br />
              再合成一张工作台。
            </div>
          </div>
        </div>

        {/* 右：书页预览 */}
        <div
          style={{
            flex: 1,
            background: 'radial-gradient(120% 120% at 50% 0%, #241a36, #120d1d 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <BookSpread
              width={Math.min(600, width - sidebarWidth - formWidth - 48)}
              leftTitle="基础"
              leftLines={['入门所需的一切']}
              rightTitle={spreadTitle}
              rightLines={spreadLines}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: C.dim }}>
              <span>◀</span>
              <span style={{ color: C.text }}>
                {page + 1} / 2
              </span>
              <span>▶</span>
              <span style={{ marginLeft: 8, color: '#7c6f95' }}>← → 翻页</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
