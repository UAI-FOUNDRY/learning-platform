import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-6 text-center text-sm text-gray-500">
      <p>&copy; {new Date().getFullYear()} Learning Platform. All rights reserved.</p>
    </footer>
  );
}
