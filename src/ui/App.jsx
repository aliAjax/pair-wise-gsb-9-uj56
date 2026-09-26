import React, { useEffect, useMemo, useState } from 'react';
import { loadState, saveState } from '../storage/local.js';
import {
  addMember, addPaper, approvePending, memberById, pendingList,
  rejectPending, requestBinding, saveMember, setMemberStatus,
  unbind, unmatchedAuthors, updatePaper,
} from '../logic/identity.js';
import PapersView from './PapersView.jsx';
import MembersView from './MembersView.jsx';
import PendingView from './PendingView.jsx';
import UnmatchedView from './UnmatchedView.jsx';

const VIEWS = [
  { key: 'papers', icon: '▤', label: '文献署名' },
  { key: 'members', icon: '◎', label: '成员身份台' },
  { key: 'pending', icon: '⏳', label: '待处理绑定' },
  { key: 'unmatched', icon: '?', label: '未匹配作者' },
];

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('papers');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');

  // 关闭页面再打开仍在：任何状态变化都写回本机。
  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const pendingCount = useMemo(() => pendingList(state).length, [state]);
  const unmatchedCount = useMemo(() => unmatchedAuthors(state).length, [state]);

  // ---- 动作编排：判定层给结论，页面层只负责提示语 ----
  const handleBind = (paperId, authorIndex, memberId) => {
    const { state: next, result } = requestBinding(state, paperId, authorIndex, memberId);
    setState(next);
    const name = memberById(next, memberId)?.name;
    if (result === 'confirmed') setToast(`已绑定到 ${name}，机构按当前机构定格`);
    else if (result === 'pending') setToast('该姓名已有归属，绑定已停在待处理');
    else if (result === 'invalid') setToast('无法绑定：成员不存在或已离组');
  };

  const handleUnbind = (paperId, authorIndex) => {
    setState(unbind(state, paperId, authorIndex));
    setToast('已解除绑定，署名回到未匹配');
  };

  const handleApprove = (pendingId) => {
    const { state: next, result } = approvePending(state, pendingId);
    setState(next);
    if (result === 'confirmed') setToast('已批准：绑定成立，机构按当前机构定格');
    else if (result === 'invalid') setToast('无法批准：申请人已离组');
  };

  const handleReject = (pendingId) => {
    const { state: next } = rejectPending(state, pendingId);
    setState(next);
    setToast('已驳回，署名回到未匹配');
  };

  const handleAddMember = (data) => {
    const { state: next } = addMember(state, data);
    setState(next);
    setToast(`成员 ${data.name} 已登记`);
  };

  const handleSaveMember = (id, data) => {
    const { state: next, result } = saveMember(state, id, data);
    setState(next);
    setToast(result === 'orgChanged' ? '资料已保存，并追加了新的机构履历' : '成员资料已保存');
  };

  const handleToggleStatus = (id) => {
    const member = memberById(state, id);
    const nextStatus = member.status === '离组' ? '在组' : '离组';
    setState(setMemberStatus(state, id, nextStatus));
    setToast(nextStatus === '离组' ? '已标记离组，文献中的署名全部保留' : '已标记重新在组');
  };

  const handleAddPaper = (form) => {
    const { state: next, paper } = addPaper(state, form);
    setState(next);
    setToast('文献已加入，作者尚未匹配');
    return { paper };
  };

  const handleUpdatePaper = (paperId, patch) => setState(updatePaper(state, paperId, patch));

  const handleExport = () => {
    const text = state.papers.map((p) => p.cite).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'references.txt';
    a.click();
    setToast('引用列表已导出');
  };

  const goPaper = (paperId) => {
    setSelectedId(paperId);
    setView('papers');
  };

  const navBadge = (key) => {
    if (key === 'pending' && pendingCount) return <b className="nav-warn">{pendingCount}</b>;
    if (key === 'unmatched' && unmatchedCount) return <b>{unmatchedCount}</b>;
    return null;
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> IDENTITY DESK</div>
        <div className="library-head">
          <span>作者身份台</span>
          <strong>{state.members.length}<small> 位成员</small></strong>
          <small>{state.papers.length} 篇文献 · {state.bindings.length} 处署名</small>
        </div>
        <nav>
          {VIEWS.map((v) => (
            <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>
              {v.icon} <span>{v.label}</span>
              {navBadge(v.key)}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <small>资料 · 判定 · 本机保存 · 页面 分层</small>
          <small>数据仅存于本机浏览器</small>
        </div>
      </aside>

      <main>
        {view === 'papers' && (
          <PapersView
            state={state}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBind={handleBind}
            onUnbind={handleUnbind}
            onAddPaper={handleAddPaper}
            onUpdatePaper={handleUpdatePaper}
            onExport={handleExport}
            onGoPending={() => setView('pending')}
          />
        )}
        {view === 'members' && (
          <MembersView
            state={state}
            onAddMember={handleAddMember}
            onSaveMember={handleSaveMember}
            onToggleStatus={handleToggleStatus}
          />
        )}
        {view === 'pending' && (
          <PendingView
            state={state}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpenPaper={goPaper}
          />
        )}
        {view === 'unmatched' && (
          <UnmatchedView
            state={state}
            onBind={handleBind}
            onGoPending={() => setView('pending')}
            onOpenPaper={goPaper}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
