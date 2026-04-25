import React from 'react';
import type { Cake, SizeOption } from '../types/types';
import './CakeForm.css';

interface CakeFormProps {
  editingCake: Cake | null;
  newCake: {
    name: string;
    description: string;
    image: string;
    is_active: boolean;
  };
  setNewCake: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    image: string;
    is_active: boolean;
  }>>;
  newSizes: Omit<SizeOption, 'id' | 'cake_id'>[];
  uploading: boolean;
  imagePreview: string | null;
  selectedImage: File | null;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setImagePreview: (url: string | null) => void;
  setSelectedImage: (file: File | null) => void;
  addNewSize: () => void;
  removeSize: (index: number) => void;
  updateSize: (index: number, field: keyof Omit<SizeOption, 'id' | 'cake_id'>, value: string | number) => void;
  API_URL: string | undefined;
  FOLDER_URL: string | undefined;
}

const CakeForm: React.FC<CakeFormProps> = ({
  editingCake,
  newCake,
  setNewCake,
  newSizes,
  uploading,
  imagePreview,
  selectedImage,
  onSubmit,
  onCancel,
  handleImageSelect,
  setImagePreview,
  setSelectedImage,
  addNewSize,
  removeSize,
  updateSize,
  API_URL,
  FOLDER_URL
}) => {
  return (
    <div className="cake-form-container">
      <h2>{editingCake ? 'ケーキを編集' : '新しいケーキを追加'}</h2>

      <form onSubmit={onSubmit} className="cake-form" encType="multipart/form-data">
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

        <div className="form-group checkbox-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={newCake.is_active}
              onChange={(e) => setNewCake(prev => ({ ...prev, is_active: e.target.checked }))}
              style={{ width: 'auto' }}
            />
            アクティブ (販売中)
          </label>
        </div>

        {/* 🔹 画像セクション */}
        <div className="form-group">
          <label htmlFor="image">ケーキ画像</label>

          {/* 画像プレビュー */}
          {(imagePreview || (editingCake && newCake.image && !selectedImage)) && (
            <div className="image-preview">
              <img
                src={imagePreview || `${API_URL}/image/${FOLDER_URL}/${newCake.image}`}
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
            <div key={index} className="size-row-admin">
              <div className="size-input-group">
                <label>サイズ</label>
                <input
                  type="text"
                  value={size.size}
                  onChange={(e) => updateSize(index, 'size', e.target.value)}
                  placeholder="例: P, M, G, 1kg"
                  required
                />
              </div>

              <div className="size-input-group">
                <label>在庫</label>
                <input
                  type="text"
                  value={size.stock}
                  onChange={(e) => updateSize(index, 'stock', Number(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>

              <div className="size-input-group">
                <label>価格 (¥)</label>
                <input
                  type="text"
                  value={size.price}
                  onChange={(e) => updateSize(index, 'price', Number(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>

              <div className="size-input-group checkbox-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '4px' }}>
                  <span>有効</span>
                  <input
                    type="checkbox"
                    checked={size.is_active !== 0}
                    onChange={(e) => updateSize(index, 'is_active', e.target.checked ? 1 : 0)}
                    style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                  />
                </label>
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
            className="submit-cake-btn"
            disabled={uploading}
          >
            {uploading ? '⏳ 処理中...' : editingCake ? '💾 ケーキを更新' : '➕ ケーキを追加'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={uploading}
          >
            ↩️ 戻る
          </button>
        </div>
      </form>
    </div>
  );
};

export default CakeForm;
