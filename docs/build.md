# 构建与发布

本项目只有两种产物，都不需要 Rust / 安装包：

## 1. 单文件 HTML（发布用）

```bash
npm ci
npm run build:html
# → dist/Patchouli-Helper.html （约 155 KB）
```

打包过程（`scripts/build-html.mjs`）：

1. `esbuild` 把 `web/js/main.js` 及其依赖打成单个 IIFE（`minify: true`）
2. 读取 `web/index.html`，把 `<link rel="stylesheet">` / `<link rel="icon">` / `<script type="module">`
   换成内联的 `<style>` / data-URI 图标 / `<script>`
3. 写出单个 `.html`

> 注意：替换必须用函数形式 `replace(x, () => js)`。压缩后的 JS 里含有 `$&`、`$'` 等序列，
> 直接传字符串会被 `String.replace` 当成占位符展开，把匹配到的文本（例如 `</body>`）插进脚本里。

## 2. 直接部署静态站点（可选）

`web/` 本身就是可直接托管的静态站点（无构建步骤）：

```bash
npm run dev          # 本地 http://127.0.0.1:4173
```

放到任何静态托管（GitHub Pages / Cloudflare Pages / Nginx）都能用，
把仓库的 `web/` 目录作为站点根目录即可。若托管在子路径，记得同步调整 `index.html` 里的相对路径（当前全部是 `./` 相对引用，可直接用）。

## 校验

```bash
npm test             # 12 项核心单测
npm run dev &        # 起服务器
npm run ui:check     # 界面断言（http）
npm run check:html   # 界面断言（file:// 单文件产物）
```
