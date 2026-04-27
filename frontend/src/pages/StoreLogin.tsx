import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './StoreLogin.css';

export default function StoreLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      console.log('Login attempt result:', data);

      if (data.success) {
        // Limpar estados antigos para evitar conflitos
        sessionStorage.clear();
        localStorage.removeItem('store_token');
        
        localStorage.setItem('store_token', data.token);
        localStorage.setItem('store_user', JSON.stringify(data.user));
        sessionStorage.setItem('store_authenticated', 'true');
        
        const from = location.state?.from?.pathname || '/list';
        navigate(from, { replace: true });
      } else {
        setError(data.error || 'パスワードが正しくありません');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('サーバーに接続できません');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>店舗管理画面</h1>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="password">パスワード:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}