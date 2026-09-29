import React from 'react';
import type { Cake, SizeOption } from '../../types/types';
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
  const hasImage = imagePreview || (editingCake && newCake.image && !selectedImage);

  return (
    <div className="cake-form-container">
      <h2>{editingCake ? 'ケーキを編集' : 'ケーキを追加'}</h2>

      <form onSubmit={onSubmit} className="cake-form" encType="multipart/form-data">
        {/* ==================== 基本情報 + 画像 ==================== */}
        <div className="cake-form-top">
          <div className="cake-form-basic">
            <div className="status-toggle-row">
              <label className="toggle-switch large">
                <input
                  type="checkbox"
                  checked={newCake.is_active}
                  onChange={(e) => setNewCake(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="status-toggle-label">
                {newCake.is_active ? '販売中' : '販売停止'}
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="name">商品名 *</label>
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
                placeholder="商品の説明（任意）"
                rows={4}
              />
            </div>
          </div>

          <div className="cake-form-image">
            <label>ケーキ画像</label>
            <div className="cake-image-box">
              {hasImage ? (
                <img
                  src={imagePreview || `${API_URL}/image/${FOLDER_URL}/${newCake.image}`}
                  alt="プレビュー"
                />
              ) : (
                <div className="cake-image-placeholder">📷</div>
              )}
            </div>

            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageSelect}
              className="image-upload-input"
            />
            <label htmlFor="image-upload" className="image-upload-label">
              📁 画像を選択
            </label>

            {hasImage && (
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
            )}

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
        </div>

        {/* ==================== サイズと価格設定 ==================== */}
        <div className="sizes-section">
          <div className="sizes-header">
            <div>
              <h3>サイズと価格設定</h3>
              <span className="sizes-subtitle">商品のサイズごとの在庫・価格・有効状態の設定が可能です。</span>
            </div>
          </div>

          {newSizes.map((size, index) => {
            const priceNum = Number(size.price) || 0;
            const taxIncluded = Math.floor(priceNum * 1.08);

            return (
              <div key={index} className="size-card">
                <div className="size-card-steps">
                  {/* -------- 1. 基本情報 -------- */}
                  <div className="step-block">
                    <div className="step-label"><span className="step-number">1</span> 基本情報</div>

                    <div className="step-row">
                      <label className="mini-toggle-switch">
                        <input
                          type="checkbox"
                          checked={size.is_active !== 0}
                          onChange={(e) => updateSize(index, 'is_active', e.target.checked ? 1 : 0)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="step-row-label">
                        {size.is_active !== 0 ? '販売中' : '販売停止'}
                      </span>
                    </div>

                    <div className="step-field">
                      <label>サイズ</label>
                      <input
                        type="text"
                        value={size.size}
                        onChange={(e) => updateSize(index, 'size', e.target.value)}
                        placeholder="例: P, M, G, 1kg, 4号"
                        required
                      />
                    </div>

                    <div className="step-price-row">
                      <div className="step-field">
                        <label>税抜価格</label>
                        <div className="price-input-wrapper">
                          <span className="price-prefix">¥</span>
                          <input
                            type="text"
                            value={size.price}
                            onChange={(e) => updateSize(index, 'price', Number(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>
                      <div className="step-field">
                        <label>税込価格</label>
                        <div className="price-input-wrapper readonly">
                          <span className="price-prefix tax">8%</span>
                          <span className="tax-included-value">
                            {taxIncluded.toLocaleString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* -------- 2. 在庫設定 -------- */}
                  <div className="step-block">
                    <div className="step-label"><span className="step-number">2</span> 在庫設定</div>
                    <p className="step-desc">在庫数を管理しますか？</p>

                    <div className="stock-mode-options">
                      <button
                        type="button"
                        className={`stock-mode-card ${size.has_manage_stock === 1 ? 'selected' : ''}`}
                        onClick={() => updateSize(index, 'has_manage_stock', 1)}
                      >
                        <span className="stock-mode-icon">📦</span>
                        <span className="stock-mode-title">管理する</span>
                        <span className="stock-mode-desc">
                          在庫数を設定し、在庫切れの際に販売を停止します。
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`stock-mode-card ${size.has_manage_stock !== 1 ? 'selected' : ''}`}
                        onClick={() => updateSize(index, 'has_manage_stock', 0)}
                      >
                        <span className="stock-mode-icon">♾️</span>
                        <span className="stock-mode-title">管理しない（無制限）</span>
                        <span className="stock-mode-desc">
                          在庫数の上限を設けず、常に販売可能にします。
                        </span>
                      </button>
                    </div>

                    {size.has_manage_stock === 1 && (
                      <div className="step-field" style={{ marginTop: '12px' }}>
                        <label>在庫数</label>
                        <input
                          type="text"
                          value={size.stock}
                          onChange={(e) => updateSize(index, 'stock', Number(e.target.value) || 0)}
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* -------- 3. 注文オプション -------- */}
                  <div className="step-block">
                    <div className="step-label"><span className="step-number">3</span> 注文オプション</div>

                    <div className="option-toggle-list">
                      <label className="option-toggle-item">
                        <span className="option-icon">🍓</span>
                        <span className="option-text">
                          <strong>フルーツ盛り</strong>
                          <small>フルーツトッピングを追加できます。</small>
                        </span>
                        <span className="mini-toggle-switch">
                          <input
                            type="checkbox"
                            checked={size.has_fruit_option !== 0}
                            onChange={(e) => updateSize(index, 'has_fruit_option', e.target.checked ? 1 : 0)}
                          />
                          <span className="toggle-slider"></span>
                        </span>
                      </label>

                      <label className="option-toggle-item">
                        <span className="option-icon">🕯️</span>
                        <span className="option-text">
                          <strong>キャンドル</strong>
                          <small>お好みのキャンドルを追加できます。</small>
                        </span>
                        <span className="mini-toggle-switch">
                          <input
                            type="checkbox"
                            checked={size.has_candle_option !== 0}
                            onChange={(e) => updateSize(index, 'has_candle_option', e.target.checked ? 1 : 0)}
                          />
                          <span className="toggle-slider"></span>
                        </span>
                      </label>

                      <label className="option-toggle-item">
                        <span className="option-icon">💬</span>
                        <span className="option-text">
                          <strong>メッセージプレート</strong>
                          <small>プレートにメッセージを入れられます。</small>
                        </span>
                        <span className="mini-toggle-switch">
                          <input
                            type="checkbox"
                            checked={size.has_message_plate !== 0}
                            onChange={(e) => updateSize(index, 'has_message_plate', e.target.checked ? 1 : 0)}
                          />
                          <span className="toggle-slider"></span>
                        </span>
                      </label>

                      <label className="option-toggle-item">
                        <span className="option-icon">💳</span>
                        <span className="option-text">
                          <strong>オンライン決済</strong>
                          <small>事前のオンライン決済を利用できます。</small>
                        </span>
                        <span className="mini-toggle-switch">
                          <input
                            type="checkbox"
                            checked={size.has_online_payment !== 0}
                            onChange={(e) => updateSize(index, 'has_online_payment', e.target.checked ? 1 : 0)}
                          />
                          <span className="toggle-slider"></span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {newSizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="remove-size-btn-card"
                  >
                    ❌ このサイズを削除
                  </button>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addNewSize} className="add-size-btn-full">
            ＋ 別のサイズを追加
          </button>
        </div>

        {/* ==================== 保存 ==================== */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-cake-btn"
            disabled={uploading}
          >
            {uploading ? '⏳ 処理中...' : '💾 保存'}
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