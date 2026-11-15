// Turns the in-memory project into real Patchouli files.
//
// Verified layout (Patchouli 1.20.1 / 1.21.x):
//   data/<modid>/patchouli_books/<book>/book.json          ← book declaration (data side!)
//   assets/<modid>/patchouli_books/<book>/<lang>/...       ← categories / entries / pages
//   assets/<modid>/lang/<lang>.json                        ← only in i18n (lang key) mode
//
// A resource pack cannot declare a book, so exporting a *new* book as packs
// produces two archives: <name>-resourcepack.zip and <name>-datapack.zip.

import { getProfile } from './profiles.js';
import { getText, bookResourceId } from './model.js';
import { ALL_BOOK_FIELDS, CATEGORY_FIELDS, ENTRY_FIELDS, pageFieldsOf, PAGE_TYPES } from './schema.js';

const FALLBACK_LANG = 'en_us';

const clean = (value) => (typeof value === 'string' ? value.trim() : value);
const pathJoin = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
const sanitizeIdPath = (id) => String(id).replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');

/** True when this language really has its own text for a field. */
function hasOwnText(holder, key, lang) {
  const raw = holder?.[key];
  if (typeof raw === 'string') return raw.trim() !== '';
  return Boolean(raw && typeof raw === 'object' && String(raw[lang] ?? '').trim() !== '');
}

/** Base of generated lang keys: "<modid>.patchouli.<book>" */
const langKeyBase = (project) => `${project.modid}.patchouli.${project.bookId}`;
export const bookNameKey = (project) => `item.${bookResourceId(project)}.name`;
export const bookLandingKey = (project) => `item.${bookResourceId(project)}.landing`;

export const categoryFileName = (category) => `categories/${sanitizeIdPath(category.id)}.json`;
export const entryFileName = (entry) => `entries/${sanitizeIdPath(entry.id)}.json`;

/* ------------------------------------------------------------------ pages */

function serializePage(project, entry, page, pageIndex, lang, ctx) {
  const out = { type: page.type };
  const data = page.data || {};
  const keyPrefix = `${langKeyBase(project)}.entry.${entry.id}.page${pageIndex + 1}`;

  for (const field of pageFieldsOf(page.type)) {
    const jsonKey = field.json || field.key;
    if (field.i18n) {
      if (ctx.i18nKeys) {
        out[jsonKey] = `${keyPrefix}.${jsonKey}`;
        continue;
      }
      const value = getText(data, field.key, lang);
      if (!value && !field.required) continue;
      out[jsonKey] = value;
      continue;
    }
    if (field.type === 'bool') {
      const fallback = field.default ?? false;
      const value = data[field.key] === undefined || data[field.key] === null || data[field.key] === ''
        ? fallback
        : Boolean(data[field.key]);
      if (value !== fallback) out[jsonKey] = value;
      continue;
    }
    if (field.type === 'int' || field.type === 'float') {
      const raw = data[field.key];
      if (raw === undefined || raw === null || raw === '') {
        if (field.default !== undefined && Number(field.default) !== 0) out[jsonKey] = field.default;
        continue;
      }
      const num = Number(raw);
      if (Number.isFinite(num) && num !== 0) out[jsonKey] = field.type === 'int' ? Math.round(num) : num;
      continue;
    }
    if (field.type === 'stringlist' || field.type === 'entrylist') {
      const list = Array.isArray(data[field.key])
        ? data[field.key].map((v) => String(v).trim()).filter(Boolean)
        : [];
      if (!list.length && !field.required) continue;
      out[jsonKey] = list;
      continue;
    }
    if (field.type === 'json') {
      const raw = data[field.key];
      if (raw === undefined || raw === null || raw === '') continue;
      out[jsonKey] = raw;
      continue;
    }
    const value = clean(data[field.key]);
    if (value || field.required) out[jsonKey] = value;
  }

  // multiblock: multiblock_id and multiblock are mutually exclusive
  if (page.type === 'patchouli:multiblock') {
    if (out.multiblock_id && out.multiblock) delete out.multiblock_id;
    if (!out.multiblock_id && !out.multiblock) delete out.multiblock;
  }
  return out;
}

/* --------------------------------------------------------------- category */

export function serializeCategory(project, category, lang, ctx = {}) {
  const out = {};
  const keyBase = `${langKeyBase(project)}.category.${category.id}`;
  for (const field of CATEGORY_FIELDS) {
    const jsonKey = field.json;
    if (field.i18n) {
      if (ctx.i18nKeys) {
        out[jsonKey] = `${keyBase}.${jsonKey}`;
        continue;
      }
      const value = getText(category.data, field.key, lang);
      if (!value && !field.required) continue;
      out[jsonKey] = value;
      continue;
    }
    if (field.type === 'bool') {
      if (category.data?.[field.key]) out[jsonKey] = true;
      continue;
    }
    if (field.type === 'int') {
      const num = Number(category.data?.[field.key] ?? 0);
      if (Number.isFinite(num) && num !== 0) out[jsonKey] = Math.round(num);
      continue;
    }
    const value = clean(category.data?.[field.key]);
    if (value) out[jsonKey] = value;
  }
  return out;
}

