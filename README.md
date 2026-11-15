# Patchouli Helper — 帕秋莉手册可视化编辑器

> 让你简单容易的制作帕秋莉手册模组的手册 / A simple and easy guide for you to make a Patchouli mod handbook
>
> **[⬇ 下载最新版](https://github.com/Colin1456/Patchouli-Helper/releases/latest)**（zip 含单文件 HTML）　·　也可以直接双击仓库里的 `dist/Patchouli-Helper.html`

用图形界面写 Minecraft [Patchouli](https://github.com/VazkiiMods/Patchouli) 手册，不用手写 JSON。
左边是书籍结构树（书 → 分类 → 条目 → 页面），中间是字段表单，右边是**实时书页预览**和 **JSON 预览**。
写完一键导出成「资源包 zip + 数据包 zip」，直接丢进 `resourcepacks/` 和存档 `datapacks/` 就能在游戏里看到书。

支持 **Forge 1.20.1** 与 **NeoForge 1.21.1**（两版书籍 JSON 格式完全一致，只有 `pack_format` 不同）。

---

## 快速开始

### 方式一：双击单文件（推荐）

下载 [`dist/Patchouli-Helper.html`](dist/Patchouli-Helper.html)（约 155 KB），**双击用浏览器打开即可**。
CSS / JS / 图标全部内联在这一个文件里，不需要安装、不需要 Node、断网也能用，换电脑只拷这一个文件。

- 工程自动存在浏览器 `localStorage`；重要工程请用顶栏「保存」导出 `.phbook` 文件
- 换浏览器 = 一份新的空白工程（`localStorage` 不共享）

### 方式二：本地开发

```bash
npm ci          # 或 npm install
npm run dev     # http://127.0.0.1:4173
```

改完前端后重新生成单文件：

```bash
npm run build:html   # → dist/Patchouli-Helper.html
```

---

## 功能

| 区域 | 能力 |
|---|---|
| 书籍结构 | 分类 / 条目的增删、排序、id（= 文件路径）重命名，未翻译项高亮 |
| 表单 | `book.json` 全部字段、分类/条目字段、宏、资源文件；schema 驱动，加页型只改 `web/js/schema.js` |
| 页面 | 16 种内置页型全部可视化编辑：text、crafting、smelting、blasting、smoking、**campfire**、stonecutting、smithing、image、spotlight、entity、multiblock（带逐层结构预览）、link、relations、quest、empty |
| 富文本 | 工具栏插入 `$(l)` 粗体、`$(item)`、`$(l:条目)` 内链、`$(k:)` 按键、`$(t:)` 悬停、颜色盘；输入时实时渲染 |
| 预览 | 拟真跨页书本：羊皮纸质感、封面配色、翻页；按可用高度自动缩放，两条分隔条可拖动调列宽（双击复位） |
| 校验 | 缺字段、分类引用不存在、id 非法或含 `en_us`、图片路径没带 `textures/`、`campfire_cooking` 拼错、multiblock 二选一…… 点条目直接跳转 |
| 导入 | **一键从 `.jar` / `.zip` 导入**（模组 jar、资源包、数据包都行，自动找 `patchouli_books`、多语言与图片一并还原）；也可选一个 `assets/` 或 `data/` 目录 |
| 导出 | 资源包 zip（自动附带数据包 zip）、整书 JSON 查看、当前页 JSON 复制 |

### 为什么导出两个包

Patchouli 的书**声明** `book.json` 在 `data/<modid>/patchouli_books/<book>/` 下，而**内容**在 `assets/...` 下。
资源包只能提供 `assets/`，所以「新增一本新书」必须成对安装：

| 组成 | 放进 | 作用 |
|---|---|---|
| `*-resourcepack.zip` | `.minecraft/resourcepacks/`，在「选项 → 资源包」启用 | 分类 / 条目 / 页面 / 贴图 / 语言文件 |
| `*-datapack.zip` | 存档 `datapacks/`，`/datapack list` 确认启用 | 只有 `book.json` |

只**覆盖别人模组里已存在的书**时，仅需资源包。

### 把书放进自己的模组

单文件版无法直接写磁盘目录，做法是：导出资源包 zip → 解压，`assets/` 与 `data/` 一并拷进模组的 `src/main/resources/`。
（`book.json` 里的 `use_resource_pack` 会被强制写成 `true` —— 少了它 Patchouli 会直接拒绝加载。）

---

## 语言与本地化

两种模式，可在「书籍设置 → 语言与本地化」切换：

- **文件夹模式（推荐）**：每种语言一套 `categories/` `entries/` JSON。`en_us` 永远输出，其它语言只输出已翻译的文件；游戏里缺失时**整份文件**回退到 `en_us`。
- **i18n 模式**：`book.json` 写 `"i18n": true`，所有文本变成 lang key，导出时生成 `assets/<modid>/lang/<lang>.json`，内容 JSON 只有一份。

注意：Patchouli 用字符串替换把路径里的 `en_us` 换成当前语言，所以**条目/分类 id 不能包含 `en_us`**（校验器会拦）。

**翻译完成度随时可见**（v0.1.4 起）：语言按钮的圆点绿=全译、黄=部分、空心虚线=零译文；统计口径是**会导出哪个文件**（与 `serializeContent` 一致）——文件夹模式数 `zh_cn/entries/*.json` 之类，i18n 模式数 lang key，所以全译的书就是 100%。当前语言不全时顶部出现提示条，**「查看明细」**列出到底哪几条没译（可点击跳转）。树里整条没译的挂「未译」标签；未翻译字段的编辑框留空，用占位提示写明「游戏里显示 en_us：…」，不会再把 en_us 冒充成译文。回退语言固定为 `en_us`，与「基准语言」设置无关。

---

## 界面与快捷键

| 快捷键 | 作用 |
|---|---|
| `Ctrl/Cmd + S` | 保存工程（`.phbook`） |
| `Ctrl/Cmd + Z` / `Ctrl + Y` | 撤销 / 重做 |
| `Ctrl/Cmd + E` | 导出资源包 zip |
| 拖动两条竖线 | 调整侧栏 / 预览宽度（双击复位） |

---

## 目录结构

```
web/                 前端源码（无打包器，ES modules）
  index.html
  css/app.css
  js/  main.js  store.js  model.js  schema.js  serialize.js
       validate.js  richtext.js  zip.js  zip-reader.js  io.js  import.js  profiles.js  util.js
  js/ui/  tree.js  editor.js  fields.js  rte.js  preview.js  modals.js  rte
  assets/icon-128.png
scripts/
  build-html.mjs     打包成单文件 HTML（esbuild + 内联）
  start-web.mjs      本地静态服务器
  ui-check.mjs       无头浏览器 22 项界面断言（http:// 与 file:// 都支持）
  debug-page.mjs     打开任意 URL，打印异常与 DOM 状态
tests/core.test.mjs  12 项核心单测
docs/                格式速查、构建说明、界面截图
dist/                单文件 HTML（发布物）
```

---

## 开发与测试

```bash
npm test             # 12 项单测：序列化 / pack_format / i18n 键 / 富文本 / 校验 / zip CRC / 导入回环
npm run dev          # 起本地服务器
npm run ui:check     # 对 http://127.0.0.1:4173 跑界面断言（需先 npm run dev）
npm run build:html   # 打包单文件
npm run check:html   # 对打包后的 file:// 页面跑同一套断言
```

`ui-check.mjs` 用 CDP 驱动无头 Edge/Chrome，断言侧栏、编辑器、双页预览、16 种页型、分栏拖拽、
1024×600 不溢出、无 console 错误，并截图。

---

## 常见问题

| 现象 | 处理 |
|---|---|
| 双击 HTML 打开是空白 | 用较新的 Edge / Chrome / Firefox；老版 IE 内核不支持 ES2020 |
| 「导出资源包」没反应 | 浏览器可能拦截了多文件下载，允许本站点多文件下载后重试 |
| 导入目录里啥也没识别 | 选的是含 `assets/`（或 `data/`）的**上一级**目录；`book.json` 或 `entries/` 至少要有其一 |
| 书在游戏里不显示 | `book.json` 必须在 `data/` 侧；`datapack` 要启用；`pack_format` 与该 MC 版本匹配（1.20.1 资源包 15 / 数据包 15，1.21.1 资源包 34 / 数据包 48） |
| 翻译不生效 | 语言目录名必须小写；缺失时整份文件回退 en_us；id 里不能出现 `en_us` |

---

## 相关文档

- [docs/patchouli-format.md](docs/patchouli-format.md) —— 目录结构、book/category/entry 字段、16 种页型、富文本控制码、pack_format 对照
- [docs/build.md](docs/build.md) —— 打包与发布说明
- [LICENSE](LICENSE) —— LGPL-2.1
