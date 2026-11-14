// Imports an existing Patchouli book (mod resources / resource pack folder) back
// into the editor model. Works on a flat list of {path, data} text files.

import { createProject, newCategory, newEntry, newPage, getText } from './model.js';
import { BOOK_FIELDS, CATEGORY_FIELDS, ENTRY_FIELDS, pageFieldsOf, PAGE_TYPES } from './schema.js';

const uniq = (list) => [...new Set(list)];

function jsonParse(text, path, warnings) {
  try {
    return JSON.parse(text);
  } catch (error) {
    warnings.push(`${path} 不是合法 JSON：${error.message}`);
    return null;
  }
}

/** Finds the book root inside a list of paths. */
function locateBook(files) {
  const bookJson = files.find((file) => /(^|\/)(data|assets)\/[^/]+\/patchouli_books\/[^/]+\/book\.json$/.test(file.path.replace(/\\/g, '/')));
  if (bookJson) {
    const path = bookJson.path.replace(/\\/g, '/');
    const match = path.match(/^(.*?)(?:data|assets)\/([^/]+)\/patchouli_books\/([^/]+)\/book\.json$/);
    if (match) {
      return {
        prefix: match[1] || '',
        modid: match[2],
        bookId: match[3],
        bookFile: bookJson,
        root: `${match[1] || ''}assets/${match[2]}/patchouli_books/${match[3]}`,
        dataRoot: `${match[1] || ''}data/${match[2]}/patchouli_books/${match[3]}`,
      };
    }
  }
  // no book.json: fall back to "assets/<ns>/patchouli_books/<book>/..." layout
  const content = files.find((file) => /assets\/[^/]+\/patchouli_books\/[^/]+\/[^/]+\/(entries|categories)\//.test(file.path.replace(/\\/g, '/')));
  if (!content) return null;
  const path = content.path.replace(/\\/g, '/');
  const match = path.match(/^(.*?)assets\/([^/]+)\/patchouli_books\/([^/]+)\//);
  if (!match) return null;
  return {
    prefix: match[1] || '',
    modid: match[2],
    bookId: match[3],
    bookFile: null,
    root: `${match[1] || ''}assets/${match[2]}/patchouli_books/${match[3]}`,
    dataRoot: `${match[1] || ''}data/${match[2]}/patchouli_books/${match[3]}`,
  };
}

const jsonToModelKey = (fields) => {
  const map = new Map();
  for (const field of fields) map.set(field.json || field.key, field);
  return map;
};

function applyFields(target, object, fields, lang) {
  const byJson = jsonToModelKey(fields);
  for (const [jsonKey, value] of Object.entries(object || {})) {
    const field = byJson.get(jsonKey);
    if (!field) continue;
    if (field.i18n) {
      const existing = typeof target[field.key] === 'object' && target[field.key] !== null ? target[field.key] : {};
      target[field.key] = { ...existing, [lang]: value };
      continue;
    }
    if (field.type === 'json') {
      target[field.key] = value;
      continue;
    }
    target[field.key] = value;
  }
}

/**
 * @param {{path: string, data: string}[]} files
 * @param {{profileId?: string}} options
 */
export function importBookFiles(files, { profileId = 'forge-1.20.1' } = {}) {
  const warnings = [];
  const book = locateBook(files);
  if (!book) {
    return { project: null, warnings: ['没有找到 patchouli_books/<book>/book.json 或 entries 目录，请确认选择的是书籍目录或资源包根目录'], found: null };
  }

  const project = createProject({ modid: book.modid, bookId: book.bookId, profileId });
  project.categories = [];
  project.entries = [];
  project.macros = [];
  project.assets = [];
  project.languages = ['en_us'];

  const bookRoot = book.root.endsWith('/') ? book.root : `${book.root}/`;
  const rel = (path) => path.replace(/\\/g, '/').replace(bookRoot, '');

  // --- languages -----------------------------------------------------------
  const langs = [];
  for (const file of files) {
    const path = file.path.replace(/\\/g, '/');
    if (!path.startsWith(bookRoot)) continue;
    const rest = rel(path);
    const match = rest.match(/^([a-z0-9_.-]+)\/(entries|categories)\//);
    if (match) langs.push(match[1]);
  }
  const languages = uniq(langs.length ? langs : ['en_us']);
  project.languages = languages.length ? languages : ['en_us'];
  if (!project.languages.includes('en_us')) project.languages.unshift('en_us');
  project.primaryLanguage = project.languages.includes('en_us') ? 'en_us' : project.languages[0];

  // --- book.json -----------------------------------------------------------
  let bookJson = null;
  if (book.bookFile) {
    bookJson = jsonParse(book.bookFile.data, book.bookFile.path, warnings);
  }
  if (bookJson) {
    applyFields(project.book, bookJson, [...BOOK_FIELDS.identity, ...BOOK_FIELDS.appearance, ...BOOK_FIELDS.behaviour], project.primaryLanguage);
    // name/landing_text are plain strings in book.json
    if (typeof bookJson.name === 'string') project.book.name = { [project.primaryLanguage]: bookJson.name };
    if (typeof bookJson.landing_text === 'string') project.book.landingText = { [project.primaryLanguage]: bookJson.landing_text };
    if (Array.isArray(Object.entries(bookJson.macros || {}))) {
      project.macros = Object.entries(bookJson.macros || {}).map(([key, value]) => ({ key, value: String(value) }));
    }
    if (bookJson.i18n === true) {
      project.localization = 'keys';
      warnings.push('原书开启了 i18n（lang key）模式，导入后正文会被当作普通文本，建议手动核对。');
    }
    if (bookJson.use_resource_pack === false) {
      warnings.push('原书 use_resource_pack 为 false（旧版格式），已自动改为 true。');
      project.book.useResourcePack = true;
    }
  } else {
    warnings.push('没有读到 book.json，书将使用默认设置，请手动填写书名等信息。');
  }

  // --- categories & entries ------------------------------------------------
  const categoryMap = new Map();
  const entryMap = new Map();

  const contentFiles = files
    .map((file) => ({ ...file, path: file.path.replace(/\\/g, '/') }))
    .filter((file) => file.path.startsWith(bookRoot))
    .map((file) => ({ ...file, rest: rel(file.path) }))
    .filter((file) => /^([a-z0-9_.-]+)\/(entries|categories)\/.+\.json$/.test(file.rest));

  for (const file of contentFiles) {
    const match = file.rest.match(/^([a-z0-9_.-]+)\/(entries|categories)\/(.+)\.json$/);
    if (!match) continue;
    const [, lang, kind, idPath] = match;
    const data = jsonParse(file.data, file.path, warnings);
    if (!data) continue;

    if (kind === 'categories') {
      if (!categoryMap.has(idPath)) {
        const category = newCategory(idPath);
        category.data = { ...category.data, name: {}, description: {} };
        categoryMap.set(idPath, category);
      }
      applyFields(categoryMap.get(idPath).data, data, CATEGORY_FIELDS, lang);
    } else {
      if (!entryMap.has(idPath)) {
        const entry = newEntry(idPath, '');
        entry.data = { ...entry.data, name: {} };
        entry.pages = [];
        entryMap.set(idPath, entry);
      }
      const entry = entryMap.get(idPath);
      applyFields(entry.data, data, ENTRY_FIELDS, lang);
      const categoryId = String(data.category || '').split(':').pop();
      if (categoryId) entry.category = categoryId;
      if (Array.isArray(data.pages) && !entry.pages.length) {
        entry.pages = data.pages.map((rawPage) => importPage(rawPage, lang, warnings));
      }
    }
  }

  project.categories = [...categoryMap.values()];
  project.entries = [...entryMap.values()].map((entry) => ({
    ...entry,
    category: entry.category || project.categories[0]?.id || '',
  }));

  // attach remaining languages' titles (already merged above through per-lang files)
  for (const entry of project.entries) {
    if (!entry.data.name || typeof entry.data.name !== 'object') entry.data.name = {};
  }

  // --- images --------------------------------------------------------------
  for (const file of files) {
    const path = file.path.replace(/\\/g, '/');
    if (!/assets\/[^/]+\/textures\/.+\.(png|jpg|jpeg)$/i.test(path)) continue;
    const match = path.match(/assets\/([^/]+)\/(textures\/.+)$/);
    if (!match) continue;
    project.assets.push({
      path: `${match[1]}:${match[2]}`,
      base64: file.base64 ? file.data : null,
      source: path,
    });
  }

  if (!project.categories.length) {
    project.categories.push(newCategory('basics', { name: { en_us: 'Basics' }, description: { en_us: '' } }));
    warnings.push('没有读到任何分类，已创建一个空分类。');
  }

  // pages of entries in other languages are not merged: keep the primary one
  for (const entry of project.entries) {
    if (!entry.pages.length) {
      entry.pages.push(newPage('patchouli:text', { text: { [project.primaryLanguage]: '' } }));
    }
  }

  void getText;
  void PAGE_TYPES;
  void pageFieldsOf;
  return { project, warnings, found: book };
}

function importPage(rawPage, lang, warnings) {
  if (typeof rawPage === 'string') {
    return newPage('patchouli:text', { text: { [lang]: rawPage } });
  }
  const type = String(rawPage.type || 'patchouli:text').includes(':') ? rawPage.type : `patchouli:${rawPage.type}`;
  const page = newPage(type, {});
  const fields = pageFieldsOf(type);
  for (const field of fields) {
    const jsonKey = field.json || field.key;
    if (!(jsonKey in rawPage)) continue;
    const value = rawPage[jsonKey];
    if (field.i18n) {
      page.data[field.key] = { [lang]: value };
      continue;
    }
    page.data[field.key] = value;
  }
  if (!PAGE_TYPES[type]) {
    warnings.push(`页型 ${type} 不是内置页型（可能是模板页），只保留了基础字段。`);
    page.templateRaw = rawPage;
  }
  return page;
}
