import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            {item.to ? <Link to={item.to} className="hover:underline">{item.label}</Link> : <span className="text-gray-700">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
