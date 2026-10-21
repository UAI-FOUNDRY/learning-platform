import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RoleRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, isLoading, normalizeRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]" data-testid="auth-loading-spinner">
        <div className="w-8 h-8 border-4 border-[#8C1D40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleNormalizer = normalizeRole || ((r) => (r || '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const userRole = roleNormalizer(user?.role);
  const normalizedAllowed = allowedRoles.map(r => roleNormalizer(r));

  if (!normalizedAllowed.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

