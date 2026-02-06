import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, error, signInWithGoogle } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // エラーはストアで管理
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">TicketHub</h1>
        <p className="login-subtitle">プロジェクト管理ツール</p>

        {error && <div className="login-error">{error}</div>}

        <button className="login-google-btn" onClick={handleGoogleLogin}>
          <FcGoogle size={24} />
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
}
