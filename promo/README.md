# Patchouli Helper 宣传片（Remotion）

30 秒 1080p 宣传片，全部用 React + CSS 画出来，没有任何外部图片/字体/音乐素材。

## 分镜（72 秒 / 11 个场景 / 2160 帧 @30fps）

| 时间 | 场景文件 | 内容 |
|---|---|---|
| 0.0–4.5s | `Hook` | 羊皮纸手册 + 「帕秋莉手册 · 可视化编辑」 |
| 4.2–11.0s | `Problem` | 手写 JSON 的痛：两段 JSON 逐行敲入，`campfire_cooking` 标红 → 游戏里「手册打不开」，右侧 6 个坑 |
| 10.7–21.3s | `Editor` | 三栏高亮（结构树/表单/书页）→ **拖动分隔条**（左栏 250→330）→ **翻页**（1/2 → 2/2）→ **加条目/复制页**高亮 |
| 21.1–30.1s | `Look` | **书籍设置**：五种颜色（正文/标题/名牌/链接/进度条）、三种贴图、开合音效、`macros` 宏、行为开关，以及 **i18n lang key 模式**开关 |
| 29.8–37.3s | `PageTypes` | 16 张页型卡片 + 四个细看：合成 3×3、聚光页、多方块、**图片页（选图/缩放）** |
| 37.1–43.3s | `RichText` | 12 个格式按钮逐个点亮（含斜体/删除线/换行/列表），源码逐字敲出，右侧同步渲染 |
| 43.1–50.0s | `I18n` | 三语言 + 完成度环 + 「zh_tw 未翻译清单」弹窗 |
| 49.7–56.0s | `Project` | **`.phbook` 工程**：Ctrl+S 保存、拖进窗口续编、**JSON 预览与复制当前页** |
| 55.7–61.7s | `Import` | jar 目录树逐行扫描 → 找到书籍 → 贴图/多语言/富文本/未知页型怎么处理 |
| 61.4–69.3s | `Export` | **校验联动**：徽标「3」→ 列表 → 点一条跳到出错字段；随后两个包 + pack_format 表 |
| 68.3–72.0s | `Outro` | logo、仓库地址、版本与平台 |

相邻场景重叠 8 帧交叉淡化；每个场景内部自带 `Fade`。

## 配乐

配乐是**代码合成**的，没有采样、没有版权问题：

```bash
node scripts/make-music.mjs      # 生成 public/music.wav（32s / 48kHz / 立体声）
```

- 120 BPM，A 小调 `Am–F–C–G`，36 小节正好 72 秒，与画面同长
- 十个场景切换点（4.2 / 10.7 / 21.3 / 29.8 / 37.0 / 43.0 / 49.7 / 55.7 / 61.4 / 68.3s）各有一个 whoosh 噪声扫频
- 段落跟着画面走：0–4s 铺底 → 4–12s 心跳（痛点）→ 12–28s 鼓+琶音 → 28–36s 抽薄（页型）→ 36–50s 温和铃声 → 50–68s 逐步加满 → 68–72s 收尾
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

## 发布素材（发 B站 / 投稿用）

| 文件 | 规格 | 用途 |
|---|---|---|
| `out/promo.mp4` | 72s / 1080p / 约 1.7 Mbps / 15 MB | 日常分享、预览 |
| `out/promo-bilibili-1080p.mp4` | 72s / 1080p / CRF 14 + slow preset（体积大得多） | **上传 B站 用母版**，平台二压后更干净 |
| `out/cover.png` | 1920×1080 PNG（<2 MB） | 封面（无损） |
| `out/cover-1146x717.jpg` | 1146×717 JPG 87 KB | 封面（B站建议尺寸，直接传这个最稳） |
| `out/cover-1920x1080.jpg` | 1920×1080 JPG 171 KB | 封面备用 |

封面是 `src/Cover.tsx`（`Composition id="Cover"`，静态 1 帧）：

```bash
remotion still Cover out/cover.png --frame=0 --browser-executable="…msedge.exe"
```

改封面文案直接编辑 `src/Cover.tsx` 里的标题与副标题。

