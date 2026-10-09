import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900">Learning Platform</Link>
      <div className="flex items-center gap-4">
        <Link to="/courses" className="text-gray-600 hover:text-gray-900">Explore</Link>
        <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
        <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Register</Link>
      </div>
    </nav>
  );
}
