import { candidatesByName } from '../rules/identity.js';

// 未匹配作者：单独列出所有还没绑定身份的署名（待处理中的不算在内）
export function UnmatchedView({ groups, members, onBind, onOpenPaper }) {
  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / UNMATCHED</span>
          <h1>未匹配作者</h1>
        </div>
      </header>
      <div className="view-body">
        <p className="hint">
          以下署名还没有归属，同姓名条目归组显示。选择成员时若与已有归属重名，
          绑定会自动停到「待处理绑定」。
        </p>
        {groups.length === 0 && <div className="empty">所有署名都已匹配到成员 🎉</div>}
        <div className="unmatched-groups">
          {groups.map((g) => (
            <div key={g.printed} className="unmatched-group">
              <h3>
                {g.printed} <span>{g.rows.length} 条署名</span>
              </h3>
              {g.rows.map(({ paper, byline }) => {
                const suggestions = candidatesByName(members, byline.printed);
                return (
                  <div key={byline.id} className="unmatched-row">
                    <button className="link" onClick={() => onOpenPaper(paper.id)}>
                      {paper.title}（{paper.year}）
                    </button>
                    <button
                      className="primary small"
                      onClick={() =>
                        onBind({ paperId: paper.id, bylineId: byline.id, printed: byline.printed })
                      }
                    >
                      {suggestions.length ? `绑定（${suggestions.length} 个同名成员）` : '绑定到成员'}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