/* ------------------------------------------------------------------ entry */

export function serializeEntry(project, entry, lang, ctx = {}) {
  const out = {};
  const keyBase = `${langKeyBase(project)}.entry.${entry.id}`;
  out.name = ctx.i18nKeys ? `${keyBase}.name` : getText(entry.data, 'name', lang);
  out.icon = clean(entry.data?.icon) || 'minecraft:paper';
  const categoryId = entry.category || '';
  out.category = String(categoryId).includes(':') ? categoryId : `${project.modid}:${categoryId}`;
  const sortnum = Number(entry.data?.sortnum ?? 0);
  if (Number.isFinite(sortnum) && sortnum !== 0) out.sortnum = Math.round(sortnum);

  for (const field of ENTRY_FIELDS) {
    if (field.key === 'name' || field.key === 'icon' || field.key === 'sortnum') continue;
    const jsonKey = field.json;
    if (field.type === 'bool') {
      if (entry.data?.[field.key]) out[jsonKey] = true;
      continue;
    }
    if (field.type === 'int') {
      const num = Number(entry.data?.[field.key] ?? 0);
      if (Number.isFinite(num) && num !== 0) out[jsonKey] = Math.round(num);
      continue;
    }
    const value = clean(entry.data?.[field.key]);
    if (value) out[jsonKey] = value;
  }

  const mappings = entry.data?.extraRecipeMappings;
  if (mappings && typeof mappings === 'object' && Object.keys(mappings).length) {
    out.extra_recipe_mappings = mappings;
  }

  out.pages = (entry.pages || []).map((page, index) => serializePage(project, entry, page, index, lang, ctx));
  return out;
}

/* ------------------------------------------------------------------- book */

export function serializeBook(project, lang, { i18nKeys = false } = {}) {
  const book = project.book || {};
  const out = {};
  out.name = i18nKeys ? bookNameKey(project) : getText(book, 'name', lang) || 'Guide Book';
  out.landing_text = i18nKeys ? bookLandingKey(project) : getText(book, 'landingText', lang);
  if (i18nKeys) {
    const keyBase = langKeyBase(project);
    out.version = clean(book.version) || '0';
    if (clean(book.subtitle?.[FALLBACK_LANG]) || Object.values(book.subtitle || {}).some((v) => String(v || '').trim())) {
      out.subtitle = `${keyBase}.subtitle`;
    }
  }

  for (const field of ALL_BOOK_FIELDS) {
    const jsonKey = field.json;
    if (field.i18n) {
      if (i18nKeys) continue; // already handled above (key form)
      const value = getText(book, field.key, lang);
      if (value) out[jsonKey] = value;
      continue;
    }
    if (field.type === 'bool') {
      const fallback = field.default ?? false;
      const raw = book[field.key];
      out[jsonKey] = raw === undefined || raw === null ? fallback : Boolean(raw);
      continue;
    }
    if (field.type === 'int' || field.type === 'float') {
      const raw = book[field.key];
      if (raw !== undefined && raw !== null && raw !== '') out[jsonKey] = Number(raw);
      continue;
    }
    const value = clean(book[field.key]);
    if (value) out[jsonKey] = value;
  }

  // Patchouli refuses to load a book from data/ without this flag.
  out.use_resource_pack = true;
  if (i18nKeys) out.i18n = true;
  if (!out.version) out.version = '0';
  return out;
}

/* -------------------------------------------------------- lang key support */

/** Every localized text in the project, with the lang key used in i18n mode. */
export function* langKeySlots(project) {
  const base = langKeyBase(project);
  yield { key: bookNameKey(project), holder: project.book, field: 'name', label: '书名' };
  yield { key: bookLandingKey(project), holder: project.book, field: 'landingText', label: '首页文本' };
  const subtitle = project.book?.subtitle;
  if (subtitle && Object.values(subtitle).some((v) => String(v || '').trim())) {
    yield { key: `${base}.subtitle`, holder: project.book, field: 'subtitle', label: '副标题' };
  }
  for (const category of project.categories) {
    yield { key: `${base}.category.${category.id}.name`, holder: category.data, field: 'name', label: `分类 ${category.id} 名称` };
    yield { key: `${base}.category.${category.id}.description`, holder: category.data, field: 'description', label: `分类 ${category.id} 描述` };
  }
  for (const entry of project.entries) {
    yield { key: `${base}.entry.${entry.id}.name`, holder: entry.data, field: 'name', label: `条目 ${entry.id} 名称` };
    for (const [index, page] of (entry.pages || []).entries()) {
      for (const field of pageFieldsOf(page.type)) {
        if (!field.i18n) continue;
        yield {
          key: `${base}.entry.${entry.id}.page${index + 1}.${field.json || field.key}`,
          holder: page.data,
          field: field.key,
          label: `条目 ${entry.id} 第 ${index + 1} 页「${field.label}」`,
        };
      }
    }
  }
}

