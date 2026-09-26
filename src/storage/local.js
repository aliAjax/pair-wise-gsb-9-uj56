// 本机保存层：只管 localStorage 的读写与旧数据迁移，不包含业务判定。
import { seedState } from '../data/seed.js';
import { makeBylines } from '../rules/identity.js';

const KEY = 'research-identity-desk';
const OLD_KEY = 'research-library'; // 旧版研究库（只存作者姓名字符串）

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2) return parsed;
    }
  } catch {
    /* 损坏数据按缺料处理，落到迁移/初始资料 */
  }
  return migrate();
}

// 旧库 -> 身份台：老文献的作者全部拆成「未匹配署名」，成员资料需要重新登记。
function migrate() {
  let oldPapers = null;
  try {
    oldPapers = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
  } catch {
    oldPapers = null;
  }
  if (!Array.isArray(oldPapers) || !oldPapers.length) return structuredCloneSafe(seedState);

  const papers = oldPapers.map((p) => {
    const id = String(p.id ?? p.title);
    return {
      id: `old-${id}`,
      title: p.title ?? '',
      printedAuthors: p.authors ?? '',
      year: p.year ?? null,
      venue: p.venue ?? '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      abstract: p.abstract ?? '',
      status: p.status ?? '待读',
      cite: p.cite ?? '',
      notes: p.notes ?? '',
      bylines: makeBylines(`old-${id}`, p.authors ?? ''),
    };
  });
  return { version: 2, members: [], papers, pending: [] };
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 存储满或被禁用时静默失败，内存中的操作仍然有效 */
  }
}
