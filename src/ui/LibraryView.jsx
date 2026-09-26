import { useMemo, useState } from 'react';

// 文献与署名：列表 + 详情。详情里每条署名显示身份与「绑定时机构」快照。
export function LibraryView({
  state,
  memberById,
  selectedPaper,
  setSelectedPaper,
  onAddPaper,
  onBind,
  onUnbind,
  replaceState,
  flash,
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');

  const tags = ['全部', ...new Set(state.papers.flatMap((p) => p.tags))];
  const filtered = useMemo(
    () =>
      state.papers.filter(
        (p) =>
          (tag === '全部' || p.tags.includes(tag)) &&
          `${p.title}${p.printedAuthors}${p.abstract}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [state.papers, tag, query],
  );
  const cur =
    state.papers.find((p) => p.id === selectedPaper) || filtered[0] || state.papers[0];

  const download = () => {
    const blob = new Blob([state.papers.map((p) => p.cite).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'references.txt';
    a.click();
    flash('引用列表已导出');
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / IDENTITY</span>
          <h1>文献与署名</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={download}>↓ 导出引用</button>
          <button className="primary" onClick={onAddPaper}>＋ 添加文献</button>
        </div>
      </header>
      <div className="toolbar">
        <div className="search">
          ⌕
          <input
            placeholder="搜索标题、作者或摘要…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
          {filtered.map((p) => (
            <button
              key={p.id}
              className={'paper ' + (cur?.id === p.id ? 'selected' : '')}
              onClick={() => setSelectedPaper(p.id)}
            >
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.printedAuthors}</p>
                <div>
                  {p.tags.map((t) => <span key={t}>#{t}</span>)}
                </div>
              </div>
              <small className={'status ' + p.status}>{p.status}</small>
            </button>
          ))}
          {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
        </section>

        <section className="detail">
          {cur && (
            <PaperDetail
              paper={cur}
              state={state}
              memberById={memberById}
              onBind={onBind}
              onUnbind={onUnbind}
              replaceState={replaceState}
            />
          )}
        </section>
      </div>
    </>
  );
}

function PaperDetail({ paper, state, memberById, onBind, onUnbind, replaceState }) {
  const copyCite = () => navigator.clipboard?.writeText(paper.cite);

  const patch = (changes) => {
    const papers = state.papers.map((p) => (p.id === paper.id ? { ...p, ...changes } : p));
    replaceState({ ...state, papers });
  };

  const waitingFor = new Set(
    state.pending.filter((q) => q.paperId === paper.id).map((q) => q.bylineId),
  );

  return (
    <>
      <div className="detail-top">
        <span className={'status reading ' + paper.status}>{paper.status}</span>
        <button onClick={() => patch({ status: paper.status === '已读' ? '待读' : '已读' })}>
          {paper.status === '已读' ? '标记为待读' : '标记为已读'}
        </button>
      </div>
      <h2>{paper.title}</h2>

      <div className="detail-section">
        <h4>作者署名 <span>BYLINE / IDENTITY</span></h4>
        <div className="byline-list">
          {paper.bylines.map((b) => {
            const m = b.memberId ? memberById.get(b.memberId) : null;
            const waiting = waitingFor.has(b.id);
            return (
              <div key={b.id} className={'byline ' + (m ? 'bound' : waiting ? 'waiting' : 'loose')}>
                <div className="byline-main">
                  <strong>{b.printed}</strong>
                  {m ? (
                    <span className="who">
                      → {m.name}
                      {m.orcid && <em className="orcid">ORCID {m.orcid}</em>}
                      {m.status === 'left' && <em className="tag-left">已离组·署名保留</em>}
                    </span>
                  ) : waiting ? (
                    <span className="who pending">绑定待处理，等待人工确认</span>
                  ) : (
                    <span className="who loose">未匹配作者</span>
                  )}
                </div>
                <div className="byline-sub">
                  {m && (
                    <>
                      <span className="aff">文献机构（绑定时）：{b.affiliation || '—'}</span>
                      {m.status === 'active' && m.affiliation !== b.affiliation && (
                        <em className="moved">成员现已转至：{m.affiliation}（仅新绑定用新机构）</em>
                      )}
                    </>
                  )}
                </div>
                <div className="byline-actions">
                  {m ? (
                    <button onClick={() => onUnbind({ paperId: paper.id, bylineId: b.id })}>
                      解除绑定
                    </button>
                  ) : (
                    <button
                      className="primary small"
                      disabled={waiting}
                      onClick={() => onBind({ paperId: paper.id, bylineId: b.id, printed: b.printed })}
                    >
                      {waiting ? '处理中…' : '绑定到成员'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="hint">机构以绑定时为准保存为快照；成员之后换机构或离组，旧文献署名不变。</p>
      </div>

      <div className="cite-actions">
        <button onClick={copyCite}>▣ 复制引用</button>
      </div>

      <div className="detail-section">
        <h4>摘要 <span>ABSTRACT</span></h4>
        <p>{paper.abstract}</p>
      </div>
      <div className="detail-section">
        <h4>出版信息 <span>PUBLICATION</span></h4>
        <div className="pub-grid">
          <div><small>出版物</small><strong>{paper.venue}</strong></div>
          <div><small>年份</small><strong>{paper.year}</strong></div>
        </div>
      </div>
      <div className="detail-section">
        <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
        <div className="cite-box">
          {paper.cite}
          <button onClick={copyCite}>复制</button>
        </div>
      </div>
      <div className="detail-section">
        <h4>我的笔记 <span>PRIVATE</span></h4>
        <textarea
          className="notes"
          placeholder="记录你的阅读想法…"
          value={paper.notes || ''}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </div>
    </>
  );
}
