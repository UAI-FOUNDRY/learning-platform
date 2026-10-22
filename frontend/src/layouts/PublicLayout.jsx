import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-mocha text-brown-soft selection:bg-burgundy selection:text-mocha">
      <Navbar variant="public" />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
