// 待处理绑定：同一姓名已有归属时，新绑定停在这里，由人工批准或驳回
export function PendingView({ state, memberById, paperById, onApprove, onReject, onOpenPaper }) {
  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / PENDING</span>
          <h1>待处理绑定</h1>
        </div>
      </header>
      <div className="view-body">
        <p className="hint">
          这些署名与某个姓名「已有归属」的成员重名，按规则先停在此处。批准后以成员
          <strong> 当前机构 </strong>
          写入快照；驳回则署名回到未匹配列表。
        </p>
        {state.pending.length === 0 && <div className="empty">没有待处理的绑定</div>}
        <div className="req-list">
          {state.pending.map((q) => {
            const m = memberById.get(q.memberId);
            const paper = paperById.get(q.paperId);
            return (
              <div key={q.id} className="req-card">
                <div className="req-main">
                  <div className="req-title">
                    <span className="req-printed">「{q.printed}」</span>
                    <span className="arrow">绑定到</span>
                    <strong>{m?.name || '（成员已删除）'}</strong>
                    {m?.orcid && <em className="orcid">ORCID {m.orcid}</em>}
                  </div>
                  <div className="req-meta">
                    文献：
                    <button className="link" onClick={() => onOpenPaper(q.paperId)}>
                      {paper?.title || '（文献不存在）'}
                    </button>
                  </div>
                  <div className="req-reason">拦截原因：{q.reason}</div>
                  <div className="req-meta">
                    提交时间：{new Date(q.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="req-actions">
                  <button
                    className="primary"
                    disabled={!m}
                    onClick={() => onApprove(q.id)}
                  >
                    批准绑定
                  </button>
                  <button onClick={() => onReject(q.id)}>驳回</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