export function buildLangFile(project, lang) {
  const out = {};
  for (const slot of langKeySlots(project)) {
    out[slot.key] = getText(slot.holder, slot.field, lang);
  }
  return out;
}

/* ------------------------------------------------------------ export files */

export function categoryHasText(category, lang) {
  return ['name', 'description'].some((key) => hasOwnText(category.data, key, lang));
}

export function entryHasText(entry, lang) {
  if (hasOwnText(entry.data, 'name', lang)) return true;
  return (entry.pages || []).some((page) =>
    pageFieldsOf(page.type).some((field) => field.i18n && hasOwnText(page.data, field.key, lang)),
  );
}

/** Content files (everything under assets/<modid>). */
export function serializeContent(project, { langs = null } = {}) {
  const i18nKeys = project.localization === 'keys' || Boolean(project.book?.i18n);
  const bookRoot = `assets/${project.modid}/patchouli_books/${project.bookId}`;
  const ctx = { i18nKeys };
  const files = [];
  const skippedLangs = [];

  const requested = (langs && langs.length ? langs : project.languages).slice();
  const ordered = [FALLBACK_LANG, ...requested.filter((l) => l !== FALLBACK_LANG)];
  const activeLangs = i18nKeys ? [FALLBACK_LANG] : ordered;

  for (const lang of activeLangs) {
    const isFallback = lang === FALLBACK_LANG;
    let emitted = 0;

    for (const category of project.categories) {
      if (!isFallback && !categoryHasText(category, lang)) continue;
      files.push({
        path: pathJoin(bookRoot, lang, categoryFileName(category)),
        data: JSON.stringify(serializeCategory(project, category, lang, ctx), null, 2) + '\n',
      });
      emitted += 1;
    }
    for (const entry of project.entries) {
      if (!isFallback && !entryHasText(entry, lang)) continue;
      files.push({
        path: pathJoin(bookRoot, lang, entryFileName(entry)),
        data: JSON.stringify(serializeEntry(project, entry, lang, ctx), null, 2) + '\n',
      });
      emitted += 1;
    }
    if (!isFallback && !emitted) skippedLangs.push(lang);
  }

  if (i18nKeys) {
    for (const lang of project.languages) {
      const langFile = buildLangFile(project, lang);
      const hasContent = Object.values(langFile).some((v) => String(v ?? '').trim());
      if (!hasContent) continue;
      files.push({
        path: `assets/${project.modid}/lang/${lang}.json`,
        data: JSON.stringify(langFile, null, 2) + '\n',
      });
    }
  }

  for (const asset of project.assets || []) {
    const resPath = String(asset.path || '').trim();
    if (!resPath) continue;
    const [ns, ...rest] = resPath.split(':');
    const rel = rest.join(':');
    if (!rel) continue;
    files.push({ path: `assets/${ns}/${rel}`, data: asset.base64, base64: true });
  }

  return { files, skippedLangs };
}

export const bookJsonPath = (project) => `data/${project.modid}/patchouli_books/${project.bookId}/book.json`;

export function packMeta({ description, packFormat, supportedFormats = null }) {
  const pack = { description, pack_format: packFormat };
  if (supportedFormats && supportedFormats.length) {
    pack.supported_formats = {
      min_inclusive: supportedFormats[0],
      max_inclusive: supportedFormats[supportedFormats.length - 1],
    };
  }
  return JSON.stringify({ pack }, null, 2) + '\n';
}

/**
 * Full export plan.
 * @param {object} project
 * @param {{mode?: 'resourcepack'|'mod', langs?: string[]}} options
 */
export function buildExport(project, { mode = 'resourcepack', langs = null } = {}) {
  const profile = getProfile(project.profileId);
  const i18nKeys = project.localization === 'keys' || Boolean(project.book?.i18n);
  const lang = project.primaryLanguage || FALLBACK_LANG;
  const { files: contentFiles, skippedLangs } = serializeContent(project, { langs });
  const bookJson = JSON.stringify(serializeBook(project, lang, { i18nKeys }), null, 2) + '\n';
  const description = `${project.meta?.name || project.bookId} (${profile.mc} Patchouli)`;

  if (mode === 'mod') {
    return { mode, files: [{ path: bookJsonPath(project), data: bookJson }, ...contentFiles], skippedLangs, profile };
  }

  const resourcePackFiles = [
    {
      path: 'pack.mcmeta',
      data: packMeta({
        description,
        packFormat: profile.resourcePackFormat,
        supportedFormats: profile.supportsSupportedFormats ? [profile.resourcePackFormat] : null,
      }),
    },
    ...contentFiles,
  ];
  const dataPackFiles = [
    {
      path: 'pack.mcmeta',
      data: packMeta({
        description: `${description} (data)`,
        packFormat: profile.dataPackFormat,
        supportedFormats: profile.supportsSupportedFormats ? [profile.dataPackFormat] : null,
      }),
    },
    { path: bookJsonPath(project), data: bookJson },
  ];
  return { mode, resourcePackFiles, dataPackFiles, skippedLangs, profile };
}

export const pageTypeLabel = (type) => PAGE_TYPES[type]?.label || type;
