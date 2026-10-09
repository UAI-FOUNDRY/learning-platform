import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function InstructorLayout() {
  const links = [
    { to: '/instructor/dashboard', label: 'Dashboard' },
    { to: '/instructor/courses/new', label: 'Create Course' },
    { to: '/instructor/submissions', label: 'Submissions' },
    { to: '/instructor/analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar links={links} />
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
