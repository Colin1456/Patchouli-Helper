// Project data model: the single source of truth the editor mutates.
//
// Text that can be translated is stored as a language map: { en_us: "...", zh_cn: "..." }.
// A plain string is treated as "the same for every language" (handy for imports and
// for fields the user has not translated yet).

import { getProfile } from './profiles.js';
import { uid, slugify } from './util.js';

export const SCHEMA_VERSION = 2;

export const isLangMap = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Reads a (possibly localized) text value. */
export function getText(holder, key, lang, { fallback = true } = {}) {
  if (!holder) return '';
  const raw = holder[key];
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw;
  if (raw[lang] !== undefined && raw[lang] !== null) return String(raw[lang]);
  if (!fallback) return '';
  // fall back to any language that has content, preferring en_us
  if (raw.en_us !== undefined && raw.en_us !== '') return String(raw.en_us);
  for (const value of Object.values(raw)) {
    if (value !== undefined && value !== null && String(value) !== '') return String(value);
  }
  return '';
}

/** Writes a localized text value (always stores a language map). */
export function setText(holder, key, lang, value) {
  if (!isLangMap(holder[key])) {
    const seed = {};
    if (typeof holder[key] === 'string' && holder[key] !== '') seed[lang] = holder[key];
    holder[key] = seed;
  }
  holder[key][lang] = value;
  return holder[key];
}

export function textHasContent(raw) {
  if (raw === undefined || raw === null) return false;
  if (typeof raw === 'string') return raw.trim() !== '';
  return Object.values(raw).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
}

export function isTranslatedFor(raw, lang) {
  if (typeof raw === 'string') return raw.trim() !== '';
  return Boolean(raw && String(raw[lang] ?? '').trim() !== '');
}

/** Lists every text holder of a project with a human readable path (for the validator). */
export function* textSlots(project) {
  yield { holder: project.book, key: 'name', label: '书名' };
  yield { holder: project.book, key: 'landingText', label: '首页文本' };
  for (const category of project.categories) {
    yield { holder: category.data, key: 'name', label: `分类「${category.id}」名称` };
    yield { holder: category.data, key: 'description', label: `分类「${category.id}」描述` };
  }
  for (const entry of project.entries) {
    yield { holder: entry.data, key: 'name', label: `条目「${entry.id}」名称` };
    for (const [index, page] of (entry.pages || []).entries()) {
      for (const [key, value] of Object.entries(page.data || {})) {
        if (key === 'title' || key === 'text' || key === 'name' || key === 'link_text') {
          yield { holder: page.data, key, label: `条目「${entry.id}」第 ${index + 1} 页 ${key}` };
        } else if (isLangMap(value)) {
          yield { holder: page.data, key, label: `条目「${entry.id}」第 ${index + 1} 页 ${key}` };
        }
      }
    }
  }
}

let seq = 0;
const nextId = (prefix) => {
  seq += 1;
  return `${prefix}${seq}`;
};

export function createBook(overrides = {}) {
  return {
    name: { en_us: 'My Mod Guide', zh_cn: '我的模组手册' },
    landingText: {
      en_us: 'Welcome to $(thing)My Mod$().',
      zh_cn: '欢迎阅读 $(thing)我的模组$() 手册。',
    },
    subtitle: { en_us: '', zh_cn: '' },
    version: '',
    creativeTab: 'minecraft:tools_and_utilities',
    advancementsTab: '',
    indexIcon: '',
    bookTexture: 'patchouli:textures/gui/book_brown.png',
    fillerTexture: 'patchouli:textures/gui/page_filler.png',
    craftingTexture: '',
    model: 'patchouli:book_brown',
    textColor: '000000',
    headerColor: '333333',
    nameplateColor: 'FFDD00',
    linkColor: '0000EE',
    linkHoverColor: '8800EE',
    progressBarColor: 'FFFF55',
    progressBarBackground: 'DDDDDD',
    openSound: 'patchouli:book_open',
    flipSound: 'patchouli:book_flip',
    useResourcePack: true,
    i18n: false,
    showProgress: true,
    useBlockyFont: false,
    pauseGame: false,
    showToasts: true,
    dontGenerateBook: false,
    pamphlet: false,
    ...overrides,
  };
}

export function createProject(overrides = {}) {
  const project = {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: '未命名书籍',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    modid: 'mymod',
    bookId: 'guide',
    profileId: 'forge-1.20.1',
    // 'folders' => one JSON folder per language (default Patchouli behaviour)
    // 'keys'    => book.json i18n:true, every string is a lang key
    localization: 'folders',
    languages: ['en_us', 'zh_cn'],
    primaryLanguage: 'en_us',
    book: createBook(),
    categories: [],
    entries: [],
    assets: [],
    macros: [],
    ...overrides,
  };
  if (!project.categories.length) {
    const basics = newCategory('basics', {
      name: { en_us: 'Basics', zh_cn: '基础' },
      description: { en_us: 'Everything you need to get started.', zh_cn: '开始游戏所需的一切。' },
    });
    project.categories.push(basics);
    const intro = newEntry('first_steps', basics.id, {
      name: { en_us: 'First Steps', zh_cn: '第一步' },
    });
    intro.pages.push(
      newPage('patchouli:text', {
        title: { en_us: 'Getting Started', zh_cn: '开始' },
        text: {
          en_us: 'Punch a $(thing)tree$() to begin.$(br2)Then craft a $(item)Crafting Table$().',
          zh_cn: '先撸一棵 $(thing)树$()，然后合成一个 $(item)工作台$()。',
        },
      }),
    );
    project.entries.push(intro);
  }
  return project;
}

