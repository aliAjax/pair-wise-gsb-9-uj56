import React from 'react';
import { pendingList } from '../logic/identity.js';
import { STATUS_LEFT } from '../data/model.js';
import { fmtDateTime } from './common.jsx';

// 待处理台：同一姓名已有归属时，新的绑定申请先停在这里。
export default function PendingView({ state, onApprove, onReject, onOpenPaper }) {
  const items = pendingList(state);

  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / PENDING</span>
          <h1>待处理绑定</h1>
        </div>
        <div className="actions"><span className="count-chip">{items.length} 条待处理</span></div>
      </header>

      <div className="view-body">
        {items.length === 0 && (
          <div className="empty-panel">
            <strong>暂无待处理绑定</strong>
            <p>当某姓名已归属一位成员，而又有人申请把同一姓名绑给另一位成员时，申请会停在这里等待判定。</p>
          </div>
        )}
        <div className="pending-list">
          {items.map((p) => {
            const targetLeft = p.member?.status === STATUS_LEFT;
            return (
              <article key={p.id} className="pending-card">
                <div className="pending-main">
                  <p className="pending-names">
                    <span className="raw-name-lg">「{p.rawName}」</span>
                    申请绑定到
                    <span className="member-chip">{p.member?.name || '未知成员'}
                      {targetLeft && <em className="badge-left">已离组</em>}
                    </span>
                  </p>
                  <p className="pending-reason">
                    ⚠ {p.reason}
                    {p.owner && <>（现归属：{p.owner.name}）</>}
                  </p>
                  <p className="pending-paper">
                    文献：
                    {p.paper
                      ? <button className="link-btn" onClick={() => onOpenPaper(p.paperId)}>{p.paper.title}（{p.paper.year}）</button>
                      : <span className="muted">原文献已不存在</span>}
                  </p>
                  <p className="pending-time">提交于 {fmtDateTime(p.createdAt)}</p>
                </div>
                <div className="pending-actions">
                  <button
                    className="primary mini"
                    disabled={!p.member || targetLeft}
                    title={targetLeft ? '成员已离组，不能确认新署名' : ''}
                    onClick={() => onApprove(p.id)}
                  >
                    批准绑定
                  </button>
                  <button className="mini warn" onClick={() => onReject(p.id)}>驳回</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
