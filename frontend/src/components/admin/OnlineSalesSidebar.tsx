import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnlineSalesSidebar.css';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

interface CakeSize {
  id: number;
  size: string;
  stock: number;
  price: number;
  is_active: number | boolean;
}

interface SameDayCake {
  id: number;
  name: string;
  image: string;
  is_active: number | boolean;
  sizes: CakeSize[];
}

export default function OnlineSalesSidebar() {
  const [cakes, setCakes] = useState<SameDayCake[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCakes();
  }, []);

  const fetchCakes = async () => {
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/same-day-cakes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setCakes(data.same_day_cakes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar same day cakes:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSizeStatus = async (sizeId: number, currentStatus: number | boolean) => {
    try {
      const newStatus = currentStatus ? 0 : 1;
      const token = sessionStorage.getItem('store_token');

      const res = await fetch(`${API_URL}/api/same-day-cakes/sizes/${sizeId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setCakes(prevCakes => prevCakes.map(cake => ({
          ...cake,
          sizes: cake.sizes.map(size => size.id === sizeId ? { ...size, is_active: newStatus } : size)
        })));
      } else {
        alert('ステータスの更新に失敗しました。');
      }
    } catch (error) {
      console.error('Erro ao alternar status do size:', error);
      alert('通信エラーが発生しました。');
    }
  };

  if (loading) return <div className="online-sales-sidebar loading">読み込み中...</div>;

  return (
    <div className="online-sales-sidebar">
      <h3 className="online-sales-title">オンライン販売</h3>

      <div className="online-sales-list">
        {cakes.filter(c => c.is_active).map(cake => (
          cake.sizes.map(size => (
            <div key={`${cake.id}-${size.id}`} className="online-sales-item">
              <div className="online-sales-img-wrapper">
                {cake.image && (
                  <img
                    src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                    alt={cake.name}
                    className="online-sales-img"
                  />
                )}
              </div>
              <div className="online-sales-info">
                <div className="online-sales-name">{cake.name}</div>
                <div className="online-sales-size">{size.size}</div>
                <div className="online-sales-toggle-wrapper">
                  <label className="online-sales-switch">
                    <input
                      type="checkbox"
                      checked={!!size.is_active}
                      onChange={() => toggleSizeStatus(size.id, size.is_active)}
                    />
                    <span className="online-sales-slider round"></span>
                  </label>
                  <span className={`online-sales-status-text ${size.is_active ? 'active' : 'inactive'}`}>
                    {size.is_active ? '販売中' : '停止中'}
                  </span>
                </div>
              </div>
              <div className="online-sales-stock-box">
                <span className="online-sales-stock-label">残り</span>
                <span className="online-sales-stock-number">{size.stock}</span>
              </div>
            </div>
          ))
        ))}
      </div>

      <button className="online-sales-edit-btn" onClick={() => navigate('/store-settings')}>
        当日オンライン販売を編集
      </button>
    </div>
  );
}
