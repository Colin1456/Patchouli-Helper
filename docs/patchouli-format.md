# Patchouli 书籍格式速查

面向**使用者**的格式速查表：手写或手改 Patchouli 书的 JSON 时对照这份就够了。
数据来自对本仓库 `_research/` 里 1.20.1 与 1.21.x 的 Patchouli 源码定论（`ClientBookRegistry`、`BookContentsBuilder`、`BookTextParser`、`BookRegistry`）。

> **两个版本的作者侧 JSON 完全一致**：`book.json`、分类、条目、页面的字段在 Forge 1.20.1 与 NeoForge 1.21.1 上没有差别。
> 需要区分的只有三件事：[pack_format](#pack_format-与-packmcmeta)、[取书语法](#取书与打开)、模组元数据文件名（`mods.toml` / `neoforge.mods.toml`）。

---

## 目录结构

一本书横跨**两套资源系统**，这是最容易踩的坑：

```
# ── 数据包侧（data/）：只有书声明，服务端也读 ──
data/<modid>/patchouli_books/<book>/book.json

# ── 资源包侧（assets/）：书的全部内容，只在客户端加载 ──
assets/<modid>/patchouli_books/<book>/<lang>/categories/<id>.json
assets/<modid>/patchouli_books/<book>/<lang>/entries/<id>.json
assets/<modid>/patchouli_books/<book>/<lang>/templates/<id>.json
assets/<modid>/lang/<lang>.json          # 仅 i18n key 模式
```

- `<modid>` = 命名空间；`<book>` = 书名（**只能小写字母、数字、下划线、斜杠**）。
- 书 ID = `<modid>:<book>`，例如 `data/mymod/patchouli_books/guide/book.json` ⇒ `mymod:guide`。
- 分类 ID 默认就是 `<modid>:<文件名不含 .json>`；条目 ID 允许子目录：`entries/basics/first_steps.json` ⇒ `mymod:basics/first_steps`。
- 条目的 `category` 字段可以只写 `basics`（同命名空间），也可以写全 `mymod:basics`。
- 只有 `.minecraft/patchouli_books/<book>/` 这种「整合包外挂目录」才把 `book.json` 和内容放一起，此时命名空间固定是 `patchouli`（书 ID 变成 `patchouli:<book>`），且 `use_resource_pack` 可以省略。

模组工程里对应的是 `src/main/resources/{assets,data}/…`；给整合包用就是一个资源包 + 一个数据包。

---

## book.json

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 书名（书物品名 + 界面标题）。开 `i18n` 后可以是 lang key |
| `landing_text` | string | ✅ | 首页正文，支持[富文本控制码](#富文本控制码) |
| `use_resource_pack` | bool | 实际上必填 | **放在 `data/` 的书必须为 `true`**，否则 Patchouli 拒绝加载。为 `true` 时内容从 `assets/` 读 |
| `creative_tab` | string | — | 创造模式标签页 ID。**不写就不生成创造栏条目**，只能 `/give` |
| `version` | string | — | 版本号；数字 ⇒ 显示「X Edition」，非数字 ⇒ 显示「Writer's Edition」 |
| `subtitle` | string | — | 副标题，`version` 为 `0`/空时显示 |
| `book_texture` | string | — | 书 GUI 背景，默认 `patchouli:textures/gui/book_brown.png` |
| `filler_texture` | string | — | 填页贴图（奇数页时的方块） |
| `crafting_texture` | string | — | 合成页背景 |
| `model` | string | — | 书物品模型，默认 `patchouli:book_brown`；模组作者应自建模型 |
| `text_color` / `header_color` / `nameplate_color` | string | — | `RRGGBB`（不用带 `#`），默认 `000000` / `333333` / `FFDD00` |
| `link_color` / `link_hover_color` | string | — | 默认 `0000EE` / `8800EE` |
| `progress_bar_color` / `progress_bar_background` | string | — | 默认 `FFFF55` / `DDDDDD` |
| `index_icon` | string | — | 索引页图标：ItemStack 字符串，或以 `.png` 结尾的贴图路径 |
| `open_sound` / `flip_sound` | string | — | 打开 / 翻页音效（须已注册） |
| `advancements_tab` | string | — | 关联的进度页 ID，设了首页会出现「进度」按钮 |
| `show_progress` | bool | — | 默认 `true`，进度条开关 |
| `show_toasts` | bool | — | 默认 `true`，有新条目时的 toast |
| `use_blocky_font` | bool | — | 默认 `false`，用原版方块字体 |
| `pause_game` | bool | — | 默认 `false`，打开书的 GUI 时单人暂停 |
| `i18n` | bool | — | 默认 `false`；`true` 时所有文本先当 lang key 去语言文件查 |
| `pamphlet` | bool | — | 手册模式（必须**恰好 1 个分类**，否则加载报错） |
| `dont_generate_book` | bool | — | `true` 不创建书物品（配合 `custom_book_item`） |
| `custom_book_item` | string | — | 自定义书物品的 ItemStack 字符串 |
| `macros` | object | — | 本书自定义宏，`{"$(potato)": "$(#F00)POTATO SALAD$()"}` |
| `text_overflow_mode` | enum | — | `overflow` / `truncate` / `resize`，控制文字溢出行为 |
| `allow_extensions` | bool | — | 默认 `true`，是否允许别家书扩展本书 |
| `extend` | string | — | **1.20 起已移除**（扩展书被资源包覆盖机制取代） |

最小可用示例：

```json
{
  "name": "My Mod Guide",
  "landing_text": "欢迎阅读 $(thing)我的模组$() 手册。",
  "version": "1",
  "creative_tab": "minecraft:tools_and_utilities",
  "use_resource_pack": true
}
```

`creative_tab` 的 1.20+ 原版取值（前面加 `minecraft:`）：
`building_blocks`、`colored_blocks`、`natural_blocks`、`functional_blocks`、`redstone_blocks`、`tools_and_utilities`、`combat`、`food_and_drinks`、`ingredients`、`spawn_eggs`。

---

## 分类（category）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 分类名 |
| `description` | string | ✅ | 分类描述，支持控制码 |
| `icon` | string | — | ItemStack 字符串，如 `minecraft:crafting_table` |
| `parent` | string | — | 父分类（**必须全限定**，如 `mymod:basics`），用于二级分类 |
| `sortnum` | int | — | 排序，越小越前 |
| `flag` | string | — | 配置开关表达式，条件不满足时整个分类消失 |
| `secret` | bool | — | 未解锁时**完全不显示**（连占位都没有） |

```json
{
  "name": "Basics",
  "description": "开始游戏所需的一切。",
  "icon": "minecraft:crafting_table",
  "sortnum": 0
}
```

---

## 条目（entry）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ✅ | 条目名 |
| `icon` | string | — | ItemStack 字符串（缺省时图标为空） |
| `category` | string | ✅ | 所属分类 ID |
| `pages` | array | ✅ | 页面数组，见下节 |
| `sortnum` | int | — | 分类内排序 |
| `advancement` | string | — | 解锁条件；未完成则条目锁定（写不存在的进度 = 永久锁死） |
| `turnin` | string | — | 交还条件（配合 quest 页） |
| `entry_color` | string | — | 条目名颜色 `RRGGBB` |
| `flag` | string | — | 配置开关表达式 |
| `priority` | bool | — | 置顶并斜体显示 |
| `secret` | bool | — | 未解锁时不显示 |
| `read_by_default` | bool | — | 默认视为已读（不显示「新」标记） |
| `extra_recipe_mappings` | object | — | `{"minecraft:apple": 0}`：物品 → 页码（0 基），查配方时跳到该页 |

```json
{
  "name": "第一步",
  "icon": "minecraft:oak_log",
  "category": "mymod:basics",
  "pages": [
    { "type": "patchouli:text", "text": "先撸一棵 $(thing)树$()。" }
  ]
}
```

`pages` 数组里的字符串会被当成隐式文本页：`"pages": ["和 text 页等价"]`。

---

## 16 种内置页型

`type` 必须是全限定 ID。所有页型都额外支持三个公共字段：

| 公共字段 | 说明 |
| --- | --- |
| `advancement` | 该页的解锁进度，未完成时这一页不显示 |
| `flag` | 配置开关表达式 |
| `anchor` | 锚点名，供 `$(l:mymod:basics/first_steps#anchor)` 跳到这一页 |

| `type` | 中文 | 必填字段 | 常用可选字段 |
| --- | --- | --- | --- |
| `patchouli:text` | 文本 | `text` | `title`（**首页不能用 title**） |
| `patchouli:crafting` | 工作台 | `recipe` | `recipe2`、`title`、`text`、`link_recipe`、`link_recipe2` |
| `patchouli:smelting` | 熔炉 | `recipe` | 同上 |
| `patchouli:blasting` | 高炉 | `recipe` | 同上 |
| `patchouli:smoking` | 烟熏炉 | `recipe` | 同上 |
| `patchouli:campfire` | 营火 | `recipe` | 同上。**是 `campfire`，不是 `campfire_cooking`** |
| `patchouli:smithing` | 锻造台 | `recipe`+`recipe2` 性质特殊 | `title`、`text`（注意是模板/基底/添加/产物四段） |
| `patchouli:stonecutting` | 切石机 | `recipe` | `title`、`text` |
| `patchouli:image` | 图片 | `images`（数组，**要自带 `textures/`**） | `border`、`title`、`text` |
| `patchouli:spotlight` | 物品展示 | `item` | `link_recipe`、`title`、`text` |
| `patchouli:empty` | 空白页 | — | `draw_filler`（默认 `true`） |
| `patchouli:multiblock` | 多方块 | `multiblock` 或 `multiblock_id` 二选一 | `name`、`enable_visualize`、`text` |
| `patchouli:link` | 外链 | `url`、`link_text` | `title`、`text`（本身是文本页 + 外链按钮） |
| `patchouli:relations` | 关联条目 | `entries`（数组） | `title`（默认 `Related Chapters`）、`text` |
| `patchouli:entity` | 实体 | `entity` | `name`、`scale`、`offset`、`rotate`、`default_rotation`、`text` |
| `patchouli:quest` | 目标 | — | `trigger`、`title`（默认 `Objective`）、`text` |

页型清单核对自 `ClientBookRegistry.addPageTypes()`（共 16 个 `pageTypes.put`），`patchouli:campfire` → `PageCampfireCooking`。

要点：

- **文本页应永远是条目第一页**：作为第一页时左侧显示页眉样式；其它位置是普通页。
- 同一页放两个配方时若两个产物不同、又没设 `title`，`text` 不会显示（没空间）。
- 一个条目里**不要放多个 quest 页**，否则无法判断勾选状态。
- `multiblock` 是内联 JSON（`pattern`/`mapping`/`symmetrical`），不需要 `.nbt` 文件；`multiblock_id` 是代码里注册的结构 ID，两者互斥。
- `image.images` 要写完整资源路径：`mymod:textures/gui/entries/step1.png`（**必须含 `textures/`**）。
- `spotlight.item` 支持三种写法：ItemStack 字符串（`minecraft:diamond`）、逗号分隔多项（`a,b`）、`tag:minecraft:axes`；也可以用原版配方 ingredient 对象 `{"item": "..."}` / `{"tag": "..."}`。

---

## 富文本控制码

写在任何「可格式化」的字段里（`landing_text`、`text`、`title`、分类 `description`…）。解析器只认 `$(...)`，括号**不能嵌套、内容里不能出现 `)`**。

| 控制码 | 作用 |
| --- | --- |
| `$()` | 重置所有格式（颜色、粗体、链接、悬停、点击全部结束） |
| `$(l)` | 粗体（别名 `$(bold)`） |
| `$(o)` | 斜体（别名 `$(italic)`、`$(italics)`） |
| `$(n)` | 下划线（别名 `$(underline)`） |
| `$(m)` | 删除线（别名 `$(strike)`） |
| `$(k)` | 混淆文字（别名 `$(obf)`） |
| `$(br)` | 换行（也可以直接写 `<br>`） |
| `$(br2)` | 空一行 / 新段落（别名 `$(2br)`、`$(p)`） |
| `$(li)` | 无序列表项；`$(li2)`…`$(li9)` 是更深层缩进 |
| `$(#rrggbb)` | 十六进制颜色，`$(#rgb)` 简写也行（`$(#f00)` = 红） |
| `$(0)`…`$(9)`、`$(a)`…`$(f)` | 原版 16 色 |
| `$(nocolor)` | 恢复书的正文颜色 |
| `$(l:条目ID)` | **内部链接**：条目或分类 ID，可带锚点 `$(l:mymod:basics/first_steps#anchor)`；省略命名空间则用本书命名空间 |
| `$(l:https://…)` | **外部链接**：`http`/`https` 开头的自动判定为外链 |
| `$(/l)` | 结束当前链接（保留其余格式） |
| `$(t:悬停文本)` | 后续文字悬停时显示提示 |
| `$(/t)` | 结束悬停 |
| `$(c:/命令)` | 点击时以玩家身份发送命令，**开头必须有 `/`**（`/trigger`、函数等）；别名 `$(command:/cmd)` |
| `$(/c)` | 结束命令 |
| `$(k:key.jump)` | 按键显示：按玩家的键位设置渲染（`$(k:key.jump)` ⇒ 空格） |
| `$(playername)` | 玩家名字 |
| `$(macroname)` | 本书 `book.json` 的 `macros` 里定义的宏 |

默认宏（可直接用）：`$(item)` = `$(#b0b)`（物品名常用色）、`$(thing)` = `$(#490)`（概念/术语色）。本书的 `macros` 优先于默认宏。

注意事项：

- **没有转义字符**。`\$(` 无效；控制码本身不可能被打出来。要输出字面量 `$(`，只能用宏绕：在 `book.json` 里定义 `"macros": { "$(dollar)": "$" }`，然后写 `$(dollar)(`（需实测，取决于宏展开与解析顺序）。
- 未知控制码**原样显示**（`$(foo)` 会照抄出来），不会报错，也不容易发现写错了。
- 宏展开最多 10 轮（`expandMacros`），存在循环引用会告警并停下。
- 内部链接指向不存在的东西时游戏内提示 `BAD LINK: xxx`；链接分类时**不能**带锚点。
- `$(k:...)` 里写的是 `options.txt` 中 `key_` 之后、`:数字` 之前的名字，去掉开头的 `key.`，例如 `key_key.togglePerspective:63` ⇒ `$(k:togglePerspective)`。

---

## pack_format 与 pack.mcmeta

| 目标 | 资源包 `pack_format` | 数据包 `pack_format` | 写 `supported_formats`？ |
| --- | --- | --- | --- |
| Forge 1.20.1 | 15 | 15 | ❌ 不能写（1.20.2 才引入该字段，写了 1.20.1 会判为不兼容） |
| NeoForge 1.21.1 | 34 | 48 | ✅ 可写（`min_inclusive` / `max_inclusive`） |

资源包 `pack.mcmeta`：

```json
{
  "pack": {
    "description": "mymod guide (1.21.1 Patchouli)",
    "pack_format": 34,
    "supported_formats": { "min_inclusive": 34, "max_inclusive": 34 }
  }
}
```

数据包 `pack.mcmeta` 结构相同，只把 `pack_format` 换成数据包的数字。

- 资源包只放 `assets/`，数据包只放 `data/`——**一个 zip 同时塞两边不会两边都生效**。
- 装数据包后 `/reload`；新增 `book.json` 仍需重启游戏。
- 1.20.1 与 1.21.x 的作者侧 JSON 相同，但 `pack_format` 不同 ⇒ 同一本书要分版本导出。

---

## 取书与打开

书物品固定是 `patchouli:guide_book`，用「标记」指定是哪本书。1.21 把 NBT 换成了数据组件：

| | Forge 1.20.1（NBT） | NeoForge 1.21.1（数据组件） |
| --- | --- | --- |
| 指令 | `/give @p patchouli:guide_book{patchouli:book:"mymod:guide"}` | `/give @p patchouli:guide_book[patchouli:book="mymod:guide"]` |
| 配方 / 战利品 | `"item": "patchouli:guide_book", "nbt": { "patchouli:book": "mymod:guide" }` | 用 `minecraft:set_components` 设置 `patchouli:book` 组件 |
| CraftTweaker | `<patchouli:guide_book>.withTag({"patchouli:book": "mymod:guide"})` | 按 1.21 组件写法 |

打开书（两版都有，需要 OP / 权限）：

```
/open-patchouli-book @s mymod:guide
```

命令实现在 `vazkii.patchouli.common.command.OpenBookCommand`（注册名 `open-patchouli-book`），参数为「目标玩家 + 书 ID」。

给新玩家自动发书（两版思路相同）：做一个 `minecraft:tick` 触发器的隐藏进度，奖励用 loot_table 发书物品——1.20.1 走 NBT，1.21.1 走 `set_components`。

---

## 语言与回退规则

1. **`en_us` 是兜底**：游戏语言为 `zh_cn` 时，先找 `.../zh_cn/entries/foo.json`，找不到就退回 `.../en_us/entries/foo.json`。所以**主内容必须放 `en_us/`**，其他语言目录只放要覆盖的文件。
2. **回退是整文件级的，不合并字段**：`zh_cn/entries/foo.json` 一旦存在，就整份替代 `en_us` 的同名文件，缺的字段不会从 `en_us` 补（会渲染成空）。
3. **语言目录名必须小写、且与游戏 locale 完全一致**：`en_us`、`zh_cn`、`zh_tw`、`pt_br`、`ja_jp`… 写成 `zh_CN` / `zh-CN` 一律不匹配。
4. **路径里不能出现 `en_us` 子串**：定位语言文件用的是
   `file.getPath().replaceAll("en_us", currentLang)`——对整条路径做字符串替换。条目 ID 叫 `basics/en_useful` 的话，在 `zh_cn` 下会被改写成 `basics/zh_cnful`，于是「文件不存在、内容空白」。同理别用 `en_useless`、`pre_en_us` 这类名字。
5. 想让 ID 与语言无关，就用 `i18n` key 模式：`book.json` 加 `"i18n": true`，所有文本变成 lang key，翻译集中在 `assets/<modid>/lang/<lang>.json`，此时语言目录只有 `en_us/` 一套。两种模式不要混用。

---

## 常见坑

| 现象 | 原因 |
| --- | --- |
| 书不存在 | `book.json` 放进了资源包（必须在 `data/`，作为数据包装），或没重启游戏 |
| 书存在但内容空 | 缺 `use_resource_pack: true`，或内容不在 `assets/<modid>/patchouli_books/<book>/<lang>/` 下 |
| 创造栏找不到 | `creative_tab` 没写（= 无标签页），或被 `secret` / `flag` 藏了 |
| 某个条目/分类不显示 | `advancement` 指向不存在的进度（永久锁死）、`flag` 条件不满足、`secret` 未解锁 |
| 翻译生效一半 | 只翻译了部分字段但把整文件放进了语言目录（整文件覆盖语义），或目录名大小写不对 |
| `unknown page type` | `type` 没写全限定 ID（`patchouli:text`），或把营火写成 `campfire_cooking` |
| 链接点了没反应 / `BAD LINK` | 目标 ID 拼错、命名空间省略错、给分类链接加了 `#anchor` |
| 图片不显示 | `images` 少了 `textures/` 段，或图不在资源包 `assets/` 里 |
| 资源包/数据包「不兼容」 | `pack_format` 与游戏版本不匹配，或 1.20.1 的包里写了 `supported_formats` |
| 单体书报错 `should have exactly one category` | 开了 `pamphlet` 却没做到「恰好 1 个分类」 |
