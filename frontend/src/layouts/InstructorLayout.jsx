import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function InstructorLayout() {
  const links = [
    { to: '/instructor/dashboard', label: 'Dashboard' },
    { to: '/instructor/courses', label: 'My Courses' },
    { to: '/instructor/courses/new', label: 'Create Course' },
    { to: '/instructor/submissions', label: 'Submissions' },
    { to: '/instructor/analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#D6D0C8] text-[#211E1A] font-sans transition-colors duration-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={links} />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
