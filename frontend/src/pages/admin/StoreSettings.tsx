import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StoreInfo } from '../../types/types';
import { applyStoreTheme } from '../../utils/theme';
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
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/storeinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log('Dados recebidos da API:', data);
      setStoreInfo(data);
      if (data.primary_color || data.secondary_color) {
        applyStoreTheme(data.primary_color, data.secondary_color);
      }
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (primary: string, secondary?: string) => {
    if (storeInfo) {
      const updated = {
        ...storeInfo,
        primary_color: primary,
        secondary_color: secondary ?? storeInfo.secondary_color ?? '#fdd111'
      };
      setStoreInfo(updated);
      applyStoreTheme(updated.primary_color, updated.secondary_color);
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
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/storeinfo`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeInfo),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '設定の保存に失敗しました');
      }

      if (storeInfo?.primary_color) {
        applyStoreTheme(storeInfo.primary_color, storeInfo.secondary_color);
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
        {/* 🎨 Section Theme Color */}
        <div className="store-settings-section">
          <h2>🎨 店舗テーマカラー設定 (Cor Padrão da Loja)</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
            店舗のテーマカラーを設定します。保存すると、ボタンや強調カラーなどサイト全体の色が自動的に変更されます。
          </p>

          <div className="store-settings-field">
            <label>メインカラー (Primary Color)：</label>
            <div className="color-picker-row">
              <input
                type="color"
                name="primary_color"
                value={storeInfo.primary_color || '#000000'}
                onChange={(e) => handleColorChange(e.target.value, storeInfo.secondary_color)}
                className="color-picker-input"
              />
              <input
                type="text"
                name="primary_color"
                value={storeInfo.primary_color || '#000000'}
                onChange={(e) => handleColorChange(e.target.value, storeInfo.secondary_color)}
                placeholder="#000000"
                style={{ width: '120px' }}
              />
            </div>
          </div>

          <div className="store-settings-field">
            <label>サブカラー (Secondary Color)：</label>
            <div className="color-picker-row">
              <input
                type="color"
                name="secondary_color"
                value={storeInfo.secondary_color || '#fdd111'}
                onChange={(e) => handleColorChange(storeInfo.primary_color || '#000000', e.target.value)}
                className="color-picker-input"
              />
              <input
                type="text"
                name="secondary_color"
                value={storeInfo.secondary_color || '#fdd111'}
                onChange={(e) => handleColorChange(storeInfo.primary_color || '#000000', e.target.value)}
                placeholder="#fdd111"
                style={{ width: '120px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#495057' }}>クイックプリセット (Preset Cores):</label>
            <div className="color-preset-group">
              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#000000', '#fdd111')}
              >
                <span className="color-badge" style={{ backgroundColor: '#000000' }}></span>
                🖤 ブラック (Black)
              </button>

              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#fdd111', '#000000')}
              >
                <span className="color-badge" style={{ backgroundColor: '#fdd111' }}></span>
                🟡 イエロー (Yellow)
              </button>

              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#007bff', '#fdd111')}
              >
                <span className="color-badge" style={{ backgroundColor: '#007bff' }}></span>
                🔵 ブルー (Blue)
              </button>

              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#ff758c', '#fff0f3')}
              >
                <span className="color-badge" style={{ backgroundColor: '#ff758c' }}></span>
                🌸 サクラピンク (Sakura Pink)
              </button>

              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#2d6a4f', '#d8f3dc')}
              >
                <span className="color-badge" style={{ backgroundColor: '#2d6a4f' }}></span>
                🍵 抹茶グリーン (Matcha Green)
              </button>

              <button
                type="button"
                className="color-preset-btn"
                onClick={() => handleColorChange('#6f42c1', '#f3e8ff')}
              >
                <span className="color-badge" style={{ backgroundColor: '#6f42c1' }}></span>
                💜 パープル (Purple)
              </button>
            </div>
          </div>
        </div>
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