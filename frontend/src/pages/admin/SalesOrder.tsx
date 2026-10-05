import { useEffect, useState, useMemo } from "react";
import "./SalesOrder.css";
import type { Order, GiftOrder } from "../../types/types";
import { STATUS_OPTIONS } from "../../types/types";
import AdminSidebar from "../../components/admin/AdminSidebar";

// ── Interfaces Cake ──────────────────────────────────────────
interface CakeSizeData { stock: number; days: Record<string, number>; }
interface SummaryType { [cakeName: string]: { [size: string]: CakeSizeData }; }
interface StatusDayCountsType { [date: string]: { [status: string]: number }; }

interface MonthlyData {
  month: string; label: string; dates: string[];
  summary: SummaryType; statusDayCounts: StatusDayCountsType;
}

interface Cake {
  id: number; name: string;
  sizes: Array<{ size: string; price: number; stock: number }>;
}

// ── Interfaces Gift ──────────────────────────────────────────
interface GiftItemSummary { days: Record<string, number>; }
interface GiftSummaryType { [giftName: string]: { [size: string]: GiftItemSummary }; }

interface GiftMonthlyData {
  month: string; label: string; dates: string[];
  summary: GiftSummaryType;
  statusDayCounts: StatusDayCountsType;
  orderValues: { [date: string]: { [status: string]: number } };
}

interface GiftProduct {
  id: number; name: string;
  sizes: Array<{ size: string; price: number; stock: number }>;
}

// ── Helpers ──────────────────────────────────────────────────
const isToday = (d: string) => new Date().toDateString() === new Date(d).toDateString();
const formatDayOnly = (d: string) => `${new Date(d).getDate()}日`;
const isCurrentMonth = (m: string) => {
  const n = new Date();
  return m === `${n.getFullYear()}-${(n.getMonth() + 1).toString().padStart(2, "0")}`;
};

