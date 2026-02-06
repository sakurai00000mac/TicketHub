import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { Modal } from '../components/common/Modal';
import { FiUserPlus } from 'react-icons/fi';

export function ProjectList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { projects, loading, error, addProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (location.state?.openNewProject) {
      setShowModal(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleCreate = async () => {
    if (!formName.trim() || !user) return;
    setCreating(true);
    try {
      const id = await addProject(formName.trim(), user.id, formDesc.trim() || undefined);
      setShowModal(false);
      setFormName('');
      setFormDesc('');
      navigate(`/projects/${id}/issues`);
    } catch (err) {
      alert('プロジェクトの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="empty-state">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="empty-state">
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>プロジェクトがありません</h2>
          <p>新しいプロジェクトを作成するか、招待コードで参加してください。</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              新規プロジェクト
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/join')}>
              <FiUserPlus style={{ marginRight: '4px' }} />
              参加する
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>プロジェクト一覧</h2>
            <button className="btn btn-secondary" onClick={() => navigate('/join')}>
              <FiUserPlus style={{ marginRight: '4px' }} />
              参加する
            </button>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => navigate(`/projects/${project.id}/issues`)}
              >
                <h3>{project.name}</h3>
                {project.description && <p>{project.description}</p>}
                <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                  作成日: {new Date(project.createdAt).toLocaleDateString('ja-JP')}
                  {project.ownerId === user?.id && ' (オーナー)'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal title="新規プロジェクト" onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>プロジェクト名</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>説明（任意）</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowModal(false)} disabled={creating}>
              キャンセル
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? '作成中...' : '作成'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
