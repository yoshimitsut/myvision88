import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { Cake } from "../../types/types";
import "./CakeInformationsSize.css";

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

export default function CakeInformationsSize() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_URL}/api/cake`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.cakes || [];
        setCakes(list);

        const initial = searchParams.get("cake");
        if (initial) {
          const found = list.find(
            (c: Cake) => c.name.toLowerCase() === initial.toLowerCase()
          );
          if (found) {
            setSelectedCake(found);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar bolos:", err))
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Reset active image and selections when modal opens for a new cake
  useEffect(() => {
    if (selectedCake) {
      setActiveImage(selectedCake.image || null);
      setSelectedSize(selectedCake.sizes && selectedCake.sizes.length > 0 ? selectedCake.sizes[0].size : "");
    }
  }, [selectedCake]);

  const handleReserve = () => {
    if (!selectedCake) return;
    navigate(`/order?cake=${encodeURIComponent(selectedCake.name)}&size=${encodeURIComponent(selectedSize)}`);
  };

  return (
    <div className="cake-page">
      <div className="cake-blur-bg"></div>

      <header className="cake-header">
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

      <main className="cake-main">
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : cakes.length === 0 ? (
          <div className="no-cakes">ケーキがありません。</div>
        ) : (
          <div>
            <div className="cake-main-image">
              <img src="/cake-main-image.png" alt="Cakes" className="cake-main-img" onError={(e) => { e.currentTarget.src = '/gift-main-image.png'; }} />
              <div className="cake-main-overlay">
                <h2>デコレーションケーキ</h2>
              </div>
            </div>

            <div className="cake-text-box">
              <span className="cake-text">特別な日のためのデコレーションケーキ。</span>
              <span className="cake-text">心を込めてお作りいたします。</span>
            </div>

            <div className="cake-grid">
              {cakes.map((cake) => (
                <div key={cake.id} className="cake-item" onClick={() => setSelectedCake(cake)}>
                  <div className="cake-image-box">
                    {cake.image ? (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                        alt={cake.name}
                        className="cake-img"
                      />
                    ) : (
                      <div className="no-image">画像なし</div>
                    )}
                  </div>
                  <div className="cake-label-bar">
                    <h3>{cake.name}</h3>
                    {cake.description && <p className="cake-sub-desc">({cake.description.substring(0, 30)}...)</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="cake-footer">
        <nav className="footer-nav">
          <div className="footer-links-box">
            <a href="/">HOME</a>
            <div className="footer-divider"></div>
            <a href="/gift">COLLECTION</a>
            <div className="footer-divider"></div>
            <a href="/about">ABOUT US</a>
            <div className="footer-divider"></div>
            <a href="/chef">CHEF</a>
            <div className="footer-divider"></div>
            <a href="/access">ACCESS</a>
            <div className="footer-divider"></div>
            <a href="/payment">お支払い方法</a>
            <div className="footer-divider"></div>
            <a href="/order">オンライン予約</a>
          </div>
        </nav>

        <div className="footer-bottom-logo">
          <img src="/logo-myvision.png" alt="LIEN DE GATEAU" className="footer-logo" />
        </div>
      </footer>

      {/* MODAL DO BOLO */}
      {selectedCake && (
        <div className="cake-modal-overlay" onClick={() => setSelectedCake(null)}>
          <div className="cake-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedCake(null)}>✕</button>

            <div className="cake-modal-body">
              <div className="cake-modal-gallery">
                <div className="cake-modal-main-image-display">
                  {activeImage ? (
                    <img src={`${API_URL}/image/${FOLDER_URL}/${activeImage}`} alt={selectedCake.name} />
                  ) : (
                    <div className="no-image">画像なし</div>
                  )}
                </div>
                {/* Se houver sistema de múltiplas imagens no futuro, adicionamos os thumbnails aqui igual ao Gift */}
              </div>

              <div className="cake-modal-details">
                <h2>{selectedCake.name}</h2>
                {selectedCake.description && <p className="cake-modal-desc">{selectedCake.description}</p>}

                <div className="cake-modal-sizes-box">
                  <h3 className="modal-sizes-title">サイズ / 価格</h3>
                  <div className="modal-sizes-options">
                    {selectedCake.sizes?.map((size, index) => (
                      <label key={index} className={`modal-size-label ${selectedSize === size.size ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="cake-size" 
                          value={size.size} 
                          checked={selectedSize === size.size}
                          onChange={() => setSelectedSize(size.size)}
                          className="size-radio"
                        />
                        <span className="modal-size-name">{size.size}</span>
                        <span className="modal-size-price" style={{ marginLeft: 'auto' }}>
                          ¥{size.price.toLocaleString()} <small>(税込)</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="cake-modal-actions">
                  <button 
                    className="cake-buy-btn"
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
