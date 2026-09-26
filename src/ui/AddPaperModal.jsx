import { useState } from 'react';

export function AddPaperModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    authors: '',
    year: String(new Date().getFullYear()),
    venue: '',
    abstract: '',
    tags: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">NEW REFERENCE</span>
        <h2>添加一篇文献</h2>
        <label>标题
          <input value={form.title} onChange={set('title')} placeholder="论文或书籍标题" />
        </label>
        <label>作者（按原文署名填写，用逗号或 &amp; 分隔）
          <input value={form.authors} onChange={set('authors')} placeholder="王芳, 张伟" />
        </label>
        <div className="two">
          <label>年份
            <input type="number" value={form.year} onChange={set('year')} />
          </label>
          <label>出版物
            <input value={form.venue} onChange={set('venue')} />
          </label>
        </div>
        <label>关键词（逗号分隔）
          <input value={form.tags} onChange={set('tags')} />
        </label>
        <label>摘要
          <textarea rows="3" value={form.abstract} onChange={set('abstract')} />
        </label>
        <p className="hint">保存后每条作者署名先进入「未匹配作者」，再由你逐条绑定到成员身份。</p>
        <button
          className="primary full"
          onClick={() =>
            onSave({
              ...form,
              tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        >
          保存文献
        </button>
      </div>
    </div>
  );
}
