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
