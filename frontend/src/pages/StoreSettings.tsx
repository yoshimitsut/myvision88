import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StoreInfo } from '../types/types';
import './StoreSettings.css';

export default function StoreSettings() {
  const navigate = useNavigate();
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 店舗設定を読み込む
  useEffect(() => {
    fetchStoreInfo();
  }, []);

  const fetchStoreInfo = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/storeinfo`);
      const data = await res.json();
      console.log('Dados recebidos da API:', data);
      setStoreInfo(data);
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (storeInfo) {
      setStoreInfo({
        ...storeInfo,
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked ? 's' : 'n'
          : value
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (storeInfo) {
      setStoreInfo({
        ...storeInfo,
        [name]: checked ? 's' : 'n'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/storeinfo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeInfo),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '設定の保存に失敗しました');
      }

      setMessage({ type: 'success', text: '✅ 設定を保存しました！' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '❌ 設定の保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="store-settings-loading">設定を読み込み中...</div>;
  }

  if (!storeInfo) {
    return <div className="store-settings-error">店舗データの読み込みに失敗しました</div>;
  }

  return (
    <div className="store-settings-container">
      <div className="store-settings-header">
        <h1>⚙️ 店舗設定</h1>
        <button onClick={() => navigate('/list')} className="store-settings-back-btn">
          ← 戻る
        </button>
      </div>

      {message.text && (
        <div className={`store-settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="store-settings-form">
        <div className="store-settings-section">
          <h2>基本情報</h2>
          
          <div className="store-settings-field">
            <label>店舗名：</label>
            <input
              type="text"
              name="store_name"
              value={storeInfo.store_name || ''}
              onChange={handleChange}
              placeholder="店舗名を入力"
            />
          </div>

          <div className="store-settings-field">
            <label>電話番号：</label>
            <input
              type="text"
              name="tel"
              value={storeInfo.tel || ''}
              onChange={handleChange}
              placeholder="000-0000-0000"
            />
          </div>

          <div className="store-settings-field">
            <label>営業時間：</label>
            <input
              type="text"
              name="open_hour"
              value={storeInfo.open_hour || ''}
              onChange={handleChange}
              placeholder="11:00 - 19:00"
            />
          </div>

          <div className="store-settings-field">
            <label>サイト/管理画面URL：</label>
            <input
              type="url"
              name="site_back"
              value={storeInfo.site_back || ''}
              onChange={handleChange}
              placeholder="http://localhost:3001"
            />
          </div>

          <div className="store-settings-field">
            <label>画像フォルダ：</label>
            <input
              type="text"
              name="folder_img"
              value={storeInfo.folder_img || ''}
              onChange={handleChange}
              placeholder="myvision88"
            />
          </div>
        </div>

        <div className="store-settings-section">
          <h2>メール設定</h2>
          
          <div className="store-settings-field">
            <label>店舗メールアドレス：</label>
            <input
              type="email"
              name="mail_store"
              value={storeInfo.mail_store || ''}
              onChange={handleChange}
              placeholder="store@example.com"
            />
          </div>

          <div className="store-settings-field">
            <label>メールパスワード：</label>
            <input
              type="password"
              name="mail_pass"
              value={storeInfo.mail_pass || ''}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <div className="store-settings-field">
            <label>Resendメールアドレス：</label>
            <input
              type="email"
              name="mail_resend"
              value={storeInfo.mail_resend || ''}
              onChange={handleChange}
              placeholder="order@yoyaku.myvision88.com"
            />
          </div>

          <div className="store-settings-field">
            <label>Resendパスワード：</label>
            <input
              type="password"
              name="resend_pass"
              value={storeInfo.resend_pass || ''}
              onChange={handleChange}
              placeholder="re_xxx"
            />
          </div>
        </div>

        <div className="store-settings-section">
          <h2>管理機能</h2>
          
          <div className="store-settings-checkbox-group">
            <label className="store-settings-checkbox">
              <input
                type="checkbox"
                name="use_admin_grafic"
                checked={storeInfo.use_admin_grafic === 's'}
                onChange={handleCheckboxChange}
              />
              グラフ機能を使用
            </label>

            <label className="store-settings-checkbox">
              <input
                type="checkbox"
                name="use_admin_cake"
                checked={storeInfo.use_admin_cake === 's'}
                onChange={handleCheckboxChange}
              />
              ケーキカタログを使用
            </label>

            <label className="store-settings-checkbox">
              <input
                type="checkbox"
                name="use_admin_date"
                checked={storeInfo.use_admin_date === 's'}
                onChange={handleCheckboxChange}
              />
              カレンダー機能を使用
            </label>

            <label className="store-settings-checkbox">
              <input
                type="checkbox"
                name="use_admin_download"
                checked={storeInfo.use_admin_download === 's'}
                onChange={handleCheckboxChange}
              />
              ダウンロード機能を使用
            </label>
          </div>
        </div>

        <div className="store-settings-actions">
          <button 
            type="submit" 
            className="store-settings-save-btn"
            disabled={saving}
          >
            {saving ? '保存中...' : '💾 設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
}