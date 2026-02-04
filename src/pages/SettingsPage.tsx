import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useWikiStore } from '../stores/wikiStore';
import { useIssueStore } from '../stores/issueStore';

export function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject, deleteProject } = useProjectStore();
  const { deleteProjectPages } = useWikiStore();
  const { deleteProjectIssues } = useIssueStore();

  const project = projectId ? getProject(projectId) : undefined;
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');

  if (!project || !projectId) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    updateProject(projectId, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (window.confirm(`プロジェクト「${project.name}」を削除しますか？すべてのデータが失われます。`)) {
      deleteProjectIssues(projectId);
      deleteProjectPages(projectId);
      deleteProject(projectId);
      navigate('/');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px' }}>
      <h2>プロジェクト設定</h2>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label>プロジェクト名</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-group">
        <label>説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>プロジェクトキー</label>
        <input type="text" value={project.projectKey} disabled />
        <small style={{ color: 'var(--color-text-secondary)' }}>課題番号のプレフィックスに使用されます</small>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button className="btn btn-primary" onClick={handleSave}>保存</button>
      </div>

      <hr style={{ margin: '32px 0', borderColor: 'var(--color-border)' }} />

      <h3 style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>危険な操作</h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
        プロジェクトを削除すると、すべての課題・Wiki・ドキュメントが失われます。
      </p>
      <button className="btn btn-danger" onClick={handleDelete}>
        プロジェクトを削除
      </button>
    </div>
  );
}
