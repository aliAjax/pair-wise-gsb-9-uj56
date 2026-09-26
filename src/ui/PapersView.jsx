import React, { useMemo, useState } from 'react';
import {
  authorOccurrences, currentOrg, paperMatchCount, splitTags,
} from '../logic/identity.js';
import { STATUS_ACTIVE, STATUS_LEFT } from '../data/model.js';
import { MemberSelect, Modal } from './common.jsx';

// 文献列表中的一条署名及其身份操作。
function AuthorIdentityRow({ occ, members, onBind, onUnbind, onGoPending }) {
  const [picking, setPicking] = useState(false);
  const [memberId, setMemberId] = useState('');

  const submit = () => {
    if (!memberId) return;
    onBind(occ.paperId, occ.authorIndex, memberId);
    setMemberId('');
    setPicking(false);
  };

  if (occ.binding) {
    const moved = occ.member && currentOrg(occ.member) !== occ.binding.orgSnapshot;
    return (
      <li className="id-row bound">
        <span className="raw-name">{occ.rawName}</span>
        <span className="arrow">→</span>
        <span className={`member-chip ${occ.member?.status === STATUS_LEFT ? 'left' : ''}`}>
          {occ.member?.name || '未知成员'}
          {occ.member?.status === STATUS_LEFT && <em className="badge-left">已离组</em>}
        </span>
        <span className="org-snap" title="绑定时定格的机构，不随后续转机构改写">
          🏛 {occ.binding.orgSnapshot || '—'}
        </span>
        {moved && (
          <span className="now-org" title="成员当前机构，仅新绑定使用">
            现机构：{currentOrg(occ.member)}
          </span>
        )}
        <button className="link-btn warn" onClick={() => onUnbind(occ.paperId, occ.authorIndex)}>解除</button>
      </li>
    );
  }

  if (occ.pending) {
    return (
      <li className="id-row pending-row">
        <span className="raw-name">{occ.rawName}</span>
        <span className="arrow">→</span>
        <span className="member-chip outline">
          {occ.pendingMember?.name || '未知成员'}
          <em className="badge-pending">待处理</em>
        </span>
        <button className="link-btn" onClick={onGoPending}>前往处理</button>
      </li>
    );
  }

  return (
    <li className="id-row">
      <span className="raw-name">{occ.rawName}</span>
      <span className="arrow">→</span>
      {picking ? (
        <span className="bind-form">
          <MemberSelect members={members} value={memberId} onChange={setMemberId} />
          <button className="mini primary" disabled={!memberId} onClick={submit}>绑定</button>
          <button className="mini" onClick={() => { setPicking(false); setMemberId(''); }}>取消</button>
        </span>
      ) : (
        <button className="link-btn dashed" onClick={() => setPicking(true)}>＋ 绑定到成员</button>
      )}
    </li>
  );
}

function AddPaperModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: '', authors: '', year: String(new Date().getFullYear()), venue: '', abstract: '', tags: '' });
  const set = (k, v) => setForm({ ...form, [k]: v });
  const submit = () => {
    if (!form.title.trim()) return;
    onAdd({ ...form, year: Number(form.year) || null, tags: splitTags(form.tags) });
  };
  return (
    <Modal title="添加一篇文献" crumb="NEW REFERENCE" onClose={onClose}>
      <label>标题<input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="论文或书籍标题" /></label>
      <label>作者（署名照原样填写，保存后逐个绑定到成员）
        <input value={form.authors} onChange={(e) => set('authors', e.target.value)} placeholder="例如：Clark, A. & Chalmers, D. / 王敏, 李航" />
      </label>
      <div className="two">
        <label>年份<input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></label>
        <label>出版物<input value={form.venue} onChange={(e) => set('venue', e.target.value)} /></label>
      </div>
      <label>关键词<input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="用逗号分隔" /></label>
      <label>摘要<textarea rows="3" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} /></label>
      <button className="primary full" disabled={!form.title.trim()} onClick={submit}>保存文献（作者稍后匹配）</button>
    </Modal>
  );
}

