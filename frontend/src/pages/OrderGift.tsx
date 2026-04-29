import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/forms/Input';
import { PaymentFormStripe } from '../components/PaymentFormStripe';
import type { StripePaymentResponse, StripeError, OrderSummaryData } from '../types/stripe';
import './OrderGift.css';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

// ==================== TIPOS ====================
interface CartItem {
  id: string;
  gift_id: number;
  name: string;
  size: string;
  price: number;
  amount: number;
  image: string | null;
}

interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  tel: string;
  message: string;
}

interface ShippingAddress {
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function OrderGift() {
  const navigate = useNavigate();

  // Cart items from sessionStorage
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer form
  const [formData, setFormData] = useState<CustomerForm>({
    firstName: '',
    lastName: '',
    email: '',
    tel: '',
    message: ''
  });

  // Delivery method
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'shipping'>('pickup');

  // Shipping address
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: ''
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'store'>('card');
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment'>('form');
  const [paymentKey, setPaymentKey] = useState(0);

  // Load cart from sessionStorage
  useEffect(() => {
    window.scrollTo(0, 0);
    const saved = sessionStorage.getItem('gift_cart');
    if (saved) {
      const items = JSON.parse(saved) as CartItem[];
      if (items.length === 0) {
        navigate('/gift');
      } else {
        setCartItems(items);
      }
    } else {
      navigate('/gift');
    }
  }, [navigate]);

  // Calculate total
  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.amount), 0);

  // ==================== HANDLERS ====================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [id]: value }));
  };

  const toKatakana = (str: string): string => {
    return str.replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  };

  const handleKatakanaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: toKatakana(value) }));
  };

  const removeCartItem = (id: string) => {
    const updated = cartItems.filter(item => item.id !== id);
    setCartItems(updated);
    sessionStorage.setItem('gift_cart', JSON.stringify(updated));
    if (updated.length === 0) {
      navigate('/gift');
    }
  };

  const updateItemAmount = (id: string, newAmount: number) => {
    if (newAmount < 1) return;
    const updated = cartItems.map(item =>
      item.id === id ? { ...item, amount: newAmount } : item
    );
    setCartItems(updated);
    sessionStorage.setItem('gift_cart', JSON.stringify(updated));
  };

  // ==================== SUBMIT ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Validate delivery address if shipping
    if (deliveryMethod === 'shipping') {
      if (!shippingAddress.postalCode || !shippingAddress.prefecture || 
          !shippingAddress.city || !shippingAddress.address1) {
        alert('配送先住所を入力してください。');
        setIsSubmitting(false);
        return;
      }
    }

    if (cartItems.length === 0) {
      alert('カートに商品がありません。');
      setIsSubmitting(false);
      return;
    }

    if (paymentMethod === 'store') {
      await handleStorePayment();
    } else {
      setPaymentStep('payment');
      setIsSubmitting(false);
    }
  };

  const handleStorePayment = async () => {
    // TODO: Backend integration
    try {
      alert('ご注文ありがとうございます！\n店頭でのお支払いとなります。');
      sessionStorage.removeItem('gift_cart');
      navigate('/gift', {
        state: { orderSuccess: true }
      });
    } catch (error) {
      alert('エラーが発生しました。');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (_paymentResult: StripePaymentResponse) => {
    // TODO: Backend integration
    try {
      alert('お支払いが完了しました！ありがとうございます。');
      sessionStorage.removeItem('gift_cart');
      navigate('/gift', {
        state: { orderSuccess: true, paymentSuccess: true }
      });
    } catch (error) {
      alert('エラーが発生しました。');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (error: StripeError) => {
    console.error('Payment error:', error);
    alert(`支払いエラー: ${error.message}`);
    setPaymentStep('form');
  };

  const handleBackToForm = () => {
    setPaymentStep('form');
    setPaymentKey(prev => prev + 1);
  };

  // Build order summary for Stripe component
  const orderSummaryData: OrderSummaryData = {
    items: cartItems.map(item => ({
      name: item.name,
      size: item.size,
      amount: item.amount,
      price: item.price,
      fruit_option: '無し' as const,
    })),
    customer: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      tel: formData.tel,
    },
    pickupDate: deliveryMethod === 'pickup' ? '店舗受取' : '配送',
    pickupTime: '',
    totalAmount: totalAmount,
    message: formData.message,
  };

  // ==================== PREFECTURES ====================
  const PREFECTURES = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
    '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
    '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
    '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
  ];

  // ==================== RENDER ====================
  if (cartItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="order-gift-main">
      <div className="order-gift-container">
        <h2 className="order-gift-title">ギフト注文</h2>
        <h2 className="order-gift-title">ご注文フォーム</h2>

        {paymentStep === 'form' ? (
          <form className="order-gift-form" onSubmit={handleSubmit}>
            
            {/* ==================== 商品一覧 ==================== */}
            <div className="og-section">
              <label className="og-section-title">ご注文内容</label>
              <div className="og-cart-items">
                {cartItems.map(item => (
                  <div key={item.id} className="og-cart-item">
                    <div className="og-item-image">
                      {item.image ? (
                        <img 
                          src={`${API_URL}/image/${FOLDER_URL}/${item.image}`} 
                          alt={item.name} 
                        />
                      ) : (
                        <div className="og-no-image">画像なし</div>
                      )}
                    </div>
                    <div className="og-item-details">
                      <h4 className="og-item-name">{item.name}</h4>
                      <p className="og-item-size">{item.size}</p>
                      <p className="og-item-price">¥{item.price.toLocaleString()}</p>
                      <div className="og-item-quantity">
                        <button 
                          type="button"
                          className="og-qty-btn" 
                          onClick={() => updateItemAmount(item.id, item.amount - 1)}
                          disabled={item.amount <= 1}
                        >
                          −
                        </button>
                        <span className="og-qty-value">{item.amount}</span>
                        <button 
                          type="button"
                          className="og-qty-btn" 
                          onClick={() => updateItemAmount(item.id, item.amount + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="og-item-subtotal">
                      <span className="og-subtotal-price">
                        ¥{(item.price * item.amount).toLocaleString()}
                      </span>
                      <button 
                        type="button" 
                        className="og-remove-btn"
                        onClick={() => removeCartItem(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="og-cart-total">
                <span>合計</span>
                <span className="og-total-price">¥{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* ==================== お客様情報 ==================== */}
            <div className="og-section">
              <label className="og-section-title">お客様情報</label>
              <div className="og-form-fields">
                <Input
                  id="firstName"
                  label="*姓(カタカナ)"
                  placeholder="ヒガ"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  lang="ja"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
                <Input
                  id="lastName"
                  label="*名(カタカナ)"
                  placeholder="タロウ"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={handleKatakanaBlur}
                  required
                />
                <Input
                  id="email"
                  label="*メールアドレス"
                  type="email"
                  placeholder="必須"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  id="tel"
                  label="*お電話番号"
                  type="tel"
                  placeholder="ハイフン不要"
                  value={formData.tel}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* ==================== 配送方法 ==================== */}
            <div className="og-section">
              <label className="og-section-title">配送方法</label>
              <div className="og-delivery-options">
                <label className={`og-delivery-option ${deliveryMethod === 'pickup' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')}
                  />
                  <span className="og-delivery-icon">🏪</span>
                  <div className="og-delivery-text">
                    <span className="og-delivery-label">店舗受取</span>
                    <span className="og-delivery-desc">店舗にてお受け取り</span>
                  </div>
                </label>

                <label className={`og-delivery-option ${deliveryMethod === 'shipping' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="shipping"
                    checked={deliveryMethod === 'shipping'}
                    onChange={() => setDeliveryMethod('shipping')}
                  />
                  <span className="og-delivery-icon">🚚</span>
                  <div className="og-delivery-text">
                    <span className="og-delivery-label">配送</span>
                    <span className="og-delivery-desc">ご指定の住所にお届け</span>
                  </div>
                </label>
              </div>

              {/* 配送先住所 */}
              {deliveryMethod === 'shipping' && (
                <div className="og-shipping-address">
                  <h4 className="og-address-title">配送先住所</h4>
                  <div className="og-address-fields">
                    <div className="og-address-row">
                      <div className="og-address-field">
                        <label htmlFor="postalCode">*郵便番号</label>
                        <input
                          type="text"
                          id="postalCode"
                          placeholder="例: 123-4567"
                          value={shippingAddress.postalCode}
                          onChange={handleAddressChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="og-address-row">
                      <div className="og-address-field">
                        <label htmlFor="prefecture">*都道府県</label>
                        <select
                          id="prefecture"
                          value={shippingAddress.prefecture}
                          onChange={handleAddressChange}
                          required
                        >
                          <option value="">選択してください</option>
                          {PREFECTURES.map(pref => (
                            <option key={pref} value={pref}>{pref}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="og-address-row">
                      <div className="og-address-field">
                        <label htmlFor="city">*市区町村</label>
                        <input
                          type="text"
                          id="city"
                          placeholder="例: 渋谷区"
                          value={shippingAddress.city}
                          onChange={handleAddressChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="og-address-row">
                      <div className="og-address-field">
                        <label htmlFor="address1">*番地</label>
                        <input
                          type="text"
                          id="address1"
                          placeholder="例: 1-2-3"
                          value={shippingAddress.address1}
                          onChange={handleAddressChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="og-address-row">
                      <div className="og-address-field">
                        <label htmlFor="address2">建物名・部屋番号</label>
                        <input
                          type="text"
                          id="address2"
                          placeholder="例: マンション名 101号室"
                          value={shippingAddress.address2}
                          onChange={handleAddressChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==================== 備考 ==================== */}
            <div className="og-section">
              <div className="og-message-field">
                <label htmlFor="message">備考・ご要望</label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="ご要望がある場合のみご記入ください。"
                  rows={3}
                />
              </div>
            </div>

            {/* ==================== 注文サマリー ==================== */}
            <div className="og-order-summary">
              <h3>ご注文確認</h3>
              {cartItems.map((item, index) => (
                <div key={index} className="og-summary-item">
                  <span>{item.name} ({item.size}) x{item.amount}</span>
                  <span>¥{(item.price * item.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="og-summary-delivery">
                <span>配送方法</span>
                <span>{deliveryMethod === 'pickup' ? '店舗受取' : '配送'}</span>
              </div>
              <div className="og-summary-total">
                <strong>合計:</strong>
                <strong>¥{totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            {/* ==================== 支払い方法 ==================== */}
            <div className="og-payment-selector">
              <h3>お支払い方法を選択</h3>
              <div className="og-payment-options">
                <label className={`og-payment-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <span className="og-pay-icon">💳</span>
                  <span className="og-pay-label">クレジットカード</span>
                  <span className="og-pay-desc">オンライン決済</span>
                </label>

                <label className={`og-payment-option ${paymentMethod === 'store' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="store"
                    checked={paymentMethod === 'store'}
                    onChange={() => setPaymentMethod('store')}
                  />
                  <span className="og-pay-icon">
                    <img src="/icons/store.png" alt="store icon" className="og-store-icon" />
                  </span>
                  <span className="og-pay-label">店舗支払い</span>
                  <span className="og-pay-desc">店頭でお支払い</span>
                </label>
              </div>
            </div>

            {/* ==================== 送信ボタン ==================== */}
            <div className="og-submit-section">
              <button
                type="submit"
                className="og-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? '処理中...' 
                  : `お支払いに進む (¥${totalAmount.toLocaleString()})`
                }
              </button>
              <button
                type="button"
                className="og-back-btn"
                onClick={() => navigate('/gift')}
                disabled={isSubmitting}
              >
                ← ギフトに戻る
              </button>
            </div>
          </form>
        ) : (
          /* ==================== PAYMENT STEP ==================== */
          <div className="og-payment-step">
            <button onClick={handleBackToForm} className="og-back-link" type="button">
              ← ご注文フォームに戻る
            </button>

            <h3>お支払い情報</h3>
            <p className="og-payment-amount">
              お支払い金額: <strong>¥{totalAmount.toLocaleString()}</strong>
            </p>

            <PaymentFormStripe
              key={paymentKey}
              amount={totalAmount}
              currency="jpy"
              orderData={orderSummaryData}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onReady={() => console.log('Stripe pronto')}
            />
          </div>
        )}
      </div>
    </div>
  );
}