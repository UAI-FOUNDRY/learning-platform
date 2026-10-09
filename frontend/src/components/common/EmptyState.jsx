import React from 'react';

export default function EmptyState({ title = 'No items found', description = 'There are no records to display.' }) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
