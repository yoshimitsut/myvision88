import './CakeManagement.css';
import CakeForm from '../components/CakeForm';
import { useCakeManagement } from '../hooks/useCakeManagement';

export default function CakeManagement() {
  const {
    cakes,
    loading,
    error,
    activeTab,
    setActiveTab,
    editingCake,
    setEditingCake,
    newCake,
    setNewCake,
    newSizes,
    selectedImage,
    imagePreview,
    uploading,
    handleImageSelect,
    clearForm,
    handleAddCake,
    handleUpdateCake,
    addNewSize,
    removeSize,
    updateSize,
    handleDeleteCake,
    handleEditCake,
    setImagePreview,
    setSelectedImage,
    API_URL,
    FOLDER_URL
  } = useCakeManagement();

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