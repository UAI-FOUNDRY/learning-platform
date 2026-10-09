import React from 'react';
import PageContainer from '../../components/layout/PageContainer';

export default function AdminDashboard() {
  return (
    <PageContainer title="Platform Administration">
      <p className="text-gray-600">System overview, metrics, and pending actions.</p>
    </PageContainer>
  );
}
