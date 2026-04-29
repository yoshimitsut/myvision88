import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Gift } from "../types/types";
import "./Gift.css";

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

interface CartItem {
  id: string;
  gift_id: number;
  name: string;
  size: string;
  price: number;
  amount: number;
  image: string | null;
}

export default function Gift() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  // Cart & Selection States
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Tenta recuperar o carrinho do sessionStorage caso exista (opcional)
    const saved = sessionStorage.getItem("gift_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  
  const navigate = useNavigate();

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("gift_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Reset active image and selections when modal opens for a new gift
  useEffect(() => {
    if (selectedGift) {
      setActiveImage(
        selectedGift.images && selectedGift.images.length > 0
          ? selectedGift.images[0]
          : selectedGift.image || null
      );
      // Auto-select the first size if available
      setSelectedSize(selectedGift.sizes && selectedGift.sizes.length > 0 ? selectedGift.sizes[0].size : "");
      setSelectedAmount(1);
    }
  }, [selectedGift]);

  const handleAddToCart = () => {
    if (!selectedGift || !selectedSize) return;

    const sizeObj = selectedGift.sizes.find(s => s.size === selectedSize);
    if (!sizeObj) return;

    const newItem: CartItem = {
      id: Date.now().toString(),
      gift_id: selectedGift.id,
      name: selectedGift.name,
      size: sizeObj.size,
      price: sizeObj.price,
      amount: selectedAmount,
      image: selectedGift.images && selectedGift.images.length > 0 ? selectedGift.images[0] : selectedGift.image || null
    };

    setCartItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
    setSelectedGift(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.amount), 0);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_URL}/api/gift`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGifts(data.gift);
        }
      })
      .catch((err) => console.error("Erro ao carregar gifts:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gift-page">
      <div className="gift-blur-bg"></div>

      <header className="gift-header">
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

      <main className="gift-main">
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : gifts.length === 0 ? (
          <div className="no-gifts">ギフトがありません。</div>
        ) : (
          <div>
            <div className="gift-main-image">
              <img src="/gift-main-image.png" alt="Gift" className="gift-main-img" />
              <div className="gift-main-overlay">
                <h2>ギフト</h2>
              </div>
            </div>

            <div className="gift-text-box">
              <span className="gift-text">ギフトは中身が変更になる場合がございます。</span>
              <span className="gift-text">御希望の予算、内容に合ったギフトをお作り可能です。</span>
            </div>

            <div className="gift-grid">

              {gifts.map((gift) => (
                <div key={gift.id} className="gift-item" onClick={() => setSelectedGift(gift)}>
                  <div className="gift-image-box">
                    {(gift.images && gift.images.length > 0) ? (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${gift.images[0]}`}
                        alt={gift.name}
                        className="gift-img"
                      />
                    ) : gift.image ? (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${gift.image}`}
                        alt={gift.name}
                        className="gift-img"
                      />
                    ) : (
                      <div className="no-image">画像なし</div>
                    )}
                  </div>
                  <div className="gift-label-bar">
                    <h3>{gift.name}</h3>
                    {gift.description && <p className="gift-sub-desc">({gift.description})</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="gift-footer">
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

      {/* MODAL DO PRESENTE */}
      {selectedGift && (
        <div className="gift-modal-overlay" onClick={() => setSelectedGift(null)}>
          <div className="gift-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedGift(null)}>✕</button>

            <div className="gift-modal-body">
              <div className="gift-modal-gallery">
                <div className="gift-modal-main-image-display">
                  {activeImage ? (
                    <img src={`${API_URL}/image/${FOLDER_URL}/${activeImage}`} alt={selectedGift.name} />
                  ) : (
                    <div className="no-image">画像なし</div>
                  )}
                </div>
                {selectedGift.images && selectedGift.images.length > 0 && (
                  <div className="gift-modal-thumbnails">
                    {selectedGift.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={`${API_URL}/image/${FOLDER_URL}/${img}`}
                        alt={`${selectedGift.name} ${idx + 1}`}
                        onClick={() => setActiveImage(img)}
                        className={activeImage === img ? 'active-thumb' : ''}
                      />
                    ))}
                    {(!selectedGift.images || selectedGift.images.length === 0) && selectedGift.image && (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${selectedGift.image}`}
                        alt={selectedGift.name}
                        onClick={() => setActiveImage(selectedGift.image || null)}
                        className={activeImage === selectedGift.image ? 'active-thumb' : ''}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="gift-modal-details">
                <h2>{selectedGift.name}</h2>
                {selectedGift.description && <p className="gift-modal-desc">{selectedGift.description}</p>}

                <div className="gift-modal-sizes-box">
                  <h3 className="modal-sizes-title">サイズ / 価格</h3>
                  <div className="modal-sizes-options">
                    {selectedGift.sizes.map((size) => (
                      <label key={size.id} className={`modal-size-label ${selectedSize === size.size ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="gift-size" 
                          value={size.size} 
                          checked={selectedSize === size.size}
                          onChange={() => setSelectedSize(size.size)}
                          className="size-radio"
                        />
                        <span className="modal-size-name">{size.size}</span>
                        <span className="modal-size-price">
                          ¥{size.price.toLocaleString()} <small>(税込)</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="gift-modal-quantity">
                  <span className="quantity-label">数量</span>
                  <div className="quantity-controls">
                    <button 
                      onClick={() => setSelectedAmount(prev => Math.max(1, prev - 1))}
                      className="qty-btn"
                    >-</button>
                    <span className="qty-value">{selectedAmount}</span>
                    <button 
                      onClick={() => setSelectedAmount(prev => prev + 1)}
                      className="qty-btn"
                    >+</button>
                  </div>
                </div>

                <div className="gift-modal-actions">
                  <button 
                    className="gift-buy-btn"
                    onClick={handleAddToCart}
                    disabled={!selectedSize}
                  >
                    カートに入れる (Add to Cart)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CART BUTTON */}
      <button className="cart-floating-btn" onClick={() => setIsCartOpen(true)}>
        <img src="/icons/cart.png" alt="Cart" className="floating-cart-icon" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML = '🛒' + e.currentTarget.parentElement!.innerHTML.replace(/<img[^>]*>/, ''); }} />
        {cartItems.length > 0 && <span className="cart-badge">{cartItems.length}</span>}
      </button>

      {/* CART DRAWER */}
      <div className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>ショッピングカート</h2>
          <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>✕</button>
        </div>
        
        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty">カートに商品がありません。</div>
          ) : (
            <ul className="cart-items-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item-drawer">
                  <div className="cart-item-img-box">
                    {item.image ? (
                      <img src={`${API_URL}/image/${FOLDER_URL}/${item.image}`} alt={item.name} />
                    ) : (
                      <div className="cart-item-no-img">画像なし</div>
                    )}
                  </div>
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="cart-item-size">{item.size}</p>
                    <div className="cart-item-price-row">
                      <span className="cart-item-amount">{item.amount} x </span>
                      <span className="cart-item-price">¥{item.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <button className="cart-item-remove" onClick={() => handleRemoveFromCart(item.id)}>🗑️</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span>合計</span>
              <span className="cart-total-price">¥{cartTotal.toLocaleString()}</span>
            </div>
            <button className="cart-checkout-btn" onClick={() => navigate('/gift/order')}>
              レジに進む
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
