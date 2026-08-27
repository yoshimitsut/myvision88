import './CakeManagement.css';
import CakeForm from '../../components/order/CakeForm';
import { useCakeManagement } from '../../hooks/useCakeManagement';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';

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
    handleEditCake,
    setImagePreview,
    setSelectedImage,
    API_URL,
    FOLDER_URL
  } = useCakeManagement();

  const navigate = useNavigate();

  const toggleSizeActive = async (sizeId: number) => {
    try {
      await fetch(`${API_URL}/api/sizes/${sizeId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      // A quick reload to reflect changes, or it can be handled by the hook state reload
      window.location.reload();
    } catch (error) {
      console.error('Erro ao toggle size:', error);
    }
  };

  if (loading) return <div className="loading">ケーキを読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;

  return (
    <AdminLayout>
      <div className="cake-management-content">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>ケーキ</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">ケーキリスト</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <h1>ケーキメニュー</h1>
        <div className="header-actions">
          <button
            className="add-cake-btn"
            onClick={() => {
              setActiveTab('add');
              setEditingCake(null);
              clearForm();
            }}
          >
            ＋ ケーキを追加
          </button>
          <button className="close-btn" onClick={() => navigate('/list')}>× 閉じる</button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="content-area">
        {activeTab === 'list' && (
          <div className="cake-list">
            {cakes.length === 0 ? (
              <p className="no-cakes">登録されているケーキがありません。</p>
            ) : (
              <div className="cake-cards-list">
                {cakes.map(cake => (
                  <div key={cake.id} className="cake-card-horizontal">
                    {/* Imagem */}
                    <div className="cake-image-container">
                      {cake.image ? (
                        <img
                          src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                          alt={cake.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-cake.jpg';
                          }}
                        />
                      ) : (
                        <div className="no-image">📷</div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="cake-details">
                      <div className="cake-header">
                        <h2>{cake.name}</h2>
                        <div className="cake-actions-header">
                          <button
                            className="edit-link"
                            onClick={() => handleEditCake(cake)}
                          >
                            編集
                          </button>
                          {cake.is_active === 1 ? (
                            <span className="status-badge active">オンライン販売中</span>
                          ) : (
                            <span className="status-badge inactive">オンライン停止中</span>
                          )}
                        </div>
                      </div>

                      {/* Tabela de tamanhos */}
                      <div className="sizes-table">
                        {cake.sizes.map(size => (
                          <div key={size.id} className="size-row">
                            <div className="size-toggle-wrapper">
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={size.is_active === 1}
                                  onChange={() => size.id !== undefined && toggleSizeActive(size.id)}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                              <span className={`size-label ${size.is_active === 0 ? 'inactive' : ''}`}>
                                {size.size}
                              </span>
                              <span className="size-icon">♾️</span>
                            </div>
                            <div className="size-price">
                              <span className="currency-symbol">¥</span>
                              <span className="price-value">{size.price.toLocaleString('ja-JP')}</span>
                            </div>
                            <div className="size-stock">
                              <span className="stock-percentage">8%</span>
                              <span className="stock-value">{Math.floor(size.price * 1.08).toLocaleString('ja-JP')}</span>
                            </div>
                          </div>
                        ))}
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
    </AdminLayout>
  );
}