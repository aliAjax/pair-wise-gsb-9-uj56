// 判定层：作者身份的全部规则。纯函数，不读 localStorage、不碰 DOM、不依赖 React。
// 输入始终是 state（{papers, members, bindings, pending}），返回新 state，绝不原地修改。

import { makeMember, makePaper, citeText, uid } from '../data/model.js';

// ---- 署名解析 ----

// 把一条文献的作者字符串拆成独立署名。
// 支持 “A & B”“A and B”“;”“，”“,”（中文姓名之间）等分隔写法。
export function splitAuthors(authors = '') {
  return authors
    .split(/\s*(?:&|\band\b|;|；)\s*|\s*,\s*(?=[一-鿿])|\s*，\s*/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 比较用的规范名：去空白、转小写。“Miller, S.” 与 “miller, s.” 视为同一姓名键。
export const normName = (name = '') => name.replace(/\s+/g, ' ').trim().toLowerCase();

const clone = (s) => ({
  ...s,
  papers: s.papers.map((p) => ({ ...p, tags: [...p.tags] })),
  members: s.members.map((m) => ({ ...m, formerNames: [...m.formerNames], history: m.history.map((h) => ({ ...h })) })),
  bindings: s.bindings.map((b) => ({ ...b })),
  pending: s.pending.map((p) => ({ ...p })),
});

// ---- 成员与姓名归属 ----

export const memberById = (state, id) => state.members.find((m) => m.id === id);

export const currentOrg = (member) => (member.history.length ? member.history[member.history.length - 1].org : '');

// 成员登记过的全部姓名：现名 + 曾用名。
export const memberNames = (member) => [member.name, ...member.formerNames];

// 某规范姓名当前登记在哪些成员名下（用于重名提示与判定）。
export function ownersOfName(state, name, excludeMemberId = null) {
  const key = normName(name);
  return state.members.filter(
    (m) => m.id !== excludeMemberId && memberNames(m).some((n) => normName(n) === key),
  );
}

// 某署名在某文献上的位置键。
export const occKey = (paperId, authorIndex) => `${paperId}#${authorIndex}`;

export function bindingAt(state, paperId, authorIndex) {
  return state.bindings.find((b) => b.paperId === paperId && b.authorIndex === authorIndex) || null;
}

export function pendingAt(state, paperId, authorIndex) {
  return state.pending.find((p) => p.paperId === paperId && p.authorIndex === authorIndex) || null;
}

// 同一姓名是否已有确认归属（可同时有多人登记同名；已确认绑定优先）。
export function existingOwnerOfName(state, name, excludeMemberId = null) {
  const key = normName(name);
  const ownerId = state.bindings.find((b) => normName(b.rawName) === key)?.memberId;
  if (ownerId && ownerId !== excludeMemberId) return memberById(state, ownerId);
  const registered = ownersOfName(state, name, excludeMemberId)[0];
  return registered || null;
}

// ---- 绑定判定 ----
// 返回 {state, result}：
//   confirmed  直接确认（姓名无其他归属，或本就是该成员）
//   pending    同一姓名已有归属 → 停在待处理
//   invalid    成员不存在或已离组（离组不能再产生新署名）
//   noop       该署名已绑定给同一成员
export function requestBinding(state, paperId, authorIndex, memberId) {
  const paper = state.papers.find((p) => p.id === paperId);
  const member = memberById(state, memberId);
  if (!paper || !member) return { state, result: 'invalid' };
  if (member.status === '离组') return { state, result: 'invalid' };

  const authors = splitAuthors(paper.authors);
  const rawName = authors[authorIndex];
  if (rawName === undefined) return { state, result: 'invalid' };

  const current = bindingAt(state, paperId, authorIndex);
  if (current && current.memberId === memberId) return { state, result: 'noop' };
  // 同一署名已有打开的待处理申请：不重复排队。
  if (!current && pendingAt(state, paperId, authorIndex)) return { state, result: 'pending' };

  const owner = existingOwnerOfName(state, rawName, memberId);
  const next = clone(state);

  if (owner) {
    next.pending = [
      ...next.pending.filter((p) => !(p.paperId === paperId && p.authorIndex === authorIndex)),
      {
        id: `pd-${uid()}`, paperId, authorIndex, rawName, memberId,
        reason: `同一姓名已归属 ${owner.name}`, createdAt: new Date().toISOString(),
      },
    ];
    return { state: next, result: 'pending' };
  }

  next.bindings = [
    ...next.bindings.filter((b) => !(b.paperId === paperId && b.authorIndex === authorIndex)),
    {
      id: `b-${uid()}`, paperId, authorIndex, rawName, memberId,
      // 绑定即定格机构：旧文献的显示永远以快照为准，不随后续转机构改写。
      orgSnapshot: currentOrg(member),
      boundAt: new Date().toISOString(),
    },
  ];
  next.pending = next.pending.filter((p) => !(p.paperId === paperId && p.authorIndex === authorIndex));
  return { state: next, result: 'confirmed' };
}

// 待处理 → 批准：确认绑定（机构以批准时成员的当前机构定格）。
export function approvePending(state, pendingId) {
  const item = state.pending.find((p) => p.id === pendingId);
  if (!item) return { state, result: 'missing' };
  const member = memberById(state, item.memberId);
  if (!member) return { state, result: 'invalid' };
  if (member.status === '离组') return { state, result: 'invalid' };

  const next = clone(state);
  next.pending = next.pending.filter((p) => p.id !== pendingId);
  next.bindings = [
    ...next.bindings.filter((b) => !(b.paperId === item.paperId && b.authorIndex === item.authorIndex)),
    {
      id: `b-${uid()}`, paperId: item.paperId, authorIndex: item.authorIndex,
      rawName: item.rawName, memberId: item.memberId,
      orgSnapshot: currentOrg(member), boundAt: new Date().toISOString(),
    },
  ];
  return { state: next, result: 'confirmed' };
}

// 待处理 → 驳回 / 撤回：只移除申请，署名回到未匹配。
export function rejectPending(state, pendingId) {
  if (!state.pending.some((p) => p.id === pendingId)) return { state, result: 'missing' };
  const next = clone(state);
  next.pending = next.pending.filter((p) => p.id !== pendingId);
  return { state: next, result: 'rejected' };
}

export function unbind(state, paperId, authorIndex) {
  if (!bindingAt(state, paperId, authorIndex)) return state;
  const next = clone(state);
  next.bindings = next.bindings.filter((b) => !(b.paperId === paperId && b.authorIndex === authorIndex));
  return next;
}

// ---- 成员维护 ----

export function addMember(state, data) {
  const id = data.id || `m-${uid()}`;
  const member = makeMember({
    id,
    name: data.name.trim(),
    org: data.org.trim(),
    orcid: (data.orcid || '').trim(),
    formerNames: (data.formerNames || []).map((s) => s.trim()).filter(Boolean),
  });
  const next = clone(state);
  next.members = [...next.members, member];
  return { state: next, member };
}

// 编辑成员。机构发生变化时追加一条履历（旧文献的快照不受影响，新绑定取新机构）。
export function saveMember(state, id, patch) {
  const member = memberById(state, id);
  if (!member) return { state, result: 'missing' };
  const next = clone(state);
  const target = next.members.find((m) => m.id === id);
  target.name = patch.name.trim();
  target.orcid = (patch.orcid || '').trim();
  target.formerNames = (patch.formerNames || []).map((s) => s.trim()).filter(Boolean);

  const orgChanged = patch.org.trim() !== currentOrg(target);
  if (orgChanged && patch.org.trim()) {
    target.history = [...target.history, { org: patch.org.trim(), since: new Date().toISOString() }];
  }
  return { state: next, result: orgChanged ? 'orgChanged' : 'saved' };
}

// 离组 / 重新在组。离组只改状态：文献里的署名与机构快照一律保留。
export function setMemberStatus(state, id, status, at = new Date().toISOString()) {
  const member = memberById(state, id);
  if (!member || member.status === status) return state;
  const next = clone(state);
  const target = next.members.find((m) => m.id === id);
  target.status = status;
  target.leftAt = status === '离组' ? at : null;
  return next;
}

// ---- 文献维护 ----

export function addPaper(state, form) {
  const paper = makePaper({
    id: form.id ?? uid(),
    title: form.title.trim(),
    authors: form.authors.trim(),
    year: form.year,
    venue: form.venue.trim(),
    tags: Array.isArray(form.tags) ? form.tags : splitTags(form.tags || ''),
    abstract: form.abstract.trim(),
  });
  const next = clone(state);
  next.papers = [...next.papers, paper];
  return { state: next, paper };
}

export const splitTags = (s) => s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);

export function updatePaper(state, paperId, patch) {
  if (!state.papers.some((p) => p.id === paperId)) return state;
  const next = clone(state);
  const paper = next.papers.find((p) => p.id === paperId);
  Object.assign(paper, patch);
  if (patch.tags && typeof patch.tags === 'string') paper.tags = splitTags(patch.tags);
  return next;
}

// ---- 页面用的派生视图 ----

// 一篇文献每个署名的绑定情况（顺序与文献署名一致）。
export function authorOccurrences(state, paper) {
  return splitAuthors(paper.authors).map((rawName, authorIndex) => {
    const binding = bindingAt(state, paper.id, authorIndex);
    const pending = pendingAt(state, paper.id, authorIndex);
    return {
      key: occKey(paper.id, authorIndex),
      paperId: paper.id,
      authorIndex,
      rawName,
      binding,
      member: binding ? memberById(state, binding.memberId) : null,
      pending,
      pendingMember: pending ? memberById(state, pending.memberId) : null,
    };
  });
}

export const paperMatchCount = (state, paper) => {
  const occ = authorOccurrences(state, paper);
  return { total: occ.length, matched: occ.filter((o) => o.binding).length };
};

// 未匹配作者：按署名列出去重，各自列出出现在哪些文献。
export function unmatchedAuthors(state) {
  const groups = new Map();
  for (const paper of state.papers) {
    for (const occ of authorOccurrences(state, paper)) {
      if (occ.binding) continue;
      const key = normName(occ.rawName);
      if (!groups.has(key)) groups.set(key, { name: occ.rawName, occurrences: [] });
      groups.get(key).occurrences.push({
        paperId: paper.id, paperTitle: paper.title, authorIndex: occ.authorIndex,
        pending: occ.pending, pendingMember: occ.pendingMember,
      });
    }
  }
  return [...groups.values()];
}

// 待处理列表附带文献与成员信息。
export function pendingList(state) {
  return state.pending.map((p) => ({
    ...p,
    paper: state.papers.find((x) => x.id === p.paperId) || null,
    member: memberById(state, p.memberId) || null,
    owner: existingOwnerOfName(state, p.rawName, p.memberId),
  }));
}

export const memberWorks = (state, memberId) =>
  state.bindings.filter((b) => b.memberId === memberId);

export { citeText };
