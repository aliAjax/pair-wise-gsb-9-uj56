// 资料层：只描述“存什么”——数据形状、身份规则所需的字段、演示种子资料。
// 不做任何判定（不含冲突逻辑），也不接触 localStorage 或 DOM。

export const STATUS_ACTIVE = '在组';
export const STATUS_LEFT = '离组';

// 统一生成 id：时间戳不够用时退化为自增序号。
export const uid = () => Date.now() + Math.floor(Math.random() * 1e3);

// 机构履历条目：{org, since}。当前机构 = 最后一条。
export function makeMember({ id, name, org, orcid = '', formerNames = [], history, status = STATUS_ACTIVE, joinedAt, leftAt = null }) {
  const since = joinedAt || new Date().toISOString();
  return {
    id,
    name,
    orcid,
    formerNames: [...formerNames],
    history: history && history.length ? history.map((h) => ({ ...h })) : [{ org, since }],
    status,
    joinedAt: since,
    leftAt,
  };
}

export function makePaper({ id, title, authors, year, venue = '', tags = [], abstract = '', status = '待读', cite = '', notes = '' }) {
  return {
    id,
    title,
    authors,
    year: Number(year),
    venue,
    tags: [...tags],
    abstract,
    status,
    cite: cite || citeText(authors, year, title, venue),
    notes,
  };
}

export const citeText = (authors, year, title, venue) => `${authors} (${year}). ${title}. ${venue}.`;

// ---- 演示资料（含重名、改名、转机构、离组各一例）----

const M = {
  clark: 'm-1',
  chalmers: 'm-2',
  millerHCI: 'm-3',
  laura: 'm-4',
  samuel: 'm-5',
  zhou: 'm-6',
};
const P = { p1: 1, p2: 2, p3: 3, p4: 4, p5: 5 };

function seedMembers() {
  return [
    makeMember({
      id: M.clark,
      name: 'Andy Clark',
      org: '爱丁堡大学',
      orcid: '0000-0002-1234-567X',
      history: [
        { org: '华盛顿大学圣路易斯分校', since: '1998-01-01T00:00:00.000Z' },
        { org: '爱丁堡大学', since: '2004-09-01T00:00:00.000Z' },
      ],
    }),
    makeMember({
      id: M.chalmers,
      name: 'David Chalmers',
      org: '纽约大学',
      orcid: '0000-0002-9876-5432',
      history: [
        { org: '加州大学圣克鲁兹分校', since: '1998-01-01T00:00:00.000Z' },
        { org: '纽约大学', since: '2009-09-01T00:00:00.000Z' },
      ],
    }),
    makeMember({
      id: M.millerHCI,
      name: 'Sarah Miller',
      org: '麻省理工学院',
      orcid: '0000-0003-1111-2222',
      formerNames: ['Laura Miller'],
      history: [{ org: '麻省理工学院', since: '2018-03-01T00:00:00.000Z' }],
    }),
    makeMember({
      id: M.laura,
      name: 'Laura Miller',
      org: '西北大学',
      orcid: '0000-0003-3333-4444',
      history: [{ org: '西北大学', since: '2020-06-01T00:00:00.000Z' }],
    }),
    makeMember({
      id: M.samuel,
      name: 'Samuel Miller',
      org: '清华大学',
      orcid: '0000-0003-5555-6666',
      history: [{ org: '清华大学', since: '2021-09-01T00:00:00.000Z' }],
    }),
    makeMember({
      id: M.zhou,
      name: '周敏',
      org: '北京大学',
      orcid: '',
      formerNames: ['王敏'],
      status: STATUS_LEFT,
      leftAt: '2023-12-31T00:00:00.000Z',
      history: [{ org: '北京大学', since: '2015-07-01T00:00:00.000Z' }],
    }),
  ];
}

function seedPapers() {
  return [
    makePaper({
      id: P.p1,
      title: 'The Extended Mind',
      authors: 'Clark, A. & Chalmers, D.',
      year: 1998,
      venue: 'Analysis',
      tags: ['具身认知', '经典'],
      abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
      status: '阅读中',
      cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.',
      notes: '',
    }),
    makePaper({
      id: P.p2,
      title: 'Situated Learning',
      authors: 'Lave, J. & Wenger, E.',
      year: 1991,
      venue: 'Cambridge University Press',
      tags: ['学习科学', '社会'],
      abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
      status: '待读',
      cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.',
    }),
    makePaper({
      id: P.p3,
      title: 'Designing with Data',
      authors: 'Miller, S.',
      year: 2022,
      venue: 'MIT Press',
      tags: ['设计研究', '方法'],
      abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
      status: '已读',
      cite: 'Miller, S. (2022). Designing with Data.',
    }),
    makePaper({
      id: P.p4,
      title: '共同体中的学徒制',
      authors: '王敏, 李航',
      year: 2019,
      venue: '社会学研究',
      tags: ['学习科学'],
      abstract: '以合法边缘参与为线索，追踪一个研究小组中学徒身份的形成与机构流动。',
      status: '已读',
    }),
    makePaper({
      id: P.p5,
      title: 'Mixed Methods at Scale',
      authors: 'Miller, S.',
      year: 2024,
      venue: 'Springer',
      tags: ['方法'],
      abstract: '讨论大规模混合方法研究中，署名身份消歧与机构归属的记录方式。',
      status: '待读',
    }),
  ];
}

function seedBindings() {
  return [
    // p1 两条绑定都定格在“当时的机构”（成员此后已转机构）
    {
      id: 'b-1', paperId: P.p1, authorIndex: 0, rawName: 'Clark, A.', memberId: M.clark,
      orgSnapshot: '华盛顿大学圣路易斯分校', boundAt: '2024-01-10T08:00:00.000Z',
    },
    {
      id: 'b-2', paperId: P.p1, authorIndex: 1, rawName: 'Chalmers, D.', memberId: M.chalmers,
      orgSnapshot: '加州大学圣克鲁兹分校', boundAt: '2024-01-10T08:01:00.000Z',
    },
    // 重名 “Miller, S.” 已归 Sarah Miller
    {
      id: 'b-3', paperId: P.p3, authorIndex: 0, rawName: 'Miller, S.', memberId: M.millerHCI,
      orgSnapshot: '麻省理工学院', boundAt: '2024-02-01T08:00:00.000Z',
    },
    // 曾用名 “王敏” 归周敏（她已离组，但署名保留、机构定格）
    {
      id: 'b-4', paperId: P.p4, authorIndex: 0, rawName: '王敏', memberId: M.zhou,
      orgSnapshot: '北京大学', boundAt: '2024-02-05T08:00:00.000Z',
    },
  ];
}

function seedPending() {
  return [
    // 同名 “Miller, S.” 想绑定到另一位成员 → 停在待处理
    {
      id: 'pd-1', paperId: P.p5, authorIndex: 0, rawName: 'Miller, S.', memberId: M.samuel,
      reason: '同一姓名已归属其他成员', createdAt: '2024-03-01T08:00:00.000Z',
    },
  ];
}

export function makeSeedState() {
  return {
    version: 1,
    papers: seedPapers(),
    members: seedMembers(),
    bindings: seedBindings(),
    pending: seedPending(),
  };
}
