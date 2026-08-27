import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { Html5Qrcode } from 'html5-qrcode';
import Select from "react-select";

import EditOrderModal from "../../components/admin/EditOrderModal";
import AdminLayout from '../../components/admin/AdminLayout';

import type { StylesConfig, SingleValue } from 'react-select';
import type { Order, StatusOption } from '../../types/types';
import { STATUS_OPTIONS } from '../../types/types';

import { formatDateJP } from "../../utils/formatDateJP";
import ListGiftOrder from "./ListGiftOrder";

import './ListOrder.css';

export default function ListOrder() {
  const [viewType, setViewType] = useState<"cake" | "gift">("cake");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedOrderId, setScannedOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode] = useState<"date" | "order">("order");
  const [activeTab, setActiveTab] = useState<"all" | "today" | "active" | "completed" | "cancelled" | "past">("today");

  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("すべて");
  const [cakeFilter, setCakeFilter] = useState("すべて");
  const [dateFilter, setDateFilter] = useState("すべて");
  const [hourFilter, setHourFilter] = useState("すべて");

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  type FilterOption = {
    value: string;
    label: string;
  };

  const statusOptions = STATUS_OPTIONS;

  const filterOptions: FilterOption[] = [
    { value: "すべて", label: "すべて" },
    ...statusOptions
  ];

  const navigate = useNavigate();
  const handleSearch = useRef<number | null>(null);

  // Efeito para lidar com navegação e recarga
  useEffect(() => {
    if (location.state?.newOrderCreated) {
      navigate(location.pathname, { replace: true, state: {} });
      setRefreshKey(prev => prev + 1);
    }
  }, [location.state, navigate, location.pathname]);

  // Efeito para carregar pedidos
  useEffect(() => {
    if (handleSearch.current) {
      clearTimeout(handleSearch.current);
    }

    handleSearch.current = setTimeout(() => {
      const searchUrl = search
        ? `${import.meta.env.VITE_API_URL}/api/list?search=${encodeURIComponent(search)}`
        : `${import.meta.env.VITE_API_URL}/api/list`;

      const token = sessionStorage.getItem('store_token');
      fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then((res) => {
          if (res.status === 401) {
            sessionStorage.removeItem('store_token');
            sessionStorage.removeItem('store_authenticated');
            window.location.href = '/store-login';
            throw new Error('Não autorizado');
          }
          return res.json();
        })
        .then((data) => {
          const normalized = Array.isArray(data) ? data : (data.orders || []);
          setOrders(normalized);
          console.log("---" + normalized);
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

  // UseMemo para encontrar o pedido escaneado
  const foundScannedOrder = useMemo(() => {
    if (scannedOrderId) {
      return orders.find((o) => o.id_order === scannedOrderId);
    }
    return null;
  }, [scannedOrderId, orders]);

  // Agrupar pedidos por data
  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const dateKey = formatDateJP(order.date);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  // Efeito para o scanner QR Code
  // No seu componente ListOrder, substitua o useEffect do scanner por:

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (showScanner) {
      html5QrCode = new Html5Qrcode("reader");

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 } // 🔹 Corrigido formato
        },
        (decodedText) => {
          console.log("QR Code lido:", decodedText);
          setShowScanner(false);

          const orderId = Number(decodedText);
          if (!isNaN(orderId)) {
            const found = orders.find((o) => o.id_order === orderId);
            if (found) {
              setScannedOrderId(found.id_order);
            } else {
              alert("注文が見つかりません。");
            }
          } else {
            alert("QRコードが無効です。");
          }
        },
        (error) => {
          // Apenas log errors, não mostrar alertas para cada frame
          if (!error.includes("NotFoundException")) {
            console.warn("QRコード読み取りエラー:", error);
          }
        }
      ).catch((err) => {
        console.error("Erro ao iniciar câmera:", err);
        alert("カメラの起動に失敗しました。");
        setShowScanner(false);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch((err) => {
          console.error("Erro ao parar scanner:", err);
        });
      }
    };
  }, [showScanner, orders]);

  // Ordenar pedidos agrupados
  const sortedGroupedOrders = useMemo(() => {
    return Object.entries(groupedOrders) as [string, Order[]][];
  }, [groupedOrders]);

  // Definir como exibir os pedidos
  const displayOrders: [string, Order[]][] = useMemo(() => {
    if (viewMode === 'date') {
      return sortedGroupedOrders;
    } else {
      return [["注文順", [...orders].sort((a, b) => a.id_order - b.id_order)]];
    }
  }, [viewMode, sortedGroupedOrders, orders]);

  // 🔹 SEPARAR PEDIDOS POR CATEGORIAS
  // Usar string YYYY-MM-DD local para evitar bug de fuso horário com UTC do MySQL
  const todayLocalStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  // Extrai a parte YYYY-MM-DD da data do pedido (que vem do MySQL como string)
  // Usa slice(0,10) para NUNCA fazer conversão de timezone — 100% seguro em qualquer fuso
  const getOrderDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    // MySQL2 retorna DATE como "2026-08-27" ou "2026-08-27T00:00:00.000Z"
    // slice(0,10) sempre pega exatamente "YYYY-MM-DD" sem converter para Date
    return dateStr.slice(0, 10);
  };


  // 🔹 Pedidos de Hoje: todos os status com data de hoje
  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = getOrderDateStr(o.date);
      const isFinish = o.status !== "d";
      const orderNoCanceled = o.status !== "e";
      return orderDate === todayLocalStr && isFinish && orderNoCanceled;
    });
  }, [orders, todayLocalStr]);

  // Pedidos Ativos: status a, b, c com data futura ou hoje
  const activeOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = getOrderDateStr(o.date);
      const isActiveStatus = o.status === "a" || o.status === "b" || o.status === "c" || o.status === "f";
      const isFutureOrToday = orderDate >= todayLocalStr;
      return isActiveStatus && isFutureOrToday;
    });
  }, [orders, todayLocalStr]);

  // 🔹 Pedidos com Data Anterior: status a, b, c com data passada
  const pastDateOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = getOrderDateStr(o.date);
      const isActiveStatus = o.status === "a" || o.status === "b" || o.status === "c" || o.status === "f";
      const isPastDate = orderDate < todayLocalStr;
      return isActiveStatus && isPastDate;
    });
  }, [orders, todayLocalStr]);

  // Pedidos Finalizados: status d (お渡し済み)
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === "d");
  }, [orders]);

  // Pedidos Cancelados: status e (キャンセル)
  const cancelledOrders = useMemo(() => {
    return orders.filter(o => o.status === "e");
  }, [orders]);

  const sortedTodayOrders = useMemo(() => {
    return [...todayOrders].sort((a, b) => {
      const timeA = a.pickupHour || "";
      const timeB = b.pickupHour || "";
      return timeA.localeCompare(timeB, "ja");
    });
  }, [todayOrders]);

  const sortedPastDateOrders = useMemo(() => {
    return [...pastDateOrders].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = a.pickupHour || "";
      const timeB = b.pickupHour || "";
      return timeA.localeCompare(timeB, "ja");
    });
  }, [pastDateOrders]);

  const sortedCompletedOrders = useMemo(() => {
    return [...completedOrders].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = a.pickupHour || "";
      const timeB = b.pickupHour || "";
      return timeA.localeCompare(timeB, "ja");
    });
  }, [completedOrders]);

  const sortedCancelledOrders = useMemo(() => {
    return [...cancelledOrders].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = a.pickupHour || "";
      const timeB = b.pickupHour || "";
      return timeA.localeCompare(timeB, "ja");
    });
  }, [cancelledOrders]);

  const sortedAllOrders = useMemo(() => {
    return [...orders].sort((a, b) => b.id_order - a.id_order);
  }, [orders]);

  // 🔹 Pedidos de hoje agrupados por horário para o painel de timeline
  const todayOrdersByHour = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const reserved = orders.filter(o => {
      const orderDate = o.date?.slice(0, 10);
      const isToday = orderDate === todayStr;
      const isNotCancelled = o.status !== 'e' && o.status !== 'd';
      return isToday && isNotCancelled;
    });

    const grouped: Record<string, typeof orders> = {};
    for (const order of reserved) {
      const hour = order.pickupHour || '時間未定';
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(order);
    }

    // Ordenar as chaves (horários)
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'ja'));
  }, [orders]);


  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Função para alterar status
  async function handleStatusChange(id: number, newStatus: "a" | "b" | "c" | "d" | "f" | "e") {
    const order = orders.find((o) => o.id_order === id);
    if (!order) return;

    const statusMap: Record<string, string> = {
      a: "未",
      b: "オンライン予約",
      c: "店頭支払い済",
      f: "オンライン支払い済み",
      d: "お渡し済",
      e: "キャンセル",
    };

    const currentStatus = statusMap[order.status ?? "a"];
    const nextStatus = statusMap[newStatus];

    // Mensagem de confirmação especial para cancelamento com Stripe
    let confirmationMessage = `【確認】ステータスを変更しますか？\n\n` +
      `受付番号: ${String(order.id_order).padStart(4, "0")}\n` +
      `お名前: ${order.first_name} ${order.last_name}\n\n` +
      `${currentStatus} → ${nextStatus}`;

    // Se for cancelamento e pedido foi pago online, avisar sobre reembolso
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reservar/${id}`, {
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
        console.error(e);
        throw new Error(`サーバーからの応答が無効です（ステータス ${res.status}）`);
      }

      if (!res.ok || !data || !data.success) {
        throw new Error(data?.error || `保存に失敗しました（ステータス ${res.status}）`);
      }

      if (newStatus === 'e' && data.stripe) {
        if (data.stripe.success) {
          if (data.stripe.action === 'refund') {
            const amount = data.stripe.amount;
            const formattedAmount = `¥${amount.toLocaleString('ja-JP')}`;

            // ✅ Mostrar ID do pedido e nome do cliente
            alert(`✅ 注文をキャンセルし、返金処理を行いました。
      
            📋 受付番号: ${String(order.id_order).padStart(4, "0")}
            👤 お客様: ${order.last_name} ${order.first_name}
            💰 返金額: ${formattedAmount}
            🆔 返金ID: ${data.stripe.refundId}`);

          } else if (data.stripe.action === 'cancel') {
            alert(`✅ 注文をキャンセルしました。
      
            📋 受付番号: ${String(order.id_order).padStart(4, "0")}
            👤 お客様: ${order.last_name} ${order.first_name}
            未決済の支払いは取り消されました。`);

          } else if (data.stripe.action === 'already_canceled') {
            alert(`ℹ️ 注文をキャンセルしました。
      
            📋 受付番号: ${String(order.id_order).padStart(4, "0")}
            👤 お客様: ${order.last_name} ${order.first_name}
            この支払いは既にキャンセル済みです。`);
          }
        } else {
          // ⚠️ Caso de erro no Stripe
          alert(`⚠️ 注文はキャンセルされましたが、Stripeでの処理に問題がありました。
    
          📋 受付番号: ${String(order.id_order).padStart(4, "0")}
          👤 お客様: ${order.last_name} ${order.first_name}
          ❌ エラー: ${data.stripe.message || 'Erro na comunicação com Stripe'}

          別途返金処理が必要な場合があります。`);
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

  // Função para salvar edição
  const handleSaveEdit = async (updatedOrder: Order) => {
    if (!updatedOrder) return;

    setIsSavingEdit(true);

    try {
      const token = sessionStorage.getItem('store_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${updatedOrder.id_order}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedOrder),
      });
      const data = await res.json();


      if (!res.ok || !data.success) {
        throw new Error(data.error || "更新に失敗しました。");
      }

      setOrders((old) =>
        old.map((o) =>
          o.id_order === updatedOrder.id_order ? updatedOrder : o
        )
      );

      setRefreshKey(prev => prev + 1);

      setEditingOrder(null);
      alert("✅ 注文が正常に更新されました。");
    } catch (err) {
      console.error("❌ 編集保存エラー:", err);
      alert("❌ 更新中にエラーが発生しました。");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const customStyles: StylesConfig<StatusOption, false> = {
    control: (provided, state) => {
      const selected = state.selectProps.value as StatusOption | null;

      let bgColor = "#000";
      let fontColor = "#fff";

      if (selected) {
        switch (selected.value) {
          case "a":
            bgColor = "#C40000";
            fontColor = "#FFF";
            break;
          case "b":
            bgColor = "#000DBD";
            fontColor = "#FFF";
            break;
          case "c":
            bgColor = "#287300";
            fontColor = "#FFF";
            break;
          case "d":
            bgColor = "#6B6B6B";
            fontColor = "#FFF";
            break;
          case "f":
            bgColor = "#7332a8";
            fontColor = "#fff";
            break;
          case "e":
            bgColor = "#000";
            fontColor = "#fff";
            break;
          default:
            bgColor = "#fff";
            fontColor = "#000";
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
    singleValue: (provided) => {
      return {
        ...provided,
        color: "white",
      };
    },
    option: (provided, state) => {
      let bgColor = "#000";
      let fontColor = "#FFF";

      switch ((state.data as StatusOption).value) {
        case "a":
          bgColor = state.isFocused ? "#C40000" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
        case "b":
          bgColor = state.isFocused ? "#000DBD" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
        case "c":
          bgColor = state.isFocused ? "#287300" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
        case "d":
          bgColor = state.isFocused ? "#6B6B6B" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
        case "f":
          bgColor = state.isFocused ? "#7332a8" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
        case "e":
          bgColor = state.isFocused ? "#000" : "white";
          fontColor = state.isFocused ? "white" : "black";
          break;
      }

      return {
        ...provided,
        backgroundColor: bgColor,
        color: fontColor,
      };
    },
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "1px",
    }),
  };

  // 🔹 COMPONENTE PARA TODOS OS PEDIDOS
  const renderAllOrdersTable = () => (
    <>
      {sortedAllOrders.length === 0 ? (
        <p>該当する注文はありません。</p>
      ) : (
        <div className="table-card-wrapper">
          <table className="modern-admin-table">
            <thead>
              <tr>
                <th>受取日時</th>
                <th>お名前 / 受付番号</th>
                <th>商品名</th>
                <th>個数</th>
                <th>フルーツ盛り</th>
                <th>キャンドル</th>
                <th>メッセージプレート</th>
                <th>編集</th>
              </tr>
            </thead>
            <tbody>
              {sortedAllOrders
                .filter((order) => {
                  const matchesStatus = statusFilter === "すべて" || order.status === statusFilter;
                  const matchesCake = cakeFilter === "すべて" || (order.cakes && order.cakes.some(cake => cake.name === cakeFilter));
                  const matchesDate = dateFilter === "すべて" || formatDateJP(order.date) === formatDateJP(dateFilter);
                  const matchesHour = hourFilter === "すべて" || order.pickupHour === hourFilter;

                  return matchesStatus && matchesCake && matchesDate && matchesHour;
                })
                .map((order) => (
                  <tr key={order.id_order} className="order-row-card">
                    <td>
                      <div className="order-date-col">
                        <span>{formatDateJP(order.date)}</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>{order.pickupHour}</span>
                        <span className="status-pill-toggle"></span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '13px', color: '#222' }}>{order.first_name} {order.last_name}</strong>
                        <span className="order-id-badge">#{String(order.id_order).padStart(4, "0")}</span>
                      </div>
                    </td>
                    <td>
                      {order.cakes && order.cakes.map((cake, index) => (
                        <div key={`${order.id_order}-${cake.cake_id}-${index}`}>
                          {cake.name} {cake.size}
                        </div>
                      ))}
                    </td>
                    <td>
                      {order.cakes && order.cakes.map((cake, index) => (
                        <div key={`${order.id_order}-${cake.cake_id}-${index}`}>
                          {cake.amount}
                        </div>
                      ))}
                    </td>
                    <td>
                      {order.cakes && order.cakes.map((cake, index) => (
                        <div key={`${order.id_order}-${cake.cake_id}-${index}`}>
                          {cake.fruit_option || "有り"}
                        </div>
                      ))}
                    </td>
                    <td>
                      {order.cakes && order.cakes.map((cake, index) => (
                        <div key={`${order.id_order}-${cake.cake_id}-${index}`}>
                          {(cake as any).candle_option || "有り"}
                        </div>
                      ))}
                    </td>
                    <td>
                      {order.cakes && order.cakes.map((cake, index) => (
                        <div key={`${order.id_order}-${cake.cake_id}-${index}`}>
                          {cake.message_cake || "なし"}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button className="edit-circle-btn" onClick={() => setEditingOrder(order)} title="編集">
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // 🔹 COMPONENTE PARA PEDIDOS DE HOJE
  const renderTodayOrdersTable = () => {

    return (
      <>
        {sortedTodayOrders.length === 0 ? (
          <p>本日の注文はありません。</p>
        ) : (
          <div className="table-wrapper scroll-cell table-order-container">
            <table className="list-order-table table-order">
              <thead>
                <tr>
                  <th className='id-cell'>受付番号</th>
                  <th className='situation-cell'>
                    <div className='filter-column'>
                      お会計
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        {filterOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th>お名前</th>
                  <th>
                    <div className='filter-column'>
                      受取希望時間
                      <select
                        value={hourFilter}
                        onChange={(e) => setHourFilter(e.target.value)}
                      >
                        <option value="すべて">すべて</option>
                        {Array.from(
                          new Set(todayOrders.map((o) => o.pickupHour))
                        )
                          .sort((a, b) => {
                            const numA = parseInt(a);
                            const numB = parseInt(b);
                            return numA - numB;
                          })
                          .map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                      </select>
                    </div>
                  </th>
                  <th>
                    <div className='filter-column'>
                      ご注文のケーキ
                      <select value={cakeFilter} onChange={(e) => setCakeFilter(e.target.value)}>
                        <option value="すべて">すべて</option>
                        {Array.from(
                          new Set(
                            todayOrders.flatMap((o) => (o.cakes ?? []).map((c) => c.name))
                          )
                        ).map((cake) => (
                          <option key={cake} value={cake}>{cake}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th>個数</th>
                  <th>フルーツ盛り</th>
                  <th className='message-cell'>メッセージプレート</th>
                  <th className='message-cell'>その他メッセージ</th>
                  <th>電話番号</th>
                  <th>メールアドレス</th>
                  <th>編集</th>
                </tr>
              </thead>
              <tbody>
                {sortedTodayOrders
                  .filter((order) => {
                    const matchesStatus = statusFilter === "すべて" || order.status === statusFilter;
                    const matchesCake = cakeFilter === "すべて" || order.cakes.some(cake => cake.name === cakeFilter);
                    const matchesHour = hourFilter === "すべて" || order.pickupHour === hourFilter;

                    return matchesStatus && matchesCake && matchesHour;
                  })
                  .map((order) => (
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
                      <td>{order.first_name} {order.last_name}</td>
                      <td>{order.pickupHour}</td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, index) => (
                            <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                              {cake.name} {cake.size} - ¥{cake.price}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ textAlign: "left" }}>
                        <ul>
                          {order.cakes.map((cake, index) => (
                            <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                              {cake.amount}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ textAlign: "left" }}>
                        <ul>
                          {order.cakes.map((cake, index) => (
                            <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                              {cake.fruit_option}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className='message-cell' style={{ textAlign: "left" }}>
                        <ul>
                          {order.cakes.map((cake, index) => (
                            <li key={`${order.id_order}-${cake.cake_id}-${index}`} >
                              {cake.message_cake}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className='message-cell'>
                        {order.message || " "}
                      </td>
                      <td>{order.tel}</td>
                      <td>{order.email}</td>
                      <td>
                        <button
                          onClick={() => setEditingOrder(order)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem"
                          }}
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>


        )}
      </>
    );
  };

  // 🔹 COMPONENTE PARA PEDIDOS ATIVOS
  const renderActiveOrdersTable = () => (
    <>
      {activeOrders.length === 0 ? (
        <p>現在の注文はありません。</p>
      ) : (
        <>
          {/* Tabelas (desktop) */}
          {displayOrders
            .filter(([, list]) => list.some(o => activeOrders.includes(o)))
            .map(([groupTitles, ordersForGroup]: [string, Order[]]) => {
              const activeOrdersForGroup = ordersForGroup.filter(order =>
                activeOrders.includes(order)
              );

              return (
                <div key={groupTitles} className="table-wrapper scroll-cell table-order-container">
                  <table className="list-order-table table-order">
                    <thead>
                      <tr>
                        <th className='id-cell'>受付番号</th>
                        <th className='situation-cell'>
                          <div className='filter-column'>
                            お会計
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              {filterOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </th>
                        <th>お名前</th>
                        <th>
                          <div className='filter-column'>
                            受取希望日時
                            <div className='filter-column-date'>
                              <select
                                value={dateFilter}
                                onChange={(e) => {
                                  setDateFilter(e.target.value);
                                  setHourFilter("すべて");
                                }}
                              >
                                <option value="すべて">すべて</option>
                                {Array.from(new Set(activeOrders.map((o) => o.date)))
                                  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                                  .map((date) => (
                                    <option key={date} value={date}>
                                      {formatDate(date)}
                                    </option>
                                  ))}
                              </select>

                              <select
                                value={hourFilter}
                                onChange={(e) => setHourFilter(e.target.value)}
                                style={{ marginLeft: "6px" }}
                              >
                                <option value="すべて">すべて</option>
                                {Array.from(
                                  new Set(
                                    activeOrders
                                      .filter((o) => dateFilter === "すべて" || o.date === dateFilter)
                                      .map((o) => o.pickupHour)
                                  )
                                )
                                  .sort((a, b) => {
                                    const numA = parseInt(a);
                                    const numB = parseInt(b);
                                    return numA - numB;
                                  })
                                  .map((hour) => (
                                    <option key={hour} value={hour}>
                                      {hour}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </th>
                        <th>
                          <div className='filter-column'>
                            ご注文のケーキ
                            <select value={cakeFilter} onChange={(e) => setCakeFilter(e.target.value)}>
                              <option value="すべて">すべて</option>
                              {Array.from(
                                new Set(
                                  activeOrders.flatMap((o) => (o.cakes ?? []).map((c) => c.name))
                                )
                              ).map((cake) => (
                                <option key={cake} value={cake}>{cake}</option>
                              ))}
                            </select>
                          </div>
                        </th>
                        <th>個数</th>
                        <th>フルーツ盛り</th>
                        <th className='message-cell'>プレートメッセージ</th>
                        <th className='message-cell'>その他メッセージ</th>
                        <th>電話番号</th>
                        <th>メールアドレス</th>
                        <th>編集</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrdersForGroup
                        .filter((order) => {
                          const matchesStatus = statusFilter === "すべて" || order.status === statusFilter;
                          const matchesCake = cakeFilter === "すべて" || order.cakes.some(cake => cake.name === cakeFilter);
                          const matchesDate = dateFilter === "すべて" || formatDateJP(order.date) === formatDateJP(dateFilter);
                          const matchesHour = hourFilter === "すべて" || order.pickupHour === hourFilter;

                          return matchesStatus && matchesCake && matchesDate && matchesHour;
                        })
                        .sort((a, b) => {
                          if (dateFilter !== "すべて") {
                            const hourA = a.pickupHour || "";
                            const hourB = b.pickupHour || "";
                            return hourA.localeCompare(hourB, "ja");
                          } else {
                            const idA = Number(a.id_order) || 0;
                            const idB = Number(b.id_order) || 0;
                            return idA - idB;
                          }
                        })
                        .map((order) => (
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
                            <td>
                              {order.first_name} {order.last_name}
                            </td>
                            <td>{formatDateJP(order.date)} {order.pickupHour}</td>
                            <td>
                              <ul>
                                {order.cakes.map((cake, index) => (
                                  <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                                    {cake.name}
                                    {cake.size} - ¥{cake.price}<br />
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td style={{ textAlign: "left" }}>
                              <ul>
                                {order.cakes.map((cake, index) => (
                                  <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                                    {cake.amount}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td style={{ textAlign: "left" }}>
                              <ul>
                                {order.cakes.map((cake, index) => (
                                  <li key={`${order.id_order}-${cake.cake_id}-${index}`}>
                                    {cake.fruit_option}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className='message-cell' style={{ textAlign: "left" }}>
                              <ul>
                                {order.cakes.map((cake, index) => (
                                  <li key={`${order.id_order}-${cake.cake_id}-${index}`} >
                                    {cake.message_cake}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className='message-cell'>
                              <li>
                                {order.message || " "}
                              </li>
                            </td>
                            <td>{order.tel}</td>
                            <td>{order.email}</td>
                            <td>
                              <button
                                onClick={() => setEditingOrder(order)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  backgroundColor: "#007bff",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.8rem"
                                }}
                              >
                                編集
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

          {/* Cards (mobile) */}
          <div className="mobile-orders">
            {activeOrders.map((order) => (
              <div className="order-card" key={order.id_order}>
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
                <div className="order-header">
                  <span><strong>受付番号:</strong> {String(order.id_order).padStart(4, "0")}</span>
                </div>
                <p><strong>お名前:</strong> {order.first_name} {order.last_name}</p>
                <p><strong>受取日:</strong> {formatDateJP(order.date)} {order.pickupHour}</p>
                <details>
                  <summary>ご注文内容</summary>
                  <ul>
                    {order.cakes.map((cake, index) => (
                      <li key={`${cake.cake_id}-${index}`}>
                        {cake.name} - 個数: {cake.amount} - {cake.size}
                      </li>
                    ))}
                  </ul>

                  <ul>
                    {order.cakes.map((cake, index) => (
                      <li key={`${cake.cake_id}-${index}`}>
                        {cake.name} - フルーツ盛り: {cake.fruit_option}
                      </li>
                    ))}
                  </ul>
                  <p><strong>電話番号:</strong> {order.tel}</p>
                  <p><strong>メッセージ:</strong> {order.message || " "}</p>
                </details>
                <button
                  onClick={() => setEditingOrder(order)}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  編集
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  // 🔹 COMPONENTE PARA PEDIDOS COM DATA ANTERIOR (COM MOBILE)
  const renderPastDateOrdersTable = () => {

    return (
      <>
        {sortedPastDateOrders.length === 0 ? (
          <p>過去の日付の注文はありません。</p>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="desktop-table table-wrapper scroll-cell table-order-container">
              <table className="list-order-table table-order">
                <thead>
                  <tr>
                    <th>受付番号</th>
                    <th className='situation-cell'>お会計</th>
                    <th>お名前</th>
                    <th>受取希望日時</th>
                    <th>ご注文のケーキ</th>
                    <th>個数</th>
                    <th>フルーツ盛り</th>
                    <th className='message-cell'>メッセージプレート</th>
                    <th className='message-cell'>その他メッセージ</th>
                    <th>電話番号</th>
                    <th>メールアドレス</th>
                    <th>編集</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPastDateOrders.map(order => (
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
                      <td>{order.first_name} {order.last_name}</td>
                      <td>{formatDateJP(order.date)} {order.pickupHour}</td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.name} {cake.size}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.amount}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.fruit_option}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.message_cake}</li>
                          ))}
                        </ul>
                      </td>
                      <td>{order.message}</td>
                      <td>{order.tel}</td>
                      <td>{order.email}</td>
                      <td>
                        <button
                          onClick={() => setEditingOrder(order)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem"
                          }}
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="mobile-orders">
              {sortedPastDateOrders.map((order) => (
                <div className="order-card" key={order.id_order}>
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
                  {/* <div className="order-header">
                </div> */}
                  <span className="order-id">受付番号: {String(order.id_order).padStart(4, "0")}</span>
                  <p><strong>お名前:</strong> {order.first_name} {order.last_name}</p>
                  <p><strong>受取日時:</strong> {formatDateJP(order.date)} {order.pickupHour}</p>
                  <details>
                    <summary>ご注文内容</summary>
                    <ul>
                      {order.cakes.map((cake, index) => (
                        <li key={`${cake.cake_id}-${index}`}>
                          <strong>{cake.name}</strong><br />
                          サイズ: {cake.size}<br />
                          個数: {cake.amount}<br />
                          フルーツ盛り: {cake.fruit_option}<br />
                          プレートメッセージ: {cake.message_cake || "なし"}
                        </li>
                      ))}
                    </ul>
                    <p><strong>電話番号:</strong> {order.tel}</p>
                    <p><strong>メール:</strong> {order.email}</p>
                    <p><strong>その他メッセージ:</strong> {order.message || "なし"}</p>
                  </details>
                  <button
                    onClick={() => setEditingOrder(order)}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem 1rem",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    編集
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  // 🔹 COMPONENTE PARA PEDIDOS FINALIZADOS (COM MOBILE)
  const renderCompletedOrdersTable = () => {

    return (
      <>
        {sortedCompletedOrders.length === 0 ? (
          <p>お渡し済みの注文はありません。</p>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="desktop-table table-wrapper scroll-cell table-order-container">
              <table className="list-order-table table-order">
                <thead>
                  <tr>
                    <th>受付番号</th>
                    <th>お名前</th>
                    <th>受取希望日時</th>
                    <th>ご注文のケーキ</th>
                    <th>個数</th>
                    <th>フルーツ盛り</th>
                    <th>メッセージプレート</th>
                    <th>その他メッセージ</th>
                    <th>電話番号</th>
                    <th>メールアドレス</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompletedOrders.map(order => (
                    <tr key={order.id_order}>
                      <td>{String(order.id_order).padStart(4, "0")}</td>
                      <td>{order.first_name} {order.last_name}</td>
                      <td>{formatDateJP(order.date)} {order.pickupHour}</td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.name} {cake.size}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.amount}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.fruit_option}</li>
                          ))}
                        </ul>
                      </td>

                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.message_cake}</li>
                          ))}
                        </ul>
                      </td>
                      <td>{order.message}</td>
                      <td>{order.tel}</td>
                      <td>{order.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="mobile-orders">
              {sortedCompletedOrders.map((order) => (
                <div className="order-card" key={order.id_order}>
                  <div className="order-header">
                    <span className="order-status status-completed">✅ お渡し済み</span>
                    <span className="order-id">受付番号: {String(order.id_order).padStart(4, "0")}</span>
                  </div>
                  <p><strong>お名前:</strong> {order.first_name} {order.last_name}</p>
                  <p><strong>受取日時:</strong> {formatDateJP(order.date)} {order.pickupHour}</p>
                  <details>
                    <summary>ご注文内容</summary>
                    <ul>
                      {order.cakes.map((cake, index) => (
                        <li key={`${cake.cake_id}-${index}`}>
                          <strong>{cake.name}</strong><br />
                          サイズ: {cake.size}<br />
                          個数: {cake.amount}<br />
                          フルーツ盛り: {cake.fruit_option}<br />
                          プレートメッセージ: {cake.message_cake || "なし"}
                        </li>
                      ))}
                    </ul>
                    <p><strong>電話番号:</strong> {order.tel}</p>
                    <p><strong>メール:</strong> {order.email}</p>
                    <p><strong>その他メッセージ:</strong> {order.message || "なし"}</p>
                  </details>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  // 🔹 COMPONENTE PARA PEDIDOS CANCELADOS (COM MOBILE)
  const renderCancelledOrdersTable = () => {

    return (
      <>
        {sortedCancelledOrders.length === 0 ? (
          <p>キャンセルされた注文はありません。</p>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="desktop-table table-wrapper scroll-cell table-order-container">
              <table className="list-order-table table-order">
                <thead>
                  <tr>
                    <th>受付番号</th>
                    <th>お名前</th>
                    <th>受取希望日時</th>
                    <th>ご注文のケーキ</th>
                    <th>個数</th>
                    <th>フルーツ盛り</th>
                    <th>メッセージプレート</th>
                    <th>その他メッセージ</th>
                    <th>電話番号</th>
                    <th>メールアドレス</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCancelledOrders.map(order => (
                    <tr key={order.id_order}>
                      <td>{String(order.id_order).padStart(4, "0")}</td>
                      <td>{order.first_name} {order.last_name}</td>
                      <td>{formatDateJP(order.date)} {order.pickupHour}</td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.name} {cake.size}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.amount}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.fruit_option}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul>
                          {order.cakes.map((cake, i) => (
                            <li key={i}>{cake.message_cake}</li>
                          ))}
                        </ul>
                      </td>
                      <td>{order.message}</td>
                      <td>{order.tel}</td>
                      <td>{order.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="mobile-orders">
              {sortedCancelledOrders.map((order) => (
                <div className="order-card" key={order.id_order}>
                  <div className="order-header">
                    <span className="order-status status-cancelled">❌ キャンセル</span>
                    <span className="order-id">受付番号: {String(order.id_order).padStart(4, "0")}</span>
                  </div>
                  <p><strong>お名前:</strong> {order.first_name} {order.last_name}</p>
                  <p><strong>受取日時:</strong> {formatDateJP(order.date)} {order.pickupHour}</p>
                  <details>
                    <summary>ご注文内容</summary>
                    <ul>
                      {order.cakes.map((cake, index) => (
                        <li key={`${cake.cake_id}-${index}`}>
                          <strong>{cake.name}</strong><br />
                          サイズ: {cake.size}<br />
                          個数: {cake.amount}<br />
                          フルーツ盛り: {cake.fruit_option}<br />
                          プレートメッセージ: {cake.message_cake || "なし"}
                        </li>
                      ))}
                    </ul>
                    <p><strong>電話番号:</strong> {order.tel}</p>
                    <p><strong>メール:</strong> {order.email}</p>
                    <p><strong>その他メッセージ:</strong> {order.message || "なし"}</p>
                  </details>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <AdminLayout sidebarProps={{
      orders,
      activeOrders,
      todayOrders,
      pastDateOrders,
      completedOrders,
      cancelledOrders,
      viewType,
      setViewType,
      search,
      setSearch,
      activeTab,
      setActiveTab,
      setShowScanner
    }}>
      {/* Breadcrumbs */}
      <div className="admin-breadcrumbs">
        <span>予約管理</span> / <span>予約ステータス</span> / <span className="current">すべて</span>
      </div>

      {/* Main Card Container */}
      <div className="admin-card-container">
        <h2 className="admin-page-title">予約ステータス</h2>

        {/* Category Pills Row */}
        <div className="category-pills-row">
          <button
            className={`category-pill ${activeTab === 'all' ? 'active-solid' : ''}`}
            onClick={() => {
              setActiveTab('all');
              setViewType('cake');
            }}
          >
            すべて
          </button>
          <button
            className={`category-pill pill-cake ${viewType === 'cake' ? 'active-cake' : ''}`}
            onClick={() => setViewType('cake')}
          >
            ケーキ <span className="pill-count">{activeOrders.length || orders.length}</span>
          </button>
          <button
            className={`category-pill pill-gift ${viewType === 'gift' ? 'active-gift' : ''}`}
            onClick={() => setViewType('gift')}
          >
            ギフト <span className="pill-count">1</span>
          </button>
        </div>

        {viewType === "gift" ? (
          <ListGiftOrder />
        ) : (
          <>
            {showScanner && (
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <button
                  onClick={() => setShowScanner(false)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
                <div id="reader" style={{ width: '100%', maxWidth: '300px' }}></div>
              </div>
            )}

            {foundScannedOrder && (
              <div style={{ border: '1px solid #007bff', padding: 12, marginBottom: 20 }}>
                <strong>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find((opt) => String(opt.value) === String(foundScannedOrder.status))}
                    onChange={(selected) =>
                      handleStatusChange(
                        foundScannedOrder.id_order,
                        selected?.value as "a" | "b" | "c" | "d" | "e"
                      )
                    }
                    isDisabled={isUpdating}
                    isLoading={isUpdating}
                    styles={customStyles}
                    isSearchable={false}
                  />
                </strong>
                <strong>受付番号: </strong> {String(foundScannedOrder.id_order).padStart(4, "0")}<br />
                <strong>お名前: </strong> {foundScannedOrder.first_name} {foundScannedOrder.last_name}<br />
                <strong>電話番号: </strong> {foundScannedOrder.tel}<br />
                <strong>受取日: </strong> {formatDateJP(foundScannedOrder.date)} - {foundScannedOrder.pickupHour}<br />
                <strong>ご注文のケーキ: </strong>
                <ul className='cake-list'>
                  {foundScannedOrder.cakes.map((cake, index) => (
                    <li key={`${cake.cake_id}-${index}`}>
                      <span className='cake-name'>{cake.name}</span>
                      <span className='cake-amount'>¥{cake.price.toLocaleString()}</span>
                      <span className='cake-size'>サイズ: {cake.size}</span>
                      <span className='cake-quantity'>個数: {cake.amount}</span>
                      <span className='cake-fruitop'>フルーツ盛り: {cake.fruit_option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {/* ========== 本日の予約タイムライン ========== */}
            {todayOrdersByHour.length > 0 && (
              <div className="today-timeline-panel">
                <div className="today-timeline-header">
                  <span className="today-timeline-title">🕐 本日の予約状況</span>
                  <span className="today-timeline-date">
                    {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                  </span>
                </div>
                <div className="today-timeline-scroll">
                  {todayOrdersByHour.map(([hour, hourOrders]) => (
                    <div key={hour} className="today-timeline-slot">
                      <div className="today-timeline-slot-time">{hour}</div>
                      <div className="today-timeline-slot-cards">
                        {hourOrders.map(order => {
                          const statusColor: Record<string, string> = {
                            a: '#C40000', b: '#000DBD', c: '#287300',
                            f: '#7332a8', e: '#000', d: '#6B6B6B'
                          };
                          const color = statusColor[order.status] || '#555';
                          return (
                            <div
                              key={order.id_order}
                              className="today-timeline-card"
                              style={{ borderLeft: `4px solid ${color}` }}
                              onClick={() => setEditingOrder(order)}
                              title="クリックして編集"
                            >
                              <div className="today-timeline-card-header">
                                <span className="today-timeline-card-id">#{String(order.id_order).padStart(4, '0')}</span>
                                <span className="today-timeline-card-hour">{hour}</span>
                              </div>
                              <div className="today-timeline-card-name">
                                {order.first_name} {order.last_name}
                              </div>
                              {order.cakes?.map((cake, ci) => (
                                <div key={ci} className="today-timeline-card-cake">
                                  {cake.name} {cake.size && `(${cake.size})`}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tab-content">
              {loading ? (
                <p style={{ padding: '20px 0' }}>読み込み中...</p>
              ) : orders.length === 0 ? (
                <p style={{ padding: '20px 0' }}>注文が見つかりません。</p>
              ) : (
                <>
                  {activeTab === "all" && renderAllOrdersTable()}
                  {activeTab === "today" && renderTodayOrdersTable()}
                  {activeTab === "active" && renderActiveOrdersTable()}
                  {activeTab === "past" && renderPastDateOrdersTable()}
                  {activeTab === "completed" && renderCompletedOrdersTable()}
                  {activeTab === "cancelled" && renderCancelledOrdersTable()}
                </>
              )}
            </div>


            {/* Modal de edição */}
            {editingOrder && (
              <EditOrderModal
                editingOrder={editingOrder}
                setEditingOrder={setEditingOrder}
                handleSaveEdit={handleSaveEdit}
                isSaving={isSavingEdit}
              />
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}