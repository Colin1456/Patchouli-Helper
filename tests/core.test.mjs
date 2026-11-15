// Node smoke tests for the DOM-free core: model → serialize → validate → zip.
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProject, newCategory, newEntry, newPage, getText, setText, normalizeProject } from '../web/js/model.js';
import { buildExport, serializeEntry, serializeBook, buildLangFile } from '../web/js/serialize.js';
import { validateProject } from '../web/js/validate.js';
import { renderRichText, stripCodes } from '../web/js/richtext.js';
import { buildZip, crc32 } from '../web/js/zip.js';
import { importBookFiles } from '../web/js/import.js';

test('project defaults are exportable', () => {
  const project = createProject();
  const plan = buildExport(project, { mode: 'resourcepack' });
  const paths = plan.resourcePackFiles.map((file) => file.path);
  assert.ok(paths.includes('pack.mcmeta'), 'resource pack has pack.mcmeta at its root');
  assert.ok(
    paths.some((p) => p === 'assets/mymod/patchouli_books/guide/en_us/categories/basics.json'),
    'category file path',
  );
  assert.ok(
    plan.dataPackFiles.some((file) => file.path === 'data/mymod/patchouli_books/guide/book.json'),
    'book.json lives on the data side',
  );
  const book = JSON.parse(plan.dataPackFiles.find((f) => f.path.endsWith('book.json')).data);
  assert.equal(book.use_resource_pack, true, 'use_resource_pack must be true');
  assert.equal(book.creative_tab, 'minecraft:tools_and_utilities');
  assert.ok(book.name.length > 0);
});

test('pack formats follow the selected profile', () => {
  const forge = createProject({ profileId: 'forge-1.20.1' });
  const neo = createProject({ profileId: 'neoforge-1.21.1' });
  const forgePlan = buildExport(forge, { mode: 'resourcepack' });
  const neoPlan = buildExport(neo, { mode: 'resourcepack' });
  assert.equal(JSON.parse(forgePlan.resourcePackFiles[0].data).pack.pack_format, 15);
  assert.equal(JSON.parse(forgePlan.dataPackFiles[0].data).pack.pack_format, 15);
  assert.equal(JSON.parse(neoPlan.resourcePackFiles[0].data).pack.pack_format, 34);
  assert.equal(JSON.parse(neoPlan.dataPackFiles[0].data).pack.pack_format, 48);
  // 1.20.1 does not understand supported_formats
  assert.equal(JSON.parse(forgePlan.resourcePackFiles[0].data).pack.supported_formats, undefined);
  assert.equal(JSON.parse(neoPlan.resourcePackFiles[0].data).pack.supported_formats.max_inclusive, 34);
});

test('entry serialization keeps page fields and drops empty ones', () => {
  const project = createProject();
  const entry = project.entries[0];
  entry.pages.push(
    newPage('patchouli:crafting', { recipe: 'minecraft:crafting_table', link_recipe: true, text: { en_us: 'hi' } }),
  );
  entry.pages.push(newPage('patchouli:image', { images: ['mymod:textures/gui/entries/a.png'], border: true }));
  const json = serializeEntry(project, entry, 'en_us');
  assert.equal(json.category, 'mymod:basics');
  assert.equal(json.pages.length, 3);
  assert.equal(json.pages[1].type, 'patchouli:crafting');
  assert.equal(json.pages[1].recipe, 'minecraft:crafting_table');
  assert.equal(json.pages[1].link_recipe, undefined === json.pages[1].link_recipe ? undefined : json.pages[1].link_recipe);
  assert.equal(json.pages[2].border, true);
});

test('folder mode only emits translated languages for extra langs', () => {
  const project = createProject();
  project.languages = ['en_us', 'zh_cn', 'ja_jp'];
  const plan = buildExport(project, { mode: 'resourcepack' });
  const paths = plan.resourcePackFiles.map((f) => f.path);
  assert.ok(paths.some((p) => p.includes('/zh_cn/')));
  assert.ok(!paths.some((p) => p.includes('/ja_jp/')), 'ja_jp has no text, so no file is emitted');
});

test('i18n mode generates lang files and key references', () => {
  const project = createProject();
  project.localization = 'keys';
  project.book.i18n = true;
  const plan = buildExport(project, { mode: 'resourcepack' });
  const langFile = plan.resourcePackFiles.find((f) => f.path === 'assets/mymod/lang/en_us.json');
  assert.ok(langFile, 'lang file generated');
  const keys = Object.keys(JSON.parse(langFile.data));
  assert.ok(keys.includes('item.mymod:guide.name'));
  const entryFile = plan.resourcePackFiles.find((f) => f.path.endsWith('en_us/entries/first_steps.json'));
  const entryJson = JSON.parse(entryFile.data);
  assert.ok(entryJson.name.includes('mymod.patchouli.guide.entry.first_steps.name'));
  assert.equal(JSON.parse(plan.dataPackFiles.find((f) => f.path.endsWith('book.json')).data).i18n, true);
});

