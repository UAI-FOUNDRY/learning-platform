import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-cosmic/30 bg-[#3A151A] py-12 px-4 sm:px-6 lg:px-8 text-mocha">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-burgundy flex items-center justify-center text-mocha shadow-warm-sm border border-cosmic/40">
            <svg
              className="w-4 h-4 text-mocha stroke-[2.2]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span className="font-serif font-bold text-mocha text-base">
            Learn<span className="text-cosmic-light italic ml-0.5">Space</span>
          </span>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link to="/" className="text-mocha/80 hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/courses" className="text-mocha/80 hover:text-white transition-colors">
            Explore Courses
          </Link>
          <Link to="/about" className="text-mocha/80 hover:text-white transition-colors">
            About
          </Link>
          <Link to="/contact" className="text-mocha/80 hover:text-white transition-colors">
            Contact
          </Link>
          <Link to="/login" className="text-mocha/80 hover:text-white transition-colors">
            Sign In
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-cosmic text-center md:text-right">
          &copy; {new Date().getFullYear()} LearnSpace. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
