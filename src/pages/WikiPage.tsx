import { useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWikiStore } from '../stores/wikiStore';
import { Sidebar } from '../components/Layout/Sidebar';
import { Modal } from '../components/common/Modal';

export function WikiPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = location.pathname.endsWith('/edit');
  const { addPage } = useWikiStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');

  const handleNewPage = (parentId: string | null) => {
    setNewPageParentId(parentId);
    setFormName('');
    setShowNewPage(true);
  };

  const handleCreate = () => {
    if (!formName.trim() || !projectId) return;
    const id = addPage(projectId, formName.trim(), newPageParentId);
    setShowNewPage(false);
    navigate(`/projects/${projectId}/wiki/${id}/edit`);
  };

  return (
    <div className="wiki-layout">
      <Sidebar
        onNewPage={handleNewPage}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <div className="wiki-content" style={isEditing ? { padding: 0, overflow: 'hidden' } : {}}>
        <Outlet />
      </div>

      {showNewPage && (
        <Modal title="新規ページ" onClose={() => setShowNewPage(false)}>
          <div className="form-group">
            <label>ページタイトル</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowNewPage(false)}>キャンセル</button>
            <button className="btn btn-primary" onClick={handleCreate}>作成</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
