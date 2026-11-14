// Schema description for every Patchouli JSON structure the editor can produce.
//
// Verified against Patchouli 1.20.1 (Forge) and 1.21.x (NeoForge) sources — both
// versions share the exact same author-facing JSON format.
// Forms, serializer and validator are all generated from this file, so adding a
// page type here is enough to make it editable + exportable.

/** Field types:
 *  text      single line localized string
 *  richtext  multi line localized string with Patchouli formatting codes
 *  string    non localized string (ids, resource locations)
 *  stringlist array of non localized strings
 *  entrylist array of entry ids
 *  bool      checkbox
 *  int       integer
 *  float     decimal
 *  json      free form JSON (stored as parsed value)
 *  enum      one of `options`
 */

const f = (key, type, label, extra = {}) => ({ key, type, label, ...extra });

/** Keys every page object may carry, whatever its type. */
export const PAGE_COMMON_FIELDS = [
  f('advancement', 'string', '页面解锁进度 advancement', {
    json: 'advancement',
    help: '进度未完成时这一页不显示',
  }),
  f('flag', 'string', 'flag', { json: 'flag', help: '配置 flag 表达式，一般留空' }),
  f('anchor', 'string', '锚点 anchor', { json: 'anchor', help: '供 $(l:entry#anchor) 跳转到这一页' }),
];

const RECIPE_FIELDS = (label, opts = {}) => ({
  label,
  short: opts.short || '配方',
  glyph: '⚒',
  fields: [
    f('recipe', 'string', '配方 ID', {
      required: true,
      width: 'half',
      placeholder: 'minecraft:crafting_table',
      help: '只填配方 id，不需要内联配方',
    }),
    f('recipe2', 'string', '第二个配方 ID', { width: 'half', help: '留空则只显示一个配方' }),
    f('link_recipe', 'bool', 'link_recipe', { default: true, help: '把产物注册为"本页教这个物品"' }),
    f('link_recipe2', 'bool', 'link_recipe2', { default: true }),
    f('title', 'text', '标题', { i18n: true, width: 'half' }),
    f('text', 'richtext', '说明文本', { i18n: true }),
  ],
});

