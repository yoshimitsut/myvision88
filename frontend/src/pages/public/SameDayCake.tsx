import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Cake } from "../../types/types";
import "./SameDayCake.css";

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

interface CartItem {
  id: string;
  cake_id: number;
  name: string;
  size: string;
  price: number;
  amount: number;
  image: string | null;
}

export default function SameDayCake() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);

  // Cart & Selection States
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem("sameday_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number>(1);

  const navigate = useNavigate();

  // Persiste o carrinho
  useEffect(() => {
    sessionStorage.setItem("sameday_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Reset seleção ao abrir modal
  useEffect(() => {
    if (selectedCake) {
      const activeSizes = selectedCake.sizes.filter((s) => s.is_active !== 0);
      setSelectedSize(activeSizes.length > 0 ? activeSizes[0].size : "");
      setSelectedAmount(1);
    }
  }, [selectedCake]);

  const handleAddToCart = () => {
    if (!selectedCake || !selectedSize) return;

    const sizeObj = selectedCake.sizes.find((s) => s.size === selectedSize);
    if (!sizeObj) return;

    const newItem: CartItem = {
      id: Date.now().toString(),
      cake_id: selectedCake.id,
      name: selectedCake.name,
      size: sizeObj.size,
      price: sizeObj.price,
      amount: selectedAmount,
      image: selectedCake.image || null,
    };

    setCartItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
    setSelectedCake(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.amount,
    0
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_URL}/api/samedaycake`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Filtra apenas bolos ativos
          const active = (data.same_day_cakes as Cake[]).filter(
            (c) => c.is_active !== 0
          );
          setCakes(active);
        }
      })
      .catch((err) => console.error("Erro ao carregar bolos do dia:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="sdc-pub-page">
      <div className="sdc-pub-blur-bg"></div>

      {/* HEADER */}
      <header className="sdc-pub-header">
        <div className="sdc-pub-header-left"></div>
        <div className="sdc-pub-header-center">
          <img
            src="/logo-myvision.png"
            alt="Myvision88"
            className="sdc-pub-logo"
            onClick={() => navigate("/")}
          />
        </div>
        <div className="sdc-pub-header-right">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="sdc-pub-ig-link"
          >
            <img src="/instagram-icon.png" alt="Instagram" />
          </a>
        </div>
      </header>

      {/* MAIN */}
      <main className="sdc-pub-main">
        {/* Hero Banner */}
        <div className="sdc-pub-hero">
          <div className="sdc-pub-hero-overlay">
            <span className="sdc-pub-hero-sub">TODAY'S</span>
            <h1 className="sdc-pub-hero-title">当日受取ケーキ</h1>
            <p className="sdc-pub-hero-desc">
              本日お持ち帰りいただける特別なケーキをご用意しました
            </p>
          </div>
        </div>

        {/* NOTA */}
        <div className="sdc-pub-note-box">
          <span>🕐</span>
          <p>当日受取専用のケーキです。在庫がなくなり次第終了となります。</p>
        </div>

        {/* GRID DE BOLOS */}
        {loading ? (
          <div className="sdc-pub-loading">
            <div className="sdc-pub-spinner"></div>
            <p>読み込み中...</p>
          </div>
        ) : cakes.length === 0 ? (
          <div className="sdc-pub-empty">
            <span>🎂</span>
            <p>本日の当日受取ケーキはございません。</p>
          </div>
        ) : (
          <div className="sdc-pub-grid">
            {cakes.map((cake) => {
              const activeSizes = cake.sizes.filter((s) => s.is_active !== 0);
              const totalStock = activeSizes.reduce(
                (acc, s) => acc + s.stock,
                0
              );
              const isOutOfStock = totalStock === 0;

              return (
                <div
                  key={cake.id}
                  className={`sdc-pub-card ${isOutOfStock ? "out-of-stock" : ""}`}
                  onClick={() => !isOutOfStock && setSelectedCake(cake)}
                >
                  <div className="sdc-pub-card-img-box">
                    {cake.image ? (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${cake.image}`}
                        alt={cake.name}
                        className="sdc-pub-card-img"
                      />
                    ) : (
                      <div className="sdc-pub-no-image">🎂</div>
                    )}
                    {isOutOfStock && (
                      <div className="sdc-pub-soldout-badge">SOLD OUT</div>
                    )}
                    {!isOutOfStock && totalStock <= 3 && (
                      <div className="sdc-pub-few-badge">残り{totalStock}個</div>
                    )}
                  </div>

                  <div className="sdc-pub-card-info">
                    <h3 className="sdc-pub-card-name">{cake.name}</h3>
                    {cake.description && (
                      <p className="sdc-pub-card-desc">{cake.description}</p>
                    )}
                    <div className="sdc-pub-card-sizes">
                      {activeSizes.map((s) => (
                        <span key={s.id} className="sdc-pub-size-chip">
                          {s.size} — ¥{s.price.toLocaleString()}
                        </span>
                      ))}
                    </div>
                    {!isOutOfStock && (
                      <button className="sdc-pub-card-btn">
                        ご予約
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="sdc-pub-footer">
        <nav className="sdc-pub-footer-nav">
          <div className="sdc-pub-footer-links">
            <a href="/">HOME</a>
            <div className="sdc-pub-footer-divider"></div>
            <a href="/order">オンライン予約</a>
            <div className="sdc-pub-footer-divider"></div>
            <a href="/gift">GIFT</a>
          </div>
        </nav>
        <div className="sdc-pub-footer-logo">
          <img src="/logo-myvision.png" alt="Myvision88" />
        </div>
      </footer>

      {/* MODAL */}
      {selectedCake && (
        <div
          className="sdc-pub-modal-overlay"
          onClick={() => setSelectedCake(null)}
        >
          <div
            className="sdc-pub-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sdc-pub-modal-close"
              onClick={() => setSelectedCake(null)}
            >
              ✕
            </button>

            <div className="sdc-pub-modal-body">
              {/* Imagem */}
              <div className="sdc-pub-modal-img-col">
                {selectedCake.image ? (
                  <img
                    src={`${API_URL}/image/${FOLDER_URL}/${selectedCake.image}`}
                    alt={selectedCake.name}
                    className="sdc-pub-modal-img"
                  />
                ) : (
                  <div className="sdc-pub-modal-no-img">🎂</div>
                )}
              </div>

              {/* Detalhes */}
              <div className="sdc-pub-modal-details">
                <h2 className="sdc-pub-modal-title">{selectedCake.name}</h2>
                {selectedCake.description && (
                  <p className="sdc-pub-modal-desc">
                    {selectedCake.description}
                  </p>
                )}

                {/* Seleção de tamanho */}
                <div className="sdc-pub-modal-sizes">
                  <h3>サイズ / 価格</h3>
                  <div className="sdc-pub-modal-sizes-options">
                    {selectedCake.sizes
                      .filter((s) => s.is_active !== 0)
                      .map((size) => (
                        <label
                          key={size.id}
                          className={`sdc-pub-size-label ${
                            selectedSize === size.size ? "selected" : ""
                          } ${size.stock === 0 ? "no-stock" : ""}`}
                        >
                          <input
                            type="radio"
                            name="sdc-size"
                            value={size.size}
                            checked={selectedSize === size.size}
                            onChange={() =>
                              size.stock > 0 && setSelectedSize(size.size)
                            }
                            disabled={size.stock === 0}
                          />
                          <span className="sdc-pub-size-name">{size.size}</span>
                          <span className="sdc-pub-size-price">
                            ¥{size.price.toLocaleString()}
                            <small> (税込)</small>
                          </span>
                          {size.stock === 0 && (
                            <span className="sdc-pub-size-soldout">
                              SOLD OUT
                            </span>
                          )}
                          {size.stock > 0 && size.stock <= 3 && (
                            <span className="sdc-pub-size-few">
                              残り{size.stock}個
                            </span>
                          )}
                        </label>
                      ))}
                  </div>
                </div>

                {/* Quantidade */}
                <div className="sdc-pub-modal-qty">
                  <span className="sdc-pub-qty-label">数量</span>
                  <div className="sdc-pub-qty-controls">
                    <button
                      className="sdc-pub-qty-btn"
                      onClick={() =>
                        setSelectedAmount((prev) => Math.max(1, prev - 1))
                      }
                    >
                      −
                    </button>
                    <span className="sdc-pub-qty-value">{selectedAmount}</span>
                    <button
                      className="sdc-pub-qty-btn"
                      onClick={() => setSelectedAmount((prev) => prev + 1)}
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* CTA */}
                <button
                  className="sdc-pub-add-btn"
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                >
                  🛒 カートに入れる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CART */}
      <button
        className="sdc-pub-cart-float"
        onClick={() => setIsCartOpen(true)}
      >
        🛒
        {cartItems.length > 0 && (
          <span className="sdc-pub-cart-badge">{cartItems.length}</span>
        )}
      </button>

      {/* CART DRAWER */}
      <div
        className={`sdc-pub-drawer-overlay ${isCartOpen ? "open" : ""}`}
        onClick={() => setIsCartOpen(false)}
      ></div>
      <div className={`sdc-pub-drawer ${isCartOpen ? "open" : ""}`}>
        <div className="sdc-pub-drawer-header">
          <h2>カート</h2>
          <button
            className="sdc-pub-drawer-close"
            onClick={() => setIsCartOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="sdc-pub-drawer-body">
          {cartItems.length === 0 ? (
            <div className="sdc-pub-drawer-empty">
              <span>🛒</span>
              <p>カートに商品がありません</p>
            </div>
          ) : (
            <ul className="sdc-pub-drawer-list">
              {cartItems.map((item) => (
                <li key={item.id} className="sdc-pub-drawer-item">
                  <div className="sdc-pub-drawer-img">
                    {item.image ? (
                      <img
                        src={`${API_URL}/image/${FOLDER_URL}/${item.image}`}
                        alt={item.name}
                      />
                    ) : (
                      <div className="sdc-pub-drawer-no-img">🎂</div>
                    )}
                  </div>
                  <div className="sdc-pub-drawer-info">
                    <h4>{item.name}</h4>
                    <p className="sdc-pub-drawer-size">{item.size}</p>
                    <div className="sdc-pub-drawer-price-row">
                      <span>{item.amount}個</span>
                      <span className="sdc-pub-drawer-price">
                        ¥{(item.price * item.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="sdc-pub-drawer-remove"
                    onClick={() => handleRemoveFromCart(item.id)}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="sdc-pub-drawer-footer">
            <div className="sdc-pub-drawer-total">
              <span>合計</span>
              <span className="sdc-pub-drawer-total-price">
                ¥{cartTotal.toLocaleString()}
              </span>
            </div>
            <button
              className="sdc-pub-checkout-btn"
              onClick={() => navigate("/sameday/order")}
            >
              ご予約へ進む →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
