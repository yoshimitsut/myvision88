import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ExcelExportButton from './ExcelExportButton';
import type { Order } from '../../types/types';

interface AdminSidebarProps {
  orders?: Order[];
  activeOrders?: Order[];
  todayOrders?: Order[];
  pastDateOrders?: Order[];
  completedOrders?: Order[];
  cancelledOrders?: Order[];
  viewType?: "cake" | "gift";
  setViewType?: (type: "cake" | "gift") => void;
  search?: string;
  setSearch?: (val: string) => void;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  setShowScanner?: (show: boolean) => void;
}

export default function AdminSidebar({
  orders = [],
  activeOrders = [],
  todayOrders = [],
  pastDateOrders = [],
  completedOrders = [],
  cancelledOrders = [],
  viewType = "cake",
  setViewType,
  search = "",
  setSearch,
  activeTab = "all",
  setActiveTab,
  setShowScanner
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tab: string) => {
    if (setActiveTab) {
      setActiveTab(tab);
    } else {
      navigate('/list');
    }
  };

  const handleSearchChange = (val: string) => {
    if (setSearch) {
      setSearch(val);
      if (val.trim() !== '' && activeTab !== 'all' && setActiveTab) {
        setActiveTab('all');
      }
    }
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span className="sidebar-sub-title">予約管理</span>
        <h1 className="sidebar-main-title">MYVISION88</h1>
      </div>

      <div className="sidebar-menu-card">
        <div
          className={`sidebar-menu-item ${location.pathname === '/list' ? "active" : ""}`}
          onClick={() => navigate('/list')}
        >
          <span>TOPメニュー</span>
        </div>
        <div
          className={`sidebar-menu-item ${location.pathname === '/admin/cake' ? "active" : ""}`}
          onClick={() => navigate("/admin/cake")}
        >
          <span>ケーキ</span>
        </div>
        <div
          className={`sidebar-menu-item ${location.pathname === '/admin/gift' ? "active" : ""}`}
          onClick={() => navigate("/admin/gift")}
        >
          <span>ギフト</span>
        </div>
      </div>

      <div className="sidebar-search-box">
        <div className="sidebar-search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="名前・電話番号・受付番号で検索"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="sidebar-search-input"
            disabled={!setSearch}
          />
        </div>
        <button className="sidebar-add-btn" onClick={() => navigate("/orderstore")}>
          + 新しい予約
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">予約ステータス</div>
        <div className="sidebar-filter-list">
          <div
            className={`sidebar-filter-item ${activeTab === 'all' || activeTab === 'today' ? 'active' : ''}`}
            onClick={() => handleTabClick('all')}
          >
            <span>すべて</span>
            <span className="sidebar-badge active">{orders.length}</span>
          </div>
          <div
            className={`sidebar-filter-item ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => handleTabClick('active')}
          >
            <span>オンライン予約</span>
            <span className="sidebar-badge">{activeOrders.length}</span>
          </div>
          <div
            className={`sidebar-filter-item`}
            onClick={() => handleTabClick('today')}
          >
            <span>店頭予約</span>
            <span className="sidebar-badge">{todayOrders.length}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">履歴</div>
        <div className="sidebar-filter-list">
          <div
            className={`sidebar-filter-item ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => handleTabClick('past')}
          >
            <span>予約日経過</span>
            <span className="sidebar-badge badge-green">{pastDateOrders.length}</span>
          </div>
          <div
            className={`sidebar-filter-item ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => handleTabClick('completed')}
          >
            <span>受け取り済み</span>
            <span className="sidebar-badge badge-green">{completedOrders.length}</span>
          </div>
          <div
            className={`sidebar-filter-item ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => handleTabClick('cancelled')}
          >
            <span>キャンセル</span>
            <span className="sidebar-badge badge-green">{cancelledOrders.length}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer-actions">
        <button className="sidebar-action-btn" onClick={() => navigate("/admin/date")} title="予定">
          <span className="action-icon">📅</span>
          <span className="action-label">予定</span>
        </button>
        <div className="sidebar-action-btn-wrapper" title="出力">
          <ExcelExportButton data={orders} filename='注文ケーキ.xlsx' sheetName='注文' />
        </div>
        <button className="sidebar-action-btn" onClick={() => navigate("/ordertable")} title="集計">
          <span className="action-icon">📊</span>
          <span className="action-label">集計</span>
        </button>
        <button className="sidebar-action-btn" onClick={() => {
          if (setShowScanner) setShowScanner(true);
          else navigate('/list');
        }} title="QR">
          <span className="action-icon">📱</span>
          <span className="action-label">QR</span>
        </button>
      </div>
    </aside>
  );
}
