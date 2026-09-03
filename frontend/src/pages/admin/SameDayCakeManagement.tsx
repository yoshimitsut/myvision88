import './SameDayCakeManagement.css';
import CakeForm from '../../components/order/CakeForm';
import { useSameDayCakeManagement } from '../../hooks/useSameDayCakeManagement';
import { useSameDayTimeSlots } from '../../hooks/useSameDayTimeSlots';
import { useHoursOptions } from '../../hooks/useHoursOptions';
import { useState } from 'react';

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

  const { timeSlots, toggleTimeSlot, deleteTimeSlot, addTimeSlot } = useSameDayTimeSlots();
  // Use regular time slots for same-day orders
  useHoursOptions(new Date(), timeSlots);



  const [newTime, setNewTime] = useState('');

  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) {
      alert('時間を選択してください。');
      return;
    }
    const success = await addTimeSlot(newTime);
    if (success) {
      setNewTime('');
    }
  };

  if (loading) return <div className="sdc-loading">読み込み中...</div>;
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
        <button
          className={`sdc-tab-button ${activeTab === 'time' ? 'active' : ''}`}
          onClick={() => setActiveTab('time')}
        >
          ⏰ 時間設定
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

        {activeTab === 'time' && (
          <>
            <form className="sdc-time-form" onSubmit={handleAddTimeSlot}>
              <input type="time" required className="sdc-time-input" value={newTime} onChange={e => setNewTime(e.target.value)} />
              <button type="submit" className="sdc-time-add-btn">➕ 時間を追加</button>
            </form>

            <div className="sdc-time-slots">
              {timeSlots.length === 0 ? (
                <p>登録されている時間がありません。</p>
              ) : (
                <table className="sdc-time-table">
                  <thead>
                    <tr>
                      <th>時間</th>
                      <th>ステータス</th>
                      <th>アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(slot => (
                      <tr key={slot.id} className={slot.is_active ? '' : 'inactive-row'}>
                        <td className="time-col">{slot.time}</td>
                        <td>
                          <button 
                            className={`status-btn ${slot.is_active ? 'active' : 'inactive'}`}
                            onClick={() => toggleTimeSlot(slot.id, slot.time, slot.is_active)}
                          >
                            {slot.is_active ? '✅ アクティブ' : '❌ 非アクティブ'}
                          </button>
                        </td>
                        <td>
                          <button 
                            className="sdc-delete-btn" 
                            onClick={() => deleteTimeSlot(slot.id)}
                          >
                            🗑️ 削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
