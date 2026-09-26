import React, { useMemo, useState } from 'react';
import { currentOrg, memberWorks } from '../logic/identity.js';
import { STATUS_ACTIVE, STATUS_LEFT } from '../data/model.js';
import { fmtDate, Modal, nameConflict, Orcid } from './common.jsx';

const blank = { name: '', org: '', orcid: '', formerNamesText: '' };

function MemberEditor({ members, editing, onClose, onSave }) {
  const isEdit = Boolean(editing);
  const [form, setForm] = useState(
    editing
      ? {
          name: editing.name,
          org: currentOrg(editing),
          orcid: editing.orcid || '',
          formerNamesText: editing.formerNames.join(', '),
        }
      : blank,
  );
  const set = (k, v) => setForm({ ...form, [k]: v });
  const conflict = nameConflict(members, form.name, editing?.id);

  const submit = () => {
    if (!form.name.trim() || !form.org.trim()) return;
    onSave({
      name: form.name,
      org: form.org,
      orcid: form.orcid,
      formerNames: form.formerNamesText.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <Modal title={isEdit ? `编辑成员：${editing.name}` : '登记新成员'} crumb={isEdit ? 'EDIT MEMBER' : 'NEW MEMBER'} onClose={onClose}>
      <label>姓名
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="现用姓名" />
      </label>
      {conflict && (
        <p className="field-warn">
          ⚠ 同一姓名已登记在「{conflict.name}」名下。保存后，把该姓名的文献绑定到本成员时会先进入待处理。
        </p>
      )}
      <label>当前机构
        <input value={form.org} onChange={(e) => set('org', e.target.value)} />
      </label>
      {isEdit && form.org.trim() !== currentOrg(editing) && form.org.trim() && (
        <p className="field-hint">机构已变化：将追加一条机构履历。旧文献继续显示当时机构，只有新绑定使用新机构。</p>
      )}
      <label>ORCID
        <input value={form.orcid} onChange={(e) => set('orcid', e.target.value)} placeholder="0000-0000-0000-0000（可留空）" />
      </label>
      <label>曾用名（改名前发表的姓名，用逗号分隔）
        <input value={form.formerNamesText} onChange={(e) => set('formerNamesText', e.target.value)} placeholder="例如：Laura Miller" />
      </label>
      <button className="primary full" disabled={!form.name.trim() || !form.org.trim()} onClick={submit}>
        {isEdit ? '保存资料' : '登记成员'}
      </button>
    </Modal>
  );
}

function MemberCard({ member, state, onEdit, onToggleStatus }) {
  const works = memberWorks(state, member.id);
  const left = member.status === STATUS_LEFT;
  return (
    <article className={`member-card ${left ? 'left' : ''}`}>
      <div className="member-card-head">
        <h3>{member.name}</h3>
        {left
          ? <span className="mem-badge left">已离组 · {fmtDate(member.leftAt)}</span>
          : <span className="mem-badge active">在组</span>}
      </div>
      <p className="member-line">🏛 {currentOrg(member)}</p>
      <p className="member-line"><Orcid value={member.orcid} /></p>
      {member.formerNames.length > 0 && (
        <p className="member-line former">曾用名：{member.formerNames.join('、')}</p>
      )}
      <details className="history">
        <summary>机构履历（{member.history.length}）· 文献署名 {works.length} 处</summary>
        <ol>
          {[...member.history].reverse().map((h, i) => (
            <li key={i}>
              <strong>{h.org}</strong>
              <span>{i === 0 ? '起 ' : ''}{fmtDate(h.since)}{i === 0 ? ' 至今' : ''}</span>
            </li>
          ))}
        </ol>
        <p className="history-note">
          已离组成员的 {works.length} 处文献署名全部保留；离组不带走、也不删除署名。
        </p>
      </details>
      <div className="member-actions">
        <button className="mini" onClick={onEdit}>编辑资料</button>
        <button className={`mini ${left ? '' : 'warn'}`} onClick={onToggleStatus}>
          {left ? '标记重新在组' : '标记离组'}
        </button>
      </div>
    </article>
  );
}

export default function MembersView({ state, onAddMember, onSaveMember, onToggleStatus }) {
  const [editing, setEditing] = useState(null); // null=关, 'new'=新增, member=编辑
  const members = useMemo(
    () => [...state.members].sort((a, b) => Number(a.status === STATUS_LEFT) - Number(b.status === STATUS_LEFT)),
    [state.members],
  );

  return (
    <>
      <header>
        <div>
          <span className="crumb">IDENTITY / MEMBERS</span>
          <h1>成员身份台</h1>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => setEditing('new')}>＋ 登记成员</button>
        </div>
      </header>

      <div className="view-body members-body">
        <p className="view-intro">
          每位成员登记姓名、机构、ORCID 与曾用名。文献署名绑定到成员后定格机构；成员离组不影响既有署名。
          在组 {state.members.filter((m) => m.status === STATUS_ACTIVE).length} 人 ·
          离组 {state.members.filter((m) => m.status === STATUS_LEFT).length} 人
        </p>
        <div className="member-grid">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              state={state}
              onEdit={() => setEditing(m)}
              onToggleStatus={() => onToggleStatus(m.id)}
            />
          ))}
          {!members.length && <div className="no-result">还没有登记成员</div>}
        </div>
      </div>

      {editing && (
        <MemberEditor
          members={state.members}
          editing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') onAddMember(data);
            else onSaveMember(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
