import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useWikiStore } from '../stores/wikiStore';
import { useIssueStore } from '../stores/issueStore';
import { useDocumentStore } from '../stores/documentStore';
import { generateId } from '../utils/markdown';
import type { IssueStatus, IssueType } from '../types';
import { FiPlus, FiTrash2, FiMenu } from 'react-icons/fi';

export function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject, deleteProject } = useProjectStore();
  const { deleteProjectPages } = useWikiStore();
  const { deleteProjectIssues, getProjectIssues } = useIssueStore();
  const { deleteProjectDocuments } = useDocumentStore();

  const project = projectId ? getProject(projectId) : undefined;
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [editStatuses, setEditStatuses] = useState<IssueStatus[]>(
    () => project?.issueStatuses ? [...project.issueStatuses] : []
  );
  const [editTypes, setEditTypes] = useState<IssueType[]>(
    () => project?.issueTypes ? [...project.issueTypes] : []
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!project || !projectId) return null;

  const issues = getProjectIssues(projectId);

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
      deleteProjectDocuments(projectId);
      deleteProject(projectId);
      navigate('/');
    }
  };

  // --- Status helpers ---
  const updateStatus = (id: string, updates: Partial<IssueStatus>) => {
    setEditStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addStatus = () => {
    setEditStatuses((prev) => [
      ...prev,
      { id: generateId(), name: '新しいステータス', color: '#6b7280', order: prev.length },
    ]);
  };

  const removeStatus = (id: string) => {
    if (editStatuses.length <= 1) return;
    const usedCount = issues.filter((i) => i.statusId === id).length;
    if (usedCount > 0) {
      window.alert(`このステータスは ${usedCount} 件の課題で使用中のため削除できません。`);
      return;
    }
    setEditStatuses((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const saveStatuses = () => {
    updateProject(projectId, { issueStatuses: editStatuses.map((s, i) => ({ ...s, order: i })) });
  };

  const handleStatusDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleStatusDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setEditStatuses((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };

  const handleStatusDragEnd = () => {
    setDragIdx(null);
  };

  // --- Type helpers ---
  const updateType = (id: string, updates: Partial<IssueType>) => {
    setEditTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addType = () => {
    setEditTypes((prev) => [
      ...prev,
      { id: generateId(), name: '新しい種別', color: '#6b7280', icon: 'FiCircle' },
    ]);
  };

  const removeType = (id: string) => {
    if (editTypes.length <= 1) return;
    const usedCount = issues.filter((i) => i.typeId === id).length;
    if (usedCount > 0) {
      window.alert(`この種別は ${usedCount} 件の課題で使用中のため削除できません。`);
      return;
    }
    setEditTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const saveTypes = () => {
    updateProject(projectId, { issueTypes: editTypes });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '700px' }}>
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

      {/* ステータス設定 */}
      <hr style={{ margin: '32px 0', borderColor: 'var(--color-border)' }} />
      <div className="settings-section">
        <h3>ステータス設定</h3>
        <p>課題のステータスを追加・編集・並べ替え・削除できます。ドラッグで順序変更が可能です。</p>
        <div className="settings-list">
          {editStatuses.map((status, idx) => (
            <div
              key={status.id}
              className={`settings-list-item${dragIdx === idx ? ' dragging' : ''}`}
              draggable
              onDragStart={() => handleStatusDragStart(idx)}
              onDragOver={(e) => handleStatusDragOver(e, idx)}
              onDragEnd={handleStatusDragEnd}
            >
              <span className="settings-drag-handle"><FiMenu /></span>
              <input
                type="color"
                value={status.color}
                onChange={(e) => updateStatus(status.id, { color: e.target.value })}
              />
              <input
                type="text"
                value={status.name}
                onChange={(e) => updateStatus(status.id, { name: e.target.value })}
              />
              <button
                className="btn-icon"
                onClick={() => removeStatus(status.id)}
                title="削除"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm" onClick={addStatus}>
            <FiPlus /> ステータスを追加
          </button>
          <button className="btn btn-primary btn-sm" onClick={saveStatuses}>保存</button>
        </div>
      </div>

      {/* 種別設定 */}
      <hr style={{ margin: '32px 0', borderColor: 'var(--color-border)' }} />
      <div className="settings-section">
        <h3>種別設定</h3>
        <p>課題の種別を追加・編集・削除できます。</p>
        <div className="settings-list">
          {editTypes.map((type) => (
            <div key={type.id} className="settings-list-item">
              <input
                type="color"
                value={type.color}
                onChange={(e) => updateType(type.id, { color: e.target.value })}
              />
              <select
                value={type.icon}
                onChange={(e) => updateType(type.id, { icon: e.target.value })}
              >
                <option value="FiCheckSquare">チェック</option>
                <option value="FiAlertCircle">アラート</option>
                <option value="FiStar">スター</option>
                <option value="FiCircle">丸</option>
                <option value="FiAlertTriangle">警告</option>
                <option value="FiZap">稲妻</option>
                <option value="FiBug">バグ</option>
                <option value="FiFileText">ファイル</option>
              </select>
              <input
                type="text"
                value={type.name}
                onChange={(e) => updateType(type.id, { name: e.target.value })}
              />
              <button
                className="btn-icon"
                onClick={() => removeType(type.id)}
                title="削除"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm" onClick={addType}>
            <FiPlus /> 種別を追加
          </button>
          <button className="btn btn-primary btn-sm" onClick={saveTypes}>保存</button>
        </div>
      </div>

      {/* 危険な操作 */}
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
