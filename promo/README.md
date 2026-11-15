# Patchouli Helper 宣传片（Remotion）

30 秒 1080p 宣传片，全部用 React + CSS 画出来，没有任何外部图片/字体/音乐素材。

## 分镜

| 时间 | 场景 | 内容 |
|---|---|---|
| 0.0–3.6s | `Hook` | 羊皮纸手册 + 「帕秋莉手册 · 可视化编辑」 |
| 3.3–10.2s | `Editor` | 编辑器三栏界面模拟（结构 / 表单 / 书页） |
| 9.9–15.6s | `PageTypes` | 16 种内置页型卡片逐个弹出 |
| 15.3–21.2s | `I18n` | 语言按钮 + 完成度环 + 「查看明细」提示条 |
| 20.9–26.8s | `ImportExport` | jar → 资源包 + 数据包，版本标签 |
| 26.5–32.0s | `Outro` | 片尾 logo、仓库地址、版本 |

## 预览

```bash
cd promo
npm run studio          # 打开 Remotion Studio，拖时间轴逐帧看
```

## 导出 MP4

```bash
cd promo
npm run render          # out/promo.mp4
```

如果不在依赖里带 Chromium（本机没下载成功 headless shell），可以用系统 Edge 当渲染浏览器：

```bash
remotion render Promo out/promo.mp4 --browser-executable="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

Windows 上若 ffmpeg 报 `pre-encode.mp4: Permission denied`，把临时目录指到可写位置：

```bash
TEMP=./out/tmp TMP=./out/tmp remotion render Promo out/promo.mp4
```

## 结构

```
promo/
├── src/
│   ├── index.ts            registerRoot
│   ├── Root.tsx            <Composition id="Promo"> + <Composition id="Bed">
│   ├── Promo.tsx           全片时间轴（Sequence 拼场景）+ 共用背景
│   ├── theme.ts            配色 / 字体 / 画幅常量
│   ├── components/         BookCover、BookSpread、EditorWindow、Fade/Headline/NoteBar
│   └── scenes/             六个场景
└── out/                    渲染产物（已被 .gitignore 忽略）
```

`Bed` 是只有背景的 1 帧合成，用来给 `scripts/check-frames.py` 做差分，量前景内容的包围盒
（这个模型看不到图，用数值体检代替肉眼）。

## 改文案 / 配色

- 文案：每个场景文件里直接改字符串
- 配色：`src/theme.ts` 的 `C`（与编辑器本体配色一致）
- 时长：`src/Root.tsx` 的 `durationInFrames`，以及 `src/Promo.tsx` 里 `SCENES` 的 `from/dur`
