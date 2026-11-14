// Project validation: everything that would make the exported book misbehave
// in game. Each problem points at a selectable node so the UI can jump to it.

import { getProfile } from './profiles.js';
import { getText } from './model.js';
import { pageFieldsOf, PAGE_TYPES } from './schema.js';

const ID_CHARS = /^[a-z0-9_\-./]+$/;

const problem = (severity, message, target = null, where = '') => ({ severity, message, target, where });

function checkId(problems, id, kind, label, project, { allowSlash = true } = {}) {
  if (!id) {
    problems.push(problem('error', `${label} 的 id 为空`, { kind, id }, label));
    return;
  }
  if (id.includes(':')) {
    problems.push(problem('error', `${label} id「${id}」不能包含冒号（命名空间由 modid 决定）`, { kind, id }, label));
  }
  const plain = id.split(':').pop();
  if (!allowSlash && plain.includes('/')) {
    problems.push(problem('error', `${label} id「${id}」不能包含斜杠`, { kind, id }, label));
  }
  if (!ID_CHARS.test(plain)) {
    problems.push(
      problem('error', `${label} id「${id}」只能包含小写字母、数字、_ - . /`, { kind, id }, label),
    );
  }
  if (plain.includes('en_us')) {
    problems.push(
      problem(
        'error',
        `${label} id「${id}」不能包含 "en_us"：Patchouli 用字符串替换做语言回退，会误伤路径`,
        { kind, id },
        label,
      ),
    );
  }
  void project;
}

function checkRichtext(problems, text, target, where) {
  if (!text) return;
  const opens = (text.match(/\$\(/g) || []).length;
  const closes = (text.match(/\$\([^)]*\)/g) || []).length;
  if (opens > closes) {
    problems.push(problem('warning', `「${where}」里存在没有闭合的 $( ，游戏会原样输出`, target, where));
  }
  const linkRe = /\$\(l:([^)]+)\)/g;
  let match;
  while ((match = linkRe.exec(text))) {
    const target2 = match[1];
    if (/^https?:/i.test(target2)) continue;
    void target2;
  }
}

const IMAGE_PATH = /^[a-z0-9_.-]+:textures\/.+\.png$/i;

