import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIssueStore } from '../stores/issueStore';
import { useProjectStore } from '../stores/projectStore';
import type { IssuePriority } from '../types';

export function IssueNewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { addIssue } = useIssueStore();
  const { getProject, incrementIssueCounter } = useProjectStore();

  const project = projectId ? getProject(projectId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState(project?.issueTypes[0]?.id ?? '');
  const [statusId, setStatusId] = useState(project?.issueStatuses[0]?.id ?? '');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  if (!projectId || !project) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;

    const counter = incrementIssueCounter(projectId);
    const key = `${project.projectKey}-${counter}`;

    const id = addIssue({
      projectId,
      key,
      title: title.trim(),
      description,
      typeId,
      statusId,
      priority,
      assigneeId: null,
      parentId: null,
      startDate: startDate ? new Date(startDate).getTime() : null,
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      order: 0,
      createdBy: 'local-user',
    });

    navigate(`/projects/${projectId}/issues/${id}`);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>課題の作成</h2>

      <div className="form-group">
        <label>件名</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>詳細（Markdown）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="課題の詳細をMarkdownで記述..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label>種別</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {project.issueTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>優先度</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="form-group">
          <label>ステータス</label>
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            {project.issueStatuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>開始日</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>期限</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="modal-actions" style={{ marginTop: '24px' }}>
        <button className="btn" onClick={() => navigate(`/projects/${projectId}/issues`)}>
          キャンセル
        </button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          作成
        </button>
      </div>
    </div>
  );
}