export const PAGE_TYPES = {
  'patchouli:text': {
    label: '文本 (text)',
    short: '文本',
    glyph: '¶',
    fields: [
      f('title', 'text', '标题', { i18n: true, width: 'half', help: '留空则没有标题栏（首页不能用 title）' }),
      f('text', 'richtext', '正文', { i18n: true, required: true, rows: 10 }),
    ],
  },
  'patchouli:crafting': RECIPE_FIELDS('合成表 (crafting)', { short: '合成' }),
  'patchouli:smelting': RECIPE_FIELDS('熔炉 (smelting)', { short: '熔炉' }),
  'patchouli:blasting': RECIPE_FIELDS('高炉 (blasting)', { short: '高炉' }),
  'patchouli:smoking': RECIPE_FIELDS('烟熏炉 (smoking)', { short: '烟熏' }),
  'patchouli:campfire': RECIPE_FIELDS('营火 (campfire)', { short: '营火' }),
  'patchouli:stonecutting': RECIPE_FIELDS('切石机 (stonecutting)', { short: '切石' }),
  'patchouli:smithing': RECIPE_FIELDS('锻造台 (smithing)', { short: '锻造' }),
  'patchouli:spotlight': {
    label: '物品展示 (spotlight)',
    short: '物品',
    glyph: '◆',
    fields: [
      f('item', 'string', '物品', {
        required: true,
        placeholder: 'minecraft:diamond_sword',
        help: 'ItemStack 字符串；支持 "a,b"（左右并排）和 "tag:minecraft:axes"',
      }),
      f('link_recipe', 'bool', 'link_recipe', { default: false }),
      f('title', 'text', '标题', { i18n: true, width: 'half' }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:image': {
    label: '图片 (image)',
    short: '图片',
    glyph: '▣',
    fields: [
      f('images', 'stringlist', '图片列表', {
        required: true,
        help: '完整资源路径，必须自带 textures/：mymod:textures/gui/entries/step1.png',
      }),
      f('border', 'bool', '显示边框 border', { default: false }),
      f('title', 'text', '标题', { i18n: true, width: 'half' }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:entity': {
    label: '实体 (entity)',
    short: '实体',
    glyph: '☃',
    fields: [
      f('entity', 'string', '实体 ID', { required: true, width: 'half', placeholder: 'minecraft:cow' }),
      f('name', 'text', '显示名称', { i18n: true, width: 'half' }),
      f('scale', 'float', '缩放 scale', { width: 'half', default: 1, help: '负数会上下翻转' }),
      f('offset', 'float', '垂直偏移 offset', { width: 'half', default: 0 }),
      f('rotate', 'bool', '可旋转 rotate', { default: true }),
      f('default_rotation', 'float', '默认角度 default_rotation', { width: 'half', default: -45 }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:multiblock': {
    label: '多方块 (multiblock)',
    short: '多方块',
    glyph: '▦',
    fields: [
      f('name', 'text', '结构名称', { i18n: true, width: 'half' }),
      f('enable_visualize', 'bool', '允许可视化', { default: true }),
      f('multiblock_id', 'string', 'multiblock_id', {
        width: 'half',
        help: '引用已注册的结构 id（与下面的 JSON 二选一）',
      }),
      f('multiblock', 'json', '结构 JSON multiblock', {
        rows: 12,
        help: '内联 JSON，含 pattern（或 sparse_pattern）与 mapping；不需要任何 .nbt 文件',
        placeholder:
          '{\n  "pattern": [["_ _ _", "_ 0 _", "_ _ _"]],\n  "mapping": { "0": "minecraft:furnace" },\n  "symmetrical": true\n}',
      }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:link': {
    label: '外链 (link)',
    short: '外链',
    glyph: '↗',
    fields: [
      f('url', 'string', '链接地址 url', { required: true, placeholder: 'https://example.com' }),
      f('link_text', 'text', '链接文字 link_text', { i18n: true, required: true }),
      f('title', 'text', '标题', { i18n: true, width: 'half' }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:relations': {
    label: '关联条目 (relations)',
    short: '关联',
    glyph: '⇄',
    fields: [
      f('entries', 'entrylist', '关联的条目', {
        required: true,
        help: '例如 mymod:basics/first_steps；不写命名空间则用本书命名空间',
      }),
      f('title', 'text', '标题', { i18n: true, width: 'half', help: '默认显示 Related Chapters' }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:quest': {
    label: '目标 (quest)',
    short: '目标',
    glyph: '✦',
    fields: [
      f('trigger', 'string', '触发器 trigger', { width: 'half', placeholder: 'minecraft:impossible' }),
      f('title', 'text', '标题', { i18n: true, width: 'half', help: '默认显示 Objective' }),
      f('text', 'richtext', '说明文本', { i18n: true }),
    ],
  },
  'patchouli:empty': {
    label: '空白页 (empty)',
    short: '空白',
    glyph: '·',
    fields: [f('draw_filler', 'bool', '显示填充纹理 draw_filler', { default: true })],
  },
};

export const PAGE_TYPE_KEYS = Object.keys(PAGE_TYPES);

export const pageTypeInfo = (type) =>
  PAGE_TYPES[type] || { label: `${type}（模板页）`, short: type, glyph: '?', fields: [] };

export const pageFieldsOf = (type) => [...pageTypeInfo(type).fields, ...PAGE_COMMON_FIELDS];

/** book.json fields. `json` is the key inside book.json. */
export const BOOK_FIELDS = {
  identity: [
    f('name', 'text', '书名 name', { i18n: true, required: true, json: 'name' }),
    f('landingText', 'richtext', '首页文本 landing_text', { i18n: true, json: 'landing_text', rows: 5 }),
    f('creativeTab', 'string', '创造标签 creative_tab', {
      json: 'creative_tab',
      width: 'half',
      placeholder: 'minecraft:tools_and_utilities',
      help: '留空则书不会出现在创造模式物品栏',
    }),
    f('version', 'string', '版本 version', { json: 'version', width: 'half', help: '数字 → "X Edition"，其他 → "Writer\'s Edition"' }),
    f('subtitle', 'text', '副标题 subtitle', { i18n: true, json: 'subtitle', width: 'half' }),
    f('advancementsTab', 'string', '进度页 advancements_tab', { json: 'advancements_tab', width: 'half' }),
  ],
  appearance: [
    f('bookTexture', 'string', '书本贴图 book_texture', {
      json: 'book_texture',
      width: 'half',
      placeholder: 'mymod:textures/gui/book_custom.png',
    }),
    f('model', 'string', '物品模型 model', { json: 'model', width: 'half', placeholder: 'mymod:guide_book' }),
    f('fillerTexture', 'string', '空白页贴图 filler_texture', { json: 'filler_texture', width: 'half' }),
    f('craftingTexture', 'string', '合成页贴图 crafting_texture', { json: 'crafting_texture', width: 'half' }),
    f('indexIcon', 'string', '索引图标 index_icon', { json: 'index_icon', width: 'half' }),
    f('textColor', 'string', '正文颜色 text_color', { json: 'text_color', width: 'half', placeholder: '000000' }),
    f('headerColor', 'string', '标题颜色 header_color', { json: 'header_color', width: 'half', placeholder: '333333' }),
    f('nameplateColor', 'string', '名牌颜色 nameplate_color', { json: 'nameplate_color', width: 'half', placeholder: 'FFDD00' }),
    f('linkColor', 'string', '链接颜色 link_color', { json: 'link_color', width: 'half', placeholder: '0000EE' }),
    f('linkHoverColor', 'string', '链接悬停 link_hover_color', { json: 'link_hover_color', width: 'half', placeholder: '8800EE' }),
    f('progressBarColor', 'string', '进度条 progress_bar_color', { json: 'progress_bar_color', width: 'half', placeholder: 'FFFF55' }),
    f('progressBarBackground', 'string', '进度条底 progress_bar_background', {
      json: 'progress_bar_background',
      width: 'half',
      placeholder: 'DDDDDD',
    }),
  ],
  behaviour: [
    f('useResourcePack', 'bool', 'use_resource_pack', {
      json: 'use_resource_pack',
      help: '1.20+ 放在 data/ 的书必须为 true，否则 Patchouli 直接拒绝加载',
    }),
    f('i18n', 'bool', 'i18n（文本当作 lang key）', {
      json: 'i18n',
      help: '开启后书名/分类名/正文会先作为语言文件的 key 查询，适合多语言发布',
    }),
    f('showProgress', 'bool', 'show_progress', { json: 'show_progress' }),
    f('useBlockyFont', 'bool', 'use_blocky_font', { json: 'use_blocky_font' }),
    f('pauseGame', 'bool', 'pause_game', { json: 'pause_game' }),
    f('showToasts', 'bool', 'show_toasts', { json: 'show_toasts' }),
    f('dontGenerateBook', 'bool', 'dont_generate_book', { json: 'dont_generate_book' }),
    f('pamphlet', 'bool', 'pamphlet（手册模式，只能 1 个分类）', { json: 'pamphlet' }),
    f('openSound', 'string', '打开音效 open_sound', { json: 'open_sound', width: 'half', placeholder: 'patchouli:book_open' }),
    f('flipSound', 'string', '翻页音效 flip_sound', { json: 'flip_sound', width: 'half', placeholder: 'patchouli:book_flip' }),
  ],
};

export const ALL_BOOK_FIELDS = [...BOOK_FIELDS.identity, ...BOOK_FIELDS.appearance, ...BOOK_FIELDS.behaviour];

export const CATEGORY_FIELDS = [
  f('name', 'text', '分类名 name', { i18n: true, required: true, json: 'name' }),
  f('description', 'richtext', '分类描述 description', { i18n: true, required: true, json: 'description', rows: 4 }),
  f('icon', 'string', '图标 icon', { json: 'icon', width: 'half', placeholder: 'minecraft:crafting_table' }),
  f('sortnum', 'int', '排序 sortnum', { json: 'sortnum', width: 'half', default: 0 }),
  f('parent', 'string', '父分类 parent', { json: 'parent', width: 'half', help: '必须写全限定 id，如 mymod:basics' }),
  f('flag', 'string', 'flag', { json: 'flag', width: 'half' }),
  f('secret', 'bool', 'secret（未解锁时完全不显示）', { json: 'secret' }),
];

export const ENTRY_FIELDS = [
  f('name', 'text', '条目名 name', { i18n: true, required: true, json: 'name' }),
  f('icon', 'string', '图标 icon', { json: 'icon', width: 'half', placeholder: 'minecraft:oak_log' }),
  f('sortnum', 'int', '排序 sortnum', { json: 'sortnum', width: 'half', default: 0 }),
  f('advancement', 'string', '解锁进度 advancement', { json: 'advancement', width: 'half', placeholder: 'minecraft:story/root' }),
  f('turnin', 'string', '交还进度 turnin', { json: 'turnin', width: 'half' }),
  f('entryColor', 'string', '条目颜色 entry_color', { json: 'entry_color', width: 'half', placeholder: 'FFAA00' }),
  f('flag', 'string', 'flag', { json: 'flag', width: 'half' }),
  f('priority', 'bool', 'priority（置顶并斜体显示）', { json: 'priority' }),
  f('secret', 'bool', 'secret（未解锁不显示）', { json: 'secret' }),
  f('readByDefault', 'bool', 'read_by_default', { json: 'read_by_default' }),
];

export function fieldsOf(scope) {
  if (scope === 'category') return CATEGORY_FIELDS;
  if (scope === 'entry') return ENTRY_FIELDS;
  return [];
}

/** Extra recipe mappings: item -> page index (0 based). Edited as key/value rows. */
export const EXTRA_RECIPE_MAPPING_HELP = '物品 → 页码（0 基），点击可跳转到对应配方页';

export const FORMAT_SHORTCUTS = [
  { label: 'B', title: '加粗 $(l)…$()', open: '$(l)', close: '$()', placeholder: '粗体' },
  { label: 'I', title: '斜体 $(o)…$()', open: '$(o)', close: '$()', placeholder: '斜体' },
  { label: 'U', title: '下划线 $(n)…$()', open: '$(n)', close: '$()', placeholder: '下划线' },
  { label: 'S', title: '删除线 $(m)…$()', open: '$(m)', close: '$()', placeholder: '删除线' },
  { label: '物品', title: '物品名 $(item)', open: '$(item)', close: '$()', placeholder: '物品' },
  { label: '概念', title: '概念/术语 $(thing)', open: '$(thing)', close: '$()', placeholder: '概念' },
  { label: '↩', title: '换行 $(br)', open: '$(br)', close: '', placeholder: '' },
  { label: '¶', title: '空一行 $(br2)', open: '$(br2)', close: '', placeholder: '' },
  { label: '•', title: '列表项 $(li)', open: '$(li)', close: '', placeholder: '' },
  { label: '链接', title: '内部链接 $(l:条目)$(…$()', open: '$(l:', close: ')$()', placeholder: 'mymod:basics/first_steps', raw: true },
  { label: '外链', title: '外部链接 $(l:https://…)$(…$()', open: '$(l:', close: ')$()', placeholder: 'https://example.com', raw: true },
  { label: '按键', title: '按键 $(k:key.jump)', open: '$(k:', close: ')', placeholder: 'key.jump', raw: true },
  { label: '悬停', title: '悬停提示 $(t:说明)$(…$()', open: '$(t:', close: ')$()', placeholder: '说明', raw: true },
];

/** Colors offered by the palette buttons. */
export const COLOR_PRESETS = [
  ['#000000', '0'], ['#0000AA', '1'], ['#00AA00', '2'], ['#00AAAA', '3'],
  ['#AA0000', '4'], ['#AA00AA', '5'], ['#FFAA00', '6'], ['#AAAAAA', '7'],
  ['#555555', '8'], ['#5555FF', '9'], ['#55FF55', 'a'], ['#55FFFF', 'b'],
  ['#FF5555', 'c'], ['#FF55FF', 'd'], ['#FFFF55', 'e'], ['#FFFFFF', 'f'],
];
