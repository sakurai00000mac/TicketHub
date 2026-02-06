import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';

export default function JoinProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { joinProjectByCode } = useProjectStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const projectId = await joinProjectByCode(code.trim().toUpperCase(), user.id);
      navigate(`/projects/${projectId}/issues`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-project-page">
      <div className="join-project-card">
        <h1>プロジェクトに参加</h1>
        <p className="join-project-description">
          招待コードを入力してプロジェクトに参加します
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="join-project-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="code">招待コード</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例: ABCD1234"
              maxLength={8}
              className="join-project-input"
              autoFocus
            />
          </div>

          <div className="join-project-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !code.trim()}
            >
              {loading ? '参加中...' : '参加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
