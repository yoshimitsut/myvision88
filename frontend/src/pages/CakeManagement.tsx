import React, { useState, useEffect } from 'react';
import './CakeManagement.css';
import type { Cake, SizeOption } from '../types/types';
import CakeForm from '../components/CakeForm';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export default function CakeManagement() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingCake, setEditingCake] = useState<Cake | null>(null);

  const [newCake, setNewCake] = useState({
    name: '',
    description: '',
    image: '',
    is_active: true
  });
  const [newSizes, setNewSizes] = useState<Omit<SizeOption, 'id' | 'cake_id'>[]>([
    { size: '', stock: 0, price: 0, is_active: 1 }
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

  // 🔹 フォームをクリア
  const clearForm = () => {
    setNewCake({ name: '', description: '', image: '', is_active: true });
    setNewSizes([{ size: '', stock: 0, price: 0, is_active: 1 }]);
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
        setUploading(false);
        return;
      }

      // FormDataを使用してマルチパートデータとして送信
      const formData = new FormData();

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      const hasActiveSize = validSizes.some(size => size.is_active !== 0);

      if (newCake.is_active && !hasActiveSize) {
        alert('少なくとも1つのサイズが必要です');
        setUploading(false);
        return;
      }

      // テキストフィールドを追加
      formData.append('name', newCake.name.trim());
      formData.append('description', newCake.description?.trim() || '');
      formData.append('is_active', newCake.is_active ? '1' : '0');

      // サイズをJSON文字列として追加
      formData.append('sizes', JSON.stringify(validSizes));

      // 画像があれば追加
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('📦 Enviando FormData:');
      console.log('📦 name:', newCake.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 image:', selectedImage?.name);

      const response = await fetch(`${API_URL}/api/cake`, {
        method: 'POST',
        body: formData, // Não usar Content-Type header! O browser vai setar automaticamente com boundary
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
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ケーキの追加に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 ケーキを更新
  const handleUpdateCake = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCake) return;

    try {
      setUploading(true);

      const validSizes = newSizes.filter(size => size.size.trim() !== '');
      const hasActiveSize = validSizes.some(size => size.is_active !== 0);

      if (newCake.is_active && !hasActiveSize) {
        alert('少なくとも1つのサイズが必要です');
        setUploading(false);
        return;
      }

      // FormDataを使用
      const formData = new FormData();

      formData.append('name', newCake.name.trim());
      formData.append('description', newCake.description?.trim() || '');
      formData.append('is_active', newCake.is_active ? '1' : '0');

      formData.append('sizes', JSON.stringify(validSizes));

      // 既存の画像ファイル名を送信
      if (newCake.image && !selectedImage) {
        formData.append('existingImage', newCake.image);
      }

      // 新しい画像があれば追加
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('📦 Update FormData:');
      console.log('📦 name:', newCake.name);
      console.log('📦 sizes:', JSON.stringify(validSizes));
      console.log('📦 new image:', selectedImage?.name);

      const response = await fetch(`${API_URL}/api/cake/${editingCake.id}`, {
        method: 'PUT',
        body: formData,
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
      console.error('❌ Erro:', err);
      alert(err instanceof Error ? err.message : 'ケーキの更新に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 🔹 新しいサイズを追加
  const addNewSize = () => {
    setNewSizes(prev => [...prev, { size: '', stock: 0, price: 0, is_active: 1 }]);
  };

  // 🔹 サイズを削除
  const removeSize = (index: number) => {
    if (newSizes.length > 1) {
      setNewSizes(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 🔹 サイズを更新
  const updateSize = (index: number, field: keyof Omit<SizeOption, 'id' | 'cake_id'>, value: string | number) => {
    setNewSizes(prev =>
      prev.map((size, i) =>
        i === index ? { ...size, [field]: value } : size
      )
    );
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
      image: cake.image || '',
      is_active: cake.is_active === undefined ? true : Boolean(cake.is_active)
    });
    setNewSizes(cake.sizes.length > 0 ? cake.sizes.map(s => ({ ...s, is_active: s.is_active === undefined ? 1 : s.is_active })) : [{ size: '', stock: 0, price: 0, is_active: 1 }]);
    setImagePreview(cake.image ? `${API_URL}/image/${FOLDER_URL}/${cake.image}` : null);
    setSelectedImage(null);
    setActiveTab('add');
  };

  if (loading) return <div className="loading">ケーキを読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  return (
    <div className="cake-management">
      <h1>🎂 ケーキ管理</h1>

      {/* ナビゲーションタブ */}
      <div className="cake-tabs">
        <button
          className={`tab-cake-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 ケーキ一覧
        </button>
        <button
          className={`tab-cake-button ${activeTab === 'add' ? 'active' : ''}`}
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
          <div className="cake-list-admin">
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
                          src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                          alt={cake.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-cake.jpg';
                          }}
                        />
                      ) : (
                        <div className="no-image">📷 画像なし</div>
                      )}
                    </div>

                    <div className='cake-info-actions'>
                      <div className="cake-info">
                        <h3>{cake.name} {cake.is_active === 0 && <span style={{ color: 'red', fontSize: '0.8em' }}>(非アクティブ)</span>}</h3>
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
                                  <span className="size-name" style={{ textDecoration: size.is_active === 0 ? 'line-through' : 'none', color: size.is_active === 0 ? '#999' : 'inherit' }}>
                                    {size.size} {size.is_active === 0 && '(無効)'}
                                  </span>
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
                          className="edit-cake-btn"
                          onClick={() => handleEditCake(cake)}
                        >
                          ✏️ 編集
                        </button>
                        <button
                          className="delete-cake-btn"
                          onClick={() => handleDeleteCake(cake.id)}
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
          <CakeForm
            editingCake={editingCake}
            newCake={newCake}
            setNewCake={setNewCake}
            newSizes={newSizes}
            uploading={uploading}
            imagePreview={imagePreview}
            selectedImage={selectedImage}
            onSubmit={editingCake ? handleUpdateCake : handleAddCake}
            onCancel={() => {
              setActiveTab('list');
              setEditingCake(null);
              clearForm();
            }}
            handleImageSelect={handleImageSelect}
            setImagePreview={setImagePreview}
            setSelectedImage={setSelectedImage}
            addNewSize={addNewSize}
            removeSize={removeSize}
            updateSize={updateSize}
            API_URL={API_URL}
            FOLDER_URL={FOLDER_URL}
          />
        )}
      </div>
    </div>
  );
}