# Patchouli Helper v0.1.2

帕秋莉手册（Patchouli）可视化编辑器 —— **单文件 HTML**，双击即用。

## 下载

`Patchouli-Helper-0.1.0.zip` 解压后双击 `Patchouli-Helper.html`，用 Edge / Chrome 打开即可。
不需要安装、不需要 Node、不需要联网。

## 修复（相对 v0.1.1）

- **弹窗被顶栏挡住/贴到左上角**：`modal-backdrop` 用的 `inset: 0` 在旧内核不支持，改成 `top/right/bottom/left` 四边 + flex 居中
- **「导入 ▾ / 导出 ▾」菜单只露出一条**：顶栏 `overflow-x` 会裁掉 `position: absolute` 子元素，改用 `fixed` + JS 按按钮坐标定位
- `width: min(...)` 换成 `width + max-width`，避免旧内核整条声明失效导致宽度异常
- **下拉菜单只露小半条**：顶栏的 `backdrop-filter` 会把 `position: fixed` 子元素拽回顶栏坐标系，菜单被限制在 48px 高度内 → 改为把菜单 portal 到 `<body>`，成为真正的视口级浮层（z-index 90）
- `ui-check` 新增「弹窗居中且完整可见」「下拉菜单完整可见」「菜单浮在最上层」「菜单项可点击」四项断言

## 功能

- 可视化编辑 `book.json`、分类、条目与 **16 种内置页型**（text / crafting / smelting / blasting / smoking / campfire / stonecutting / smithing / image / spotlight / entity / multiblock / link / relations / quest / empty）
- 拟真跨页书本预览：羊皮纸质感、封面配色、翻页、按窗口自适应缩放；两条分隔条可拖动调列宽（双击复位）
- 富文本工具栏：`$(l)` 粗体、`$(item)`、`$(l:条目)` 内链、`$(k:)` 按键、`$(t:)` 悬停、调色板，输入时实时渲染
- 两种本地化模式：每语言文件夹 / i18n lang key，自动生成 `assets/<modid>/lang/*.json`
- 校验器：缺字段、分类引用不存在、id 非法或含 `en_us`、图片路径缺 `textures/`、`campfire_cooking` 拼错等
- **一键从 `.jar` / `.zip` 导入**：直接选模组 jar 或资源包，自动找 `patchouli_books`，多语言与图片一并还原（包内多本书会让你选）
- 导出：**资源包 zip + 数据包 zip**（Patchouli 的 `book.json` 在 `data/` 侧，故必须成对）、整书 JSON 预览、当前页 JSON

## 支持版本

| 目标 | 资源包 pack_format | 数据包 pack_format |
|---|---|---|
| Forge 1.20.1 | 15 | 15 |
| NeoForge 1.21.1 | 34 | 48 |

两版书籍 JSON 格式一致，切换 Profile 即可。

## 已知限制

- 无桌面版：无法直接写入模组工程目录，导出 zip 后自行解压到 `src/main/resources`
- 模板页（`templates/`）不可视化编辑；未知页型保留但只提示
- `extra_recipe_mappings` 暂无表单（导入会保留）

## 验证

- 12 项核心单测：序列化 / pack_format / i18n 键 / 富文本 / 校验 / zip CRC / 导入回环
- 23 项无头浏览器界面断言（`file://` 与 `http://` 双模式）：16 页型渲染、分栏拖拽、1024×600 与 600×800 不溢出、无 console 错误
