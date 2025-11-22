import { useEffect, useState, useMemo } from "react";
import "./SalesOrder.css";
import type { Order } from "../types/types";
import { STATUS_OPTIONS } from "../types/types";
import { useNavigate } from "react-router-dom";

// Interfaces para tipagem correta
interface CakeSizeData {
  stock: number;
  days: Record<string, number>;
}

interface SummaryType {
  [cakeName: string]: {
    [size: string]: CakeSizeData;
  };
}

interface StatusDayCountsType {
  [date: string]: {
    [status: string]: number;
  };
}

interface MonthlyData {
  month: string;
  label: string;
  dates: string[];
  summary: SummaryType;
  statusDayCounts: StatusDayCountsType;
}

interface Cake {
  id: number;
  name: string;
  sizes: Array<{
    size: string;
    price: number;
    stock: number;
  }>;
}

export default function SalesOrder() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allCakes, setAllCakes] = useState<Cake[]>([]); // 🔹 NOVO: Lista de todos os bolos

  const navigate = useNavigate();
  const statusOptions = STATUS_OPTIONS;

  // 🔹 Função para verificar se é o dia atual
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const targetDate = new Date(dateString);
    
    return today.toDateString() === targetDate.toDateString();
  };

  // 🔹 Função para formatar apenas o dia com 日
  const formatDayOnly = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString();
    return `${day}日`;
  };

  // 🔹 Função para verificar se é o mês atual
  const isCurrentMonth = (month: string): boolean => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return month === currentMonth;
  };

  useEffect(() => {
    // 🔹 CARREGAR TODOS OS BOLOS PRIMEIRO
    const fetchAllCakes = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cake`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.cakes)) {
          // Ordenar bolos pelo ID
          const sortedCakes = data.cakes.sort((a: Cake, b: Cake) => a.id - b.id);
          setAllCakes(sortedCakes);
          console.log("Todos os bolos carregados:", sortedCakes);
          return sortedCakes;
        } else {
          throw new Error("Formato de resposta inesperado para bolos");
        }
      } catch (error) {
        console.error("Erro ao carregar bolos:", error);
        return [];
      }
    };

    // 🔹 CARREGAR PEDIDOS E PROCESSAR DADOS
    const fetchOrdersAndProcess = async () => {
      try {
        const cakes = await fetchAllCakes();
        
        const ordersResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/list`);
        const ordersData = await ordersResponse.json();
        
        console.log("Resposta completa da API:", ordersData);
        
        let ordersDataProcessed: Order[] = [];
        
        if (Array.isArray(ordersData)) {
          ordersDataProcessed = ordersData;
        } else if (ordersData.orders && Array.isArray(ordersData.orders)) {
          ordersDataProcessed = ordersData.orders;
        } else if (ordersData.data && Array.isArray(ordersData.data)) {
          ordersDataProcessed = ordersData.data;
        } else {
          throw new Error("Formato de resposta inesperado da API");
        }

        console.log("Pedidos processados:", ordersDataProcessed);

        // Processar dados por mês
        const monthlyDataMap = new Map<string, MonthlyData>();
        const allDates = new Set<string>();

        ordersDataProcessed.forEach((order) => {
          const status = order.status?.toLowerCase() || '';
          const date = order.date;
          const monthKey = date.substring(0, 7); // YYYY-MM
          
          allDates.add(date);
          
          if (!monthlyDataMap.has(monthKey)) {
            monthlyDataMap.set(monthKey, {
              month: monthKey,
              label: `${date.split('-')[0]}年${date.split('-')[1]}月`,
              dates: [],
              summary: {},
              statusDayCounts: {}
            });
          }
          
          const monthData = monthlyDataMap.get(monthKey)!;
          
          // Adicionar data se não existir
          if (!monthData.dates.includes(date)) {
            monthData.dates.push(date);
          }
          
          // Inicializar contador de status para esta data
          if (!monthData.statusDayCounts[date]) {
            monthData.statusDayCounts[date] = {};
          }
          monthData.statusDayCounts[date][status] = (monthData.statusDayCounts[date][status] || 0) + 1;
          
          // Processar bolos (excluir status "e")
          if (status !== "e") {
            order.cakes.forEach((cake) => {
              // Verificar se name e size não são null antes de usar trim()
              const name = cake.name ? cake.name.trim() : "Nome não definido";
              const size = cake.size ? cake.size.trim() : "Tamanho não definido";
              const amount = Number(cake.amount) || 0;
              const stock = Number(cake.stock) || 0;

              if (!monthData.summary[name]) monthData.summary[name] = {};
              if (!monthData.summary[name][size]) {
                monthData.summary[name][size] = {
                  stock: stock,
                  days: {}
                };
              }
              
              // Atualizar stock se for o primeiro bolo encontrado
              if (monthData.summary[name][size].stock === 0 && stock > 0) {
                monthData.summary[name][size].stock = stock;
              }
              
              if (!monthData.summary[name][size].days[date]) {
                monthData.summary[name][size].days[date] = 0;
              }

              monthData.summary[name][size].days[date] += amount;
            });
          }
        });

        // 🔹 GARANTIR QUE TODOS OS BOLOS APAREÇAM, MESMO SEM PEDIDOS
        monthlyDataMap.forEach((monthData) => {
          cakes.forEach((cake: Cake) => {
            const cakeName = cake.name.trim();
            
            // Se o bolo não existe no summary, criar estrutura vazia
            if (!monthData.summary[cakeName]) {
              monthData.summary[cakeName] = {};
            }
            
            // Garantir que todos os tamanhos do bolo apareçam
            cake.sizes.forEach(sizeInfo => {
              const size = sizeInfo.size.trim();
              
              if (!monthData.summary[cakeName][size]) {
                monthData.summary[cakeName][size] = {
                  stock: sizeInfo.stock,
                  days: {}
                };
                
                // Inicializar todos os dias com 0
                monthData.dates.forEach(date => {
                  monthData.summary[cakeName][size].days[date] = 0;
                });
              }
            });
          });
        });

        // Ordenar datas em cada mês e criar array final
        const processedMonthlyData = Array.from(monthlyDataMap.values()).map(monthData => ({
          ...monthData,
          dates: monthData.dates.sort()
        })).sort((a, b) => a.month.localeCompare(b.month));

        console.log("Dados mensais processados:", processedMonthlyData);
        
        // 🔹 ENCONTRAR O MÊS ATUAL AUTOMATICAMENTE
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        // Tentar encontrar o mês atual nos dados
        const foundCurrentMonth = processedMonthlyData.find(month => month.month === currentMonth);
        
        // Se não encontrar, usar o último mês disponível
        const initialMonth = foundCurrentMonth ? currentMonth : (processedMonthlyData[processedMonthlyData.length - 1]?.month || "");

        setMonthlyData(processedMonthlyData);
        setActiveMonth(initialMonth);
        setOrders(ordersDataProcessed);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        setError("Erro ao carregar dados: " + error);
        setLoading(false);
      }
    };

    fetchOrdersAndProcess();
  }, []);

  // Encontrar dados do mês ativo
  const activeMonthData = useMemo(() => 
    monthlyData.find(month => month.month === activeMonth),
    [monthlyData, activeMonth]
  );

  // Cálculo dos valores por status para o mês ativo
  const statusValues = useMemo(() => {
    if (!activeMonthData) return {};
    
    const values: { [status: string]: { [date: string]: number } } = {};
    const { dates } = activeMonthData;
    
    statusOptions.forEach(({ value }) => {
      values[value] = {};
      dates.forEach(date => {
        values[value][date] = orders
          .filter(order => order.date === date && order.status === value)
          .reduce((sum: number, order: Order) => {
            const orderTotal = order.cakes.reduce((cakeSum: number, cake) => 
              cakeSum + (cake.price * cake.amount), 0
            );
            return sum + orderTotal;
          }, 0);
      });
    });
    
    return values;
  }, [activeMonthData, orders, statusOptions]);

  // 🔹 Cálculo do total geral de todos os bolos por dia no mês ativo
  const totalGeralPorDia = useMemo(() => {
    if (!activeMonthData) return {};
    
    return activeMonthData.dates.reduce((acc: Record<string, number>, date) => {
      let total = 0;
      Object.values(activeMonthData.summary).forEach((sizes) => {
        Object.values(sizes).forEach((sizeData) => {
          total += sizeData.days[date] || 0;
        });
      });
      acc[date] = total;
      return acc;
    }, {});
  }, [activeMonthData]);

  const totalGlobal = Object.values(totalGeralPorDia).reduce((a, b) => a + b, 0);

  // 🔹 FUNÇÃO PARA OBTER BOLOS ORDENADOS POR ID
  const getCakesInOrder = useMemo(() => {
    if (!activeMonthData) return [];
    
    // Criar array de bolos ordenados por ID
    const orderedCakes = allCakes
      // .filter(cake => {
      //   // Incluir apenas bolos que existem no summary OU todos os bolos
      //   const cakeName = cake.name.trim();
      //   return activeMonthData.summary[cakeName] !== undefined;
      // })
      .sort((a, b) => a.id - b.id); // Ordenar por ID
    
    // console.log("Bolos ordenados por ID:", orderedCakes);
    return orderedCakes;
  }, [activeMonthData, allCakes]);

  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>エラー</button>
    </div>
  );

  // if (monthlyData.length === 0) return (
  //   <div className="loading-container">
  //     <p>Loading...</p>
  //   </div>
  // );

  return (
    <div className="summary-table-container">
      <div className="table-order-actions" onClick={() => navigate("/list")}>
        <div className='btn-actions'>
          <div className='btn-back'>
            <img src="/icons/btn-back.png" alt="list icon" />
          </div>
        </div>
      </div>

      {/* 🔹 Abas dos Meses */}
      <div className="month-tabs-container">
        <div className="month-tabs">
          {monthlyData.map(({ month, label }) => (
            <button
              key={month}
              className={`tab-button ${activeMonth === month ? 'active' : ''} ${isCurrentMonth(month) ? 'current-month-tab' : ''}`}
              onClick={() => setActiveMonth(month)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 🔹 Conteúdo do Mês Ativo */}
      {activeMonthData && (
        <div className="tab-content">
          {/* Tabela Total Geral */}
          <div className="cake-table-wrapper">
            <div>
              <table className="summary-table total-summary">
                <thead>
                  <tr>
                    <th>日付毎の合計</th>
                    {activeMonthData.dates.map((date) => (
                      <th 
                        key={date} 
                        className={isToday(date) ? 'current-day' : ''}
                      >
                        {formatDayOnly(date)}
                      </th>
                    ))}
                    <th>月合計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="total-row">
                    <td></td>
                    {activeMonthData.dates.map((date) => (
                      <td 
                        key={date} 
                        className={isToday(date) ? 'data-current-day' : ''}
                      >
                        <strong>{totalGeralPorDia[date] || 0}</strong>
                      </td>
                    ))}
                    <td><strong>{totalGlobal}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔹 Tabelas Individuais por Bolo - AGORA ORDENADAS POR ID */}
          {getCakesInOrder.map((cake) => {
            const cakeName = cake.name.trim();
            const sizes = activeMonthData.summary[cakeName] || {};
            
            const totalPorDia = activeMonthData.dates.reduce((acc: Record<string, number>, date) => {
              let total = 0;
              Object.values(sizes).forEach((sizeData) => {
                total += sizeData.days[date] || 0;
              });
              acc[date] = total;
              return acc;
            }, {});

            const totalGeral = Object.values(totalPorDia).reduce((a, b) => a + b, 0);

            return (
              <div key={cake.id} className="cake-table-wrapper">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>{cakeName}
                         {/* (ID: {cake.id}) */}
                        </th>
                      {activeMonthData.dates.map((date) => (
                        <th 
                          key={date} 
                          className={isToday(date) ? 'current-day' : ''}
                        >
                          {formatDayOnly(date)}
                        </th>
                      ))}
                      <th>月合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sizes).map(([size, sizeData]) => {
                      const total = activeMonthData.dates.reduce((sum, date) => 
                        sum + (sizeData.days[date] || 0), 0
                      );
                      return (
                        <tr key={`${cakeName}-${size}`}>
                          <td>
                            {size}
                          </td>
                          {activeMonthData.dates.map((date) => (
                            <td 
                              key={date}
                              className={isToday(date) ? 'data-current-day' : ''}
                            >
                              {sizeData.days[date] || 0}
                            </td>
                          ))}
                          <td className="total-cell">{total}</td>
                        </tr>
                      );
                    })}

                    <tr className="total-row">
                      <td><strong>合計 →</strong></td>
                      {activeMonthData.dates.map((date) => (
                        <td 
                          key={date}
                          className={isToday(date) ? 'data-current-day' : ''}
                        >
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

          {/* Tabela de Status de Pagamento */}
          <div className="data-percentage">
            <table className="summary-table total-summary">
              <thead>
                <tr>
                  <th>支払い状況</th>
                  {activeMonthData.dates.map((date) => (
                    <th 
                      key={date} 
                      className={isToday(date) ? 'current-day' : ''}
                    >
                      {formatDayOnly(date)}
                    </th>
                  ))}
                  <th>合計(件数)</th>
                  <th>合計(金額)</th>
                </tr>
              </thead>
              <tbody>
                {statusOptions
                  .filter(({ label }) => label !== "キャンセル")
                  .map(({ value, label }) => {
                    let totalStatus = 0;
                    let totalValue = 0;
                    
                    return (
                      <tr key={value}>
                        <td className={`title-${label}`}>{label}</td>
                        {activeMonthData.dates.map((date) => {
                          const count = activeMonthData.statusDayCounts[date]?.[value] || 0;
                          const valueForDate = statusValues[value]?.[date] || 0;
                          totalStatus += count;
                          totalValue += valueForDate;
                          
                          return (
                            <td 
                              key={`${value}-${date}`}
                              className={isToday(date) ? 'data-current-day' : ''}
                            >
                              {count}
                            </td>
                          );
                        })}
                        <td><strong>{totalStatus}</strong></td>
                        <td><strong>¥{totalValue.toLocaleString("ja-JP")}</strong></td>
                      </tr>
                    );
                  })}

                <tr className="total-row">
                  <td><strong>合計</strong></td>
                  {activeMonthData.dates.map((date) => {
                    const totalDay = statusOptions
                      .filter(({ label }) => label !== "キャンセル")
                      .reduce((sum, { value }) => sum + (activeMonthData.statusDayCounts[date]?.[value] || 0), 0);
                    return (
                      <td 
                        key={`total-${date}`}
                        className={isToday(date) ? 'data-current-day' : ''}
                      >
                        <strong>{totalDay}</strong>
                      </td>
                    );
                  })}
                  <td>
                    <strong>
                      {activeMonthData.dates.reduce((sum, date) => {
                        return sum + statusOptions
                          .filter(({ label }) => label !== "キャンセル")
                          .reduce((subSum, { value }) => subSum + (activeMonthData.statusDayCounts[date]?.[value] || 0), 0);
                      }, 0)}
                    </strong>
                  </td>
                  <td>
                    <strong>
                      ¥{activeMonthData.dates.reduce((sum, date) => {
                        return sum + statusOptions
                          .filter(({ label }) => label !== "キャンセル")
                          .reduce((dateSum, { value }) => dateSum + (statusValues[value]?.[date] || 0), 0);
                      }, 0).toLocaleString("ja-JP")}
                    </strong>
                  </td>
                </tr>

                <br/><br/>
                
                {statusOptions
                  .filter(({ label }) => label === "キャンセル")
                  .map(({ value, label }) => {
                    let totalStatus = 0;
                    let totalValue = 0;

                    return (
                      <tr key={value} className="cancel-row">
                        <td className={`title-${label}`}>{label}</td>
                        {activeMonthData.dates.map((date) => {
                          const count = activeMonthData.statusDayCounts[date]?.[value] || 0;
                          const valueForDate = statusValues[value]?.[date] || 0;
                          totalStatus += count;
                          totalValue += valueForDate;

                          return (
                            <td 
                              key={`${value}-${date}`}
                              className={isToday(date) ? 'data-current-day' : ''}
                            >
                              {count}
                            </td>
                          );
                        })}
                        <td><strong>{totalStatus}</strong></td>
                        <td><strong>¥{totalValue.toLocaleString("ja-JP")}</strong></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}