import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentFormStripe } from '../../components/order/PaymentFormStripe';
import type { SameDayOrder } from '../../types/types';
import type { StripePaymentResponse, StripeError, OrderSummaryData } from '../../types/stripe';
import './SameDayPayment.css';

const API_URL = import.meta.env.VITE_API_URL;

export default function SameDayPayment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<SameDayOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<'store' | 'card'>('store');
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('予約番号が指定されていません');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/sameday-orders/public/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setError(data.error || '予約が見つかりませんでした');
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar pedido:', err);
        setError('データの読み込みに失敗しました');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleSelectStorePayment = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/sameday-orders/payment/select-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id_order })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage('店頭でのお支払いを受け付けました。ご来店時にお支払いください。');
        setOrder(prev => prev ? { ...prev, payment_method: 'store', payment_status: 'pending' } : null);
        setShowStripeForm(false);
      } else {
        alert(data.error || '処理に失敗しました');
      }
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStripeSuccess = async (paymentResult: StripePaymentResponse) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/sameday-orders/payment/confirm-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id_order,
          paymentIntentId: paymentResult.paymentIntent.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setOrder(prev => prev ? {
          ...prev,
          payment_method: 'card',
          payment_status: 'paid',
          payment_intent_id: paymentResult.paymentIntent.id
        } : null);
        setShowStripeForm(false);
        setActionSuccessMessage('クレジットカード決済が完了いたしました！店頭での受取がスムーズになります。');
      }
    } catch (e) {
      console.error('Erro ao confirmar pagamento Stripe:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="sdp-container">
        <div className="sdp-loading-box">
          <div className="sdp-spinner"></div>
          <p>予約情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="sdp-container">
        <div className="sdp-card error-card">
          <span className="sdp-icon">⚠️</span>
          <h2>ご指定の予約が見つかりませんでした</h2>
          <p>{error || 'URLが正しいかご確認ください。'}</p>
          <button className="sdp-btn-secondary" onClick={() => navigate('/')}>トップページへ戻る</button>
        </div>
      </div>
    );
  }

  // Prepara dados do Stripe se necessário
  const stripeOrderData: OrderSummaryData = {
    customer: {
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      tel: order.tel
    },
    pickupDate: order.pickup_date,
    pickupTime: order.pickup_hour,
    items: order.items.map(item => ({
      name: item.cake_name,
      size: item.size,
      amount: item.amount,
      price: item.price,
      fruit_option: '無し'
    })),
    totalAmount: order.total_amount
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${order.id_order}`;

  return (
    <div className="sdp-container">
      <div className="sdp-card">
        {/* HEADER */}
        <header className="sdp-header">
          <div className="sdp-logo-wrapper" onClick={() => navigate('/')}>
            <img src="/logo-myvision.png" alt="Myvision88" className="sdp-logo" />
          </div>
          <h1 className="sdp-title">当日受取ケーキ 予約確認</h1>
          <div className="sdp-order-badge">受付番号: #{String(order.id_order).padStart(4, '0')}</div>
        </header>

        {actionSuccessMessage && (
          <div className="sdp-alert-success">
            <span>✅</span>
            <p>{actionSuccessMessage}</p>
          </div>
        )}

        {/* STATUS PENDING */}
        {order.status === 'pending' && (
          <div className="sdp-status-box sdp-status-pending">
            <div className="sdp-status-icon">⏳</div>
            <h2>現在、店舗にて在庫確認中です</h2>
            <p>
              「当日受取ケーキ」は数量限定のため、現在店舗スタッフが実物の在庫状況を確認しております。<br />
              確認が完了次第、ご登録のメールアドレス（<strong>{order.email}</strong>）宛てにご連絡いたします。
            </p>
          </div>
        )}

        {/* STATUS REJECTED */}
        {order.status === 'rejected' && (
          <div className="sdp-status-box sdp-status-rejected">
            <div className="sdp-status-icon">⚠️</div>
            <h2>大変申し訳ございません。商品は完売いたしました</h2>
            <p>
              本日ご希望いただいたケーキは店頭にて既に完売・在庫切れとなったため、ご用意することができませんでした。<br />
              またのご利用を心よりお待ちしております。
            </p>
          </div>
        )}

        {/* STATUS CONFIRMED / COMPLETED */}
        {(order.status === 'confirmed' || order.status === 'completed') && (
          <>
            <div className="sdp-status-box sdp-status-confirmed">
              <div className="sdp-status-icon">🎉</div>
              <h2>ご予約が確定いたしました！</h2>
              <p>
                ケーキの在庫が確保されました。<br />
                受取予定時間（<strong>本日 {order.pickup_hour}</strong>）にご来店ください。
              </p>
            </div>

            {/* QR CODE DE RETIRADA */}
            <div className="sdp-qr-section">
              <h3>受取用 QRコード</h3>
              <p className="sdp-qr-note">店舗での受取時にこちらの画面をご提示ください。</p>
              <img src={qrUrl} alt="QR Code de Retirada" className="sdp-qr-img" />
            </div>

            {/* SEÇÃO DE PAGAMENTO */}
            <div className="sdp-payment-section">
              <h3 className="sdp-section-title">💳 お支払い状況</h3>

              {order.payment_status === 'paid' ? (
                <div className="sdp-paid-badge">
                  <span className="sdp-paid-icon">✅</span>
                  <div>
                    <strong>事前オンライン決済完了済み (クレジットカード)</strong>
                    <p>受取時にお支払いの必要はございません。QRコードをご提示ください。</p>
                  </div>
                </div>
              ) : (
                <div className="sdp-payment-options-box">
                  <p className="sdp-payment-intro">
                    お支払い方法を選択してください。「店頭支払い」または「事前クレジットカード決済」がご利用いただけます。
                  </p>

                  {!showStripeForm ? (
                    <div className="sdp-method-choices">
                      <div
                        className={`sdp-method-card ${selectedMethod === 'store' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('store')}
                      >
                        <div className="sdp-method-header">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedMethod === 'store'}
                            onChange={() => setSelectedMethod('store')}
                          />
                          <span className="sdp-method-name">🏪 店頭でお支払い</span>
                        </div>
                        <p className="sdp-method-desc">商品お受取時に店頭で現金またはカードでお支払いいただきます。</p>
                        {selectedMethod === 'store' && (
                          <button
                            className="sdp-btn-action"
                            onClick={handleSelectStorePayment}
                            disabled={isUpdating}
                          >
                            {isUpdating ? '処理中...' : '店頭支払いで確定する'}
                          </button>
                        )}
                      </div>

                      <div
                        className={`sdp-method-card ${selectedMethod === 'card' ? 'active' : ''}`}
                        onClick={() => setSelectedMethod('card')}
                      >
                        <div className="sdp-method-header">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedMethod === 'card'}
                            onChange={() => setSelectedMethod('card')}
                          />
                          <span className="sdp-method-name">💳 クレジットカードで事前決済</span>
                        </div>
                        <p className="sdp-method-desc">事前にオンライン決済を完了し、店頭でのお受け取りをスムーズにします。</p>
                        {selectedMethod === 'card' && (
                          <button
                            className="sdp-btn-action sdp-btn-stripe"
                            onClick={() => setShowStripeForm(true)}
                          >
                            カード決済へ進む (¥{order.total_amount.toLocaleString()}) →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="sdp-stripe-container">
                      <div style={{ marginBottom: '15px' }}>
                        <button
                          type="button"
                          className="sdp-btn-secondary"
                          onClick={() => setShowStripeForm(false)}
                          style={{ fontSize: '13px', padding: '6px 14px' }}
                        >
                          ← お支払い選択に戻る
                        </button>
                      </div>
                      <PaymentFormStripe
                        amount={order.total_amount}
                        currency="jpy"
                        orderData={stripeOrderData}
                        onPaymentSuccess={handleStripeSuccess}
                        onPaymentError={(err: StripeError) => alert(err.message || '決済エラーが発生しました')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* DETALHES DO PEDIDO */}
        <div className="sdp-details-box">
          <h3 className="sdp-section-title">📋 注文詳細</h3>
          <div className="sdp-info-grid">
            <span className="sdp-label">お名前:</span>
            <span className="sdp-val">{order.first_name} {order.last_name} 様</span>

            <span className="sdp-label">電話番号:</span>
            <span className="sdp-val">{order.tel}</span>

            <span className="sdp-label">メール:</span>
            <span className="sdp-val">{order.email}</span>

            <span className="sdp-label">受取希望日:</span>
            <span className="sdp-val">{order.pickup_date}</span>

            <span className="sdp-label">受取時間:</span>
            <strong className="sdp-val sdp-highlight">{order.pickup_hour}</strong>
          </div>

          <h4 className="sdp-items-title">ご注文商品</h4>
          <ul className="sdp-items-list">
            {order.items.map((item, idx) => (
              <li key={idx} className="sdp-item-row">
                <div className="sdp-item-info">
                  <span className="sdp-item-name">{item.cake_name}</span>
                  <span className="sdp-item-size">{item.size}</span>
                </div>
                <div className="sdp-item-meta">
                  <span>{item.amount}個</span>
                  <span className="sdp-item-price">¥{(item.price * item.amount).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="sdp-total-row">
            <span>合計金額 (税込):</span>
            <strong className="sdp-total-amount">¥{order.total_amount.toLocaleString()}</strong>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sdp-footer">
          <button className="sdp-btn-secondary" onClick={() => navigate('/')}>
            トップページへ戻る
          </button>
        </div>
      </div>
    </div>
  );
}
