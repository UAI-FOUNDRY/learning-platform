import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex text-sm text-[#514940]" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-[#71675D]">/</span>}
            {item.to ? (
              <Link to={item.to} className="hover:text-[#D92D2D] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#211E1A] font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