export function validateProject(project) {
  const problems = [];
  const profile = getProfile(project.profileId);

  if (!/^[a-z0-9_.-]+$/.test(project.modid || '')) {
    problems.push(problem('error', 'modid 只能包含小写字母、数字、_ - .', { kind: 'book' }, 'modid'));
  }
  if (!/^[a-z0-9_.-]+$/.test(project.bookId || '')) {
    problems.push(problem('error', 'bookId 只能包含小写字母、数字、_ - .（不能有斜杠）', { kind: 'book' }, 'bookId'));
  }

  const fallbackName = getText(project.book, 'name', 'en_us');
  if (!fallbackName.trim()) {
    problems.push(problem('error', '书名 en_us 不能为空（en_us 是语言回退的兜底）', { kind: 'book' }, '书名'));
  }
  if (!project.languages.includes('en_us')) {
    problems.push(problem('warning', '语言列表里没有 en_us，建议保留它作为兜底语言', { kind: 'book' }, '语言'));
  }
  if (project.localization === 'keys' && !project.languages.length) {
    problems.push(problem('error', 'i18n（lang key）模式至少需要一种语言', { kind: 'book' }, '语言'));
  }

  const categoryIds = new Set();
  for (const category of project.categories) {
    const where = `分类 ${category.id || '(空)'}`;
    checkId(problems, category.id, 'category', '分类', project);
    if (categoryIds.has(category.id)) {
      problems.push(problem('error', `分类 id「${category.id}」重复`, { kind: 'category', id: category.id }, where));
    }
    categoryIds.add(category.id);

    if (!String(category.data?.icon || '').trim()) {
      problems.push(problem('error', `${where} 缺少 icon`, { kind: 'category', id: category.id }, where));
    }
    if (!getText(category.data, 'name', 'en_us').trim()) {
      problems.push(problem('error', `${where} 缺少 en_us 名称`, { kind: 'category', id: category.id }, where));
    }
    if (!getText(category.data, 'description', 'en_us').trim()) {
      problems.push(problem('error', `${where} 缺少 en_us 描述`, { kind: 'category', id: category.id }, where));
    }
    const parent = String(category.data?.parent || '').trim();
    if (parent) {
      if (!parent.includes(':')) {
        problems.push(
          problem('error', `${where} 的 parent「${parent}」必须是全限定 id，如 ${project.modid}:${parent}`, { kind: 'category', id: category.id }, where),
        );
      }
    }
  }

  const entryIds = new Set();
  for (const entry of project.entries) {
    const where = `条目 ${entry.id || '(空)'}`;
    checkId(problems, entry.id, 'entry', '条目', project);
    if (entryIds.has(entry.id)) {
      problems.push(problem('error', `条目 id「${entry.id}」重复`, { kind: 'entry', id: entry.id }, where));
    }
    entryIds.add(entry.id);

    if (!String(entry.data?.icon || '').trim()) {
      problems.push(problem('error', `${where} 缺少 icon`, { kind: 'entry', id: entry.id }, where));
    }
    if (!getText(entry.data, 'name', 'en_us').trim()) {
      problems.push(problem('error', `${where} 缺少 en_us 名称`, { kind: 'entry', id: entry.id }, where));
    }
    if (!entry.category || !categoryIds.has(entry.category)) {
      problems.push(
        problem('error', `${where} 的分类「${entry.category || '未设置'}」不存在`, { kind: 'entry', id: entry.id }, where),
      );
    }
    const advancement = String(entry.data?.advancement || '').trim();
    if (advancement && !advancement.includes(':')) {
      problems.push(problem('warning', `${where} 的 advancement 建议写全 id（含命名空间）`, { kind: 'entry', id: entry.id }, where));
    }
    if (entry.data?.priority && entry.data?.secret) {
      problems.push(problem('info', `${where} 同时设置了 priority 与 secret，实际显示顺序可能不符合预期`, { kind: 'entry', id: entry.id }, where));
    }

    if (!Array.isArray(entry.pages) || !entry.pages.length) {
      problems.push(problem('warning', `${where} 没有任何页面`, { kind: 'entry', id: entry.id }, where));
    }

    (entry.pages || []).forEach((page, index) => {
      const pageWhere = `${where} 第 ${index + 1} 页`;
      const info = PAGE_TYPES[page.type];
      if (!info) {
        problems.push(
          problem(
            'warning',
            `${pageWhere} 使用了未知页型「${page.type}」，会被当作模板页处理（可能整页空白）`,
            { kind: 'entry', id: entry.id, pageIndex: index },
            pageWhere,
          ),
        );
      }
      for (const field of pageFieldsOf(page.type)) {
        const raw = page.data?.[field.key];
        const isEmpty = field.i18n
          ? !getText(page.data, field.key, 'en_us').trim() && !Object.values(raw || {}).some((v) => String(v ?? '').trim())
          : field.type === 'bool' || field.type === 'json'
            ? raw === undefined || raw === null || raw === ''
            : !String(raw ?? '').trim();
        if (field.required && isEmpty) {
          problems.push(
            problem(
              'error',
              `${pageWhere} 缺少必填字段「${field.label}」`,
              { kind: 'entry', id: entry.id, pageIndex: index },
              pageWhere,
            ),
          );
        }
        if (raw === undefined) continue;

        if (field.i18n) {
          checkRichtext(problems, getText(page.data, field.key, 'en_us'), { kind: 'entry', id: entry.id, pageIndex: index }, pageWhere);
          continue;
        }
        if (field.key === 'recipe' || field.key === 'recipe2') {
          const value = String(raw || '').trim();
          if (value && !value.includes(':')) {
            problems.push(
              problem('warning', `${pageWhere} 的配方 id「${value}」建议带命名空间`, { kind: 'entry', id: entry.id, pageIndex: index }, pageWhere),
            );
          }
        }
        if (field.type === 'stringlist' && field.key === 'images') {
          for (const image of raw || []) {
            const value = String(image || '').trim();
            if (!value) continue;
            if (!IMAGE_PATH.test(value)) {
              problems.push(
                problem(
                  'error',
                  `${pageWhere} 的图片路径「${value}」必须是 ns:textures/…png 形式`,
                  { kind: 'entry', id: entry.id, pageIndex: index },
                  pageWhere,
                ),
              );
            } else if (!(project.assets || []).some((asset) => asset.path === value)) {
              problems.push(
                problem(
                  'warning',
                  `${pageWhere} 引用的图片「${value}」还没有加入工程资源，导出时不会包含它`,
                  { kind: 'entry', id: entry.id, pageIndex: index },
                  pageWhere,
                ),
              );
            }
          }
        }
        if (field.key === 'entries' && field.type === 'entrylist') {
          for (const ref of raw || []) {
            const value = String(ref || '').trim();
            if (!value) continue;
            const plain = value.split(':').pop();
            if (!entryIds.has(plain) && !entryIds.has(value)) {
              problems.push(
                problem(
                  'warning',
                  `${pageWhere} 关联的条目「${value}」不存在`,
                  { kind: 'entry', id: entry.id, pageIndex: index },
                  pageWhere,
                ),
              );
            }
          }
        }
      }

      if (page.type === 'patchouli:multiblock') {
        const json = page.data?.multiblock;
        if (json && typeof json === 'object') {
          const hasPattern = Array.isArray(json.pattern) && json.pattern.length > 0;
          const hasSparse = json.sparse_pattern && Object.keys(json.sparse_pattern).length > 0;
          if (hasPattern === hasSparse) {
            problems.push(
              problem(
                'error',
                `${pageWhere} 的 multiblock 必须恰好提供 pattern 或 sparse_pattern 之一`,
                { kind: 'entry', id: entry.id, pageIndex: index },
                pageWhere,
              ),
            );
          }
          if (json.mapping && typeof json.mapping === 'object') {
            for (const key of Object.keys(json.mapping)) {
              if (key.length !== 1) {
                problems.push(
                  problem(
                    'error',
                    `${pageWhere} 的 multiblock.mapping 键「${key}」必须是单个字符`,
                    { kind: 'entry', id: entry.id, pageIndex: index },
                    pageWhere,
                  ),
                );
              }
            }
          }
        }
      }

      if (page.type === 'patchouli:campfire_cooking') {
        problems.push(
          problem(
            'error',
            `${pageWhere} 页型写成了 campfire_cooking，正确的是 patchouli:campfire`,
            { kind: 'entry', id: entry.id, pageIndex: index },
            pageWhere,
          ),
        );
      }
    });
  }

  if (project.book?.pamphlet && project.categories.length > 1) {
    problems.push(problem('error', 'pamphlet（手册模式）只允许 1 个分类', { kind: 'book' }, 'pamphlet'));
  }
  if (project.book?.useResourcePack === false) {
    problems.push(
      problem('error', 'use_resource_pack 必须为 true，否则 Patchouli 会拒绝加载这本书（导出时已强制为 true）', { kind: 'book' }, 'use_resource_pack'),
    );
  }

  if (!String(project.book?.creativeTab || '').trim()) {
    problems.push(
      problem('warning', '没有设置 creative_tab：书不会出现在创造模式物品栏（仍可用 /give 或 /open-patchouli-book 获取）', { kind: 'book' }, 'creative_tab'),
    );
  }
  if (String(project.book?.model || '').startsWith('patchouli:')) {
    problems.push(
      problem(
        'info',
        'model / book_texture 仍是 Patchouli 自带的贴图，正式模组建议换成自己的模型，否则不同模组的书看起来一样',
        { kind: 'book' },
        'model',
      ),
    );
  }

  const texturePath = String(project.book?.bookTexture || '').trim();
  if (texturePath && !texturePath.includes('patchouli:') && !(project.assets || []).some((a) => a.path === texturePath)) {
    problems.push(
      problem('warning', `自定义书本贴图「${texturePath}」还没有加入工程资源`, { kind: 'book' }, 'book_texture'),
    );
  }

  // translation coverage (informational)
  for (const lang of project.languages) {
    if (lang === 'en_us') continue;
    const untranslated = [];
    for (const category of project.categories) {
      if (!getText(category.data, 'name', lang).trim() || getText(category.data, 'name', lang) === getText(category.data, 'name', 'en_us')) {
        untranslated.push(`分类 ${category.id}`);
      }
    }
    for (const entry of project.entries) {
      if (!getText(entry.data, 'name', lang).trim() || getText(entry.data, 'name', lang) === getText(entry.data, 'name', 'en_us')) {
        untranslated.push(`条目 ${entry.id}`);
      }
    }
    if (untranslated.length) {
      problems.push(
        problem('info', `${lang} 还有 ${untranslated.length} 个未翻译的名称（缺失时整份文件回退到 en_us）`, { kind: 'book' }, lang),
      );
    }
  }

  void profile;
  return problems.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export const countBySeverity = (problems) => ({
  error: problems.filter((p) => p.severity === 'error').length,
  warning: problems.filter((p) => p.severity === 'warning').length,
  info: problems.filter((p) => p.severity === 'info').length,
});
