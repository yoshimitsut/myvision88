import { useEffect, useState, useMemo, useRef } from 'react';
import Select from "react-select";
import type { StylesConfig, SingleValue } from 'react-select';
import { STATUS_OPTIONS } from '../../types/types';
import type { GiftOrder, StatusOption } from '../../types/types';
import { formatDateJP } from "../../utils/formatDateJP";

import './ListOrder.css';

type Props = {
  viewType?: "cake" | "gift";
  setViewType?: (v: "cake" | "gift") => void;
};

export default function ListGiftOrder({ viewType, setViewType }: Props) {
  const [orders, setOrders] = useState<GiftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "cancelled">("active");

  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("すべて");
  const [refreshKey, setRefreshKey] = useState(0);

  const statusOptions = STATUS_OPTIONS;

  const filterOptions = [
    { value: "すべて", label: "すべて" },
    ...statusOptions
  ];

  const handleSearch = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    if (handleSearch.current) {
      clearTimeout(handleSearch.current);
    }

    handleSearch.current = window.setTimeout(() => {
      const searchUrl = search
        ? `${import.meta.env.VITE_API_URL}/api/gift-orders/list?search=${encodeURIComponent(search)}`
        : `${import.meta.env.VITE_API_URL}/api/gift-orders/list`;

      const token = sessionStorage.getItem('store_token');
      fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setOrders(data.orders || []);
          } else {
            setOrders([]);
          }
        })
        .catch((error) => {
          console.error('注文の読み込みエラー:', error);
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => {
      if (handleSearch.current) {
        clearTimeout(handleSearch.current);
      }
    };
  }, [search, refreshKey]);

  // Pedidos Ativos: status a, b, c, f
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === "a" || o.status === "b" || o.status === "c" || o.status === "f");
  }, [orders]);

  // Pedidos Finalizados: status d
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === "d");
  }, [orders]);

  // Pedidos Cancelados: status e
  const cancelledOrders = useMemo(() => {
    return orders.filter(o => o.status === "e");
  }, [orders]);

  async function handleStatusChange(id: number, newStatus: "a" | "b" | "c" | "d" | "f" | "e") {
    const order = orders.find((o) => o.id_order === id);
    if (!order) return;

    const statusMap: Record<string, string> = {
      a: "未",
      b: "オンライン予約",
      c: "店頭支払い済",
      f: "オンライン支払い済み",
      d: "お渡し済/発送済",
      e: "キャンセル",
    };

    const currentStatus = statusMap[order.status ?? "a"];
    const nextStatus = statusMap[newStatus];

    let confirmationMessage = `【確認】ステータスを変更しますか？\n\n` +
      `受付番号: ${String(order.id_order).padStart(4, "0")}\n` +
      `お名前: ${order.first_name} ${order.last_name}\n\n` +
      `${currentStatus} → ${nextStatus}`;

    if (newStatus === 'e' && (order.status === 'c' || order.status === 'f')) {
      confirmationMessage = `⚠️ 注意: この注文はオンライン決済済みです。\n\n` +
        `${confirmationMessage}\n\n` +
        `✅ Stripeで自動的に返金処理が行われます。\n` +
        `続行しますか？`;
    }

    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    const previousStatus = order.status;

    setIsUpdating(true);
    setUpdatingOrderId(id);

    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gift-orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`サーバーからの応答が無効です`);
      }

      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error || `保存に失敗しました`);
      }

      if (newStatus === 'e' && data.stripe) {
        if (data.stripe.success) {
          if (data.stripe.action === 'refund') {
            const amount = data.stripe.amount;
            const formattedAmount = `¥${amount.toLocaleString('ja-JP')}`;
            alert(`✅ 注文をキャンセルし、返金処理を行いました。\n\n返金額: ${formattedAmount}`);
          } else {
            alert(`✅ 注文をキャンセルしました。`);
          }
        }
      }

      setOrders((old) =>
        old.map((o) => (o.id_order === id ? { ...o, status: newStatus } : o))
      );

    } catch (err) {
      console.error("ステータス更新エラー:", err);
      alert("サーバーへのステータス保存中にエラーが発生しました。リストを再読み込みします。");
      setRefreshKey((k) => k + 1);
      setOrders((old) =>
        old.map((o) => (o.id_order === id ? { ...o, status: previousStatus } : o))
      );
    } finally {
      setIsUpdating(false);
      setUpdatingOrderId(null);
    }
  }

  const customStyles: StylesConfig<StatusOption, false> = {
    control: (provided, state) => {
      const selected = state.selectProps.value as StatusOption | null;
      let bgColor = "#000";
      let fontColor = "#fff";

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

      return {
        ...provided,
        borderRadius: 8,
        borderColor: "none",
        minHeight: 36,
        backgroundColor: bgColor,
        color: fontColor,
      };
    },
    singleValue: (provided) => ({ ...provided, color: "white" }),
    option: (provided, state) => {
      let bgColor = "#000";
      let fontColor = "#FFF";
      switch ((state.data as StatusOption).value) {
        case "a": bgColor = state.isFocused ? "#C40000" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "b": bgColor = state.isFocused ? "#000DBD" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "c": bgColor = state.isFocused ? "#287300" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "d": bgColor = state.isFocused ? "#6B6B6B" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "f": bgColor = state.isFocused ? "#7332a8" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
        case "e": bgColor = state.isFocused ? "#000" : "white"; fontColor = state.isFocused ? "white" : "black"; break;
      }
      return { ...provided, backgroundColor: bgColor, color: fontColor };
    },
    dropdownIndicator: (provided) => ({ ...provided, padding: "1px" }),
  };

  const renderTable = (orderList: GiftOrder[]) => {
    if (orderList.length === 0) return <p>注文はありません。</p>;

    return (
      <div className="table-wrapper scroll-cell table-order-container">
        <table className="list-order-table table-order">
          <thead>
            <tr>
              <th className='id-cell'>受付番号</th>
              <th className='situation-cell'>
                <div className='filter-column'>
                  お会計
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {filterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th>注文日</th>
              <th>お名前</th>
              <th>受取方法</th>
              <th>ご注文内容</th>
              <th>金額</th>
              <th>メッセージ</th>
              <th>連絡先</th>
            </tr>
          </thead>
          <tbody>
            {orderList
              .filter(order => statusFilter === "すべて" || order.status === statusFilter)
              .map(order => (
                <tr key={order.id_order}>
                  <td>{String(order.id_order).padStart(4, "0")}</td>
                  <td className='situation-cell'>
                    <Select<StatusOption, false>
                      options={statusOptions}
                      value={statusOptions.find((opt) => opt.value === order.status)}
                      onChange={(selected: SingleValue<StatusOption>) => {
                        if (selected) handleStatusChange(order.id_order, selected.value);
                      }}
                      styles={customStyles}
                      isSearchable={false}
                      isDisabled={isUpdating}
                      isLoading={isUpdating && updatingOrderId === order.id_order}
                    />
                  </td>
                  <td>{formatDateJP(order.date_order)}</td>
                  <td>{order.first_name} {order.last_name}</td>
                  <td>
                    {order.delivery_method === 'pickup' ? (
                      <span style={{ color: '#287300', fontWeight: 'bold' }}>店頭受取</span>
                    ) : (
                      <div>
                        <span style={{ color: '#000DBD', fontWeight: 'bold' }}>配送</span><br />
                        <small>〒{order.postal_code}<br />{order.prefecture} {order.city} {order.address1} {order.address2}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1rem' }}>
                      {order.items.map((item, i) => (
                        <li key={i}>{item.name} ({item.size}) - {item.amount}個</li>
                      ))}
                    </ul>
                  </td>
                  <td>¥{order.total_amount?.toLocaleString() || 0}</td>
                  <td>{order.message}</td>
                  <td>
                    {order.tel}<br />
                    <small>{order.email}</small>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className='list-order-gift-container'>
      <div className="list-order-actions">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            placeholder='検索：お名前、電話番号、受付番号などを入力'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='list-order-input'
          />
          {setViewType && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setViewType("cake")}
                style={{ padding: '0.5rem 1rem', background: viewType === 'cake' ? '#fdd111' : '#eee', color: viewType === 'cake' ? '#000' : '#666', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' }}
              >
                🎂 ケーキ
              </button>
              <button
                onClick={() => setViewType("gift")}
                style={{ padding: '0.5rem 1rem', background: viewType === 'gift' ? '#fdd111' : '#eee', color: viewType === 'gift' ? '#000' : '#666', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' }}
              >
                🎁 ギフト
              </button>
            </div>
          )}
        </div>

        {/* Placeholder invisível para manter a altura e o layout idêntico ao ListOrder.tsx */}
        <div className='btn-actions' style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          <button className='list-btn'>
            <img src="/icons/calendar_icon.png" alt="placeholder" />
          </button>
        </div>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : orders.length === 0 ? (
        <p>注文が見つかりません。</p>
      ) : (
        <>
          <div className="tabs-container">
            <div className="tabs-header">
              <button
                className={`tab-button ${activeTab === "active" ? "active" : ""}`}
                onClick={() => setActiveTab("active")}
              >
                📅 現在の注文 ({activeOrders.length})
              </button>
              <button
                className={`tab-button ${activeTab === "completed" ? "active" : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                ✅ お渡し済み/発送済 ({completedOrders.length})
              </button>
              <button
                className={`tab-button ${activeTab === "cancelled" ? "active" : ""}`}
                onClick={() => setActiveTab("cancelled")}
              >
                ❌ キャンセル ({cancelledOrders.length})
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "active" && renderTable(activeOrders)}
              {activeTab === "completed" && renderTable(completedOrders)}
              {activeTab === "cancelled" && renderTable(cancelledOrders)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
