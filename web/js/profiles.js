// Patchouli loader / Minecraft version profiles.
//
// Verified against the real Patchouli jars (1.20.1-85 / 1.21.1-93):
//  - book.json lives in the *data* pack:  data/<modid>/patchouli_books/<book>/book.json
//  - book contents live in the *resource* side: assets/<modid>/patchouli_books/<book>/<lang>/...
//  - a resource pack alone cannot declare a new book, hence the data-pack companion.

export const LOADER_PROFILES = {
  'forge-1.20.1': {
    id: 'forge-1.20.1',
    label: 'Forge 1.20.1',
    loader: 'forge',
    mc: '1.20.1',
    resourcePackFormat: 15,
    dataPackFormat: 15,
    // 1.20.2 introduced supported_formats; 1.20.1 does not understand it.
    supportsSupportedFormats: false,
    modMetaFile: 'META-INF/mods.toml',
    patchouliVersion: '1.20.1-85',
    patchouliVersionRange: '[1.20.1-85,)',
    bookItemId: 'patchouli:guide_book',
    giveSyntax: '/give @p patchouli:guide_book{patchouli:book:"%book%"}',
    openCommand: '/open-patchouli-book @s %book%',
    defaultBookTexture: 'patchouli:textures/gui/book_brown.png',
    defaultModel: 'patchouli:book_brown',
  },
  'neoforge-1.21.1': {
    id: 'neoforge-1.21.1',
    label: 'NeoForge 1.21.1',
    loader: 'neoforge',
    mc: '1.21.1',
    resourcePackFormat: 34,
    dataPackFormat: 48,
    supportsSupportedFormats: true,
    modMetaFile: 'META-INF/neoforge.mods.toml',
    patchouliVersion: '1.21.1-93',
    patchouliVersionRange: '[1.21.1-93,)',
    bookItemId: 'patchouli:guide_book',
    giveSyntax: '/give @p patchouli:guide_book[patchouli:book="%book%"]',
    openCommand: '/open-patchouli-book @s %book%',
    defaultBookTexture: 'patchouli:textures/gui/book_brown.png',
    defaultModel: 'patchouli:book_brown',
  },
};

export const PROFILE_IDS = Object.keys(LOADER_PROFILES);

export function getProfile(id) {
  return LOADER_PROFILES[id] || LOADER_PROFILES['forge-1.20.1'];
}

/** Cover colours used by the book preview, keyed by book texture name. */
export const BOOK_COVER_COLORS = {
  book_brown: ['#7a4a30', '#432416'],
  book_blue: ['#3f5a86', '#1f2d47'],
  book_red: ['#8a3b3b', '#48201f'],
  book_purple: ['#6b4a8f', '#36234a'],
  book_green: ['#3f6b4f', '#1f3a2a'],
  book_black: ['#3b3b42', '#1c1c21'],
  book_cyan: ['#3f6f75', '#1e3a3f'],
  book_gray: ['#5b5b63', '#2c2c31'],
  book_light_blue: ['#4a7f96', '#24424e'],
  book_lime: ['#5f7f3f', '#314521'],
  book_magenta: ['#8a4a86', '#472347'],
  book_orange: ['#9a6134', '#4f3118'],
  book_pink: ['#9a5570', '#4f2a38'],
  book_white: ['#9d9aa3', '#55525a'],
  book_yellow: ['#94823f', '#4d4320'],
};

export function coverColorsFor(texturePath) {
  const name = String(texturePath || '').split('/').pop()?.replace('.png', '') || 'book_brown';
  return BOOK_COVER_COLORS[name] || BOOK_COVER_COLORS.book_brown;
}

/** Book textures shipped by Patchouli itself (used by the picker). */
export const BUNDLED_BOOK_TEXTURES = Object.keys(BOOK_COVER_COLORS).map((name) => ({
  name,
  texture: `patchouli:textures/gui/${name}.png`,
  model: `patchouli:${name}`,
  colors: BOOK_COVER_COLORS[name],
}));

/** Languages offered by the editor UI. Codes follow MC's locale naming. */
export const LANGUAGE_OPTIONS = [
  { code: 'en_us', label: 'English (US)', short: 'EN' },
  { code: 'zh_cn', label: '简体中文', short: '简中' },
  { code: 'zh_tw', label: '繁體中文', short: '繁中' },
  { code: 'ja_jp', label: '日本語', short: 'JA' },
  { code: 'ko_kr', label: '한국어', short: 'KO' },
  { code: 'de_de', label: 'Deutsch', short: 'DE' },
  { code: 'fr_fr', label: 'Français', short: 'FR' },
  { code: 'es_es', label: 'Español', short: 'ES' },
  { code: 'ru_ru', label: 'Русский', short: 'RU' },
  { code: 'pt_br', label: 'Português (BR)', short: 'PT' },
  { code: 'it_it', label: 'Italiano', short: 'IT' },
  { code: 'pl_pl', label: 'Polski', short: 'PL' },
  { code: 'tr_tr', label: 'Türkçe', short: 'TR' },
  { code: 'uk_ua', label: 'Українська', short: 'UK' },
  { code: 'cs_cz', label: 'Čeština', short: 'CS' },
  { code: 'nl_nl', label: 'Nederlands', short: 'NL' },
  { code: 'sv_se', label: 'Svenska', short: 'SV' },
  { code: 'hu_hu', label: 'Magyar', short: 'HU' },
];

export const shortLang = (code) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.short || code;
export const langLabel = (code) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code;
