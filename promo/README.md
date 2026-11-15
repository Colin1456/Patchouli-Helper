# Patchouli Helper 宣传片（Remotion）

30 秒 1080p 宣传片，全部用 React + CSS 画出来，没有任何外部图片/字体/音乐素材。

## 分镜（60 秒 / 9 个场景 / 1800 帧 @30fps）

| 时间 | 场景文件 | 内容 |
|---|---|---|
| 0.0–4.5s | `Hook` | 羊皮纸手册 + 「帕秋莉手册 · 可视化编辑 · 改一页内容，不该花一晚上写 JSON」 |
| 4.2–11.0s | `Problem` | 手写 JSON 的痛：两段 book.json / entry.json 逐行敲入，`campfire_cooking` 标红 → 游戏里「手册打不开」，右侧列出 6 个坑 |
| 10.7–20.0s | `Editor` | 三栏界面，紫色高亮依次框住「结构树 → 表单 → 书页」，底部快捷键条 |
| 19.7–29.0s | `PageTypes` | 16 张页型卡片错峰弹出；右侧三个细看：合成 3×3 配方、聚光页、多方块结构 |
| 28.7–36.0s | `RichText` | 工具栏逐个点亮，源码逐字敲出 `$(l)$(item)$(l:entry)`，右侧同步渲染成书页效果 |
| 35.7–44.5s | `I18n` | 三语言按钮 + 完成度条 + 100% 圆环 → 弹出「zh_tw 未翻译清单（3）」，逐条定位 |
| 44.2–51.0s | `Import` | jar 目录树逐行扫描打勾 → 找到「我的模组手册」3 分类/24 条目/71 页，贴图与多语言一起还原 |
| 50.7–57.0s | `Export` | 资源包 + 数据包成对导出、导出前 4 条校验、pack_format 对照表（1.20.1 → 15/15，1.21.1 → 34/48） |
| 56.7–60.0s | `Outro` | logo、仓库地址、v0.1.4 与平台标签 |

相邻场景重叠 8 帧做交叉淡入；每个场景内部自带 `Fade`（12 帧淡入 / 14 帧淡出）。

## 配乐

配乐是**代码合成**的，没有采样、没有版权问题：

```bash
node scripts/make-music.mjs      # 生成 public/music.wav（32s / 48kHz / 立体声）
```

- 120 BPM，A 小调 `Am–F–C–G`，30 小节正好 60 秒，与画面同长
- 八个场景切换点（4.2 / 10.7 / 19.7 / 28.7 / 35.7 / 44.2 / 50.7 / 56.7s）各有一个 whoosh 噪声扫频
- 段落跟着画面走：0–4s pad 铺底 → 4–12s 心跳式铺底（痛点段）→ 12–30s 鼓与琶音 → 30–36s 抽薄 → 36–44s 铃声主题 → 44–58s 逐步加满 → 58–60s 收尾
- 母带：tanh 软限幅 + 首尾淡入淡出 + 归一化到 −1 dBFS，脚本会打印峰值和各段 RMS 便于确认没有空段

改速度/和弦/编排都在 `scripts/make-music.mjs` 顶部（`BPM`、`CHORDS`、`CUTS`）。

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
