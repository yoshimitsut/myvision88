import { useEffect, useState, useMemo, useRef } from 'react';
import type { SameDayOrder, SameDayOrderStatus } from '../../types/types';
import './ListSameDayOrder.css';

const API_URL = import.meta.env.VITE_API_URL;
const FOLDER_URL = import.meta.env.VITE_FOLDER_URL;

interface ListSameDayOrderProps {
  onPendingCountChange?: (count: number) => void;
}

export default function ListSameDayOrder({ onPendingCountChange }: ListSameDayOrderProps) {
  const [orders, setOrders] = useState<SameDayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed' | 'rejected' | 'all'>('pending');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSearch = useRef<number | null>(null);

  // Carregar pedidos do backend
  useEffect(() => {
    if (handleSearch.current) {
      clearTimeout(handleSearch.current);
    }

    handleSearch.current = window.setTimeout(() => {
      const searchUrl = search
        ? `${API_URL}/api/sameday-orders/list?search=${encodeURIComponent(search)}`
        : `${API_URL}/api/sameday-orders/list`;

      const token = sessionStorage.getItem('store_token');
      fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then((res) => {
          if (res.status === 401) {
            window.location.href = '/store-login';
            throw new Error('Não autorizado');
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success) {
            const list = data.orders || [];
            setOrders(list);
            const pendingCount = list.filter((o: SameDayOrder) => o.status === 'pending').length;
            if (onPendingCountChange) {
              onPendingCountChange(pendingCount);
            }
          } else {
            setOrders([]);
          }
        })
        .catch((err) => console.error('Erro ao buscar pedidos same day:', err))
        .finally(() => setLoading(false));
    }, 400);

    return () => {
      if (handleSearch.current) {
        clearTimeout(handleSearch.current);
      }
    };
  }, [search, refreshKey, onPendingCountChange]);

  // Contadores
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const confirmedOrders = useMemo(() => orders.filter(o => o.status === 'confirmed'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  const rejectedOrders = useMemo(() => orders.filter(o => o.status === 'rejected' || o.status === 'cancelled'), [orders]);

  // Filtragem por aba
  const displayedOrders = useMemo(() => {
    switch (activeTab) {
      case 'pending': return pendingOrders;
      case 'confirmed': return confirmedOrders;
      case 'completed': return completedOrders;
      case 'rejected': return rejectedOrders;
      case 'all': return orders;
      default: return orders;
    }
  }, [activeTab, pendingOrders, confirmedOrders, completedOrders, rejectedOrders, orders]);

  // 1️⃣ Ação: Confirmar Pedido (Disponível na loja)
  const handleConfirmOrder = async (order: SameDayOrder) => {
    const confirmed = window.confirm(
      `【予約確定】受付番号 #${String(order.id_order).padStart(4, '0')} (${order.first_name} ${order.last_name}様)\n\n` +
      `店舗のケーキ在庫を確保し、予約確定メール（決済リンク付き）をお客様に送信しますか？`
    );
    if (!confirmed) return;

    setIsProcessing(order.id_order);
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-orders/${order.id_order}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 予約を確定し、お客様に確定メールを送信しました！');
        setRefreshKey(prev => prev + 1);
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // 2️⃣ Ação: Recusar Pedido (Bolo Indisponível / Já vendido)
  const handleRejectOrder = async (order: SameDayOrder) => {
    const confirmed = window.confirm(
      `⚠️【在庫切れ・キャンセル】受付番号 #${String(order.id_order).padStart(4, '0')} (${order.first_name} ${order.last_name}様)\n\n` +
      `在庫なしとして注文をキャンセルし、お客様にお詫びメールを送信しますか？`
    );
    if (!confirmed) return;

    setIsProcessing(order.id_order);
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-orders/${order.id_order}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert('在庫なしとしてキャンセルし、お客様に通知メールを送信しました。');
        setRefreshKey(prev => prev + 1);
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // 3️⃣ Ação: Atualizar status (Concluir entrega / Cancelar)
  const handleUpdateStatus = async (orderId: number, status: SameDayOrderStatus, messageAlert: string) => {
    const confirmed = window.confirm(messageAlert);
    if (!confirmed) return;

    setIsProcessing(orderId);
    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${API_URL}/api/sameday-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setRefreshKey(prev => prev + 1);
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="lsdo-container">
      {/* BARRA DE PESQUISA E REFRESH */}
      <div className="lsdo-controls">
        <div className="lsdo-search-box">
          <span className="lsdo-search-icon">🔍</span>
          <input
            type="text"
            placeholder="お名前、電話番号、受付番号で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lsdo-search-input"
          />
          {search && (
            <button className="lsdo-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <button className="lsdo-refresh-btn" onClick={() => setRefreshKey(k => k + 1)}>
          🔄 更新
        </button>
      </div>

      {/* ABAS DE STATUS */}
      <div className="lsdo-tabs">
        <button
          type="button"
          className={`lsdo-tab ${activeTab === 'pending' ? 'active tab-pending' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ 確認待ち
          {pendingOrders.length > 0 && (
            <span className="lsdo-tab-badge badge-pending">{pendingOrders.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`lsdo-tab ${activeTab === 'confirmed' ? 'active tab-confirmed' : ''}`}
          onClick={() => setActiveTab('confirmed')}
        >
          ✅ 予約確定
          <span className="lsdo-tab-count">({confirmedOrders.length})</span>
        </button>
        <button
          type="button"
          className={`lsdo-tab ${activeTab === 'completed' ? 'active tab-completed' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          📦 お渡し完了
          <span className="lsdo-tab-count">({completedOrders.length})</span>
        </button>
        <button
          type="button"
          className={`lsdo-tab ${activeTab === 'rejected' ? 'active tab-rejected' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ 在庫なし・取消
          <span className="lsdo-tab-count">({rejectedOrders.length})</span>
        </button>
        <button
          type="button"
          className={`lsdo-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          すべて ({orders.length})
        </button>
      </div>

      {/* LISTA DE PEDIDOS */}
      {loading ? (
        <div className="lsdo-loading">
          <div className="lsdo-spinner"></div>
          <p>当日受取注文を読み込み中...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="lsdo-empty">
          <span className="lsdo-empty-icon">🎂</span>
          <p>該当する当日受取ケーキの予約はありません。</p>
        </div>
      ) : (
        <div className="lsdo-grid">
          {displayedOrders.map((order) => {
            const isOrderProcessing = isProcessing === order.id_order;

            return (
              <div
                key={order.id_order}
                className={`lsdo-card card-status-${order.status} ${isOrderProcessing ? 'processing' : ''}`}
              >
                {/* CABEÇALHO DO CARD */}
                <div className="lsdo-card-header">
                  <div className="lsdo-card-number">
                    <span className="lsdo-order-label">当日予約</span>
                    <strong>#{String(order.id_order).padStart(4, '0')}</strong>
                  </div>

                  <div className="lsdo-badges">
                    {/* Status Badge */}
                    {order.status === 'pending' && (
                      <span className="lsdo-status-pill status-pending">⏳ 確認待ち</span>
                    )}
                    {order.status === 'confirmed' && (
                      <span className="lsdo-status-pill status-confirmed">✅ 予約確定</span>
                    )}
                    {order.status === 'completed' && (
                      <span className="lsdo-status-pill status-completed">📦 お渡し完了</span>
                    )}
                    {order.status === 'rejected' && (
                      <span className="lsdo-status-pill status-rejected">❌ 在庫なし</span>
                    )}
                    {order.status === 'cancelled' && (
                      <span className="lsdo-status-pill status-cancelled">🗑️ キャンセル</span>
                    )}

                    {/* Payment Badge */}
                    {order.payment_status === 'paid' ? (
                      <span className="lsdo-pay-pill pay-paid">💳 オンライン決済済</span>
                    ) : (
                      <span className="lsdo-pay-pill pay-store">🏪 店頭支払い (未払)</span>
                    )}
                  </div>
                </div>

                {/* CORPO DO CARD */}
                <div className="lsdo-card-body">
                  {/* Informações do Cliente */}
                  <div className="lsdo-customer-info">
                    <div className="lsdo-customer-name">
                      👤 <strong>{order.first_name} {order.last_name}</strong> 様
                    </div>
                    <div className="lsdo-customer-details">
                      <span>📞 <a href={`tel:${order.tel}`}>{order.tel}</a></span>
                      <span>✉️ {order.email}</span>
                      <span>⏰ 受取時間: <strong className="lsdo-pickup-time">{order.pickup_hour}</strong></span>
                      <span className="lsdo-date-sub">({order.pickup_date})</span>
                    </div>
                    {order.message && (
                      <div className="lsdo-customer-msg">
                        💬 備考: {order.message}
                      </div>
                    )}
                  </div>

                  {/* Itens do Pedido */}
                  <div className="lsdo-items-box">
                    <div className="lsdo-items-heading">ご希望のケーキ</div>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="lsdo-item-row">
                        {item.image && (
                          <img
                            src={`${API_URL}/image/${FOLDER_URL}/${item.image}`}
                            alt={item.cake_name}
                            className="lsdo-item-img"
                          />
                        )}
                        <div className="lsdo-item-name-box">
                          <span className="lsdo-item-name">{item.cake_name}</span>
                          <span className="lsdo-item-size-badge">{item.size}</span>
                        </div>
                        <div className="lsdo-item-price-box">
                          <span>{item.amount}個</span>
                          <strong>¥{(item.price * item.amount).toLocaleString()}</strong>
                        </div>
                      </div>
                    ))}
                    <div className="lsdo-total-row">
                      <span>合計金額:</span>
                      <strong>¥{order.total_amount.toLocaleString()} <small>(税込)</small></strong>
                    </div>
                  </div>
                </div>

                {/* AÇÕES ADMINISTRATIVAS */}
                <div className="lsdo-card-actions">
                  {order.status === 'pending' && (
                    <div className="lsdo-action-group-pending">
                      <button
                        type="button"
                        className="lsdo-btn lsdo-btn-confirm"
                        onClick={() => handleConfirmOrder(order)}
                        disabled={isOrderProcessing}
                      >
                        {isOrderProcessing ? '処理中...' : '✅ 予約確定 (在庫あり)'}
                      </button>
                      <button
                        type="button"
                        className="lsdo-btn lsdo-btn-reject"
                        onClick={() => handleRejectOrder(order)}
                        disabled={isOrderProcessing}
                      >
                        {isOrderProcessing ? '処理中...' : '❌ 在庫なし (完売)'}
                      </button>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="lsdo-action-group-confirmed">
                      <button
                        type="button"
                        className="lsdo-btn lsdo-btn-complete"
                        onClick={() => handleUpdateStatus(
                          order.id_order,
                          'completed',
                          `【受渡完了】受付番号 #${String(order.id_order).padStart(4, '0')} の受渡を完了にしますか？`
                        )}
                        disabled={isOrderProcessing}
                      >
                        📦 お渡し完了
                      </button>
                      <button
                        type="button"
                        className="lsdo-btn lsdo-btn-cancel"
                        onClick={() => handleUpdateStatus(
                          order.id_order,
                          'cancelled',
                          `【キャンセル】受付番号 #${String(order.id_order).padStart(4, '0')} をキャンセルし、在庫を戻しますか？`
                        )}
                        disabled={isOrderProcessing}
                      >
                        🗑️ 取消
                      </button>
                    </div>
                  )}

                  {order.status === 'completed' && (
                    <div className="lsdo-completed-msg">
                      <span>✅ お渡し完了済み</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
