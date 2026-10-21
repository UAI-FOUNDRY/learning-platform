import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import InstructorNavbar from '../components/instructor/InstructorNavbar';
import InstructorSidebar from '../components/instructor/InstructorSidebar';

export default function InstructorLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#D6D0C8] text-[#211E1A] font-sans transition-colors duration-200">
      {/* High-Polish Instructor Sidebar */}
      <InstructorSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Instructor Specific Top Bar */}
        <InstructorNavbar
          onOpenMobileSidebar={() => setIsMobileDrawerOpen(true)}
        />

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
