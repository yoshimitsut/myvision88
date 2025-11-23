// hooks/useHeaderConfig.ts
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import type { HeaderConfig, UseHeaderConfigReturn } from '../types/header';

export const useHeaderConfig = (pageSpecificConfig: Partial<HeaderConfig> = {}): UseHeaderConfigReturn => {
  const location = useLocation();
  const [search, setSearch] = useState<string>('');

  const getHeaderConfig = (): HeaderConfig => {
    const baseConfigs: Record<string, HeaderConfig> = {
      '/admin': {
        title: '注文管理',
        showSearch: true,
        searchPlaceholder: '検索：お名前、電話番号、受付番号などを入力',
        buttons: [
          { 
            icon: "/icons/calendar_icon.ico", 
            alt: "カレンダーアイコン",
            path: "/admin/date",
            className: "list-btn qrcode-btn"
          },
          { 
            icon: "/icons/qr-code.ico", 
            alt: "QRコードアイコン",
            onClick: () => console.log('Scanner'),
            className: "list-btn qrcode-btn"
          },
          { 
            icon: "/icons/graph.ico", 
            alt: "グラフアイコン",
            path: "/ordertable",
            className: "list-btn"
          }
        ]
      },
      '/admin/date': {
        title: '日付別管理',
        showSearch: false,
        buttons: [
          { 
            text: "戻る", 
            path: "/admin",
            className: "back-btn"
          }
        ]
      },
      '/ordertable': {
        title: '注文統計',
        showSearch: false,
        buttons: [
          { 
            text: "戻る", 
            path: "/admin",
            className: "back-btn"
          },
          { 
            icon: "/icons/download.ico", 
            alt: "ダウンロードアイコン",
            onClick: () => console.log('Export chart'),
            className: "list-btn"
          }
        ]
      },
      '/customers': {
        title: '顧客管理',
        showSearch: true,
        searchPlaceholder: '顧客名、電話番号で検索',
        buttons: [
          { 
            text: "新規顧客", 
            path: "/customers/new", 
            className: "primary-btn" 
          }
        ]
      }
    };

    const baseConfig = baseConfigs[location.pathname] || {};
    
    return { 
      ...baseConfig,
      ...pageSpecificConfig,
      searchValue: search,
      onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)
    };
  };

  return {
    headerConfig: getHeaderConfig(),
    search,
    setSearch
  };
};