// 资料层：初始研究库数据。
// 成员（身份）与文献（带署名条目）互相独立，署名条目通过 memberId 绑定到成员，
// affiliation 是绑定时机构的快照 —— 成员后来换机构不会改动它。

export const seedMembers = [
  {
    id: 'm1',
    name: '王芳',
    orcid: '0000-0001-5501-2345',
    affiliation: '北京大学心理与认知科学学院',
    formerNames: ['王芳芳'],
    history: [{ affiliation: '北京师范大学心理学部', until: '2019-09-01' }],
    status: 'active',
  },
  {
    id: 'm2',
    name: '陈立',
    orcid: '0000-0002-3132-7781',
    affiliation: '清华大学教育研究院',
    formerNames: [],
    history: [],
    status: 'active',
  },
  {
    id: 'm3',
    name: '李航',
    orcid: '0000-0003-0018-4420',
    affiliation: '华东师范大学教育心理学系',
    formerNames: [],
    history: [
      { affiliation: '北京师范大学认知神经科学与学习国家重点实验室', until: '2021-06-30' },
    ],
    status: 'active',
  },
  {
    id: 'm4',
    name: '赵敏',
    orcid: '0000-0002-9987-1104',
    affiliation: '浙江大学教育学院',
    formerNames: [],
    history: [],
    status: 'left',
    leftNote: '2023 年离组，文献署名按原署名保留',
  },
  // 重名：两个「张伟」靠 ORCID 与机构区分
  {
    id: 'm5',
    name: '张伟',
    orcid: '0000-0003-4455-9012',
    affiliation: '北京师范大学心理学部',
    formerNames: [],
    history: [],
    status: 'active',
  },
  {
    id: 'm6',
    name: '张伟',
    orcid: '0000-0003-7710-6633',
    affiliation: '华东师范大学教育心理学系',
    formerNames: [],
    history: [],
    status: 'active',
  },
];

// 新加入的署名条目默认未绑定（memberId: null）。
// 初始资料使用显式 ID，便于预置的待处理请求引用。
const byline = (id, name, memberId, affiliation) => ({
  id,
  printed: name,
  memberId,
  affiliation,
});

export const seedPapers = [
  {
    id: 'p1',
    title: '工作记忆训练的迁移效应：一项元分析',
    printedAuthors: '王芳芳, 陈立',
    year: 2018,
    venue: '心理科学进展',
    tags: ['元分析', '工作记忆'],
    abstract:
      '对工作记忆训练能否迁移到流体智力进行元分析，结果显示近迁移稳定、远迁移效应量较小且受调节变量影响。',
    status: '已读',
    cite: '王芳芳, 陈立 (2018). 工作记忆训练的迁移效应：一项元分析. 心理科学进展.',
    notes: '',
    bylines: [
      byline('p1b1', '王芳芳', 'm1', '北京师范大学心理学部'),
      byline('p1b2', '陈立', 'm2', '清华大学教育研究院'),
    ],
  },
  {
    id: 'p2',
    title: '情境学习与共同体实践',
    printedAuthors: 'Lave, J., 李航, 赵敏',
    year: 2020,
    venue: '学习科学杂志',
    tags: ['学习科学', '社会'],
    abstract: '讨论知识如何在真实共同体的参与中生成，分析合法的边缘性参与对身份发展的作用。',
    status: '阅读中',
    cite: 'Lave, J., 李航, 赵敏 (2020). 情境学习与共同体实践. 学习科学杂志.',
    notes: '',
    bylines: [
      byline('p2b1', 'Lave, J.', null, null),
      byline('p2b2', '李航', 'm3', '北京师范大学认知神经科学与学习国家重点实验室'),
      byline('p2b3', '赵敏', 'm4', '浙江大学教育学院'),
    ],
  },
  {
    id: 'p3',
    title: '课堂话语中的教师追问研究',
    printedAuthors: '王芳, 张伟',
    year: 2023,
    venue: '教育研究',
    tags: ['课堂话语', '方法'],
    abstract:
      '基于课堂录像编码，区分事实性追问与解释性追问，后者更能促进学生的深层概念理解。',
    status: '待读',
    cite: '王芳, 张伟 (2023). 课堂话语中的教师追问研究. 教育研究.',
    notes: '',
    bylines: [
      byline('p3b1', '王芳', 'm1', '北京大学心理与认知科学学院'),
      byline('p3b2', '张伟', 'm5', '北京师范大学心理学部'),
    ],
  },
  {
    id: 'p4',
    title: '教育神经科学的跨学科协作网络',
    printedAuthors: '李航, 张伟, Smith, J.',
    year: 2025,
    venue: 'Mind, Brain, and Education',
    tags: ['教育神经科学', '合作网络'],
    abstract:
      '用作者共现网络分析 2010–2024 年教育神经科学的跨学科合作结构，发现机构流动显著改变合作簇。',
    status: '待读',
    cite: '李航, 张伟, Smith, J. (2025). 教育神经科学的跨学科协作网络. Mind, Brain, and Education.',
    notes: '',
    bylines: [
      byline('p4b1', '李航', 'm3', '华东师范大学教育心理学系'),
      byline('p4b2', '张伟', null, null),
      byline('p4b3', 'Smith, J.', null, null),
    ],
  },
];

// 预置一个待处理请求：p4 的「张伟」与 p3 已有归属的「张伟（北师大）」重名，
// 新绑定先停在待处理。
export const seedPending = [
  {
    id: 'req1',
    paperId: 'p4',
    bylineId: 'p4b2',
    printed: '张伟',
    memberId: 'm6',
    affiliationSnapshot: '华东师范大学教育心理学系',
    reason: '该姓名已有归属：张伟（0000-0003-4455-9012，北京师范大学心理学部）',
    createdAt: '2025-11-02T10:00:00.000Z',
  },
];

export const seedState = {
  version: 2,
  members: seedMembers,
  papers: seedPapers,
  pending: seedPending,
};
