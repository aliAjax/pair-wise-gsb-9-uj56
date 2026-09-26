// 判定层：全部是纯函数，负责身份归属规则，不依赖 React、不读写本机存储。
//
// 核心规则：
// 1. 姓名按「归一化字符串」判重名；成员的现用名和曾用名都算该姓名的候选。
// 2. 一个姓名一旦在某条署名上有「已确认」归属，后来同名的新绑定先停在待处理。
// 3. 绑定时把成员当时机构作为快照存进署名条目，之后成员换机构不影响旧文献。
// 4. 离组只改成员状态，不改动任何署名条目（署名带不走也抹不掉）。

export const uid = (prefix) =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// 把 "Clark, A. & Chalmers, D." / "王芳, 张伟" 这类作者字符串拆成单个姓名。
// 难点：英文 "Clark, A." 里的逗号是姓名内部格式，不是分隔符；
// 而中文姓名不含字母，可用「字母开头 + 逗号 + 缩写」模式保护。
export function splitAuthors(text) {
  const source = String(text || '');
  const placeholders = [];
  // 保护形如 "Clark, A." / "Smith, J. R." 的作者内部逗号
  const protectedText = source.replace(
    /([A-Za-z][A-Za-z.'’-]*)\s*,\s*((?:[A-Z]\.\s*)+)/g,
    (_match, last, initials) => {
      placeholders.push(`${last}, ${initials.trim()}`);
      return `@@BYLINE${placeholders.length - 1}@@`;
    },
  );
  return protectedText
    .split(/&|；|;|，|,|、/g)
    .map((part) =>
      part
        .trim()
        .replace(/@@BYLINE(\d+)@@/g, (_m, i) => placeholders[Number(i)]),
    )
    .filter(Boolean);
}

export function makeBylines(paperId, authorText) {
  return splitAuthors(authorText).map((name, i) => ({
    id: `${paperId}b${i + 1}`,
    printed: name,
    memberId: null,
    affiliation: null,
  }));
}

// 归一化姓名：去空白、转小写，用于重名判断
export function normalizeName(name) {
  return String(name || '').replace(/\s+/g, '').toLowerCase();
}

// 成员登记过的全部姓名（现用名 + 曾用名）
export function memberNameKeys(member) {
  return [member.name, ...(member.formerNames || [])].map(normalizeName);
}

// 姓名 -> 登记过该姓名的成员列表
export function candidatesByName(members, printed) {
  const key = normalizeName(printed);
  return members.filter((m) => memberNameKeys(m).includes(key));
}

// 全库「已确认」的归属：归一化姓名 -> 首次绑定到的成员
// 用首次绑定者作为已有归属者：批准待处理时也走同一套规则。
export function ownerMap(papers) {
  const map = new Map();
  for (const paper of papers) {
    for (const b of paper.bylines || []) {
      if (!b.memberId) continue;
      const key = normalizeName(b.printed);
      if (!map.has(key)) map.set(key, b.memberId);
    }
  }
  return map;
}

// 找到某条署名所在文献；返回 { paper, byline }
export function locateByline(papers, paperId, bylineId) {
  const paper = papers.find((p) => p.id === paperId);
  const byline = paper?.bylines?.find((b) => b.id === bylineId) || null;
  return paper ? { paper, byline } : { paper: null, byline: null };
}

// 判断把 printed 这个姓名绑给 memberId 会不会与已有归属冲突。
// 同一个人重复绑定不算冲突（返回 null）；姓名已有别人的归属时返回归属者成员说明。
export function conflictFor(papers, members, printed, memberId) {
  const ownerId = ownerMap(papers).get(normalizeName(printed));
  if (!ownerId || ownerId === memberId) return null;
  const owner = members.find((m) => m.id === ownerId);
  if (!owner) return null;
  return `该姓名已有归属：${owner.name}（${owner.orcid || '无 ORCID'}，${owner.affiliation}）`;
}

// 执行一次绑定请求：
// - 目标成员不存在 / 署名不存在：报错
// - 与已有归属冲突：生成一条 pending 请求，原数据不动
// - 否则立即绑定，同时写入当时机构快照
export function requestBind(state, { paperId, bylineId, memberId }) {
  const member = state.members.find((m) => m.id === memberId);
  const { byline } = locateByline(state.papers, paperId, bylineId);
  if (!member || !byline) return { state, error: '成员或署名不存在' };

  const conflict = conflictFor(state.papers, state.members, byline.printed, memberId);
  if (conflict) {
    // 已有同一条针对该署名+成员的待处理请求时不重复生成
    const dup = state.pending.some(
      (q) => q.paperId === paperId && q.bylineId === bylineId && q.memberId === memberId,
    );
    if (dup) return { state, error: '该绑定已在待处理队列中' };
    const req = {
      id: uid('req'),
      paperId,
      bylineId,
      printed: byline.printed,
      memberId,
      affiliationSnapshot: member.affiliation,
      reason: conflict,
      createdAt: new Date().toISOString(),
    };
    return { state: { ...state, pending: [...state.pending, req] }, queued: true };
  }

  const papers = state.papers.map((p) =>
    p.id !== paperId
      ? p
      : {
          ...p,
          bylines: p.bylines.map((b) =>
            b.id !== bylineId
              ? b
              : { ...b, memberId, affiliation: member.affiliation },
          ),
        },
  );
  return { state: { ...state, papers } };
}

// 批准待处理：管理员确认后按请求内容绑定（以成员当前机构做快照），随后删除该请求。
// 批准本身就是对「同名归属冲突」的人工裁决，因此不再拦截；
// 若目标成员已被删除，请求只能驳回。
export function approvePending(state, requestId) {
  const req = state.pending.find((q) => q.id === requestId);
  if (!req) return { state, error: '请求不存在' };
  const member = state.members.find((m) => m.id === req.memberId);
  if (!member) return { state, error: '目标成员已不存在，请驳回该请求' };

  const papers = state.papers.map((p) =>
    p.id !== req.paperId
      ? p
      : {
          ...p,
          bylines: p.bylines.map((b) =>
            b.id !== req.bylineId
              ? b
              : { ...b, memberId: req.memberId, affiliation: member.affiliation },
          ),
        },
  );
  return {
    state: { ...state, papers, pending: state.pending.filter((q) => q.id !== requestId) },
  };
}

// 驳回待处理：仅删除请求，署名保持未匹配
export function rejectPending(state, requestId) {
  return { ...state, pending: state.pending.filter((q) => q.id !== requestId) };
}

// 取消已有绑定：署名回到未匹配（不动历史机构以外的字段）
export function unbind(state, { paperId, bylineId }) {
  const papers = state.papers.map((p) =>
    p.id !== paperId
      ? p
      : {
          ...p,
          bylines: p.bylines.map((b) =>
            b.id !== bylineId ? b : { ...b, memberId: null, affiliation: null },
          ),
        },
  );
  // 指向该署名的待处理请求一并清掉
  const pending = state.pending.filter(
    (q) => !(q.paperId === paperId && q.bylineId === bylineId),
  );
  return { ...state, papers, pending };
}

// 未匹配署名清单：未绑定、且没有待处理请求在排队的署名
export function unmatchedEntries(state) {
  const waiting = new Set(state.pending.map((q) => `${q.paperId}/${q.bylineId}`));
  const rows = [];
  for (const paper of state.papers) {
    for (const b of paper.bylines || []) {
      if (!b.memberId && !waiting.has(`${paper.id}/${b.id}`)) {
        rows.push({ paper, byline: b });
      }
    }
  }
  // 按归一化姓名归组
  const groups = new Map();
  for (const row of rows) {
    const key = normalizeName(row.byline.printed);
    if (!groups.has(key)) groups.set(key, { printed: row.byline.printed, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}

// 成员登记：姓名/机构必填，ORCID 可空但同一 ORCID 不能重复登记
export function addMember(state, data) {
  const name = (data.name || '').trim();
  const affiliation = (data.affiliation || '').trim();
  if (!name || !affiliation) return { state, error: '姓名和机构必填' };
  const orcid = (data.orcid || '').trim();
  if (orcid && state.members.some((m) => m.orcid === orcid)) {
    return { state, error: '该 ORCID 已登记' };
  }
  const member = {
    id: uid('m'),
    name,
    orcid,
    affiliation,
    formerNames: (data.formerNames || []).map((s) => s.trim()).filter(Boolean),
    history: [],
    status: 'active',
  };
  return { state: { ...state, members: [...state.members, member] } };
}

// 成员资料变更：
// - 姓名变化：旧姓名自动进曾用名（曾用名用于同名候选，不丢历史）
// - 机构变化：旧机构进 history（旧文献的署名快照不动，只有之后的新绑定用新机构）
export function updateMember(state, memberId, data) {
  const before = state.members.find((m) => m.id === memberId);
  if (!before) return { state, error: '成员不存在' };
  const name = (data.name || '').trim();
  const affiliation = (data.affiliation || '').trim();
  if (!name || !affiliation) return { state, error: '姓名和机构必填' };
  const orcid = (data.orcid || '').trim();
  if (orcid && state.members.some((m) => m.id !== memberId && m.orcid === orcid)) {
    return { state, error: '该 ORCID 已被其他成员登记' };
  }

  const formerNames = [...(before.formerNames || [])];
  if (name !== before.name && !formerNames.includes(before.name)) {
    formerNames.push(before.name);
  }

  const history = [...(before.history || [])];
  if (affiliation !== before.affiliation) {
    history.push({
      affiliation: before.affiliation,
      until: new Date().toISOString().slice(0, 10),
    });
  }

  const members = state.members.map((m) =>
    m.id === memberId ? { ...m, name, orcid, affiliation, formerNames, history } : m,
  );
  return { state: { ...state, members } };
}

// 离组 / 回组：只切换状态，署名条目一个都不动
export function setMemberStatus(state, memberId, status) {
  const members = state.members.map((m) => (m.id === memberId ? { ...m, status } : m));
  return { ...state, members };
}

// 没有任何署名（含待处理请求指向）的成员才能删除，防止把归属删空
export function canDeleteMember(state, memberId) {
  const used = state.papers.some((p) => (p.bylines || []).some((b) => b.memberId === memberId));
  const queued = state.pending.some((q) => q.memberId === memberId);
  return !used && !queued;
}

export function deleteMember(state, memberId) {
  if (!canDeleteMember(state, memberId)) {
    return { state, error: '该成员名下已有署名或待处理绑定，不能删除，可改为标记离组' };
  }
  return { ...state, members: state.members.filter((m) => m.id !== memberId) };
}

// 新增文献：作者字符串拆成未匹配署名
export function addPaper(state, paper) {
  const id = uid('p');
  const bylines = makeBylines(id, paper.authors);
  const record = {
    id,
    title: paper.title.trim(),
    printedAuthors: paper.authors.trim(),
    year: Number(paper.year) || null,
    venue: paper.venue.trim(),
    tags: paper.tags,
    abstract: paper.abstract.trim(),
    status: '待读',
    cite: `${paper.authors.trim()} (${paper.year}). ${paper.title.trim()}. ${paper.venue.trim()}.`,
    notes: '',
    bylines,
  };
  return { state: { ...state, papers: [...state.papers, record] }, paper: record };
}
