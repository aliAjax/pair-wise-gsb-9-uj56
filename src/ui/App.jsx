import { useEffect, useMemo, useState } from 'react';
import { loadState, saveState } from '../storage/local.js';
import * as I from '../rules/identity.js';
import { MembersView } from './MembersView.jsx';
import { PendingView } from './PendingView.jsx';
import { UnmatchedView } from './UnmatchedView.jsx';
import { LibraryView } from './LibraryView.jsx';
import { AddPaperModal } from './AddPaperModal.jsx';
import { MemberModal } from './MemberModal.jsx';
import { BindModal } from './BindModal.jsx';

// 页面层：只负责界面与交互编排，所有身份判定走 rules/identity，
// 所有本机读写走 storage/local。
export function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('library');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [notice, setNotice] = useState('');
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [memberModal, setMemberModal] = useState(null); // {mode:'create'} | {mode:'edit', id}
  const [bindTarget, setBindTarget] = useState(null); // {paperId, bylineId, printed}

  // 关闭页面再打开：绑定、待处理、机构变更都在
  useEffect(() => saveState(state), [state]);

  const flash = (msg) => {
    setNotice(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setNotice(''), 2600);
  };

  // 统一的状态变更入口：规则函数返回 {state, error} 时统一处理提示
  const apply = (result, okMsg) => {
    if (result?.error) {
      flash(result.error);
      return false;
    }
    setState(result.state);
    if (okMsg) flash(okMsg);
    return true;
  };

  const memberById = useMemo(() => {
    const map = new Map(state.members.map((m) => [m.id, m]));
    return map;
  }, [state.members]);

  const groups = useMemo(() => I.unmatchedEntries(state), [state]);
  const unmatchedCount = groups.reduce((n, g) => n + g.rows.length, 0);
  const pendingCount = state.pending.length;
  const paperById = useMemo(() => new Map(state.papers.map((p) => [p.id, p])), [state.papers]);

  const openPaper = (id) => {
    setSelectedPaper(id);
    setView('library');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> IDENTITY DESK</div>
        <div className="library-head">
          <span>作者身份台</span>
          <strong>{state.members.filter((m) => m.status === 'active').length}<small> 位在组</small></strong>
        </div>
        <nav>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>
            ▤ <span>文献与署名</span><b>{state.papers.length}</b>
          </button>
          <button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>
            ⏳ <span>待处理绑定</span>
            {pendingCount > 0 && <b className="badge">{pendingCount}</b>}
          </button>
          <button className={view === 'unmatched' ? 'active' : ''} onClick={() => setView('unmatched')}>
            ◌ <span>未匹配作者</span>
            {unmatchedCount > 0 && <b className="badge warn">{unmatchedCount}</b>}
          </button>
          <button className={view === 'members' ? 'active' : ''} onClick={() => setView('members')}>
            ◇ <span>成员身份</span><b>{state.members.length}</b>
          </button>
        </nav>
        <div className="side-foot">
          <button onClick={() => setMemberModal({ mode: 'create' })}>＋ 登记新成员</button>
          <small>本机保存 · 刷新/重开不丢失</small>
        </div>
      </aside>

      <main>
        {view === 'library' && (
          <LibraryView
            state={state}
            memberById={memberById}
            selectedPaper={selectedPaper}
            setSelectedPaper={setSelectedPaper}
            onAddPaper={() => setShowAddPaper(true)}
            onBind={(t) => setBindTarget(t)}
            onUnbind={(t) => apply(I.unbind(state, t), '已解除绑定，署名回到未匹配')}
            replaceState={setState}
            flash={flash}
          />
        )}
        {view === 'pending' && (
          <PendingView
            state={state}
            memberById={memberById}
            paperById={paperById}
            onApprove={(id) => apply(I.approvePending(state, id), '已确认绑定')}
            onReject={(id) => {
              setState(I.rejectPending(state, id));
              flash('已驳回，署名保留在未匹配列表');
            }}
            onOpenPaper={openPaper}
          />
        )}
        {view === 'unmatched' && (
          <UnmatchedView
            groups={groups}
            members={state.members}
            onBind={(t) => setBindTarget(t)}
            onOpenPaper={openPaper}
          />
        )}
        {view === 'members' && (
          <MembersView
            state={state}
            onEdit={(id) => setMemberModal({ mode: 'edit', id })}
            onCreate={() => setMemberModal({ mode: 'create' })}
            onToggleLeave={(m) => {
              const next = m.status === 'left' ? 'active' : 'left';
              setState(I.setMemberStatus(state, m.id, next));
              flash(next === 'left' ? `${m.name} 已标记离组，历史署名原样保留` : `${m.name} 已回组`);
            }}
            onDelete={(m) => apply(I.deleteMember(state, m.id), '成员已删除')}
            paperCount={(memberId) =>
              state.papers.reduce(
                (n, p) => n + (p.bylines || []).filter((b) => b.memberId === memberId).length,
                0,
              )
            }
          />
        )}
      </main>

      {showAddPaper && (
        <AddPaperModal
          onClose={() => setShowAddPaper(false)}
          onSave={(paper) => {
            if (!paper.title.trim()) {
              flash('标题不能为空');
              return;
            }
            const result = I.addPaper(state, paper);
            setState(result.state);
            setShowAddPaper(false);
            setSelectedPaper(result.paper.id);
            setView('library');
            flash('文献已加入，作者已列为未匹配，请逐条绑定身份');
          }}
        />
      )}

      {memberModal && (
        <MemberModal
          member={memberModal.mode === 'edit' ? memberById.get(memberModal.id) : null}
          onClose={() => setMemberModal(null)}
          onSave={(data) => {
            const result =
              memberModal.mode === 'edit'
                ? I.updateMember(state, memberModal.id, data)
                : I.addMember(state, data);
            if (apply(result, memberModal.mode === 'edit' ? '资料已更新' : '成员已登记')) {
              setMemberModal(null);
            }
          }}
        />
      )}

      {bindTarget && (
        <BindModal
          target={bindTarget}
          members={state.members}
          memberById={memberById}
          papers={state.papers}
          onClose={() => setBindTarget(null)}
          onPick={(memberId) => {
            const result = I.requestBind(state, { ...bindTarget, memberId });
            if (result.error) {
              flash(result.error);
              return;
            }
            setState(result.state);
            setBindTarget(null);
            flash(result.queued ? '该姓名已有归属，新绑定已停在待处理' : '绑定完成，已记录当时机构');
          }}
        />
      )}

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