export default function SalesOrder() {
  const statusOptions = STATUS_OPTIONS;

  // ── View tab ─────────────────────────────────────────────────
  const [viewType, setViewType] = useState<"cake" | "gift">("cake");

  // ── Cake state ───────────────────────────────────────────────
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allCakes, setAllCakes] = useState<Cake[]>([]);

  // ── Gift state ───────────────────────────────────────────────
  const [giftMonthlyData, setGiftMonthlyData] = useState<GiftMonthlyData[]>([]);
  const [giftActiveMonth, setGiftActiveMonth] = useState<string>("");
  const [giftOrders, setGiftOrders] = useState<GiftOrder[]>([]);
  const [allGifts, setAllGifts] = useState<GiftProduct[]>([]);

  // ── Fetch all data ───────────────────────────────────────────
  useEffect(() => {
    const token = () => sessionStorage.getItem("store_token");
    const headers = () => ({ Authorization: `Bearer ${token()}` });

    const fetchCakes = async (): Promise<Cake[]> => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cake`, { headers: headers() });
      const data = await res.json();
      if (data.success && Array.isArray(data.cakes)) {
        const sorted = data.cakes.sort((a: Cake, b: Cake) => a.id - b.id);
        setAllCakes(sorted);
        return sorted;
      }
      return [];
    };

    const fetchCakeOrders = async (cakes: Cake[]) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/list`, { headers: headers() });
      const data = await res.json();
      let raw: Order[] = Array.isArray(data) ? data : (data.orders || data.data || []);
      setOrders(raw);

      const map = new Map<string, MonthlyData>();
      raw.forEach((order) => {
        const status = order.status?.toLowerCase() || "";
        const date = order.date;
        const monthKey = date.substring(0, 7);
        if (!map.has(monthKey)) {
          map.set(monthKey, {
            month: monthKey,
            label: `${date.split("-")[0]}年${date.split("-")[1]}月`,
            dates: [], summary: {}, statusDayCounts: {}
          });
        }
        const md = map.get(monthKey)!;
        if (!md.dates.includes(date)) md.dates.push(date);
        if (!md.statusDayCounts[date]) md.statusDayCounts[date] = {};
        md.statusDayCounts[date][status] = (md.statusDayCounts[date][status] || 0) + 1;

        if (status !== "e") {
          order.cakes.forEach((cake) => {
            const name = cake.name?.trim() || "Nome não definido";
            const size = cake.size?.trim() || "Tamanho não definido";
            const amount = Number(cake.amount) || 0;
            const stock = Number(cake.stock) || 0;
            if (!md.summary[name]) md.summary[name] = {};
            if (!md.summary[name][size]) md.summary[name][size] = { stock, days: {} };
            if (md.summary[name][size].stock === 0 && stock > 0) md.summary[name][size].stock = stock;
            md.summary[name][size].days[date] = (md.summary[name][size].days[date] || 0) + amount;
          });
        }
      });

      map.forEach((md) => {
        cakes.forEach((cake) => {
          const n = cake.name.trim();
          if (!md.summary[n]) md.summary[n] = {};
          cake.sizes.forEach((s) => {
            if (!md.summary[n][s.size.trim()]) {
              md.summary[n][s.size.trim()] = { stock: s.stock, days: {} };
              md.dates.forEach((d) => { md.summary[n][s.size.trim()].days[d] = 0; });
            }
          });
        });
      });

      const processed = Array.from(map.values())
        .map((md) => ({ ...md, dates: md.dates.sort() }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyData(processed);
      const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
      const found = processed.find((m) => m.month === currentMonth);
      setActiveMonth(found ? currentMonth : processed[processed.length - 1]?.month || "");
    };

    const fetchGiftProducts = async (): Promise<GiftProduct[]> => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gift`, { headers: headers() });
        const data = await res.json();
        if (data.success && Array.isArray(data.gift)) {
          const sorted = data.gift.sort((a: GiftProduct, b: GiftProduct) => a.id - b.id);
          setAllGifts(sorted);
          return sorted;
        }
        return [];
      } catch { return []; }
    };

    const fetchGiftOrders = async (gifts: GiftProduct[]) => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gift-orders/list`, { headers: headers() });
        const data = await res.json();
        if (!data.success) return;
        const raw: GiftOrder[] = data.orders || [];
        setGiftOrders(raw);

        const map = new Map<string, GiftMonthlyData>();
        raw.forEach((order) => {
          const status = order.status?.toLowerCase() || "";
          const fullDate = order.date_order ? order.date_order.substring(0, 10) : "";
          if (!fullDate) return;
          const monthKey = fullDate.substring(0, 7);

          if (!map.has(monthKey)) {
            map.set(monthKey, {
              month: monthKey,
              label: `${fullDate.split("-")[0]}年${fullDate.split("-")[1]}月`,
              dates: [], summary: {}, statusDayCounts: {}, orderValues: {}
            });
          }
          const md = map.get(monthKey)!;
          if (!md.dates.includes(fullDate)) md.dates.push(fullDate);
          if (!md.statusDayCounts[fullDate]) md.statusDayCounts[fullDate] = {};
          md.statusDayCounts[fullDate][status] = (md.statusDayCounts[fullDate][status] || 0) + 1;

          if (!md.orderValues[fullDate]) md.orderValues[fullDate] = {};
          md.orderValues[fullDate][status] = (md.orderValues[fullDate][status] || 0) + (order.total_amount || 0);

          if (status !== "e") {
            order.items.forEach((item) => {
              const name = item.name?.trim() || "Nome não definido";
              const size = item.size?.trim() || "Tamanho não definido";
              const amount = Number(item.amount) || 0;
              if (!md.summary[name]) md.summary[name] = {};
              if (!md.summary[name][size]) md.summary[name][size] = { days: {} };
              md.summary[name][size].days[fullDate] = (md.summary[name][size].days[fullDate] || 0) + amount;
            });
          }
        });

        map.forEach((md) => {
          gifts.forEach((gift) => {
            const n = gift.name.trim();
            if (!md.summary[n]) md.summary[n] = {};
            gift.sizes.forEach((s) => {
              if (!md.summary[n][s.size.trim()]) {
                md.summary[n][s.size.trim()] = { days: {} };
                md.dates.forEach((d) => { md.summary[n][s.size.trim()].days[d] = 0; });
              }
            });
          });
        });

        const processed = Array.from(map.values())
          .map((md) => ({ ...md, dates: md.dates.sort() }))
          .sort((a, b) => a.month.localeCompare(b.month));

        setGiftMonthlyData(processed);
        const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
        const found = processed.find((m) => m.month === currentMonth);
        setGiftActiveMonth(found ? currentMonth : processed[processed.length - 1]?.month || "");
      } catch (err) {
        console.error("Erro ao carregar gift orders:", err);
      }
    };

    const run = async () => {
      try {
        const [cakes, gifts] = await Promise.all([fetchCakes(), fetchGiftProducts()]);
        await Promise.all([fetchCakeOrders(cakes), fetchGiftOrders(gifts)]);
      } catch (err) {
        setError("Erro ao carregar dados: " + err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // ── Cake memos ───────────────────────────────────────────────
  const activeMonthData = useMemo(() => monthlyData.find((m) => m.month === activeMonth), [monthlyData, activeMonth]);

  const statusValues = useMemo(() => {
    if (!activeMonthData) return {};
    const values: { [status: string]: { [date: string]: number } } = {};
    statusOptions.forEach(({ value }) => {
      values[value] = {};
      activeMonthData.dates.forEach((date) => {
        values[value][date] = orders
          .filter((o) => o.date === date && o.status === value)
          .reduce((sum, o) => sum + o.cakes.reduce((cs, c) => cs + c.price * c.amount, 0), 0);
      });
    });
    return values;
  }, [activeMonthData, orders, statusOptions]);

  const totalGeralPorDia = useMemo(() => {
    if (!activeMonthData) return {};
    return activeMonthData.dates.reduce((acc: Record<string, number>, date) => {
      acc[date] = Object.values(activeMonthData.summary).reduce((t, sizes) =>
        t + Object.values(sizes).reduce((s, sd) => s + (sd.days[date] || 0), 0), 0);
      return acc;
    }, {});
  }, [activeMonthData]);

  const totalGlobal = Object.values(totalGeralPorDia).reduce((a, b) => a + b, 0);

  const getCakesInOrder = useMemo(() =>
    allCakes.sort((a, b) => a.id - b.id),
    [allCakes]
  );

  // ── Gift memos ───────────────────────────────────────────────
  const activeGiftMonthData = useMemo(() => giftMonthlyData.find((m) => m.month === giftActiveMonth), [giftMonthlyData, giftActiveMonth]);

  const giftTotalPorDia = useMemo(() => {
    if (!activeGiftMonthData) return {};
    return activeGiftMonthData.dates.reduce((acc: Record<string, number>, date) => {
      acc[date] = Object.values(activeGiftMonthData.summary).reduce((t, sizes) =>
        t + Object.values(sizes).reduce((s, sd) => s + (sd.days[date] || 0), 0), 0);
      return acc;
    }, {});
  }, [activeGiftMonthData]);

  const giftTotalGlobal = Object.values(giftTotalPorDia).reduce((a, b) => a + b, 0);

  const getGiftsInOrder = useMemo(() =>
    allGifts.sort((a, b) => a.id - b.id),
    [allGifts]
  );

  const giftStatusValues = useMemo(() => {
    if (!activeGiftMonthData) return {};
    const values: { [status: string]: { [date: string]: number } } = {};
    statusOptions.forEach(({ value }) => {
      values[value] = {};
      activeGiftMonthData.dates.forEach((date) => {
        values[value][date] = giftOrders
          .filter((o) => {
            const d = o.date_order?.substring(0, 10);
            return d === date && o.status === value;
          })
          .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      });
    });
    return values;
  }, [activeGiftMonthData, giftOrders, statusOptions]);

  // ── Render helper: status table ──────────────────────────────
  const renderStatusTable = (
    monthData: MonthlyData | GiftMonthlyData,
    sv: { [status: string]: { [date: string]: number } }
  ) => (
    <div className="so-data-percentage">
      <table className="so-summary-table so-total-summary">
        <thead>
          <tr>
            <th>支払い状況</th>
            {monthData.dates.map((date) => (
              <th key={date} className={isToday(date) ? "so-current-day" : ""}>{formatDayOnly(date)}</th>
            ))}
            <th>合計(件数)</th>
            <th>合計(金額)</th>
          </tr>
        </thead>
        <tbody>
          {statusOptions.filter(({ label }) => label !== "キャンセル").map(({ value, label }) => {
            let totalStatus = 0, totalValue = 0;
            return (
              <tr key={value}>
                <td className={`so-title-${label}`}>{label}</td>
                {monthData.dates.map((date) => {
                  const count = monthData.statusDayCounts[date]?.[value] || 0;
                  const val = sv[value]?.[date] || 0;
                  totalStatus += count; totalValue += val;
                  return <td key={`${value}-${date}`} className={isToday(date) ? "so-data-current-day" : ""}>{count}</td>;
                })}
                <td><strong>{totalStatus}</strong></td>
                <td><strong>¥{totalValue.toLocaleString("ja-JP")}</strong></td>
              </tr>
            );
          })}
          <tr className="so-sales-total-row">
            <td><strong>合計</strong></td>
            {monthData.dates.map((date) => {
              const total = statusOptions.filter(({ label }) => label !== "キャンセル")
                .reduce((s, { value }) => s + (monthData.statusDayCounts[date]?.[value] || 0), 0);
              return <td key={`total-${date}`} className={isToday(date) ? "so-data-current-day" : ""}><strong>{total}</strong></td>;
            })}
            <td><strong>{monthData.dates.reduce((s, d) => s + statusOptions.filter(({ label }) => label !== "キャンセル").reduce((ss, { value }) => ss + (monthData.statusDayCounts[d]?.[value] || 0), 0), 0)}</strong></td>
            <td><strong>¥{monthData.dates.reduce((s, d) => s + statusOptions.filter(({ label }) => label !== "キャンセル").reduce((ss, { value }) => ss + (sv[value]?.[d] || 0), 0), 0).toLocaleString("ja-JP")}</strong></td>
          </tr>
          <tr><td colSpan={monthData.dates.length + 3} style={{ padding: '4px', background: 'transparent', border: 'none' }}></td></tr>
          {statusOptions.filter(({ label }) => label === "キャンセル").map(({ value, label }) => {
            let totalStatus = 0, totalValue = 0;
            return (
              <tr key={value} className="so-cancel-row">
                <td className={`so-title-${label}`}>{label}</td>
                {monthData.dates.map((date) => {
                  const count = monthData.statusDayCounts[date]?.[value] || 0;
                  const val = sv[value]?.[date] || 0;
                  totalStatus += count; totalValue += val;
                  return <td key={`${value}-${date}`} className={isToday(date) ? "so-data-current-day" : ""}>{count}</td>;
                })}
                <td><strong>{totalStatus}</strong></td>
                <td><strong>¥{totalValue.toLocaleString("ja-JP")}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (error) return (
    <div className="so-error-container">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>再読み込み</button>
    </div>
  );

  const currentMonthData = viewType === "cake" ? activeMonthData : activeGiftMonthData;
  const currentMonthDates = currentMonthData?.dates || [];

  // Compute sidebar-compatible counts from orders for the sidebar
  const activeOrdersForSidebar = orders.filter(o => o.status === "b" || o.status === "f");
  const todayOrdersForSidebar = orders.filter(o => o.status === "c");
  const pastDateOrdersForSidebar = orders.filter(o => {
    const d = new Date(o.date);
    return d < new Date() && o.status !== "d" && o.status !== "e";
  });
  const completedOrdersForSidebar = orders.filter(o => o.status === "d");
  const cancelledOrdersForSidebar = orders.filter(o => o.status === "e");

  return (
    <div className="so-page-layout">
      {/* Sidebar */}
      <AdminSidebar
        orders={orders}
        activeOrders={activeOrdersForSidebar}
        todayOrders={todayOrdersForSidebar}
        pastDateOrders={pastDateOrdersForSidebar}
        completedOrders={completedOrdersForSidebar}
        cancelledOrders={cancelledOrdersForSidebar}
      />

      {/* Main Content */}
      <div className="so-main-content">
        {/* Header */}
        <div className="so-header">
          <h2 className="so-page-title">予約グラフ</h2>
        </div>

        {/* Month Tabs */}
        <div className="so-month-tabs-row">
          {viewType === "cake"
            ? monthlyData.map(({ month, label }) => (
                <button
                  key={month}
                  className={`so-month-tab ${activeMonth === month ? "so-month-tab--active" : ""} ${isCurrentMonth(month) ? "so-month-tab--current" : ""}`}
                  onClick={() => setActiveMonth(month)}
                >
                  {label}
                  {isCurrentMonth(month) && <span className="so-current-badge">当月</span>}
                </button>
              ))
            : giftMonthlyData.map(({ month, label }) => (
                <button
                  key={month}
                  className={`so-month-tab ${giftActiveMonth === month ? "so-month-tab--active" : ""} ${isCurrentMonth(month) ? "so-month-tab--current" : ""}`}
                  onClick={() => setGiftActiveMonth(month)}
                >
                  {label}
                  {isCurrentMonth(month) && <span className="so-current-badge">当月</span>}
                </button>
              ))
          }
        </div>

        {/* View Type Tabs */}
        <div className="so-view-tabs">
          <button
            className={`so-view-tab ${viewType === "cake" ? "so-view-tab--active" : ""}`}
            onClick={() => setViewType("cake")}
          >
            🎂 ケーキ
          </button>
          <button
            className={`so-view-tab ${viewType === "gift" ? "so-view-tab--active" : ""}`}
            onClick={() => setViewType("gift")}
          >
            🎁 ギフト
          </button>
        </div>

        {/* ─── CAKE SECTION ─── */}
        {viewType === "cake" && activeMonthData && (
          <div className="so-tab-content">
            {/* Grand Total Row */}
            <div className="so-table-block">
              <table className="so-summary-table so-total-summary">
                <thead>
                  <tr>
                    <th>日付毎の合計</th>
                    {activeMonthData.dates.map((date) => (
                      <th key={date} className={isToday(date) ? "so-current-day" : ""}>{formatDayOnly(date)}</th>
                    ))}
                    <th>月合計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="so-grand-total-row">
                    <td></td>
                    {activeMonthData.dates.map((date) => (
                      <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>
                        <strong>{totalGeralPorDia[date] || 0}</strong>
                      </td>
                    ))}
                    <td><strong>{totalGlobal}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Per-Cake Tables */}
            {getCakesInOrder.map((cake) => {
              const cakeName = cake.name.trim();
              const sizes = activeMonthData.summary[cakeName] || {};
              const totalPorDia = activeMonthData.dates.reduce((acc: Record<string, number>, date) => {
                acc[date] = Object.values(sizes).reduce((t, sd) => t + (sd.days[date] || 0), 0);
                return acc;
              }, {});
              const totalGeral = Object.values(totalPorDia).reduce((a, b) => a + b, 0);
              return (
                <div key={cake.id} className="so-table-block">
                  <table className="so-summary-table">
                    <thead>
                      <tr>
                        <th className="so-cake-name-header">{cakeName}</th>
                        {activeMonthData.dates.map((date) => (
                          <th key={date} className={isToday(date) ? "so-current-day" : ""}>{formatDayOnly(date)}</th>
                        ))}
                        <th>月合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sizes).map(([size, sizeData]) => {
                        const total = activeMonthData.dates.reduce((s, d) => s + (sizeData.days[d] || 0), 0);
                        return (
                          <tr key={`${cakeName}-${size}`}>
                            <td className="so-size-cell">{size}</td>
                            {activeMonthData.dates.map((date) => (
                              <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>{sizeData.days[date] || 0}</td>
                            ))}
                            <td className="so-total-cell">{total}</td>
                          </tr>
                        );
                      })}
                      <tr className="so-subtotal-row">
                        <td><strong>合計 →</strong></td>
                        {activeMonthData.dates.map((date) => (
                          <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>
                            <strong>{totalPorDia[date] || 0}</strong>
                          </td>
                        ))}
                        <td><strong>{totalGeral}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Status table */}
            {renderStatusTable(activeMonthData, statusValues)}
          </div>
        )}

        {/* ─── GIFT SECTION ─── */}
        {viewType === "gift" && activeGiftMonthData && (
          <div className="so-tab-content">
            <div className="so-table-block">
              <table className="so-summary-table so-total-summary">
                <thead>
                  <tr>
                    <th>日付毎の合計</th>
                    {activeGiftMonthData.dates.map((date) => (
                      <th key={date} className={isToday(date) ? "so-current-day" : ""}>{formatDayOnly(date)}</th>
                    ))}
                    <th>月合計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="so-grand-total-row">
                    <td></td>
                    {activeGiftMonthData.dates.map((date) => (
                      <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>
                        <strong>{giftTotalPorDia[date] || 0}</strong>
                      </td>
                    ))}
                    <td><strong>{giftTotalGlobal}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {getGiftsInOrder.map((gift) => {
              const giftName = gift.name.trim();
              const sizes = activeGiftMonthData.summary[giftName] || {};
              const totalPorDia = activeGiftMonthData.dates.reduce((acc: Record<string, number>, date) => {
                acc[date] = Object.values(sizes).reduce((t, sd) => t + (sd.days[date] || 0), 0);
                return acc;
              }, {});
              const totalGeral = Object.values(totalPorDia).reduce((a, b) => a + b, 0);
              return (
                <div key={gift.id} className="so-table-block">
                  <table className="so-summary-table">
                    <thead>
                      <tr>
                        <th className="so-cake-name-header">{giftName}</th>
                        {activeGiftMonthData.dates.map((date) => (
                          <th key={date} className={isToday(date) ? "so-current-day" : ""}>{formatDayOnly(date)}</th>
                        ))}
                        <th>月合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sizes).map(([size, sizeData]) => {
                        const total = activeGiftMonthData.dates.reduce((s, d) => s + (sizeData.days[d] || 0), 0);
                        return (
                          <tr key={`${giftName}-${size}`}>
                            <td className="so-size-cell">{size}</td>
                            {activeGiftMonthData.dates.map((date) => (
                              <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>{sizeData.days[date] || 0}</td>
                            ))}
                            <td className="so-total-cell">{total}</td>
                          </tr>
                        );
                      })}
                      <tr className="so-subtotal-row">
                        <td><strong>合計 →</strong></td>
                        {activeGiftMonthData.dates.map((date) => (
                          <td key={date} className={isToday(date) ? "so-data-current-day" : ""}>
                            <strong>{totalPorDia[date] || 0}</strong>
                          </td>
                        ))}
                        <td><strong>{totalGeral}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            {renderStatusTable(activeGiftMonthData, giftStatusValues)}
          </div>
        )}

        {viewType === "gift" && giftMonthlyData.length === 0 && (
          <p className="so-empty">ギフト注文がありません。</p>
        )}
      </div>
    </div>
  );
}