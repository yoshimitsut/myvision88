import React from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebarProps?: any;
}

export default function AdminLayout({ children, sidebarProps }: AdminLayoutProps) {
  return (
    <div className="admin-dashboard-page">
      <AdminSidebar {...sidebarProps} />
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
