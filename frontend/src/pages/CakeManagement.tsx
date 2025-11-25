import React, { useState, useEffect } from 'react';
import './CakeManagement.css';

interface CakeSize {
  id: number;
  size: string;
  stock: number;
  price: number;
}

interface Cake {
  id: number;
  name: string;
  description: string;
  image: string;
  sizes: CakeSize[];
}

const API_URL = import.meta.env.VITE_API_URL;

export default function CakeManagement() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingCake, setEditingCake] = useState<Cake | null>(null);

  // 新しいケーキの状態
  const [newCake, setNewCake] = useState({
    name: '',
    description: '',
    image: ''
  });
  const [newSizes, setNewSizes] = useState<Omit<CakeSize, 'id'>[]>([
    { size: '', stock: 0, price: 0 }
  ]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ケーキを読み込む
  const fetchCakes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/cake`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.cakes)) {
        setCakes(data.cakes);
      } else {
        throw new Error('予期しないレスポンス形式');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ケーキの読み込みエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCakes();
  }, []);

  // 🔹 画像処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 画像ファイルか確認
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }

      // ファイルサイズを確認（最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('画像は5MB以下にしてください。');
        return;
      }

      setSelectedImage(file);
      
      // プレビューを作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`${API_URL}/api/cake/upload`, {
      method: "POST",
      body: formData,
    });

    // Lê o body apenas UMA vez
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error("JSON Parse Error:", err);
      console.error("Server Raw Response:", responseText);

      throw new Error(`サーバーエラー: ${response.status} ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    if (data.success && data.filename) {
      return data.filename;
    }

    throw new Error(data.error || "画像のアップロードエラー");
  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
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
  const updateSize = (index: number, field: keyof CakeSize, value: string | number) => {
    setNewSizes(prev => 
      prev.map((size, i) => 
        i === index ? { ...size, [field]: value } : size
      )
    );
  };

  // 🔹 フォームをクリア
  const clearForm = () => {
    setNewCake({ name: '', description: '', image: '' });
    setNewSizes([{ size: '', stock: 0, price: 0 }]);
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 🔹 新しいケーキを追加
  const handleAddCake = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUploading(true);

      // データを検証
      if (!newCake.name.trim()) {
        alert('ケーキ名は必須です');
        return;
      }

      let imageFilename = newCake.image;

      // 新しい画像が選択された場合はアップロード
      if (selectedImage) {
        imageFilename = await uploadImage(selectedImage);
      }

      const payload = {
        ...newCake,
        image: imageFilename,
        sizes: newSizes.filter(size => size.size.trim() !== '')
      };

      const response = await fetch(`${API_URL}/api/cake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に追加されました！');
        clearForm();
        setActiveTab('list');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの追加に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ケーキの追加に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 ケーキを削除
  const handleDeleteCake = async (cakeId: number) => {
    if (!confirm('このケーキを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`${API_URL}/api/cake/${cakeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に削除されました！');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの削除に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ケーキの削除に失敗しました');
    }
  };

  // 🔹 ケーキを編集
  const handleEditCake = (cake: Cake) => {
    setEditingCake(cake);
    setNewCake({
      name: cake.name,
      description: cake.description || '',
      image: cake.image || ''
    });
    setNewSizes(cake.sizes.length > 0 ? cake.sizes : [{ size: '', stock: 0, price: 0 }]);
    setImagePreview(cake.image ? `${API_URL}/image/${cake.image}` : null);
    setSelectedImage(null);
    setActiveTab('add');
  };

  // 🔹 ケーキを更新
  const handleUpdateCake = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCake) return;

    try {
      setUploading(true);

      let imageFilename = newCake.image;

      // 新しい画像が選択された場合はアップロード
      if (selectedImage) {
        imageFilename = await uploadImage(selectedImage);
      }

      const payload = {
        ...newCake,
        image: imageFilename,
        sizes: newSizes.filter(size => size.size.trim() !== '')
      };

      const response = await fetch(`${API_URL}/api/cake/${editingCake.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert('ケーキが正常に更新されました！');
        setEditingCake(null);
        clearForm();
        setActiveTab('list');
        fetchCakes();
      } else {
        throw new Error(data.error || 'ケーキの更新に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ケーキの更新に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="loading">ケーキを読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  return (
    <div className="cake-management">
      <h1>🎂 ケーキ管理</h1>

      {/* ナビゲーションタブ */}
      <div className="cake-tabs">
        <button 
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 ケーキ一覧
        </button>
        <button 
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setEditingCake(null);
            clearForm();
          }}
        >
          ➕ {editingCake ? 'ケーキを編集' : 'ケーキを追加'}
        </button>
      </div>

      {/* タブの内容 */}
      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="cake-list">
            <h2>登録済みケーキ一覧</h2>
            
            {cakes.length === 0 ? (
              <p className="no-cakes">登録されているケーキがありません。</p>
            ) : (
              <div className="cakes-grid">
                {cakes.map(cake => (
                  <div key={cake.id} className="cake-card">
                    <div className="cake-image">
                      {cake.image ? (
                        <img 
                          src={`${API_URL}/image/${cake.image}`} 
                          alt={cake.name}
                          // onError={(e) => {
                          //   (e.target as HTMLImageElement).src = '/image/default-cake.jpg';
                          // }}
                        />
                      ) : (
                        <div className="no-image">📷 画像なし</div>
                      )}
                    </div>
                    
                    <div className="cake-info">
                      <h3>{cake.name}</h3>
                      {cake.description && (
                        <p className="cake-description">{cake.description}</p>
                      )}
                      
                      <div className="cake-sizes">
                        <h4>サイズ:</h4>
                        {cake.sizes.length === 0 ? (
                          <p className="no-sizes">登録されているサイズがありません</p>
                        ) : (
                          <ul>
                            {cake.sizes.map(size => (
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

                    <div className="cake-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditCake(cake)}
                      >
                        ✏️ 編集
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteCake(cake.id)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="cake-form-container">
            <h2>{editingCake ? 'ケーキを編集' : '新しいケーキを追加'}</h2>
            
            <form onSubmit={editingCake ? handleUpdateCake : handleAddCake} className="cake-form">
              <div className="form-group">
                <label htmlFor="name">ケーキ名 *</label>
                <input
                  type="text"
                  id="name"
                  value={newCake.name}
                  onChange={(e) => setNewCake(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="例: チョコレートケーキ"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  value={newCake.description}
                  onChange={(e) => setNewCake(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ケーキの説明（任意）"
                  rows={3}
                />
              </div>

              {/* 🔹 更新された画像セクション */}
              <div className="form-group">
                <label htmlFor="image">ケーキ画像</label>
                
                {/* 画像プレビュー */}
                {(imagePreview || newCake.image) && (
                  <div className="image-preview">
                    <img 
                      src={imagePreview || `${API_URL}/image/${newCake.image}`} 
                      alt="プレビュー" 
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedImage(null);
                        setNewCake(prev => ({ ...prev, image: '' }));
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

                {/* 画像名のテキスト入力（フォールバック用） */}
                {/* <div style={{ marginTop: '10px' }}>
                  <small>またはファイル名を入力:</small>
                  <input
                    type="text"
                    value={newCake.image}
                    onChange={(e) => setNewCake(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="例: chocolate-cake.jpg"
                    style={{ marginTop: '5px' }}
                  />
                </div> */}

                <small className="help-text">
                  対応形式: JPG, PNG, GIF。最大サイズ: 5MB
                </small>
              </div>

              {/* ケーキのサイズ */}
              <div className="sizes-section">
                <div className="sizes-header">
                  <h3>サイズと価格 *</h3>
                  <button type="button" onClick={addNewSize} className="add-size-btn">
                    ➕ サイズを追加
                  </button>
                </div>

                {newSizes.map((size, index) => (
                  <div key={index} className="size-row">
                    <div className="size-input-group">
                      <label>サイズ</label>
                      <input
                        type="text"
                        value={size.size}
                        onChange={(e) => updateSize(index, 'size', e.target.value)}
                        // placeholder="例: P, M, G, 1kg, 2kg"
                        required
                      />
                    </div>

                    <div className="size-input-group">
                      <label>在庫</label>
                      <input
                        type="number"
                        value={size.stock}
                        onChange={(e) => updateSize(index, 'stock', parseInt(e.target.value) || 0)}
                        min="0"
                        required
                      />
                    </div>

                    <div className="size-input-group">
                      <label>価格 (¥)</label>
                      <input
                        type="text"
                        value={size.price}
                        onChange={(e) => updateSize(index, 'price', parseInt(e.target.value) || 0)}
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
                  {uploading ? '⏳ 処理中...' : editingCake ? '💾 ケーキを更新' : '➕ ケーキを追加'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setActiveTab('list');
                    setEditingCake(null);
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