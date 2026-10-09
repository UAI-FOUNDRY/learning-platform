import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function LearnerLayout() {
  const links = [
    { to: '/learner/dashboard', label: 'Dashboard' },
    { to: '/learner/my-learning', label: 'My Learning' },
    { to: '/learner/wishlist', label: 'Wishlist' },
    { to: '/learner/certificates', label: 'Certificates' },
    { to: '/learner/profile', label: 'Profile' }
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
