import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './Hero.css'
import type { Cake } from '../../types/types'

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;



export default function Hero() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_URL}/api/cake`)
      .then((res) => res.json())
      .then((data) => {
        const activeCakes = (data.cakes || []).filter((cake: Cake) => cake.is_active !== 0);
        setCakes(activeCakes);
      })
      .catch((err) => console.error("Erro ao carregar bolos:", err));
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
    navigate(`/order?cake=${encodeURIComponent(selectedCake.name)}&size=${encodeURIComponent(selectedSize)}`);
  };

  return (
    <div className="hero-page">
      <div className="hero-blur-bg"></div>

      <header className="hero-header">
        <div className="header-left"></div>
        <div className="header-center">
          <img src="/logo-myvision.png" alt="Myvision88" className="logo-img" onClick={() => navigate("/")} />
        </div>
        <div className="header-right">
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="instagram-link">
            <img src="/instagram-icon.png" alt="Instagram" />
          </a>
          <button className="menu-toggle">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <div className="hero-main-image">
        <div className="fadeOverlay">ホールケーキ</div>
      </div>

      <main className="hero-main">
        <div className="hero-grid">
          {cakes.map((cake, index) => (
            <div 
              className="hero-item" 
              key={`${cake.id ?? index}-${index}`}
              onClick={() => openModal(cake)}
            >
              <div className="hero-item-image-wrapper">
                <img src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`} alt={cake.name} loading="lazy" />
              </div>
              <div className="hero-item-info">
                <h3>{cake.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="hero-footer">
        <div className="footer-links">
          <a href="#">特定商取引法に基づく表記</a>
          <a href="#">プライバシーポリシー</a>
          <a href="#">お問い合わせ</a>
        </div>
        <div className="footer-bottom-logo">
          <img src="/logo-myvision.png" alt="LIEN DE GATEAU" className="footer-logo" />
        </div>
      </footer>

      {/* MODAL DO BOLO */}
      {selectedCake && (
        <div className="hero-modal-overlay" onClick={closeModal}>
          <div className="hero-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="hero-close-modal-btn" onClick={closeModal}>✕</button>

            <div className="hero-modal-body">
              <div className="hero-modal-gallery">
                <div className="hero-modal-main-image">
                  {selectedCake.image ? (
                    <img src={`${API_URL}/image/${FOLDER_URL}/${selectedCake.image}`} alt={selectedCake.name} />
                  ) : (
                    <div className="hero-no-image">画像なし</div>
                  )}
                </div>
              </div>

              <div className="hero-modal-details">
                <h2>{selectedCake.name}</h2>
                {selectedCake.description && <p className="hero-modal-desc">{selectedCake.description}</p>}

                <div className="hero-modal-sizes-box">
                  <h3 className="hero-modal-sizes-title">サイズ / 価格</h3>
                  <div className="hero-modal-sizes-options">
                    {selectedCake.sizes?.map((size, index) => (
                      <label key={index} className={`hero-modal-size-label ${selectedSize === size.size ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="cake-size"
                          value={size.size}
                          checked={selectedSize === size.size}
                          onChange={() => setSelectedSize(size.size)}
                          className="hero-size-radio"
                        />
                        <span className="hero-modal-size-name">{size.size}</span>
                        <span className="hero-modal-size-price">
                          ¥{size.price.toLocaleString()} <small>(税込)</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="hero-modal-actions">
                  <button
                    className="hero-buy-btn"
                    onClick={handleReserve}
                    disabled={!selectedSize}
                  >
                    予約 (Reserve)
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
