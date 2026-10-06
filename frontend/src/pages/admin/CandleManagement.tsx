import './CandleManagement.css';
import { useCandleManagement } from '../../hooks/useCandleManagement';
import AdminLayout from '../../components/admin/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL;

export default function CandleManagement() {
  const {
    candles,
    loading,
    error,
    editingCandle,
    setEditingCandle,
    newCandle,
    setNewCandle,
    imagePreview,
    uploading,
    handleImageSelect,
    clearForm,
    handleAddCandle,
    handleUpdateCandle,
    handleDeleteCandle,
    toggleActive,
    FOLDER_URL
  } = useCandleManagement();

  if (loading) return <div className="loading">キャンドルを読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  const currentCandle = editingCandle || newCandle;
  const isEditing = !!editingCandle;

  return (
    <AdminLayout>
      <div className="candle-management-content">
        <div className="breadcrumb">
          <span>キャンドル</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">管理</span>
        </div>

        <h1>キャンドル管理</h1>

        <div className="candle-form-card">
          <h2>{isEditing ? 'キャンドルを編集' : '新しいキャンドルを追加'}</h2>

          <div className="form-grid">
            <div className="form-left">
              <div className="form-group">
                <label>名前<span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={currentCandle.name || ''}
                  onChange={e => isEditing
                    ? setEditingCandle({ ...editingCandle!, name: e.target.value })
                    : setNewCandle({ ...newCandle, name: e.target.value })}
                  placeholder="例: ナンバーキャンドル「1」レッド"
                />
              </div>

              <div className="form-group">
                <label>価格 <span className="required">*</span></label>
                <input
                  type="number"
                  className="form-control"
                  value={currentCandle.price || 0}
                  onChange={e => isEditing
                    ? setEditingCandle({ ...editingCandle!, price: parseInt(e.target.value) || 0 })
                    : setNewCandle({ ...newCandle, price: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>種類 (Tipo) <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={currentCandle.candle_type || 'ノーマル'}
                  onChange={e => isEditing
                    ? setEditingCandle({ ...editingCandle!, candle_type: e.target.value })
                    : setNewCandle({ ...newCandle, candle_type: e.target.value })}
                >
                  <option value="ノーマル">ノーマル</option>
                  <option value="有料キャンドル">有料キャンドル</option>
                </select>
              </div>

              <div className="form-group">
                <label>最大選択可能数 <span className="required">*</span></label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={currentCandle.max_limit || 1}
                  onChange={e => isEditing
                    ? setEditingCandle({ ...editingCandle!, max_limit: parseInt(e.target.value) || 1 })
                    : setNewCandle({ ...newCandle, max_limit: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="form-group">
                <label>説明</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={currentCandle.description || ''}
                  onChange={e => isEditing
                    ? setEditingCandle({ ...editingCandle!, description: e.target.value })
                    : setNewCandle({ ...newCandle, description: e.target.value })}
                />
              </div>

              <div className="form-group-isactive checkbox-group-isactive">
                <div>
                  <input
                    type="checkbox"
                    checked={currentCandle.is_active}
                    onChange={e => isEditing
                      ? setEditingCandle({ ...editingCandle!, is_active: e.target.checked })
                      : setNewCandle({ ...newCandle, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active"> アクティブ (販売中)</label>
                </div>
              </div>
            </div>

            <div className="form-right">
              <div className="form-group">
                <label>画像</label>
                <div className="image-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    id="candle-image-upload"
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="image-preview-candle" />
                  ) : currentCandle.image && isEditing ? (
                    <img src={`${API_URL}/image/${FOLDER_URL}/${currentCandle.image}`} alt="Current" className="image-preview-candle" />
                  ) : (
                    <p>画像をアップロード</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {isEditing && (
              <button type="button" className="btn-cancel" onClick={clearForm}>
                キャンセル (Cancelar)
              </button>
            )}
            <button
              type="button"
              className="btn-save"
              onClick={isEditing ? handleUpdateCandle : handleAddCandle}
              disabled={uploading}
            >
              {uploading ? '保存中...' : isEditing ? '更新する' : '追加する'}
            </button>
          </div>
        </div>

        <div className="candle-list">
          <table className="candle-table">
            <thead>
              <tr>
                <th>画像</th>
                <th>名前</th>
                <th>種類</th>
                <th>上限</th>
                <th>価格</th>
                <th>ステータス</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>
              {candles.map(candle => (
                <tr key={candle.id}>
                  <td>
                    {candle.image ? (
                      <img src={`${API_URL}/image/${FOLDER_URL}/${candle.image}`} alt={candle.name} className="candle-thumbnail" />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </td>
                  <td>{candle.name}</td>
                  <td>{candle.candle_type}</td>
                  <td>{candle.max_limit}</td>
                  <td>¥{candle.price.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${candle.is_active ? 'active' : 'inactive'}`}>
                      {candle.is_active ? '公開' : '非公開'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-toggle" onClick={() => toggleActive(candle.id)}>
                        {candle.is_active ? '非公開にする' : '公開する'}
                      </button>
                      <button className="btn-edit" onClick={() => {
                        clearForm();
                        setEditingCandle(candle);
                        window.scrollTo(0, 0);
                      }}>
                        編集
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteCandle(candle.id)}>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {candles.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>キャンドルがありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
