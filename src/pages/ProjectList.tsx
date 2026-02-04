import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { Modal } from '../components/common/Modal';

export function ProjectList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    if (location.state?.openNewProject) {
      setShowModal(true);
      // stateをクリア
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleCreate = () => {
    if (!formName.trim()) return;
    const id = addProject(formName.trim(), formDesc.trim() || undefined);
    setShowModal(false);
    setFormName('');
    setFormDesc('');
    navigate(`/projects/${id}/issues`);
  };

  return (
    <div style={{ padding: '24px' }}>
      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>プロジェクトがありません</h2>
          <p>右上の「新規プロジェクト」ボタンからプロジェクトを作成してください。</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '16px' }}>
            新規プロジェクト
          </button>
        </div>
      ) : (
        <>
          <h2>プロジェクト一覧</h2>
          <div className="project-list">
            {projects.map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => navigate(`/projects/${project.id}/issues`)}
              >
                <h3>{project.name}</h3>
                {project.description && <p>{project.description}</p>}
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  作成日: {new Date(project.createdAt).toLocaleDateString('ja-JP')}
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
            <button className="btn" onClick={() => setShowModal(false)}>キャンセル</button>
            <button className="btn btn-primary" onClick={handleCreate}>作成</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
