import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import LearnerSidebar from '../components/learner/LearnerSidebar';
import LearnerNavbar from '../components/learner/LearnerNavbar';

export default function LearnerLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#D6D0C8] text-[#211E1A] font-sans transition-colors duration-200">
      {/* High-Polish Learner Sidebar */}
      <LearnerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Learner Top Bar */}
        <LearnerNavbar
          onOpenMobileSidebar={() => setIsMobileDrawerOpen(true)}
        />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
