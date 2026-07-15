import './SameDayCakeManagement.css';
import CakeForm from '../../components/order/CakeForm';
import { useSameDayCakeManagement } from '../../hooks/useSameDayCakeManagement';

export default function SameDayCakeManagement() {
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
  } = useSameDayCakeManagement();

  if (loading) return <div className="sdc-loading">ケーキを読み込み中...</div>;
  if (error) return <div className="sdc-error">エラー: {error}</div>;

  return (
    <div className="sdc-management">
      <div className="sdc-header">
        <h1>🎂 当日受取ケーキ管理</h1>
        <p className="sdc-subtitle">Bolos disponíveis para retirada no mesmo dia</p>
      </div>

      {/* Abas de navegação */}
      <div className="sdc-tabs">
        <button
          className={`sdc-tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 ケーキ一覧
        </button>
        <button
          className={`sdc-tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('add');
            setEditingCake(null);
            clearForm();
          }}
        >
          ➕ {editingCake ? 'ケーキを編集' : 'ケーキを追加'}
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div className="sdc-tab-content">
        {activeTab === 'list' && (
          <div className="sdc-list">
            <h2>登録済みケーキ一覧</h2>

            {cakes.length === 0 ? (
              <p className="sdc-no-cakes">登録されているケーキがありません。</p>
            ) : (
              <div className="sdc-grid">
                {cakes.map(cake => (
                  <div key={cake.id} className="sdc-card">
                    <div className="sdc-card-image">
                      {cake.image ? (
                        <img
                          src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                          alt={cake.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-cake.jpg';
                          }}
                        />
                      ) : (
                        <div className="sdc-no-image">📷 画像なし</div>
                      )}
                      <div className={`sdc-status-badge ${cake.is_active ? 'active' : 'inactive'}`}>
                        {cake.is_active ? '● アクティブ' : '○ 非アクティブ'}
                      </div>
                    </div>

                    <div className="sdc-card-body">
                      <h3 className="sdc-cake-name">{cake.name}</h3>
                      {cake.description && (
                        <p className="sdc-cake-description">{cake.description}</p>
                      )}

                      <div className="sdc-sizes">
                        <h4>サイズ・在庫</h4>
                        {cake.sizes.length === 0 ? (
                          <p className="sdc-no-sizes">登録されているサイズがありません</p>
                        ) : (
                          <ul>
                            {cake.sizes.map(size => (
                              <li key={size.id} className={size.is_active === 0 ? 'sdc-size-inactive' : ''}>
                                <span className="sdc-size-label">
                                  {size.size}
                                  {size.is_active === 0 && <span className="sdc-size-disabled"> (無効)</span>}
                                </span>
                                <span className="sdc-size-info">
                                  在庫: <strong>{size.stock}</strong> | ¥{size.price.toLocaleString('ja-JP')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="sdc-card-actions">
                        <button
                          className="sdc-edit-btn"
                          onClick={() => handleEditCake(cake)}
                        >
                          ✏️ 編集
                        </button>
                        <button
                          className="sdc-delete-btn"
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
