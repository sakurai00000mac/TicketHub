import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';
import { MarkdownPreview } from '../components/Editor/MarkdownPreview';
import { FiArrowLeft, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import type { IssuePriority } from '../types';

function formatDateInput(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(ts: number | null): string {
  if (!ts) return '未設定';
  return new Date(ts).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function IssueDetailPage() {
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();
  const { issues, updateIssue, deleteIssue, getChildIssues, getProjectIssues } = useIssueStore();
  const { getProject } = useProjectStore();

  // 編集モード
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const issue = issues.find((i) => i.id === issueId);
  const project = projectId ? getProject(projectId) : undefined;

  // フォーカス制御
  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingDesc && descRef.current) descRef.current.focus();
  }, [editingDesc]);

  if (!issue || !project) {
    return (
      <div className="empty-state">
        <h2>課題が見つかりません</h2>
      </div>
    );
  }

  const childIssues = getChildIssues(issue.id);
  const allIssues = getProjectIssues(project.id);
  const parentIssue = issue.parentId ? issues.find((i) => i.id === issue.parentId) : null;

  // 親課題の選択肢（自分自身と自分の子孫は除外）
  const getDescendantIds = (id: string): string[] => {
    const children = allIssues.filter((i) => i.parentId === id);
    return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
  };
  const excludeIds = new Set(getDescendantIds(issue.id));
  const parentCandidates = allIssues.filter((i) => !excludeIds.has(i.id));

  const handleDelete = () => {
    if (window.confirm(`課題「${issue.title}」を削除しますか？子課題も全て削除されます。`)) {
      deleteIssue(issue.id);
      navigate(`/projects/${projectId}/issues`);
    }
  };

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== issue.title) {
      updateIssue(issue.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const saveDescription = () => {
    if (descDraft !== issue.description) {
      updateIssue(issue.id, { description: descDraft });
    }
    setEditingDesc(false);
  };

  const isOverdue = issue.dueDate && issue.dueDate < Date.now() && issue.statusId !== 'status-closed';

  return (
    <div className="issue-detail-page">
      {/* ヘッダー */}
      <div className="issue-detail-header">
        <button className="btn btn-sm" onClick={() => navigate(`/projects/${projectId}/issues`)}>
          <FiArrowLeft /> 戻る
        </button>
        <div className="issue-detail-header-right">
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <FiTrash2 /> 削除
          </button>
        </div>
      </div>

      {/* タイトル行 */}
      <div className="issue-detail-title-section">
        <span className="issue-key issue-key-lg">{issue.key}</span>
        {editingTitle ? (
          <div className="inline-edit-row" style={{ flex: 1 }}>
            <input
              ref={titleRef}
              type="text"
              className="inline-edit-input inline-edit-title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
            <button className="btn btn-sm btn-primary" onClick={saveTitle}><FiCheck /></button>
            <button className="btn btn-sm" onClick={() => setEditingTitle(false)}><FiX /></button>
          </div>
        ) : (
          <h1
            className="issue-detail-title"
            onClick={() => { setTitleDraft(issue.title); setEditingTitle(true); }}
            title="クリックして編集"
          >
            {issue.title}
            <FiEdit2 className="edit-icon" size={14} />
          </h1>
        )}
        {parentIssue && (
          <span
            className="issue-parent-link"
            onClick={() => navigate(`/projects/${projectId}/issues/${parentIssue.id}`)}
          >
            親: {parentIssue.key}
          </span>
        )}
      </div>

      {/* 説明 */}
      <div className="issue-detail-section">
        <div className="issue-detail-section-header">
          <h3>詳細</h3>
          {!editingDesc && (
            <button
              className="btn btn-sm"
              onClick={() => { setDescDraft(issue.description); setEditingDesc(true); }}
            >
              <FiEdit2 size={12} /> 編集
            </button>
          )}
        </div>
        {editingDesc ? (
          <div className="desc-edit">
            <textarea
              ref={descRef}
              className="desc-edit-textarea"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={12}
              placeholder="Markdownで記述..."
            />
            <div className="desc-edit-actions">
              <button className="btn btn-sm" onClick={() => setEditingDesc(false)}>キャンセル</button>
              <button className="btn btn-sm btn-primary" onClick={saveDescription}>保存</button>
            </div>
          </div>
        ) : issue.description ? (
          <div className="issue-description-content">
            <MarkdownPreview content={issue.description} />
          </div>
        ) : (
          <p className="issue-no-description" onClick={() => { setDescDraft(''); setEditingDesc(true); }}>
            クリックして詳細を追加...
          </p>
        )}
      </div>

      {/* 属性パネル（横長・2列） */}
      <div className="issue-detail-section">
        <div className="issue-props-panel">
          <div className="issue-props-field">
            <label>ステータス</label>
            <select value={issue.statusId} onChange={(e) => updateIssue(issue.id, { statusId: e.target.value })}>
              {project.issueStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="issue-props-field">
            <label>種別</label>
            <select value={issue.typeId} onChange={(e) => updateIssue(issue.id, { typeId: e.target.value })}>
              {project.issueTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="issue-props-field">
            <label>優先度</label>
            <select value={issue.priority} onChange={(e) => updateIssue(issue.id, { priority: e.target.value as IssuePriority })}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="issue-props-field">
            <label>親課題</label>
            <select
              value={issue.parentId ?? ''}
              onChange={(e) => updateIssue(issue.id, { parentId: e.target.value || null })}
            >
              <option value="">なし</option>
              {parentCandidates.map((i) => (
                <option key={i.id} value={i.id}>{i.key} {i.title}</option>
              ))}
            </select>
          </div>
          <div className="issue-props-field">
            <label>開始日</label>
            <input
              type="date"
              value={formatDateInput(issue.startDate)}
              onChange={(e) => updateIssue(issue.id, { startDate: e.target.value ? new Date(e.target.value).getTime() : null })}
            />
          </div>
          <div className="issue-props-field">
            <label>期限</label>
            <input
              type="date"
              className={isOverdue ? 'overdue' : ''}
              value={formatDateInput(issue.dueDate)}
              onChange={(e) => updateIssue(issue.id, { dueDate: e.target.value ? new Date(e.target.value).getTime() : null })}
            />
            {isOverdue && <span className="overdue-text">期限超過</span>}
          </div>
          <div className="issue-props-field issue-props-info">
            <label>作成日</label>
            <span>{formatDateDisplay(issue.createdAt)}</span>
          </div>
          <div className="issue-props-field issue-props-info">
            <label>更新日</label>
            <span>{formatDateDisplay(issue.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* 子課題 */}
      {childIssues.length > 0 && (
        <div className="issue-detail-section">
          <h3>子課題 ({childIssues.length})</h3>
          <div className="issue-children-list">
            {childIssues.map((child) => {
              const childStatus = project.issueStatuses.find((s) => s.id === child.statusId);
              return (
                <div
                  key={child.id}
                  className="issue-child-row"
                  onClick={() => navigate(`/projects/${projectId}/issues/${child.id}`)}
                >
                  <span className="issue-key">{child.key}</span>
                  <span className="issue-child-title">{child.title}</span>
                  <span
                    className="status-badge"
                    style={{ background: childStatus?.color ?? '#6b7280', fontSize: '10px', padding: '1px 6px' }}
                  >
                    {childStatus?.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