export function newCategory(id, data = {}) {
  return {
    id: id || `category_${nextId('')}`,
    data: {
      name: { en_us: 'New Category', zh_cn: '新分类' },
      description: { en_us: '', zh_cn: '' },
      icon: 'minecraft:book',
      sortnum: 0,
      parent: '',
      flag: '',
      secret: false,
      ...data,
    },
  };
}

export function newEntry(id, categoryId, data = {}) {
  return {
    id: id || `entry_${nextId('')}`,
    category: categoryId || '',
    data: {
      name: { en_us: 'New Entry', zh_cn: '新条目' },
      icon: 'minecraft:paper',
      sortnum: 0,
      advancement: '',
      turnin: '',
      secret: false,
      readByDefault: false,
      priority: false,
      entryColor: '',
      flag: '',
      extraRecipeMappings: {},
      ...data,
    },
    pages: [],
  };
}

export function newPage(type = 'patchouli:text', data = {}) {
  return { id: uid('page'), type, data: { ...data } };
}

export function findCategory(project, id) {
  return project.categories.find((c) => c.id === id) || null;
}

export function findEntry(project, id) {
  return project.entries.find((e) => e.id === id) || null;
}

export function entriesOfCategory(project, categoryId) {
  return project.entries.filter((e) => e.category === categoryId);
}

export function sortBySortnumThenName(list, lang = 'en_us') {
  return [...list].sort((a, b) => {
    const sa = Number(a.data?.sortnum ?? 0);
    const sb = Number(b.data?.sortnum ?? 0);
    if (sa !== sb) return sa - sb;
    return getText(a.data, 'name', lang).localeCompare(getText(b.data, 'name', lang));
  });
}

/** Book id as it appears in game: "<modid>:<bookId>". */
export const bookResourceId = (project) => `${project.modid}:${project.bookId}`;

/** Qualified entry id used by Patchouli: "<modid>:<categoryPath>/<entryPath>" */
export const entryResourceId = (project, entry) =>
  `${project.modid}:${entry.id}`;
export const categoryResourceId = (project, category) =>
  `${project.modid}:${category.id}`;

export function ensureIds(project) {
  const used = new Set();
  for (const category of project.categories) {
    if (!category.id || used.has(`c:${category.id}`)) {
      let i = 1;
      let candidate;
      do {
        candidate = slugify(getText(category.data, 'name', project.primaryLanguage) || `category_${i}`);
        i += 1;
      } while (used.has(`c:${candidate}`));
      category.id = candidate;
    }
    used.add(`c:${category.id}`);
  }
  const usedEntries = new Set();
  for (const entry of project.entries) {
    if (!entry.id || usedEntries.has(entry.id)) {
      let i = 1;
      let candidate;
      do {
        const base = entry.category || 'entries';
        candidate = `${base}/${slugify(getText(entry.data, 'name', project.primaryLanguage) || `entry_${i}`)}`;
        i += 1;
      } while (usedEntries.has(candidate));
      entry.id = candidate;
    }
    usedEntries.add(entry.id);
  }
}

export function touch(project) {
  project.meta.updatedAt = new Date().toISOString();
  return project;
}

/** Loads a project JSON blob (from .phbook or localStorage) and repairs it. */
export function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('无效的工程文件');
  const base = createProject();
  const project = {
    ...base,
    ...raw,
    meta: { ...base.meta, ...(raw.meta || {}) },
    book: { ...base.book, ...(raw.book || {}) },
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    macros: Array.isArray(raw.macros) ? raw.macros : [],
    languages: Array.isArray(raw.languages) && raw.languages.length ? raw.languages : ['en_us', 'zh_cn'],
  };
  if (!project.categories.length) {
    project.categories = base.categories;
    project.entries = base.entries;
    project.pages = undefined;
  }
  project.profileId = getProfile(project.profileId).id;
  if (!project.primaryLanguage || !project.languages.includes(project.primaryLanguage)) {
    project.primaryLanguage = project.languages[0] || 'en_us';
  }
  if (!project.languages.includes('en_us')) project.languages.unshift('en_us');
  // pages are always arrays
  project.entries = project.entries.map((entry) => ({
    id: entry.id || uid('entry'),
    category: entry.category || project.categories[0]?.id || '',
    data: { ...newEntry('', '').data, ...(entry.data || {}) },
    pages: Array.isArray(entry.pages) ? entry.pages.map((p) => ({ id: p.id || uid('page'), type: p.type || 'patchouli:text', data: p.data || {} })) : [],
  }));
  project.categories = project.categories.map((category) => ({
    id: category.id || uid('category'),
    data: { ...newCategory('').data, ...(category.data || {}) },
  }));
  project.schemaVersion = SCHEMA_VERSION;
  return project;
}
