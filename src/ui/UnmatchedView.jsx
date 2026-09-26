import React, { useState } from 'react';
import { unmatchedAuthors } from '../logic/identity.js';
import { MemberSelect } from './common.jsx';

// 未匹配作者：尚未绑定成员的署名单独列出来，可直接处理。
export default function UnmatchedView({ state, onBind, onGoPending, onOpenPaper }) {
  const groups = unmatchedAuthors(state);
  const [pick, setPick] = useState({}); // key: groupName -> memberId

  const bindOne = (occ, name) => {
    const memberId = pick[name];
    if (!memberId) return;
    onBind(occ.paperId, occ.authorIndex, memberId);
  };

  const bindAll = (group) => {
    const memberId = pick[group.name];
    if (!memberId) return;
    // 逐处提交：若某处姓名已有归属，判定层会自动转成待处理。
    group.occurrences.forEach((occ) => onBind(occ.paperId, occ.authorIndex, memberId));
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / UNMATCHED</span>
          <h1>未匹配作者</h1>
        </div>
        <div className="actions"><span className="count-chip">{groups.length} 个署名</span></div>
      </header>

      <div className="view-body">
        {groups.length === 0 && (
          <div className="empty-panel">
            <strong>所有署名都已匹配</strong>
            <p>文献中的每位作者都已绑定到成员。新增文献后，尚未匹配的署名会出现在这里。</p>
          </div>
        )}
        <div className="unmatched-list">
          {groups.map((g) => (
            <article key={g.name} className="unmatched-card">
              <div className="unmatched-head">
                <h3>{g.name}</h3>
                <span className="muted">出现于 {g.occurrences.length} 篇文献</span>
                <span className="bind-all">
                  <MemberSelect members={state.members} value={pick[g.name] || ''} onChange={(v) => setPick({ ...pick, [g.name]: v })} />
                  <button className="mini primary" disabled={!pick[g.name]} onClick={() => bindAll(g)}>
                    全部绑定到此成员
                  </button>
                </span>
              </div>
              <ul className="occ-list">
                {g.occurrences.map((occ) => (
                  <li key={`${occ.paperId}-${occ.authorIndex}`}>
                    <button className="link-btn" onClick={() => onOpenPaper(occ.paperId)}>{occ.paperTitle}</button>
                    {occ.pending ? (
                      <span className="member-chip outline">
                        {occ.pendingMember?.name || '未知成员'}
                        <em className="badge-pending">待处理</em>
                        <button className="link-btn" onClick={onGoPending}>去处理</button>
                      </span>
                    ) : (
                      <span className="occ-bind">
                        <MemberSelect
                          members={state.members}
                          value={pick[g.name] || ''}
                          onChange={(v) => setPick({ ...pick, [g.name]: v })}
                        />
                        <button className="mini" disabled={!pick[g.name]} onClick={() => bindOne(occ, g.name)}>绑定</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
