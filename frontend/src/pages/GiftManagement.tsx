import React, { useState, useEffect } from 'react';
import './GiftManagement.css';

interface GiftSize {
  id: number;
  size: string;
  stock: number;
  price: number;
}

interface Gift {
  id: number;
  name: string;
  description: string;
  image: string; // Main image
  images: string[]; // All images
  sizes: GiftSize[];
}

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export default function GiftManagement() {
  const [giftList, setGiftList] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingGift, setEditingGift] = useState<Gift | null>(null);

  // 新しいギフトの状態
  const [newGift, setNewGift] = useState({
    name: '',
    description: '',
    image: ''
  });
  const [newSizes, setNewSizes] = useState<Omit<GiftSize, 'id'>[]>([
    { size: '', stock: 0, price: 0 }
  ]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<'existing' | 'new' | null>(null);

  // ギフトを読み込む
  const fetchGifts = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/gift`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.gift)) {
        setGiftList(data.gift);
      } else {
        throw new Error('予期しないレスポンス形式');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ギフトの読み込みエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  // 🔹 画像処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name}は画像ファイルではありません。`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}は5MBを超えています。`);
          return false;
        }
        return true;
      });

      setSelectedImages(prev => [...prev, ...validFiles]);

      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // 🔹 画像の並び替え (Drag & Drop)
  const handleDragStart = (index: number, source: 'existing' | 'new') => {
    setDragIndex(index);
    setDragSource(source);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDragSource(null);
  };

  const handleDropExisting = (dropIndex: number) => {
    if (dragIndex === null || dragSource !== 'existing') return;
    setExistingImages(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    handleDragEnd();
  };

  const handleDropNew = (dropIndex: number) => {
    if (dragIndex === null || dragSource !== 'new') return;
    setSelectedImages(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setImagePreviews(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    handleDragEnd();
  };

  // 🔹 ボタンで並び替え
  const moveExistingImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= existingImages.length) return;
    setExistingImages(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const moveNewImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= imagePreviews.length) return;
    setSelectedImages(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
    setImagePreviews(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  // 🔹 フォームをクリア
  const clearForm = () => {
    setNewGift({ name: '', description: '', image: '' });
    setNewSizes([{ size: '', stock: 0, price: 0 }]);
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  // 🔹 新しいギフトを追加
  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);

      if (!newGift.name.trim()) {
        alert('ギフト名は必須です');
        setUploading(false);
        return;
      }

      const formData = new FormData();

      formData.append('name', newGift.name.trim());
      formData.append('description', newGift.description?.trim() || '');

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      formData.append('sizes', JSON.stringify(validSizes));

      if (selectedImages.length > 0) {
        selectedImages.forEach(file => {
          formData.append('images', file);
        });
      }

      console.log('📦 Enviando FormData (Gift):');
      console.log('📦 name:', newGift.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 images:', selectedImages.length);

      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/gift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('ギフトが正常に追加されました！');
        clearForm();
        setActiveTab('list');
        fetchGifts();
      } else {
        throw new Error(data.error || 'ギフトの追加に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ギフトの追加に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 ギフトを更新
  const handleUpdateGift = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingGift) return;

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append('name', newGift.name.trim());
      formData.append('description', newGift.description?.trim() || '');

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      formData.append('sizes', JSON.stringify(validSizes));
      formData.append('existingImages', JSON.stringify(existingImages));

      if (selectedImages.length > 0) {
        selectedImages.forEach(file => {
          formData.append('images', file);
        });
      }

      console.log('📦 Update FormData (Gift):');
      console.log('📦 name:', newGift.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 existing images:', existingImages.length);
      console.log('📦 new images:', selectedImages.length);

      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/gift/${editingGift.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('ギフトが正常に更新されました！');
        setEditingGift(null);
        clearForm();
        setActiveTab('list');
        fetchGifts();
      } else {
        throw new Error(data.error || 'ギフトの更新に失敗しました');
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ギフトの更新に失敗しました');
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
  const updateSize = (index: number, field: keyof Omit<GiftSize, 'id'>, value: string | number) => {
    setNewSizes(prev =>
      prev.map((size, i) =>
        i === index ? { ...size, [field]: field === 'size' ? value : Number(value) || 0 } : size
      )
    );
  };

  // 🔹 ギフトを削除
  const handleDeleteGift = async (giftId: number) => {
    if (!confirm('このギフトを削除してもよろしいですか？')) return;

    try {
      const token = sessionStorage.getItem('store_token');
      const response = await fetch(`${API_URL}/api/gift/${giftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('ギフトが正常に削除されました！');
        fetchGifts();
      } else {
        throw new Error(data.error || 'ギフトの削除に失敗しました');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ギフトの削除に失敗しました');
    }
  };

  // 🔹 ギフトを編集
  const handleEditGift = (gift: Gift) => {
    setEditingGift(gift);
    setNewGift({
      name: gift.name,
      description: gift.description || '',
      image: gift.image || ''
    });
    setNewSizes(gift.sizes.length > 0 ? gift.sizes : [{ size: '', stock: 0, price: 0 }]);
    setExistingImages(gift.images || []);
    setImagePreviews([]);
    setSelectedImages([]);
    setActiveTab('add');
  };

  if (loading) return <div className="loading">ギフトを読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  return (
    <div className="gift-management">
      <h1>🍪 ギフト管理</h1>

      {/* ナビゲーションタブ */}
      <div className="gift-tabs">
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 ギフト一覧
        </button>
        <button
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setEditingGift(null);
            clearForm();
          }}
        >
          ➕ {editingGift ? 'ギフトを編集' : 'ギフトを追加'}
        </button>
      </div>

      {/* タブの内容 */}
      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="gift-list-admin">
            <h2>登録済みギフト一覧</h2>

            {giftList.length === 0 ? (
              <p className="no-gift">登録されているギフトがありません。</p>
            ) : (
              <div className="gift-grid">
                {giftList.map(gift => (
                  <div key={gift.id} className="gift-card">
                    <div className="gift-image">
                      {gift.image ? (
                        <img
                          src={`${API_URL}/image/myvision88/${gift.image}`}
                          alt={gift.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-gift.jpg';
                          }}
                        />
                      ) : (
                        <div className="no-image">📷 画像なし</div>
                      )}
                    </div>

                    <div className='gift-info-actions'>
                      <div className="gift-info">
                        <h3>{gift.name}</h3>
                        {gift.description && (
                          <p className="gift-description">{gift.description}</p>
                        )}

                        <div className="gift-sizes">
                          <h4>サイズ/種類:</h4>
                          {gift.sizes.length === 0 ? (
                            <p className="no-sizes">登録されているサイズがありません</p>
                          ) : (
                            <ul>
                              {gift.sizes.map(size => (
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

                      <div className="gift-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditGift(gift)}
                        >
                          ✏️ 編集
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteGift(gift.id)}
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
          <div className="gift-form-container">
            <h2>{editingGift ? 'ギフトを編集' : '新しいギフトを追加'}</h2>

            <form onSubmit={editingGift ? handleUpdateGift : handleAddGift} className="gift-form" encType="multipart/form-data">
              <div className="form-group">
                <label htmlFor="name">ギフト名 *</label>
                <input
                  type="text"
                  id="name"
                  value={newGift.name}
                  onChange={(e) => setNewGift(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="例: マカロン, フィナンシェ, クッキー"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  value={newGift.description}
                  onChange={(e) => setNewGift(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ギフトの説明（任意）"
                  rows={3}
                />
              </div>

              {/* 🔹 画像セクション */}
              <div className="form-group">
                <label>ギフト画像</label>

                <div className="images-preview-grid">
                  {/* 既存の画像 */}
                  {existingImages.map((img, index) => (
                    <div
                      key={`existing-${img}`}
                      className={`image-preview-item${
                        dragSource === 'existing' && dragIndex === index ? ' dragging' : ''
                      }${dragSource === 'existing' && dragOverIndex === index ? ' drag-over' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(index, 'existing')}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleDropExisting(index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="image-order-badge">{index + 1}</div>
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${img}`}
                        alt={`既存画像 ${index + 1}`}
                      />
                      <div className="image-controls">
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveExistingImage(index, -1)}
                          disabled={index === 0}
                          title="左へ移動"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeExistingImage(index)}
                        >
                          ❌
                        </button>
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveExistingImage(index, 1)}
                          disabled={index === existingImages.length - 1}
                          title="右へ移動"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 新しく選択された画像 */}
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={`new-${index}`}
                      className={`image-preview-item${
                        dragSource === 'new' && dragIndex === index ? ' dragging' : ''
                      }${dragSource === 'new' && dragOverIndex === index ? ' drag-over' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(index, 'new')}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleDropNew(index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="image-order-badge new">
                        {existingImages.length + index + 1}
                      </div>
                      <img src={preview} alt={`新規画像 ${index + 1}`} />
                      <div className="image-controls">
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveNewImage(index, -1)}
                          disabled={index === 0}
                          title="左へ移動"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeSelectedImage(index)}
                        >
                          ❌
                        </button>
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveNewImage(index, 1)}
                          disabled={index === imagePreviews.length - 1}
                          title="右へ移動"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <small className="help-text" style={{ marginTop: '5px' }}>
                    💡 ドラッグ＆ドロップ、または矢印ボタンで画像の順番を変更できます。1番目の画像がメイン画像になります。
                  </small>
                )}

                {/* ファイル入力 */}
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="image-upload-input"
                />
                <label htmlFor="image-upload" className="image-upload-label">
                  📁 画像を追加 (複数選択可)
                </label>

                {selectedImages.length > 0 && (
                  <div className="file-info">
                    <small>{selectedImages.length} 個の新しい画像が選択されています</small>
                  </div>
                )}

                <small className="help-text">
                  対応形式: JPG, PNG, GIF。最大サイズ: 5MB/枚
                </small>
              </div>

              {/* ギフトのサイズ/種類 */}
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
                  {uploading ? '⏳ 処理中...' : editingGift ? '💾 ギフトを更新' : '➕ ギフトを追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingGift(null);
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