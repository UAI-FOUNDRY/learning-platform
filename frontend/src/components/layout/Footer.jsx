import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-[#B6AA9A] bg-[#E2DCD4] py-6 text-center text-sm text-[#514940] transition-colors duration-200">
      <p>&copy; {new Date().getFullYear()} LearnSpace. All rights reserved.</p>
    </footer>
  );
}
