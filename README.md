# Patchouli Helper — 帕秋莉手册可视化编辑器

> 让你简单容易的制作帕秋莉手册模组的手册 / A simple and easy guide for you to make a Patchouli mod handbook

用图形界面写 Minecraft [Patchouli](https://github.com/VazkiiMods/Patchouli) 手册，不用手写 JSON。

左侧是书籍结构树（书 → 分类 → 条目 → 页面），中间是字段表单，右侧是**实时书页预览**和 **JSON 预览**。
写完一键导出成「资源包 zip + 数据包 zip」，直接丢进 `resourcepacks/` 和存档 `datapacks/` 就能在游戏里看到书。

- 桌面端：Tauri v2（`src-tauri/`），Rust 后端只做文件读写，逻辑全在前端
- 前端：**纯静态**、无打包器、无框架——`web/` 下的 `index.html` + ES modules，用浏览器直接打开也能跑（见下文）
- 零依赖运行时：zip 是自己写的（`web/js/zip.js`，`CompressionStream` 可用时 deflate，否则 store）

---

## 支持的版本

| 项目 | Forge 1.20.1 | NeoForge 1.21.1 |
| --- | --- | --- |
| 配置 ID（`profileId`） | `forge-1.20.1` | `neoforge-1.21.1` |
| Minecraft | 1.20.1 | 1.21.1 |
| Patchouli | 1.20.1-85 及以上 | 1.21.1-93 及以上 |
| 资源包 `pack_format` | 15 | 34 |
| 数据包 `pack_format` | 15 | 48 |
| `pack.mcmeta` 的 `supported_formats` | **不写**（1.20.1 不认识，1.20.2 才引入） | 写入 |
| 取书（give）语法 | `/give @p patchouli:guide_book{patchouli:book:"mymod:guide"}` | `/give @p patchouli:guide_book[patchouli:book="mymod:guide"]` |
| 打开书 | `/open-patchouli-book @s mymod:guide` | 同左 |
| 模组元数据文件 | `META-INF/mods.toml` | `META-INF/neoforge.mods.toml` |

两个版本的**作者侧 JSON 格式完全一致**（`book.json` / 分类 / 条目 / 页面字段没有任何差别），每一条页型、每一个字段都对着 1.20.1 与 1.21.x 的 Patchouli 源码与 jar 核对过（见 `web/js/schema.js`、`web/js/profiles.js` 顶部注释）。
版本差异只体现在 **pack_format、取书语法、模组元数据**这三处——编辑器按所选 profile 自动切换。

字段与页型的完整速查见 [docs/patchouli-format.md](docs/patchouli-format.md)。

---

## 功能

| 功能 | 说明 |
| --- | --- |
| 结构树编辑 | 书 / 分类 / 条目的增删改、`sortnum` 排序、父分类嵌套、`parent` 与条目 `category` 的引用 |
| 16 种内置页型 | text、crafting、smelting、blasting、smoking、campfire（**不是** `campfire_cooking`）、smithing、stonecutting、image、spotlight、empty、multiblock、link、relations、entity、quest |
| 富文本 | 工具条插入 `$(l)` `$(o)` `$(n)` `$(m)` `$(br)` `$(br2)` `$(li)` `$(item)` `$(thing)` `$(l:…)` `$(t:…)` `$(k:…)`；16 色调色板；按 Patchouli `BookTextParser` 语义实时渲染预览 |
| 多语言 | 两种模式：`folders`（每种语言一套 `<lang>/` 目录，Patchouli 原生回退）与 `keys`（`book.json` 的 `i18n: true`，文本变 lang key，另出 `assets/<modid>/lang/<lang>.json`） |
| 双预览 | 书页预览（翻页、缩放）+ 当前选中节点的 JSON 预览 |
| 校验 | `validate.js`：id 合法性与重复、id 含 `en_us`、缺 icon / 缺 `en_us` 文本、`parent` 非全限定、条目分类不存在、配方/物品 id 缺命名空间、`$(…)` 未闭合、`pamphlet` 分类数不为 1、`use_resource_pack`、自定义贴图未入库等，分 error / warning / info 三级，结果可点击跳转 |
| 工程文件 | `.phbook`（工程 JSON，含内嵌资源图片的 base64），新建 / 打开 / 保存；`import.js` 可把已有书籍目录或资源包读回工程 |
| 撤销重做 | 60 步历史，连续输入 700 ms 内的编辑合并为一步（`web/js/store.js`） |
| 自动保存 | 每次改动写 localStorage，崩溃/关窗不丢内容 |
| 导出 | 资源包 zip、资源包文件夹、直接写入模组工程、单页 JSON 复制、整书 JSON 打包 |
| 拖放 | 把 `.phbook` / `.json` 拖进窗口即可载入（`main.js` 的 `drop` 监听） |
| 桌面集成 | 通过 Rust 命令读写文件、探测路径、在系统文件管理器中显示（`reveal_path`） |

---

## 三种使用方式

### 方式一：开发运行

```bash
npm i
npm run tauri dev          # 没有打包器，Tauri 直接加载 ../web 静态目录
```

也可以分开跑：

```bash
npm run dev                # 只用浏览器调试前端：http://127.0.0.1:4173（scripts/start-web.mjs）
npm run tauri:dev          # 等价于 npm run tauri dev
npm run test               # node --test tests/core.test.mjs
```

`npm run dev` 是一个 50 行的静态服务器（`scripts/start-web.mjs`，`PORT` / `HOST` 环境变量可覆盖，默认 `127.0.0.1:4173`），只用来在浏览器里调界面，文件 IO 会退化成下载/上传。

`tauri.conf.json` 里 `build.frontendDist` 指向 `../web`，没有 `beforeDevCommand` / `beforeBuildCommand`——前端不需要编译，改完刷新即可。

### 方式二：打包安装

```bash
npm i
npm run tauri build        # 等价于 npm run tauri:build
```

产物在 `src-tauri/target/release/bundle/{msi,nsis,deb,appimage,dmg}`（带 `--target` 时路径里会多一层三元组目录）。
三平台前置依赖、MinGW 替代方案、GitHub Actions 矩阵构建见 [docs/build.md](docs/build.md)。

### 方式三：浏览器直接打开前端

`web/` 是纯静态的 ES module 站点，**但不能双击 `index.html`**：ES module 与 `fetch` 在 `file://` 下会被 CORS 拦掉，必须走 http。

```bash
npm run dev                          # 推荐：自带静态服务器，127.0.0.1:4173
# 或者用别的：
npx --yes serve web
python -m http.server 8080 --directory web
```

然后浏览器打开对应地址。前端通过 `globalThis.__TAURI__` 是否存在来判断运行环境（`web/js/io.js` 的 `isDesktop()`），所以在浏览器里编辑、预览、校验都能用。

浏览器模式与桌面模式的区别：

| 能力 | 桌面（Tauri） | 浏览器 |
| --- | --- | --- |
| 编辑、预览、校验、JSON 复制 | ✅ | ✅ |
| 导出资源包 zip | ✅ 保存对话框 + 写盘，并在同目录写「安装说明.txt」 | ✅ 直接下载 `<modid>-<book>-resourcepack.zip`、`-datapack.zip` 与 `-安装说明.txt` |
| 导出文件夹 / 写入模组工程 | ✅ 直接写盘（`write_files`） | ❌ 会提示「浏览器模式无法…，请使用桌面版」 |
| 打开本地 `.phbook` | ✅ 原生对话框 + `read_text_file` | 走 `<input type="file">` |
| 在文件管理器中显示 | ✅ `reveal_path` | ❌ |
| 自动保存 | ✅ localStorage（`autosave()`） | ✅ 同左 |

`globalThis.__TAURI__` 不存在时前端走浏览器分支（`web/js/io.js`），因此同一份 `web/` 可以在两处跑。

---

## 目录结构

```
Patchouli-Helper/
├── package.json                    # 只有 @tauri-apps/cli 一个 devDependency
├── README.md
├── LICENSE
├── docs/
│   ├── build.md                    # 三平台构建指南
│   └── patchouli-format.md         # Patchouli 书籍格式速查（给使用者）
├── .github/workflows/build.yml     # 三平台矩阵构建
├── scripts/
│   ├── start-web.mjs               # 浏览器调试用静态服务器（127.0.0.1:4173）
│   └── gen_icons.py                # 生成 src-tauri/icons 的整套图标（需 Pillow）
├── tests/core.test.mjs             # node --test：schema/serialize/zip 的单元测试
├── web/                            # 纯静态前端（无打包器）
│   ├── index.html                  # 布局：顶栏 / 结构树 / 编辑区 / 预览区 / 状态栏
│   ├── assets/                     # 界面图标（icon-128.png 等）
│   ├── css/app.css
│   └── js/
│       ├── main.js                 # 入口：事件绑定、渲染与流程编排
│       ├── io.js                   # 文件读写与对话框；桌面走 Tauri，浏览器降级为下载/上传
│       ├── model.js                # 工程数据模型；可翻译文本存成 { en_us: "...", zh_cn: "..." }
│       ├── store.js                # 状态容器 + 撤销/重做（60 步，700ms 合并）
│       ├── schema.js               # 所有 JSON 结构的唯一描述源：页型/字段/必填/i18n/默认值
│       ├── serialize.js            # 内存工程 → 真实 Patchouli 文件（含导出计划 buildExport）
│       ├── import.js               # 反向：把已有书籍目录/资源包读回工程
│       ├── validate.js             # 校验器：产出可跳转的问题列表
│       ├── profiles.js             # 加载器版本档案、pack_format、书皮配色、语言列表
│       ├── richtext.js             # Patchouli 控制码 → HTML（预览用）
│       ├── zip.js                  # 无依赖 ZIP 写入器（CRC32 + deflate-raw）
│       └── util.js                 # DOM / id / slug 等小工具
├── src-tauri/
│   ├── Cargo.toml                  # crate patchouli-helper，lib 名 patchouli_helper_lib
│   ├── build.rs                    # tauri_build::build()
│   ├── tauri.conf.json             # 窗口 1500×940、frontendDist=../web、bundle targets=all
│   ├── capabilities/default.json   # main 窗口权限：core:default + dialog:default
│   ├── icons/                      # 打包用图标（32x32 / 128x128 / @2x / ico / icns / png）
│   └── src/lib.rs                  # 8 个 #[tauri::command]
└── _research/                      # 调研笔记、反编译 jar 与源码（不进 git）
```

### Rust 侧命令（`src-tauri/src/lib.rs`）

| 命令 | 作用 |
| --- | --- |
| `read_text_file(path)` | 读 UTF-8 文本 |
| `read_file_base64(path)` | 读二进制并 base64 编码（导入图片资源用） |
| `write_text_file(path, contents)` | 写文本，自动建父目录 |
| `write_files(root, files)` | 批量写；`path` 为相对 `root` 的路径，`base64: true` 表示二进制负载；拒绝 `..`、盘符、反斜杠逃逸 |
| `list_files(root)` | 递归列出相对路径（正斜杠，已排序，用于导入书籍目录） |
| `path_exists(path)` | 路径存在性探测 |
| `ensure_dir(path)` | 建目录 |
| `reveal_path(path)` | 在系统文件管理器中打开（explorer / open / xdg-open） |

---

## 快捷键

快捷键监听在 `web/js/main.js` 的全局 `keydown` 里，`mod` = Windows/Linux 的 `Ctrl` 或 macOS 的 `Cmd`：

| 快捷键 | 操作 | 备注 |
| --- | --- | --- |
| `mod + S` | 保存 `.phbook` 工程 | 桌面版弹保存对话框；浏览器版下载 |
| `mod + Z` | 撤销 | 焦点在输入框/文本域里时不拦（让浏览器原生撤销生效） |
| `mod + Y` 或 `mod + Shift + Z` | 重做 | |
| `mod + E` | 导出资源包 zip（资源包 + 数据包 + 安装说明） | |

另外：

- 每次改动都会自动存一份到 localStorage，`Ctrl+S` 只是「另存为工程文件」。
- 把 `.phbook` / `.json` 文件**拖进窗口**即可载入（`drop` 监听，其它扩展名会提示只支持 `.phbook`）。

界面入口（对应 `index.html` 上的按钮）：

| 操作 | 位置 |
| --- | --- |
| 新建 / 打开 / 保存 / 导入 | 顶栏左侧项目组（`.phbook`） |
| 校验 | 顶栏「校验」按钮，带问题计数徽标 |
| 导出菜单 | 顶栏「导出 ▾」下拉 |
| 新建分类 / 新建条目 | 左侧结构树底部 `+ 分类`、`+ 条目` |
| 书页预览 ⇄ JSON 预览 | 右侧预览区页签 |
| 上一页 / 下一页 / 缩放 | 预览区右上角 `‹` `›` `⤢` |

---

## 导出物说明

### 三种导出模式

| 菜单项 | 产出 | 用途 |
| --- | --- | --- |
| 资源包（zip）… | `<modid>-<book>-resourcepack.zip` + `-datapack.zip` + `-安装说明.txt`，三者落在同一目录 | 玩家 / 整合包作者：两个包各拖一个文件夹 |
| 资源包（文件夹）… | 新建 `<modid>-<book>-export/`，内含 `resourcepack/`、`datapack/`、`安装说明.md` | 想先检查文件、或手动装进整合包 |
| 写入模组工程 assets… | 只写 `data/…` 与 `assets/…` 两类文件；选到工程根目录时自动落到 `src/main/resources`，覆盖前会确认 | 模组作者：直接进源码树 |
| 导出当前页 JSON（复制） | 剪贴板里一段 JSON | 临时调试 / 贴给别人 |
| 整书 JSON 打包… | 整本书的 JSON 快照 | 备份、比对、diff |

### 为什么是两个包

Patchouli 1.20+ 的布局是**跨两套资源系统**的：

```
data/<modid>/patchouli_books/<book>/book.json          ← 书声明，在「数据包」侧
assets/<modid>/patchouli_books/<book>/<lang>/categories/*.json   ← 书内容，在「资源包」侧
assets/<modid>/patchouli_books/<book>/<lang>/entries/*.json
assets/<modid>/patchouli_books/<book>/<lang>/templates/*.json
assets/<modid>/lang/<lang>.json                        ← 仅 i18n key 模式
```

- **`book.json` 必须放在 `data/`**：它是服务端也会读的书声明（`BookRegistry` 扫 `data/<ns>/patchouli_books/*/book.json`），`assets/` 里的 JSON 服务端看不见。
- **资源包不能声明新书**：Minecraft 的资源包只加载 `assets/`，不加载 `data/`。所以一个 `.zip` 无论怎么塞，都只能当资源包（内容生效但书不存在）或只能当数据包（书存在但内容为空）。
- 因此导出一本**新书**需要两个包：资源包放内容，数据包只放一份 `book.json`（外加自己的 `pack.mcmeta`）。
- 例外：如果你只是**覆盖别人的书**（addon / 整合包汉化），只需要资源包——书已经由本体声明了。

参考安装位置（单人存档 / 服务器）：

```text
<游戏目录>/resourcepacks/<modid>-<book>-resourcepack.zip
<游戏目录>/saves/<存档>/datapacks/<modid>-<book>-datapack.zip
```

装完资源包后 `/reload`（数据包）并在「选项 → 资源包」里启用资源包。**新增书声明仍需重启游戏**；已存在的书改内容可以在书里按住 Shift 点左下角铅笔热重载。

---

## 常见问题

### 书完全不显示 / 找不到书物品

按顺序排查：

1. `book.json` 是不是被放进了资源包？`data/` 不在资源包的加载范围内，必须**作为数据包**装（`saves/<存档>/datapacks/` 或服务器的 `<世界>/datapacks/`），或作为模组 jar 的 `data/` 资源。
2. 装完数据包后有没有 `/reload`？**新增的 book.json 必须重开游戏**（Patchouli 只在启动/资源重载时扫描书声明）。
3. `use_resource_pack` 是否为 `true`——1.20+ 放在 `data/` 的书如果缺这个字段，Patchouli 直接拒绝加载。编辑器里默认就是 `true`（`serialize.js` 里强制写入），导入别人的书时留意。
4. 目录名、`book.json` 里的书 ID、`/give` 里写的 ID 是否一致：`data/<modid>/patchouli_books/<book>/book.json` ⇒ 书 ID 是 `<modid>:<book>`，`<book>` 只能小写字母和下划线。
5. 有没有设 `dont_generate_book: true`？设了 Patchouli 就不创建书物品。
6. 看日志：Patchouli 加载失败会打 `Failed to load book …` / JSON 解析异常。

### 创造栏里没有书

`book.json` 的 `creative_tab` 不写（或空字符串）= 没有创造标签页，书物品只能 `/give` 拿到。
填上完整 ID，例如：

```json
{ "creative_tab": "minecraft:tools_and_utilities" }
```

1.20+ 原版标签名：`building_blocks`、`colored_blocks`、`natural_blocks`、`functional_blocks`、`redstone_blocks`、`tools_and_utilities`、`combat`、`food_and_drinks`、`ingredients`、`spawn_eggs`（写的时候要带命名空间：`minecraft:tools_and_utilities`）。如果是自己注册的标签，填注册时的全限定 ID。
另外：创造模式搜索栏按名字能搜到，标签页里翻不到先确认没开 `pamphlet` 之类的影响。

### 翻译不生效

四个高频原因，都能在 `BookContentsBuilder.loadLocalizedJson` 里找到出处：

1. **`en_us` 是兜底，主内容必须放 `en_us`**。游戏语言是 `zh_cn` 时，Patchouli 先找 `.../zh_cn/entries/foo.json`，找不到就退回 `.../en_us/entries/foo.json`。所以 `en_us/` 目录不能空着。
2. **回退是整文件级的，不合并字段**。想汉化某个条目，就把该 `entries/xxx.json` **整份**放进 `zh_cn/entries/`（所有文本字段都写上），不要只填一半——缺的字段不会从 `en_us` 补，只会显示空。
3. **语言目录名必须是小写、且与游戏 locale 完全一致**：`zh_cn`、`zh_tw`、`pt_br`、`en_us`。写 `zh_CN`、`zh-CN`、`ZH_cn` 都不会被匹配（Patchouli 用的是 `LanguageManager.getSelected()` 的原始字符串做路径替换）。
4. **路径里不能出现 `en_us` 子串**。定位语言文件的实现是
   `file.getPath().replaceAll("en_us", currentLang)` —— 对**整条路径**做字符串替换。所以条目/分类 ID 里带 `en_us` 会被一起改写：`basics/en_useful` 在 `zh_cn` 下会变成 `basics/zh_cnful`，文件找不到、内容变空白。别把 `en_us` 当普通单词用在 ID 里。

另外：如果开了 i18n key 模式（`book.json` 的 `"i18n": true`），所有文本会当作 lang key 去 `assets/<modid>/lang/<lang>.json` 里查，此时语言目录只有一份 `en_us/`，翻译全靠 lang 文件——两种模式别混用。

### 提示 `pack_format` 不匹配 / 资源包显示为不兼容

- 编辑器按所选 profile 写 `pack.mcmeta`：1.20.1 资源包 15 / 数据包 15；1.21.1 资源包 34 / 数据包 48。
- **1.20.1 不写 `supported_formats`**：这个字段是 1.20.2 才引入的，1.20.1 见到它会把整包判为不兼容。编辑器只在 `supportsSupportedFormats: true` 的 profile 下才写。
- 版本选错是最常见的原因：给 1.20.1 打包却选了 `neoforge-1.21.1`（或反之），`pack_format` 全错、书也不会加载。改 profile 后重新导出。
- 数据包 `pack_format` 对不上时游戏会提示「数据包不兼容」并要求确认，强行启用通常仍能工作，但别指望它 —— 直接改 profile 重导更省事。

### 页面报未知页型 / 页面空白

`type` 必须是全限定 ID：`patchouli:text`（1.16 及更早才是裸 `text`）。已经用编辑器内置的 16 种页型时不会有这个问题；手改 JSON 或导入旧书时注意。
`patchouli:campfire` 才是营火页型，`patchouli:campfire_cooking` 不存在。

---

## 开发与测试

```bash
npm run test            # node --test tests/core.test.mjs（schema / serialize / zip 的纯函数测试）
npm run dev             # 浏览器模式调试界面
npm run tauri dev       # 桌面包调试
python scripts/gen_icons.py   # 重新生成 src-tauri/icons 的图标（需 Pillow）
```

已知的仓库缺口：**`package-lock.json` 还没提交**（`npm ci` 依赖它），所以 CI 与文档里都按「有 lockfile 就 `npm ci`，没有就 `npm install`」处理。想锁定依赖版本就把 `package-lock.json` 提交上去。

---

## 相关文档

- [docs/build.md](docs/build.md) —— Windows / Linux / macOS 构建与排错
- [docs/patchouli-format.md](docs/patchouli-format.md) —— 目录结构、book/category/entry 字段、16 种页型、富文本控制码、pack_format
- [LICENSE](LICENSE) —— LGPL-2.1


---

## 快速开始（本机已构建）

Windows x64 可执行文件已构建完成，**在 `dist\` 目录里，两个文件必须放在一起**：

- `dist/Patchouli-Helper-0.1.0-win64.exe`（3.4 MB）
- `dist/WebView2Loader.dll`（157 KB）← GNU 工具链构建时它是动态链接的，缺了会报「找不到 WebView2Loader.dll」

要分发就整个 `dist\` 文件夹一起发（或直接双击 `scripts/launch-windows.bat`，它会先检查 dll 再启动）。想重新打包：`powershell -ExecutionPolicy Bypass -File scripts\package-windows.ps1`

界面截图见 [docs/screenshot.png](docs/screenshot.png)（真实 Tauri 窗口，由 `scripts/app-check.mjs` 自动抓取）。

> 如果双击后窗口没有出现、控制台报 `failed to create webview` / `拒绝访问 (os error 5)`：
> 这是 WebView2 无法在 `%LOCALAPPDATA%\com.colin.patchoulihelper` 创建用户数据目录导致的。
> 常见于受限沙箱/只读用户目录环境。解决办法（任选其一）：
> 1. 手动创建 `%LOCALAPPDATA%\com.colin.patchoulihelper` 与 `%APPDATA%\com.colin.patchoulihelper` 后重试；
> 2. 设置环境变量 `WEBVIEW2_USER_DATA_FOLDER` 指向一个可写目录再启动。

### 常用命令

```bash
npm run dev          # 浏览器模式（静态服务器 http://127.0.0.1:4173），只用于调界面
npm test             # 核心逻辑单测（模型 / 序列化 / 校验 / 富文本 / zip / 导入回环），12 项

# 桌面端构建（无水 Windows SDK 时使用 GNU 工具链，本机实测通过）
rustup toolchain install stable-x86_64-pc-windows-gnu
export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=<mingw>/bin/x86_64-w64-mingw32-gcc.exe
cd src-tauri && cargo build --release
# 产物：src-tauri/target/release/patchouli-helper.exe
```

### 自动化验证脚本

| 脚本 | 作用 |
|---|---|
| `node scripts/ui-check.mjs http://127.0.0.1:4173/ out.png` | 用无头 Edge/Chrome 打开界面，断言侧栏/编辑器/双页预览/语言切换/校验弹窗/16 种页型渲染，并截图 |
| `node scripts/app-check.mjs <exe> report.json` | 启动真实 Tauri 程序（WebView2 开远程调试），断言 IPC、原生对话框、文件读写、zip 导出落盘，并截图到 `docs/screenshot.png` |

### 已实现要点（与 Patchouli 真实格式对齐）

- 导出严格分成 **data 侧 `book.json` + assets 侧内容**；`use_resource_pack` 强制为 `true`；`creative_tab` 显式写入。
- 资源包导出会自动同时生成 **datapack**（因为资源包无法声明一本新书）。
- 语言回退规则：`en_us` 永远输出，其它语言只输出已翻译文件；id 中禁止出现 `en_us` 子串（校验器会报错）。
- 页型 `campfire`（不是 `campfire_cooking`）、`macros` 写在 book.json、`$(l)` 是粗体——这些易错点均按反编译源码处理。
- 支持 16 种内置页型全部可视化编辑，并带对应的书页预览（配方/物品/图片/实体/多方块结构/关联条目/目标页）。

## 打不开 / 启动失败怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| 弹窗「找不到 WebView2Loader.dll」/「代码执行无法继续」 | GNU 工具链构建的 exe 动态依赖该 DLL，而它不在 exe 同级目录 | 把 `dist/WebView2Loader.dll` 与 exe 放同一目录；`scripts/package-windows.ps1` 会自动复制，`scripts/launch-windows.bat` 启动前也会检查 |
| 弹窗「应用程序无法正常启动 (0xc0000409)」或一闪就退出 | WebView2 无法创建用户数据目录（只读 `%LOCALAPPDATA%`、被沙箱/重定向规则限制） | **0.1.1 起已修复**：程序会依次尝试 `%LOCALAPPDATA%`、`%APPDATA%`、`%TEMP%`、exe 同目录，找到可写目录并显式传给 WebView2；同时把详细错误写进 `crash.log` |
| 弹「Windows 已保护你的电脑」 | exe 未签名，被 SmartScreen 拦截 | 点「更多信息 → 仍要运行」；或右键属性勾选「解除锁定」 |
| 弹「找不到文件 …」 | 指向了已删除的 `src-tauri/target/debug/patchouli-helper.exe`（该目录已清理） | 用 `dist/Patchouli-Helper-0.1.0-win64.exe` 或双击 `scripts/launch-windows.bat` |
| 双击后没有任何窗口，也没有弹窗 | 极少见；多为进程被安全软件静默拦截 | 看 `%LOCALAPPDATA%\com.colin.patchoulihelper\crash.log`（或 `%TEMP%` 下同名目录），把内容发我 |

排查文件：`crash.log` 会写在程序选中的可写目录里（优先 `%LOCALAPPDATA%\com.colin.patchoulihelper\`，其次 `%TEMP%\com.colin.patchoulihelper\`、exe 旁边的 `userdata\`）。
## 布局与低分辨率

- 窗口默认 1200×760（最小 900×540），比之前更适合 1366×768 / 1280×720 的屏幕。
- 两条**可拖拽分隔条**：左侧「书籍结构」右侧、编辑器与预览之间，鼠标按住左右拖即可改宽度；**双击分隔条复位**。位置存 `localStorage`，下次打开保持。
- 书页预览会按可用高度自动缩放（`ResizeObserver` 监听容器），窗口再小也不会被裁掉；右下角 `⤢` 按钮可切「铺满宽度」。
- 高度 ≤ 780px 时自动进入紧凑模式（顶栏变矮、品牌副标题隐藏、卡片内边距收窄）。