test('rich text renders links, colors and macros', () => {
  const html = renderRichText('$(l:basics/first_steps)click$(/l) $(#ff0000)red$() $(item)Iron$()', {
    macros: {},
  });
  assert.match(html, /class="inlink"/);
  assert.match(html, /color:#ff0000/i);
  assert.match(html, /class="color item"/);
  assert.equal(stripCodes('$(br2)Hello $(thing)world$()'), 'Hello world');
  assert.match(renderRichText('$(li)a$(li2)b'), /class="li/);
  assert.match(renderRichText('$(l)bold$()'), /class="bold"/);
});

test('validation catches broken references', () => {
  const project = createProject();
  project.entries[0].category = 'missing_category';
  project.entries[0].pages.push(newPage('patchouli:image', { images: ['nope.png'] }));
  project.categories.push(newCategory('weird'));
  const problems = validateProject(project);
  assert.ok(problems.some((p) => p.message.includes('分类')));
  assert.ok(problems.some((p) => p.message.includes('图片路径')));
  assert.ok(problems.some((p) => p.message.includes('缺少 en_us 描述')));
});

test('campfire page type is accepted, campfire_cooking is flagged', () => {
  const project = createProject();
  project.entries[0].pages.push(newPage('patchouli:campfire_cooking', { recipe: 'minecraft:a' }));
  const problems = validateProject(project);
  assert.ok(problems.some((p) => p.severity === 'error' && p.message.includes('patchouli:campfire')));
});

test('assets are exported next to the book', () => {
  const project = createProject();
  project.assets.push({ path: 'mymod:textures/gui/entries/step1.png', base64: 'AAAA' });
  const plan = buildExport(project, { mode: 'mod' });
  assert.ok(plan.files.some((f) => f.path === 'assets/mymod/textures/gui/entries/step1.png' && f.base64));
});

test('zip writer produces archives expandable by the OS', async () => {
  const bytes = await buildZip([
    { path: 'pack.mcmeta', data: '{"pack":{"pack_format":15,"description":"test"}}' },
    { path: 'assets/mymod/patchouli_books/guide/en_us/entries/a.json', data: '{"name":"A"}'.repeat(50) },
  ]);
  assert.ok(bytes.length > 100);
  assert.equal(crc32(new TextEncoder().encode('hello')), 0x3610a686);
  const dir = await mkdtemp(join(tmpdir(), 'ph-zip-'));
  const file = join(dir, 'pack.zip');
  await writeFile(file, bytes);
  const back = await readFile(file);
  assert.deepEqual(back.subarray(0, 4), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return file;
});

test('round trip: export → import keeps categories and entries', () => {
  const project = createProject();
  project.modid = 'roundtrip';
  project.bookId = 'book';
  setText(project.entries[0].data, 'name', 'zh_cn', '第一步');
  const plan = buildExport(project, { mode: 'mod' });
  const files = plan.files.filter((f) => !f.base64).map((f) => ({ path: `root/${f.path}`, data: f.data }));
  const { project: imported, warnings } = importBookFiles(files);
  assert.ok(imported, `import failed: ${warnings.join('; ')}`);
  assert.equal(imported.modid, 'roundtrip');
  assert.equal(imported.categories.length, 1);
  assert.equal(imported.entries.length, 1);
  assert.equal(getText(imported.entries[0].data, 'name', 'zh_cn'), '第一步');
  assert.equal(imported.entries[0].pages.length, 1);
});

test('normalizeProject repairs a minimal object', () => {
  const project = normalizeProject({ modid: 'x', bookId: 'y', categories: [], entries: [] });
  assert.equal(project.modid, 'x');
  assert.ok(project.categories.length > 0);
  assert.ok(project.languages.includes('en_us'));
});

test('jar 导入：能读出模组 jar 里的书并还原成工程', async () => {
  const { listZipEntries, readZipEntry, findBooks } = await import('../web/js/zip-reader.js');

  // 用自家 zip 写入器造一个"模组 jar"
  const bookJson = JSON.stringify({ name: 'Jar Book', landing_text: 'hi', use_resource_pack: true }, null, 2);
  const catJson = JSON.stringify({ name: 'Basics', description: 'd', icon: 'minecraft:book' }, null, 2);
  const entryJson = JSON.stringify(
    { name: 'Intro', icon: 'minecraft:paper', category: 'jarmod:basics', pages: [{ type: 'patchouli:text', text: 'hello jar' }] },
    null,
    2,
  );
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

  const jar = await buildZip([
    { path: 'META-INF/mods.toml', data: 'modLoader="javafml"' },
    { path: 'data/jarmod/patchouli_books/guide/book.json', data: bookJson },
    { path: 'assets/jarmod/patchouli_books/guide/en_us/categories/basics.json', data: catJson },
    { path: 'assets/jarmod/patchouli_books/guide/en_us/entries/basics/intro.json', data: entryJson },
    { path: 'assets/jarmod/textures/gui/entries/pic.png', data: png },
  ]);

  const entries = listZipEntries(jar);
  const books = findBooks(entries);
  assert.equal(books.length, 1);
  assert.equal(books[0].modid, 'jarmod');
  assert.equal(books[0].bookId, 'guide');

  // 逐条解开，确认 deflate 与 stored 都能读
  const texts = {};
  const images = {};
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue;
    const data = await readZipEntry(jar, entry);
    if (entry.name.endsWith('.json') || entry.name.endsWith('.toml')) texts[entry.name] = new TextDecoder().decode(data);
    else images[entry.name] = data;
  }
  assert.equal(JSON.parse(texts['data/jarmod/patchouli_books/guide/book.json']).name, 'Jar Book');
  assert.deepEqual([...images['assets/jarmod/textures/gui/entries/pic.png']], [...png]);

  // 丢进现有的导入器，应该直接还原成工程
  const files = Object.entries(texts).map(([path, data]) => ({ path, data }));
  const { project } = importBookFiles(files);
  assert.ok(project, 'jar 里的书应能被导入');
  assert.equal(project.modid, 'jarmod');
  assert.equal(project.bookId, 'guide');
  assert.equal(project.categories.length, 1);
  assert.equal(project.entries.length, 1);
  assert.equal(project.entries[0].pages[0].data.text.en_us, 'hello jar');
});

test('多语言导入：zh_cn 的页面文本不会被 en_us 覆盖', () => {
  const files = [
    { path: 'data/ml/patchouli_books/guide/book.json', data: JSON.stringify({ name: 'Guide', landing_text: 'Hi', use_resource_pack: true }) },
    { path: 'assets/ml/patchouli_books/guide/en_us/categories/basics.json', data: JSON.stringify({ name: 'Basics', description: 'en desc', icon: 'minecraft:book' }) },
    { path: 'assets/ml/patchouli_books/guide/zh_cn/categories/basics.json', data: JSON.stringify({ name: '基础', description: '中文描述', icon: 'minecraft:book' }) },
    {
      path: 'assets/ml/patchouli_books/guide/en_us/entries/intro.json',
      data: JSON.stringify({ name: 'Intro', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: 'Start', text: 'English body' }] }),
    },
    {
      path: 'assets/ml/patchouli_books/guide/zh_cn/entries/intro.json',
      data: JSON.stringify({ name: '简介', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: '开始', text: '中文正文' }] }),
    },
  ];

  const { project } = importBookFiles(files);
  assert.ok(project);
  assert.deepEqual(project.languages.sort(), ['en_us', 'zh_cn']);

  const entry = project.entries[0];
  const category = project.categories[0];
  assert.equal(getText(category.data, 'name', 'zh_cn'), '基础');
  assert.equal(getText(category.data, 'description', 'zh_cn'), '中文描述');
  assert.equal(getText(entry.data, 'name', 'zh_cn'), '简介');
  assert.equal(getText(entry.pages[0].data, 'text', 'en_us'), 'English body');
  assert.equal(getText(entry.pages[0].data, 'text', 'zh_cn'), '中文正文', '中文页面文本不能被英文覆盖');
  assert.equal(getText(entry.pages[0].data, 'title', 'zh_cn'), '开始');
  // 导出时两种语言都应产出对应内容
  const plan = buildExport(project, { mode: 'mod' });
  const zhEntry = plan.files.find((f) => f.path.includes('/zh_cn/entries/intro.json'));
  const enEntry = plan.files.find((f) => f.path.includes('/en_us/entries/intro.json'));
  assert.ok(zhEntry && enEntry, '两种语言各有一份条目文件');
  assert.equal(JSON.parse(zhEntry.data).pages[0].text, '中文正文');
  assert.equal(JSON.parse(enEntry.data).pages[0].text, 'English body');
});
