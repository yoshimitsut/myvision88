import { useEffect, useState, useMemo } from "react";
import "./SalesOrder.css";
import type { Order, GiftOrder } from "../../types/types";
import { STATUS_OPTIONS } from "../../types/types";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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

    // ── CAKE fetch ───────────────────────────────────────────
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

      // Garantir todos bolos em todos os meses
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

    // ── GIFT fetch ───────────────────────────────────────────
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
          // Use date_order (creation date), take just YYYY-MM-DD
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

          // Acumular valor por status/dia
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

        // Garantir todos gifts em todos os meses
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

    // ── Run all ──────────────────────────────────────────────
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

  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>エラー</button>
    </div>
  );

  // ── Render helper: status table ──────────────────────────────
  const renderStatusTable = (
    monthData: MonthlyData | GiftMonthlyData,
    sv: { [status: string]: { [date: string]: number } }
  ) => (
    <div className="data-percentage">
      <table className="summary-table total-summary">
        <thead>
          <tr>
            <th>支払い状況</th>
            {monthData.dates.map((date) => (
              <th key={date} className={isToday(date) ? "current-day" : ""}>{formatDayOnly(date)}</th>
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
                <td className={`title-${label}`}>{label}</td>
                {monthData.dates.map((date) => {
                  const count = monthData.statusDayCounts[date]?.[value] || 0;
                  const val = sv[value]?.[date] || 0;
                  totalStatus += count; totalValue += val;
                  return <td key={`${value}-${date}`} className={isToday(date) ? "data-current-day" : ""}>{count}</td>;
                })}
                <td><strong>{totalStatus}</strong></td>
                <td><strong>¥{totalValue.toLocaleString("ja-JP")}</strong></td>
              </tr>
            );
          })}
          <tr className="sales-total-row">
            <td><strong>合計</strong></td>
            {monthData.dates.map((date) => {
              const total = statusOptions.filter(({ label }) => label !== "キャンセル")
                .reduce((s, { value }) => s + (monthData.statusDayCounts[date]?.[value] || 0), 0);
              return <td key={`total-${date}`} className={isToday(date) ? "data-current-day" : ""}><strong>{total}</strong></td>;
            })}
            <td><strong>{monthData.dates.reduce((s, d) => s + statusOptions.filter(({ label }) => label !== "キャンセル").reduce((ss, { value }) => ss + (monthData.statusDayCounts[d]?.[value] || 0), 0), 0)}</strong></td>
            <td><strong>¥{monthData.dates.reduce((s, d) => s + statusOptions.filter(({ label }) => label !== "キャンセル").reduce((ss, { value }) => ss + (sv[value]?.[d] || 0), 0), 0).toLocaleString("ja-JP")}</strong></td>
          </tr>
          <br /><br />
          {statusOptions.filter(({ label }) => label === "キャンセル").map(({ value, label }) => {
            let totalStatus = 0, totalValue = 0;
            return (
              <tr key={value} className="cancel-row">
                <td className={`title-${label}`}>{label}</td>
                {monthData.dates.map((date) => {
                  const count = monthData.statusDayCounts[date]?.[value] || 0;
                  const val = sv[value]?.[date] || 0;
                  totalStatus += count; totalValue += val;
                  return <td key={`${value}-${date}`} className={isToday(date) ? "data-current-day" : ""}>{count}</td>;
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

  // ── Gift status values (baseado em orderValues) ──────────────
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

  return (
    <div className="summary-table-container">
      {/* Botão Voltar */}
      <div className="table-order-actions" onClick={() => navigate("/list")}>
        <div className="btn-actions">
          <div className="btn-back">
            <img src="/icons/btn-back.png" alt="list icon" />
          </div>
        </div>
      </div>

      {/* ── Seletor de seção ── */}
      <div className="sales-view-tabs">
        <button
          className={`sales-view-tab ${viewType === "cake" ? "sales-view-tab--active" : ""}`}
          onClick={() => setViewType("cake")}
        >
          🎂 ケーキ
        </button>
        <button
          className={`sales-view-tab ${viewType === "gift" ? "sales-view-tab--active" : ""}`}
          onClick={() => setViewType("gift")}
        >
          🎁 ギフト
        </button>
      </div>

      {/* ══════════════════════════════════════════
          🎂 SEÇÃO CAKE
          ══════════════════════════════════════════ */}
      {viewType === "cake" && <>

      {/* Abas de Meses - Cake */}
      <div className="month-tabs-container">
        <div className="month-tabs">
          {monthlyData.map(({ month, label }) => (
            <button
              key={month}
              className={`tab-button ${activeMonth === month ? "active" : ""} ${isCurrentMonth(month) ? "current-month-tab" : ""}`}
              onClick={() => setActiveMonth(month)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeMonthData && (
        <div className="tab-content">
          {/* Total Geral */}
          <div className="cake-table-wrapper">
            <table className="summary-table total-summary">
              <thead>
                <tr>
                  <th>日付毎の合計</th>
                  {activeMonthData.dates.map((date) => (
                    <th key={date} className={isToday(date) ? "current-day" : ""}>{formatDayOnly(date)}</th>
                  ))}
                  <th>月合計</th>
                </tr>
              </thead>
              <tbody>
                <tr className="sales-total-row">
                  <td></td>
                  {activeMonthData.dates.map((date) => (
                    <td key={date} className={isToday(date) ? "data-current-day" : ""}><strong>{totalGeralPorDia[date] || 0}</strong></td>
                  ))}
                  <td><strong>{totalGlobal}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabelas por Bolo */}
          {getCakesInOrder.map((cake) => {
            const cakeName = cake.name.trim();
            const sizes = activeMonthData.summary[cakeName] || {};
            const totalPorDia = activeMonthData.dates.reduce((acc: Record<string, number>, date) => {
              acc[date] = Object.values(sizes).reduce((t, sd) => t + (sd.days[date] || 0), 0);
              return acc;
            }, {});
            const totalGeral = Object.values(totalPorDia).reduce((a, b) => a + b, 0);
            return (
              <div key={cake.id} className="cake-table-wrapper">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>{cakeName}</th>
                      {activeMonthData.dates.map((date) => (
                        <th key={date} className={isToday(date) ? "current-day" : ""}>{formatDayOnly(date)}</th>
                      ))}
                      <th>月合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sizes).map(([size, sizeData]) => {
                      const total = activeMonthData.dates.reduce((s, d) => s + (sizeData.days[d] || 0), 0);
                      return (
                        <tr key={`${cakeName}-${size}`}>
                          <td>{size}</td>
                          {activeMonthData.dates.map((date) => (
                            <td key={date} className={isToday(date) ? "data-current-day" : ""}>{sizeData.days[date] || 0}</td>
                          ))}
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}
                    <tr className="sales-total-row">
                      <td><strong>合計 →</strong></td>
                      {activeMonthData.dates.map((date) => (
                        <td key={date} className={isToday(date) ? "data-current-day" : ""}><strong>{totalPorDia[date] || 0}</strong></td>
                      ))}
                      <td><strong>{totalGeral}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Status Cake */}
          {renderStatusTable(activeMonthData, statusValues)}
        </div>
      )}
      </> }

      {/* ══════════════════════════════════════════
          🎁 SEÇÃO GIFT
          ══════════════════════════════════════════ */}
      {viewType === "gift" && <>

      {/* Abas de Meses - Gift */}
      <div className="month-tabs-container">
        <div className="month-tabs">
          {giftMonthlyData.map(({ month, label }) => (
            <button
              key={month}
              className={`tab-button ${giftActiveMonth === month ? "active" : ""} ${isCurrentMonth(month) ? "current-month-tab" : ""}`}
              onClick={() => setGiftActiveMonth(month)}
            >
              {label}
            </button>
          ))}
          {giftMonthlyData.length === 0 && (
            <span style={{ color: "#999", padding: "8px 12px", fontSize: "0.9rem" }}>注文なし</span>
          )}
        </div>
      </div>

      {activeGiftMonthData && (
        <div className="tab-content">
          {/* Total Geral Gift */}
          <div className="cake-table-wrapper">
            <table className="summary-table total-summary">
              <thead>
                <tr>
                  <th>日付毎の合計</th>
                  {activeGiftMonthData.dates.map((date) => (
                    <th key={date} className={isToday(date) ? "current-day" : ""}>{formatDayOnly(date)}</th>
                  ))}
                  <th>月合計</th>
                </tr>
              </thead>
              <tbody>
                <tr className="sales-total-row">
                  <td></td>
                  {activeGiftMonthData.dates.map((date) => (
                    <td key={date} className={isToday(date) ? "data-current-day" : ""}><strong>{giftTotalPorDia[date] || 0}</strong></td>
                  ))}
                  <td><strong>{giftTotalGlobal}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabelas por Gift */}
          {getGiftsInOrder.map((gift) => {
            const giftName = gift.name.trim();
            const sizes = activeGiftMonthData.summary[giftName] || {};
            const totalPorDia = activeGiftMonthData.dates.reduce((acc: Record<string, number>, date) => {
              acc[date] = Object.values(sizes).reduce((t, sd) => t + (sd.days[date] || 0), 0);
              return acc;
            }, {});
            const totalGeral = Object.values(totalPorDia).reduce((a, b) => a + b, 0);
            return (
              <div key={gift.id} className="cake-table-wrapper">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>{giftName}</th>
                      {activeGiftMonthData.dates.map((date) => (
                        <th key={date} className={isToday(date) ? "current-day" : ""}>{formatDayOnly(date)}</th>
                      ))}
                      <th>月合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sizes).map(([size, sizeData]) => {
                      const total = activeGiftMonthData.dates.reduce((s, d) => s + (sizeData.days[d] || 0), 0);
                      return (
                        <tr key={`${giftName}-${size}`}>
                          <td>{size}</td>
                          {activeGiftMonthData.dates.map((date) => (
                            <td key={date} className={isToday(date) ? "data-current-day" : ""}>{sizeData.days[date] || 0}</td>
                          ))}
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}
                    <tr className="sales-total-row">
                      <td><strong>合計 →</strong></td>
                      {activeGiftMonthData.dates.map((date) => (
                        <td key={date} className={isToday(date) ? "data-current-day" : ""}><strong>{totalPorDia[date] || 0}</strong></td>
                      ))}
                      <td><strong>{totalGeral}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Status Gift */}
          {renderStatusTable(activeGiftMonthData, giftStatusValues)}
        </div>
      )}
      </> }
    </div>
  );
}