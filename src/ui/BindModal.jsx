import { useMemo, useState } from 'react';
import { candidatesByName, conflictFor, normalizeName } from '../rules/identity.js';

// 把一条未匹配署名绑定到成员：
// - 同名（含曾用名）成员排最前；重名时必须靠 ORCID/机构辨认
// - 选中的成员若与已有归属冲突，提交后会进入待处理（由判定层决定）
export function BindModal({ target, members, memberById, papers, onClose, onPick }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);

  const sameName = useMemo(
    () => candidatesByName(members, target.printed),
    [members, target.printed],
  );
  const others = useMemo(() => {
    const keys = new Set(sameName.map((m) => m.id));
    const q = normalizeName(query);
    return members.filter((m) => {
      if (keys.has(m.id)) return false;
      if (!q) return true;
      return (
        normalizeName(m.name).includes(q) ||
        (m.formerNames || []).some((n) => normalizeName(n).includes(q)) ||
        m.affiliation.toLowerCase().includes(query.toLowerCase())
      );
    });
  }, [members, sameName, query]);

  const conflict = picked ? conflictFor(papers, members, target.printed, picked) : null;

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">BIND IDENTITY</span>
        <h2>绑定署名「{target.printed}」</h2>

        {sameName.length > 0 && (
          <div className="pick-section">
            <small>同名成员（请核对 ORCID 与机构）</small>
            {sameName.map((m) => (
              <MemberOption key={m.id} m={m} active={picked === m.id} onPick={() => setPicked(m.id)} />
            ))}
          </div>
        )}

        <div className="pick-section">
          <small>全部成员</small>
          <input
            placeholder="按姓名 / 曾用名 / 机构筛选…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {others.map((m) => (
            <MemberOption key={m.id} m={m} active={picked === m.id} onPick={() => setPicked(m.id)} />
          ))}
          {others.length === 0 && <p className="hint">没有其他成员，可先关闭并去「成员身份」登记。</p>}
        </div>

        {picked && conflict && (
          <div className="conflict-note">
            ⚠ {conflict}。提交后该绑定将停在「待处理绑定」，不会直接生效。
          </div>
        )}
        {picked && !conflict && (
          <div className="ok-note">
            将以成员当前机构「{memberById.get(picked)?.affiliation}」作为该署名的机构快照。
          </div>
        )}
        <button className="primary full" disabled={!picked} onClick={() => onPick(picked)}>
          {conflict ? '提交（进入待处理）' : '确认绑定'}
        </button>
      </div>
    </div>
  );
}

function MemberOption({ m, active, onPick }) {
  return (
    <button type="button" className={'member-option ' + (active ? 'active' : '')} onClick={onPick}>
      <span className="opt-name">
        {m.name}
        {m.status === 'left' && <em className="tag-left">已离组</em>}
      </span>
      <span className="opt-meta">
        {m.orcid || '无 ORCID'} · {m.affiliation}
        {m.formerNames?.length > 0 && ` · 曾用名 ${m.formerNames.join('、')}`}
      </span>
    </button>
  );
}
