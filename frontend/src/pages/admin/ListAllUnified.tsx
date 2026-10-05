import { useEffect, useState, useMemo } from 'react';
import Select from "react-select";
import type { SingleValue } from 'react-select';

import type { Order, GiftOrder, StatusOption } from '../../types/types';
import { STATUS_OPTIONS } from '../../types/types';
import { formatDateJP } from "../../utils/formatDateJP";

type UnifiedOrder = {
  id: string; // cake-123 or gift-456
  type: 'cake' | 'gift';
  order: Order | GiftOrder;
  sortTime: number;
};

export default function ListAllUnified() {
  const [cakeOrders, setCakeOrders] = useState<Order[]>([]);
  const [giftOrders, setGiftOrders] = useState<GiftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("すべて");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  
  const statusOptions = STATUS_OPTIONS;
  const filterOptions = [
    { value: "すべて", label: "すべて" },
    ...statusOptions
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const token = sessionStorage.getItem('store_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const [resCakes, resGifts] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/list`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/gift-orders/list`, { headers })
        ]);

        const dataCakes = await resCakes.json();
        const dataGifts = await resGifts.json();

        setCakeOrders(dataCakes.orders || (Array.isArray(dataCakes) ? dataCakes : []));
        setGiftOrders(dataGifts.orders || []);
      } catch (err) {
        console.error("Erro ao carregar pedidos unificados:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const unifiedOrders: UnifiedOrder[] = useMemo(() => {
    const arr: UnifiedOrder[] = [];

    cakeOrders.forEach(o => {
      const dt = new Date(o.date).getTime();
      arr.push({
        id: `cake-${o.id_order}`,
        type: 'cake',
        order: o,
        sortTime: dt
      });
    });

    giftOrders.forEach(o => {
      const dt = new Date(o.date_order).getTime();
      arr.push({
        id: `gift-${o.id_order}`,
        type: 'gift',
        order: o,
        sortTime: dt
      });
    });

    return arr.sort((a, b) => b.sortTime - a.sortTime);
  }, [cakeOrders, giftOrders]);

  async function handleStatusChange(uOrder: UnifiedOrder, newStatus: "a"|"b"|"c"|"d"|"f"|"e") {
    const isCake = uOrder.type === 'cake';
    const originalOrder = uOrder.order;
    const id = originalOrder.id_order;

    const confirmed = window.confirm(`ステータスを変更しますか？\n受付番号: ${String(id).padStart(4, "0")} (${isCake ? 'ケーキ' : 'ギフト'})`);
    if (!confirmed) return;

    setIsUpdating(true);
    setUpdatingOrderId(uOrder.id);

    try {
      const token = sessionStorage.getItem('store_token');
      const endpoint = isCake 
        ? `${import.meta.env.VITE_API_URL}/api/reservar/${id}` 
        : `${import.meta.env.VITE_API_URL}/api/gift-orders/${id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "エラーが発生しました");
      }

      if (isCake) {
        setCakeOrders(prev => prev.map(o => o.id_order === id ? { ...o, status: newStatus } : o));
      } else {
        setGiftOrders(prev => prev.map(o => o.id_order === id ? { ...o, status: newStatus } : o));
      }
      alert("✅ 更新しました");

    } catch (err) {
      console.error(err);
      alert("❌ 更新中にエラーが発生しました");
    } finally {
      setIsUpdating(false);
      setUpdatingOrderId(null);
    }
  }

  const selectStyles = {
    control: (provided: any, state: any) => {
      const selected = state.selectProps.value as StatusOption | null;
      let bgColor = "#000", fontColor = "#fff";
      if (selected) {
        switch (selected.value) {
          case "a": bgColor = "#C40000"; fontColor = "#FFF"; break;
          case "b": bgColor = "#000DBD"; fontColor = "#FFF"; break;
          case "c": bgColor = "#287300"; fontColor = "#FFF"; break;
          case "d": bgColor = "#6B6B6B"; fontColor = "#FFF"; break;
          case "f": bgColor = "#7332a8"; fontColor = "#fff"; break;
          case "e": bgColor = "#000"; fontColor = "#fff"; break;
          default: bgColor = "#fff"; fontColor = "#000";
        }
      }
      return { ...provided, borderRadius: 8, minHeight: 36, backgroundColor: bgColor, color: fontColor };
    },
    singleValue: (provided: any) => ({ ...provided, color: "white" }),
    option: (provided: any, state: any) => {
      let bgColor = "#000", fontColor = "#FFF";
      switch (state.data.value) {
        case "a": bgColor = state.isFocused ? "#C40000" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "b": bgColor = state.isFocused ? "#000DBD" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "c": bgColor = state.isFocused ? "#287300" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "d": bgColor = state.isFocused ? "#6B6B6B" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "f": bgColor = state.isFocused ? "#7332a8" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "e": bgColor = state.isFocused ? "#000" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
      }
      return { ...provided, backgroundColor: bgColor, color: fontColor };
    }
  };

  const filteredOrders = unifiedOrders.filter(u => statusFilter === "すべて" || u.order.status === statusFilter);

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#333' }}>📋 すべての注文 (ケーキ & ギフト)</h3>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>ステータス:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : filteredOrders.length === 0 ? (
        <p>注文が見つかりません。</p>
      ) : (
        <div className="table-card-wrapper" style={{ overflowX: 'auto' }}>
          <table className="modern-admin-table" style={{ width: '100%', minWidth: '1200px' }}>
            <thead>
              <tr>
                <th>種類</th>
                <th>日時 / 受取方法</th>
                <th>お名前 / 受付番号</th>
                <th style={{ width: '160px' }}>ステータス</th>
                <th>ご注文内容</th>
                <th>フルーツ盛り</th>
                <th>メッセージプレート</th>
                <th>金額</th>
                <th>その他メッセージ</th>
                <th>連絡先</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(uOrder => {
                const isCake = uOrder.type === 'cake';
                const cakeOrder = uOrder.order as Order;
                const giftOrder = uOrder.order as GiftOrder;

                return (
                  <tr key={uOrder.id} className="order-row-card" style={{ borderLeft: isCake ? '4px solid #fdd111' : '4px solid #007bff' }}>
                    <td style={{ textAlign: 'center', fontSize: '1.5rem' }}>
                      {isCake ? '🎂' : '🎁'}
                    </td>
                    <td>
                      <div className="order-date-col">
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {formatDateJP(isCake ? cakeOrder.date : giftOrder.date_order)}
                        </span>
                        {isCake && <span style={{ fontSize: '12px', color: '#666' }}>{cakeOrder.pickupHour}</span>}
                        
                        {!isCake && (
                          <div style={{ marginTop: '8px', fontSize: '12px' }}>
                            {giftOrder.delivery_method === 'pickup' ? (
                              <span style={{ color: '#287300', fontWeight: 'bold', border: '1px solid #287300', padding: '2px 4px', borderRadius: '4px' }}>店頭受取</span>
                            ) : (
                              <span style={{ color: '#000DBD', fontWeight: 'bold', border: '1px solid #000DBD', padding: '2px 4px', borderRadius: '4px' }}>配送</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '13px', color: '#222' }}>{uOrder.order.first_name} {uOrder.order.last_name}</strong>
                        <span className="order-id-badge" style={{ marginTop: '4px', display: 'inline-block', width: 'fit-content' }}>
                          #{String(uOrder.order.id_order).padStart(4, "0")}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Select<StatusOption, false>
                        options={statusOptions}
                        value={statusOptions.find((opt) => opt.value === uOrder.order.status)}
                        onChange={(selected: SingleValue<StatusOption>) => {
                          if (selected) handleStatusChange(uOrder, selected.value);
                        }}
                        styles={selectStyles}
                        isSearchable={false}
                        isDisabled={isUpdating}
                        isLoading={isUpdating && updatingOrderId === uOrder.id}
                      />
                    </td>
                    <td>
                      <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                        {isCake ? (
                          cakeOrder.cakes?.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>
                              <strong>{c.name}</strong> ({c.size}) - {c.amount}個
                              {c.candle_option && <div style={{ fontSize: '11px', color: '#666' }}>🕯️ {c.candle_option}</div>}
                            </li>
                          ))
                        ) : (
                          giftOrder.items?.map((item, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>
                              <strong>{item.name}</strong> ({item.size}) - {item.amount}個
                            </li>
                          ))
                        )}
                      </ul>
                    </td>
                    <td>
                      {isCake ? (
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
                          {cakeOrder.cakes?.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{c.fruit_option || '-'}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {isCake ? (
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
                          {cakeOrder.cakes?.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{c.message_cake || '-'}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {isCake ? (
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                          {cakeOrder.cakes?.map((c, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>¥{c.price?.toLocaleString()}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>¥{giftOrder.total_amount?.toLocaleString() || 0}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', maxWidth: '150px' }}>
                      {uOrder.order.message || "-"}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>📞 {uOrder.order.tel}</div>
                      <div style={{ color: '#666', marginTop: '4px', wordBreak: 'break-all' }}>✉️ {uOrder.order.email}</div>
                      {!isCake && giftOrder.delivery_method === 'shipping' && (
                        <div style={{ marginTop: '8px', padding: '4px', background: '#f5f5f5', borderRadius: '4px' }}>
                          〒{giftOrder.postal_code}<br />
                          {giftOrder.prefecture}{giftOrder.city}<br/>
                          {giftOrder.address1} {giftOrder.address2}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
