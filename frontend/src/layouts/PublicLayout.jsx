import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#D6D0C8] text-[#211E1A] transition-colors duration-200">
      <Navbar variant="public" />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
