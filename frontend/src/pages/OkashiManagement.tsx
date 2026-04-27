import React, { useState, useEffect } from 'react';
import './OkashiManagement.css';

interface OkashiSize {
  id: number;
  size: string;
  stock: number;
  price: number;
}

interface Okashi {
  id: number;
  name: string;
  description: string;
  image: string;
  sizes: OkashiSize[];
}

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export default function OkashiManagement() {
  const [okashiList, setOkashiList] = useState<Okashi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingOkashi, setEditingOkashi] = useState<Okashi | null>(null);

  // 新しいお菓子の状態
  const [newOkashi, setNewOkashi] = useState({
    name: '',
    description: '',
    image: ''
  });
  const [newSizes, setNewSizes] = useState<Omit<OkashiSize, 'id'>[]>([
    { size: '', stock: 0, price: 0 }
  ]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // お菓子を読み込む
  const fetchOkashi = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/okashi`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.okashi)) {
        setOkashiList(data.okashi);
      } else {
        throw new Error('予期しないレスポンス形式');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お菓子の読み込みエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOkashi();
  }, []);

  // 🔹 画像処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('画像は5MB以下にしてください。');
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔹 フォームをクリア
  const clearForm = () => {
    setNewOkashi({ name: '', description: '', image: '' });
    setNewSizes([{ size: '', stock: 0, price: 0 }]);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 🔹 新しいお菓子を追加
  const handleAddOkashi = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);

      if (!newOkashi.name.trim()) {
        alert('お菓子名は必須です');
        setUploading(false);
        return;
      }

      const formData = new FormData();

      formData.append('name', newOkashi.name.trim());
      formData.append('description', newOkashi.description?.trim() || '');

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      formData.append('sizes', JSON.stringify(validSizes));

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('📦 Enviando FormData (Okashi):');
      console.log('📦 name:', newOkashi.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 image:', selectedImage?.name);

      const token = localStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/okashi`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('お菓子が正常に追加されました！');
        clearForm();
        setActiveTab('list');
        fetchOkashi();
      } else {
        throw new Error(data.error || 'お菓子の追加に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'お菓子の追加に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 お菓子を更新
  const handleUpdateOkashi = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingOkashi) return;

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append('name', newOkashi.name.trim());
      formData.append('description', newOkashi.description?.trim() || '');

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      formData.append('sizes', JSON.stringify(validSizes));

      if (newOkashi.image && !selectedImage) {
        formData.append('existingImage', newOkashi.image);
      }

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('📦 Update FormData (Okashi):');
      console.log('📦 name:', newOkashi.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 new image:', selectedImage?.name);

      const token = localStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/okashi/${editingOkashi.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('お菓子が正常に更新されました！');
        setEditingOkashi(null);
        clearForm();
        setActiveTab('list');
        fetchOkashi();
      } else {
        throw new Error(data.error || 'お菓子の更新に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'お菓子の更新に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 新しいサイズを追加
  const addNewSize = () => {
    setNewSizes(prev => [...prev, { size: '', stock: 0, price: 0 }]);
  };

  // 🔹 サイズを削除
  const removeSize = (index: number) => {
    if (newSizes.length > 1) {
      setNewSizes(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 🔹 サイズを更新
  const updateSize = (index: number, field: keyof Omit<OkashiSize, 'id'>, value: string | number) => {
    setNewSizes(prev =>
      prev.map((size, i) =>
        i === index ? { ...size, [field]: field === 'size' ? value : Number(value) || 0 } : size
      )
    );
  };

  // 🔹 お菓子を削除
  const handleDeleteOkashi = async (okashiId: number) => {
    if (!confirm('このお菓子を削除してもよろしいですか？')) return;

    try {
      const token = localStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/okashi/${okashiId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('お菓子が正常に削除されました！');
        fetchOkashi();
      } else {
        throw new Error(data.error || 'お菓子の削除に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'お菓子の削除に失敗しました');
    }
  };

  // 🔹 お菓子を編集
  const handleEditOkashi = (okashi: Okashi) => {
    setEditingOkashi(okashi);
    setNewOkashi({
      name: okashi.name,
      description: okashi.description || '',
      image: okashi.image || ''
    });
    setNewSizes(okashi.sizes.length > 0 ? okashi.sizes : [{ size: '', stock: 0, price: 0 }]);
    setImagePreview(okashi.image ? `${API_URL}/image/${FOLDER_URL}/${okashi.image}` : null);
    setSelectedImage(null);
    setActiveTab('add');
  };

  if (loading) return <div className="loading">お菓子を読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  return (
    <div className="okashi-management">
      <h1>🍪 お菓子管理</h1>

      {/* ナビゲーションタブ */}
      <div className="okashi-tabs">
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 お菓子一覧
        </button>
        <button
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setEditingOkashi(null);
            clearForm();
          }}
        >
          ➕ {editingOkashi ? 'お菓子を編集' : 'お菓子を追加'}
        </button>
      </div>

      {/* タブの内容 */}
      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="okashi-list-admin">
            <h2>登録済みお菓子一覧</h2>

            {okashiList.length === 0 ? (
              <p className="no-okashi">登録されているお菓子がありません。</p>
            ) : (
              <div className="okashi-grid">
                {okashiList.map(okashi => (
                  <div key={okashi.id} className="okashi-card">
                    <div className="okashi-image">
                      {okashi.image ? (
                        <img
                          src={`${API_URL}/image/myvision88/${okashi.image}`}
                          alt={okashi.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-okashi.jpg';
                          }}
                        />
                      ) : (
                        <div className="no-image">📷 画像なし</div>
                      )}
                    </div>

                    <div className='okashi-info-actions'>
                      <div className="okashi-info">
                        <h3>{okashi.name}</h3>
                        {okashi.description && (
                          <p className="okashi-description">{okashi.description}</p>
                        )}

                        <div className="okashi-sizes">
                          <h4>サイズ/種類:</h4>
                          {okashi.sizes.length === 0 ? (
                            <p className="no-sizes">登録されているサイズがありません</p>
                          ) : (
                            <ul>
                              {okashi.sizes.map(size => (
                                <li key={size.id}>
                                  <span className="size-name">{size.size}</span>
                                  <span className="size-details">
                                    在庫: {size.stock} | ¥{size.price.toLocaleString('ja-JP')}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="okashi-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditOkashi(okashi)}
                        >
                          ✏️ 編集
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteOkashi(okashi.id)}
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="okashi-form-container">
            <h2>{editingOkashi ? 'お菓子を編集' : '新しいお菓子を追加'}</h2>

            <form onSubmit={editingOkashi ? handleUpdateOkashi : handleAddOkashi} className="okashi-form" encType="multipart/form-data">
              <div className="form-group">
                <label htmlFor="name">お菓子名 *</label>
                <input
                  type="text"
                  id="name"
                  value={newOkashi.name}
                  onChange={(e) => setNewOkashi(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="例: マカロン, フィナンシェ, クッキー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  value={newOkashi.description}
                  onChange={(e) => setNewOkashi(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="お菓子の説明（任意）"
                  rows={3}
                />
              </div>

              {/* 🔹 画像セクション */}
              <div className="form-group">
                <label htmlFor="image">お菓子画像</label>

                {/* 画像プレビュー */}
                {(imagePreview || (editingOkashi && newOkashi.image && !selectedImage)) && (
                  <div className="image-preview">
                    <img
                      src={imagePreview || `${API_URL}/image/${FOLDER_URL}/${newOkashi.image}`}
                      alt="プレビュー"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedImage(null);
                        setNewOkashi(prev => ({ ...prev, image: '' }));
                      }}
                    >
                      ❌ 画像を削除
                    </button>
                  </div>
                )}

                {/* ファイル入力 */}
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="image-upload-input"
                />
                <label htmlFor="image-upload" className="image-upload-label">
                  📁 {selectedImage ? '画像が選択されました' : '画像を選択'}
                </label>

                {selectedImage && (
                  <div className="file-info">
                    <small>ファイル: {selectedImage.name}</small>
                    <small>サイズ: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</small>
                  </div>
                )}

                <small className="help-text">
                  対応形式: JPG, PNG, GIF。最大サイズ: 5MB
                </small>
              </div>

              {/* お菓子のサイズ/種類 */}
              <div className="sizes-section">
                <div className="sizes-header">
                  <h3>サイズ/種類と価格 *</h3>
                  <button type="button" onClick={addNewSize} className="add-size-btn">
                    ➕ サイズ/種類を追加
                  </button>
                </div>

                {newSizes.map((size, index) => (
                  <div key={index} className="size-row">
                    <div className="size-input-group">
                      <label>サイズ/種類</label>
                      <input
                        type="text"
                        value={size.size}
                        onChange={(e) => updateSize(index, 'size', e.target.value)}
                        placeholder="例: 小袋, 箱入り, 5個入り"
                        required
                      />
                    </div>

                    <div className="size-input-group">
                      <label>在庫</label>
                      <input
                        type="number"
                        value={size.stock}
                        onChange={(e) => updateSize(index, 'stock', e.target.value)}
                        min="0"
                        required
                      />
                    </div>

                    <div className="size-input-group">
                      <label>価格 (¥)</label>
                      <input
                        type="number"
                        value={size.price}
                        onChange={(e) => updateSize(index, 'price', e.target.value)}
                        min="0"
                        required
                      />
                    </div>

                    {newSizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSize(index)}
                        className="remove-size-btn"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={uploading}
                >
                  {uploading ? '⏳ 処理中...' : editingOkashi ? '💾 お菓子を更新' : '➕ お菓子を追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingOkashi(null);
                    clearForm();
                  }}
                  className="cancel-btn"
                  disabled={uploading}
                >
                  ↩️ 戻る
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}