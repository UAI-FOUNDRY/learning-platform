import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import DevPreviewBanner from '../components/common/DevPreviewBanner';

export default function AdminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('learnspace_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('learnspace_admin_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen flex bg-[#D6D0C8] text-[#211E1A] transition-colors duration-200 font-sans">
      {/* Super Admin Collapsible & Drawer Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Super Admin Top Bar */}
        <Navbar
          variant="admin"
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={() => setIsMobileDrawerOpen(true)}
        />

        {/* Page Content Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <DevPreviewBanner />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
