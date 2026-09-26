// 本机保存层：唯一接触 localStorage 的地方。页面和判定层都不直接读写存储。

import { makeSeedState } from '../data/model.js';

const KEY = 'author-identity-desk:v1';
const LEGACY_KEY = 'research-library';

// 升级旧版研究库：旧文献全部保留，作者一律尚未匹配，成员与绑定为空。
function migrateLegacy() {
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (!Array.isArray(old) || !old.length) return null;
    return { ...makeSeedState(), papers: old, members: [], bindings: [], pending: [] };
  } catch {
    return null;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        version: 1,
        papers: parsed.papers || [],
        members: parsed.members || [],
        bindings: parsed.bindings || [],
        pending: parsed.pending || [],
      };
    }
  } catch {
    /* 数据损坏时落到迁移或种子，不抛出 */
  }
  return migrateLegacy() || makeSeedState();
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
