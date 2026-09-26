import { useState } from 'react';

// 登记新成员 / 编辑成员资料。
// 改名与换机构的历史写入由判定层 updateMember 自动处理，表单只收当前值。
export function MemberModal({ member, onClose, onSave }) {
  const editing = Boolean(member);
  const [form, setForm] = useState({
    name: member?.name || '',
    orcid: member?.orcid || '',
    affiliation: member?.affiliation || '',
    formerNames: (member?.formerNames || []).join('、'),
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () =>
    onSave({
      name: form.name,
      orcid: form.orcid,
      affiliation: form.affiliation,
      // 曾用名改名时由判定层自动追加；这里仅允许编辑时手工补充
      formerNames: editing
        ? form.formerNames.split(/,|，|、/g).map((s) => s.trim()).filter(Boolean)
        : [],
    });

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">{editing ? 'EDIT IDENTITY' : 'NEW MEMBER'}</span>
        <h2>{editing ? '编辑成员资料' : '登记新成员'}</h2>
        <label>姓名（现用名）
          <input value={form.name} onChange={set('name')} placeholder="如：张伟" />
        </label>
        <label>当前机构
          <input value={form.affiliation} onChange={set('affiliation')} placeholder="如：华东师范大学教育心理学系" />
        </label>
        <label>ORCID
          <input value={form.orcid} onChange={set('orcid')} placeholder="0000-0000-0000-0000（可稍后补登）" />
        </label>
        {editing && (
          <label>曾用名（逗号或顿号分隔；改名时旧名会自动追加）
            <input value={form.formerNames} onChange={set('formerNames')} placeholder="如：王芳芳" />
          </label>
        )}
        {editing && member.history?.length > 0 && (
          <div className="history-box">
            <small>机构履历（旧文献继续显示当时机构）</small>
            <ul>
              {member.history.map((h, i) => (
                <li key={i}>{h.affiliation} <span>至 {h.until}</span></li>
              ))}
            </ul>
          </div>
        )}
        {editing && (
          <p className="hint">保存时若机构已改，当前机构会追加进履历；旧文献署名不受影响。</p>
        )}
        <button className="primary full" onClick={submit}>
          {editing ? '保存修改' : '登记成员'}
        </button>
      </div>
    </div>
  );
}
