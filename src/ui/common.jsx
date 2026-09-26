import React from 'react';
import { STATUS_ACTIVE } from '../data/model.js';

// 模态框外壳。
export function Modal({ title, crumb, onClose, children, wide }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'modal wide' : 'modal'}>
        <button className="close" onClick={onClose} aria-label="关闭">×</button>
        {crumb && <span className="crumb">{crumb}</span>}
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// 成员选择器：只允许把新署名绑给在组成员；离组成员不出现在候选中。
export function MemberSelect({ members, value, onChange, allowEmpty = true }) {
  return (
    <select className="member-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">选择成员…</option>}
      {members
        .filter((m) => m.status === STATUS_ACTIVE)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}{m.formerNames.length ? `（曾用名：${m.formerNames.join('、')}）` : ''} · {m.history[m.history.length - 1]?.org || '—'}
          </option>
        ))}
    </select>
  );
}

// ORCID：登记了才显示，链接到 ORCID 官方页面。
export function Orcid({ value }) {
  if (!value) return <span className="muted">未登记 ORCID</span>;
  return (
    <a className="orcid-link" href={`https://orcid.org/${value}`} target="_blank" rel="noreferrer">
      <i>iD</i>{value}
    </a>
  );
}

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const fmtDateTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${fmtDate(iso)} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
};

// 同一姓名是否已登记在其他成员名下（成员表单内的重名提示）。
export function nameConflict(members, name, selfId) {
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const key = norm(name);
  if (!key) return null;
  return members.find(
    (m) => m.id !== selfId && [m.name, ...m.formerNames].some((n) => norm(n) === key),
  ) || null;
}
