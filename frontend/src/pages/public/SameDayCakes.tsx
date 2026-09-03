import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './SameDayCakes.css';
import type { Cake } from '../../types/types';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export default function SameDayCakes() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    fetch(`${API_URL}/api/sameday-cakes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.same_day_cakes)) {
          const activeCakes = data.same_day_cakes.filter((cake: Cake) => cake.is_active !== 0);
          setCakes(activeCakes);
        }
      })
      .catch((err) => console.error("Erro ao carregar bolos do dia:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const openModal = (cake: Cake) => {
    setSelectedCake(cake);
    setSelectedSize(cake.sizes && cake.sizes.length > 0 ? cake.sizes[0].size : "");
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedCake(null);
    setSelectedSize("");
    document.body.style.overflow = '';
  };

  const handleReserve = () => {
    if (!selectedCake) return;
    document.body.style.overflow = '';

    setTimeout(() => {
      navigate(`/sameday/order?cake=${encodeURIComponent(selectedCake.name)}&size=${encodeURIComponent(selectedSize)}`);
    }, 50);
  };

  return (
    <div className="sameday-page">
      <header className="sameday-header-section">
        <h1>🎂 当日受取ケーキ</h1>
        <p>Bolos disponíveis para retirada no mesmo dia</p>
      </header>

      <main className="sameday-main">
        {loading ? (
          <div className="sameday-no-cakes">読み込み中...</div>
        ) : (
          <div className="sameday-grid">
            {cakes.length === 0 ? (
              <div className="sameday-no-cakes">現在、当日お持ち帰り可能なケーキはございません。</div>
            ) : (
              cakes.map((cake, index) => (
                <div
                  className="sameday-item"
                  key={`${cake.id ?? index}-${index}`}
                  onClick={() => openModal(cake)}
                >
                  <div className="sameday-item-image-wrapper">
                    {cake.image ? (
                      <img src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`} alt={cake.name} loading="lazy" />
                    ) : (
                      <div className="sameday-no-image">📷</div>
                    )}
                  </div>
                  <div className="sameday-item-info">
                    <h3>{cake.name}</h3>
                    {cake.description && <p>{cake.description}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {selectedCake && (
        <div className="sameday-modal-overlay" onClick={closeModal}>
          <div className="sameday-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="sameday-close-modal-btn" onClick={closeModal}>✕</button>

            <div className="sameday-modal-body">
              <div className="sameday-modal-gallery">
                <div className="sameday-modal-main-image">
                  {selectedCake.image ? (
                    <img src={`${API_URL}/image/${FOLDER_URL}/${selectedCake.image}`} alt={selectedCake.name} />
                  ) : (
                    <div className="sameday-no-image">画像なし</div>
                  )}
                </div>
              </div>

              <div className="sameday-modal-details">
                <h2>{selectedCake.name}</h2>
                {selectedCake.description && <p className="sameday-modal-desc">{selectedCake.description}</p>}

                <div className="sameday-modal-sizes-box">
                  <h3 className="sameday-modal-sizes-title">サイズ / 価格</h3>
                  <div className="sameday-modal-sizes-options">
                    {selectedCake.sizes?.filter(s => s.is_active !== 0 && s.stock > 0).map((size, index) => (
                      <label key={index} className={`sameday-modal-size-label ${selectedSize === size.size ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="cake-size"
                          value={size.size}
                          checked={selectedSize === size.size}
                          onChange={() => setSelectedSize(size.size)}
                          className="sameday-size-radio"
                        />
                        <span className="sameday-modal-size-name">{size.size}</span>
                        <span className="sameday-modal-size-price">
                          ¥{size.price.toLocaleString()} <small>(税込)</small>
                        </span>
                      </label>
                    ))}
                    {selectedCake.sizes?.filter(s => s.is_active !== 0 && s.stock > 0).length === 0 && (
                      <p style={{ color: 'red' }}>申し訳ありません。現在在庫切れです。</p>
                    )}
                  </div>
                </div>

                <div className="sameday-modal-actions">
                  <button
                    className="sameday-buy-btn"
                    onClick={handleReserve}
                    disabled={!selectedSize || selectedCake.sizes?.filter(s => s.is_active !== 0 && s.stock > 0).length === 0}
                  >
                    注文する
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
