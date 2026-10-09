import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function AdminLayout() {
  const links = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/approvals', label: 'Course Approvals' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/instructors', label: 'Instructors' },
    { to: '/admin/organizations', label: 'Organizations' },
    { to: '/admin/categories', label: 'Categories' },
    { to: '/admin/reports', label: 'Reports' }
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
