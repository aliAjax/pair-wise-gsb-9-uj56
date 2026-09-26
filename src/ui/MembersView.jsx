// 成员身份名册：姓名、机构、ORCID、曾用名、机构履历、在组状态
export function MembersView({
  state,
  onEdit,
  onCreate,
  onToggleLeave,
  onDelete,
  paperCount,
}) {
  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / MEMBERS</span>
          <h1>成员身份</h1>
        </div>
        <div className="actions">
          <button className="primary" onClick={onCreate}>＋ 登记新成员</button>
        </div>
      </header>
      <div className="view-body">
        <p className="hint">
          每位成员登记现用名、机构与 ORCID；改名时旧名自动进入曾用名，换机构时旧机构进入履历。
          离组成员保留全部历史署名，不能删除已有署名的成员。
        </p>
        <div className="member-grid">
          {state.members.map((m) => {
            const count = paperCount(m.id);
            return (
              <div key={m.id} className={'member-card ' + (m.status === 'left' ? 'left' : '')}>
                <div className="member-card-head">
                  <strong>{m.name}</strong>
                  <span className={'chip ' + m.status}>{m.status === 'left' ? '已离组' : '在组'}</span>
                </div>
                <div className="member-row"><small>ORCID</small>{m.orcid || <em>未登记</em>}</div>
                <div className="member-row"><small>当前机构</small>{m.affiliation}</div>
                <div className="member-row">
                  <small>曾用名</small>
                  {m.formerNames.length ? m.formerNames.join('、') : <em>无</em>}
                </div>
                {m.history.length > 0 && (
                  <div className="member-row history">
                    <small>机构履历</small>
                    <ul>
                      {m.history.map((h, i) => (
                        <li key={i}>{h.affiliation} <span>（至 {h.until}）</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.status === 'left' && m.leftNote && <p className="left-note">{m.leftNote}</p>}
                <div className="member-foot">
                  <span>{count} 条署名</span>
                  <span className="member-btns">
                    <button onClick={() => onEdit(m.id)}>编辑</button>
                    <button onClick={() => onToggleLeave(m)}>
                      {m.status === 'left' ? '标记回组' : '标记离组'}
                    </button>
                    <button
                      className="danger"
                      disabled={count > 0}
                      title={count > 0 ? '已有文献署名，不能删除，请改为离组' : ''}
                      onClick={() => onDelete(m)}
                    >
                      删除
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
