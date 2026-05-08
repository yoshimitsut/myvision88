import React from 'react';
import ExcelJS from 'exceljs';

import type { Order, OrderCake } from '../../types/types';

type ExcelExportButtonProps = {
  data: Order[];
  filename: string;
  sheetName: string;
};

// 🔥 Mapeamento dos status
const statusOptions: Record<string, string> = {
  a: "未",
  b: "オンライン予約",
  c: "店頭支払い済",
  d: "お渡し済",
  e: "キャンセル",
};

// 🔥 Tipo para garantir que todas as linhas sejam indexáveis
type ExcelRow = Record<string, string>;

/**
 * Converte orders → formato seguro para Excel (somente strings)
 */
const formatDataForExcel = (orders: Order[]): ExcelRow[] => {
  return orders.flatMap((order) =>
    order.cakes.map((cake: OrderCake) => {
      const row: ExcelRow = {
        "受付番号": String(order.id_order).padStart(4, "0"),
        "お会計": statusOptions[order.status] || order.status,
        "お名前": `${order.first_name} ${order.last_name}`,
        "ケーキ名": cake.name,
        "サイズ/価格": String(cake.size ?? ""),
        "個数": String(cake.amount),
        "受取日": order.date,
        "受け取り時間": order.pickupHour,
        "メッセージ ケーキ": cake.message_cake || "なし",
        "その他": order.message || "なし",
        "注文日": order.date_order?.split("T")[0] ?? "",
        "電話番号": order.tel,
        "メールアドレス": order.email,
      };
      return row;
    })
  );
};

const handleExport = async (data: Order[], filename: string, sheetName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const formattedData = formatDataForExcel(data);
  if (formattedData.length === 0) return;

  const headers = Object.keys(formattedData[0]);

  // console.log("headers:", headers);
  // console.log("first row:", formattedData[0]);

  // 👉 ⭐ NECESSÁRIO PARA QUE addRow(obj) FUNCIONE
  worksheet.columns = headers.map(h => ({
    header: h,
    key: h,
    width: 20,
  }));

  // 👉 Agora funciona
  formattedData.forEach((row) => {
    worksheet.addRow(row);
  });

  // Gerar arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};



const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  filename,
  sheetName,
}) => {
  return (
    <button
      onClick={() => handleExport(data, filename, sheetName)}
      className="list-btn excel-btn"
    >
      <img src="/icons/file-download.ico" alt="excel icon" />
    </button>
  );
};

export default ExcelExportButton;