export default function PapersView({
  state, selectedId, onSelect, onBind, onUnbind, onAddPaper, onUpdatePaper, onExport, onGoPending,
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [showAdd, setShowAdd] = useState(false);
  const selected = state.papers.find((p) => p.id === selectedId) || state.papers[0];

  const tags = useMemo(() => ['全部', ...new Set(state.papers.flatMap((x) => x.tags))], [state.papers]);
  const filtered = useMemo(
    () => state.papers
      .filter((x) => (tag === '全部' || x.tags.includes(tag))
        && `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase())),
    [state.papers, tag, query],
  );

  const cur = selected;
  const update = (k, v) => cur && onUpdatePaper(cur.id, { [k]: v });
  const copyCite = () => {
    navigator.clipboard?.writeText(cur.cite);
  };
  const addPaper = (form) => {
    const { paper } = onAddPaper(form);
    onSelect(paper.id);
    setShowAdd(false);
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / LIBRARY</span>
          <h1>文献与署名</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={onExport}>↓ 导出引用</button>
          <button className="primary" onClick={() => setShowAdd(true)}>＋ 添加文献</button>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          ⌕
          <input placeholder="搜索标题、作者或摘要…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
        <div className="tag-filter">
          {tags.map((t) => (
            <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="body">
        <section className="paper-list">
          {filtered.map((p) => {
            const { total, matched } = paperMatchCount(state, p);
            return (
              <button key={p.id} className={`paper ${cur?.id === p.id ? 'selected' : ''}`} onClick={() => onSelect(p.id)}>
                <div className="paper-year">{p.year}</div>
                <div className="paper-copy">
                  <h3>{p.title}</h3>
                  <p>{p.authors}</p>
                  <div>
                    <span className={`match-pill ${matched === total ? 'full' : matched > 0 ? 'part' : 'none'}`}>
                      署名 {matched}/{total}
                    </span>
                    {p.tags.map((t) => <span key={t}>#{t}</span>)}
                  </div>
                </div>
                <small className={`status ${p.status}`}>{p.status}</small>
              </button>
            );
          })}
          {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
        </section>

        <section className="detail">
          {cur && (
            <>
              <div className="detail-top">
                <span className="status reading">{cur.status}</span>
                <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>
                  {cur.status === '已读' ? '标记为待读' : '标记为已读'}
                </button>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>

              <div className="detail-section identity-section">
                <h4>作者身份 <span>AUTHOR IDENTITY</span></h4>
                <ul className="id-list">
                  {authorOccurrences(state, cur).map((occ) => (
                    <AuthorIdentityRow
                      key={occ.key}
                      occ={occ}
                      members={state.members}
                      onBind={onBind}
                      onUnbind={onUnbind}
                      onGoPending={onGoPending}
                    />
                  ))}
                </ul>
                <p className="rule-note">机构为绑定时定格的快照；成员转机构后，旧文献仍显示当时机构，只有新绑定使用新机构。</p>
              </div>

              <div className="cite-actions">
                <button onClick={copyCite}>▣ 复制引用</button>
              </div>

              <div className="detail-section">
                <h4>摘要 <span>ABSTRACT</span></h4>
                <p>{cur.abstract}</p>
              </div>
              <div className="detail-section">
                <h4>出版信息 <span>PUBLICATION</span></h4>
                <div className="pub-grid">
                  <div><small>出版物</small><strong>{cur.venue}</strong></div>
                  <div><small>年份</small><strong>{cur.year}</strong></div>
                </div>
              </div>
              <div className="detail-section">
                <h4>引用文本 <span>CITATION</span></h4>
                <div className="cite-box">
                  {cur.cite}
                  <button onClick={copyCite}>复制</button>
                </div>
              </div>
              <div className="detail-section">
                <h4>我的笔记 <span>PRIVATE</span></h4>
                <textarea
                  className="notes"
                  placeholder="记录你的阅读想法…"
                  value={cur.notes || ''}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {showAdd && <AddPaperModal onClose={() => setShowAdd(false)} onAdd={addPaper} />}
    </>
  );
}
