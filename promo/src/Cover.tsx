import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Backdrop } from './Promo';
import { EditorWindow } from './components/editor-window';
import { C, FONT, MONO } from './theme';

const WIN_W = 1240;
const WIN_H = Math.round((WIN_W * 612) / 1300);

/**
 * 封面（1920×1080，B站建议 16:9）：上方大字卖点，下方完整编辑器界面（不裁切）。
 * 静态合成，用 `remotion still Cover` 出图。
 */
export const Cover: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
    <Backdrop />

    <div style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 26, letterSpacing: 8, color: C.accent, fontWeight: 700 }}>PATCHOULI HELPER</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1b1430',
            background: 'linear-gradient(180deg,#d7b7ff,#b98cff)',
            padding: '3px 12px',
            borderRadius: 999,
          }}
        >
          v0.1.4
        </span>
      </div>

      <div style={{ marginTop: 16, fontSize: 104, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
        改手册，不用写 JSON
      </div>

      <div style={{ marginTop: 18, fontSize: 32, color: '#c9bde0' }}>
        帕秋莉手册可视化编辑器
        <span style={{ marginLeft: 20, fontSize: 24, color: C.dim }}>
          Forge 1.20.1 · NeoForge 1.21.1 · 单文件 HTML 双击即用
        </span>
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        left: Math.round((1920 - WIN_W) / 2),
        top: 392,
        width: WIN_W,
        height: WIN_H,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 36px 90px rgba(0,0,0,0.7)',
      }}
    >
      <EditorWindow width={WIN_W} height={WIN_H} spreadTitle="开始" />
    </div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 40,
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        fontSize: 21,
        color: 'rgba(239,233,255,0.62)',
      }}
    >
      <span style={{ fontFamily: MONO }}>github.com/Colin1456/Patchouli-Helper</span>
      <span>·</span>
      <span>16 种页型 · 多语言 · jar 一键导入 · 导出资源包 + 数据包</span>
    </div>
  </AbsoluteFill>
);
