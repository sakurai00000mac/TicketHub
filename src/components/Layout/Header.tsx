import { useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { FiPlus, FiDownload, FiUpload, FiHome, FiLogOut } from 'react-icons/fi';
import { exportToFile, importFromFile } from '../../utils/storage';

export function Header() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects } = useProjectStore();
  const { importAllData } = useUIStore();
  const { user, signOut } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === projectId);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromFile(file);
      importAllData(data);
      alert(`インポート完了: ${data.projects.length}件のプロジェクト、${data.pages.length}件のページ`);
      navigate('/');
    } catch {
      alert('インポートに失敗しました。ファイル形式を確認してください。');
    }
    e.target.value = '';
  };

  return (
    <header className="header">
      <Link to="/" className="header-title">
        <FiHome size={16} />
        <h1>TicketHub</h1>
      </Link>

      {currentProject && (
        <div className="header-breadcrumb">
          <span>/</span>
          <span>{currentProject.name}</span>
        </div>
      )}

      {!projectId && projects.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) navigate(`/projects/${e.target.value}/issues`);
          }}
        >
          <option value="">-- プロジェクト選択 --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="header-actions">
        {!projectId && (
          <button
            className="btn btn-sm"
            onClick={() => navigate('/', { state: { openNewProject: true } })}
            style={{ background: 'white', color: 'var(--color-primary)', borderColor: 'white' }}
          >
            <FiPlus /> 新規プロジェクト
          </button>
        )}
        <button className="btn-icon" onClick={exportToFile} style={{ color: 'white' }} title="エクスポート">
          <FiDownload size={18} />
        </button>
        <button className="btn-icon" onClick={() => fileInputRef.current?.click()} style={{ color: 'white' }} title="インポート">
          <FiUpload size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>

      {user && (
        <div className="header-user">
          {user.photoURL && (
            <img src={user.photoURL} alt={user.displayName} className="header-user-avatar" />
          )}
          <span className="header-user-name">{user.displayName}</span>
          <button className="btn-icon" onClick={handleSignOut} style={{ color: 'white' }} title="ログアウト">
            <FiLogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
