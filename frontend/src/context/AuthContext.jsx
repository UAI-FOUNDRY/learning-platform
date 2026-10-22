import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { isDevPreviewAllowed, DEV_PREVIEW_SUPER_ADMIN_USER } from '../config/devPreview';

export const AuthContext = createContext(null);

/**
 * Normalizes user role string into standard lowercase snake_case.
 * Handles 'Super Admin', 'super_admin', 'superadmin', 'admin', 'Instructor', 'Learner', etc.
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  const cleaned = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (cleaned === 'superadmin' || cleaned === 'admin') {
    return 'super_admin';
  }
  return cleaned;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevPreview, setIsDevPreview] = useState(false);

  // Initialize and validate authentication state on mount
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    // 1. If a token exists, always attempt real backend validation first
    if (token) {
      try {
        const currentUser = await authService.getCurrentUser();

        if (currentUser && typeof currentUser === 'object' && (currentUser.id || currentUser.email)) {
          const normalizedRole = normalizeRole(currentUser.role);
          setUser({
            ...currentUser,
            role: normalizedRole,
            rawRole: currentUser.role
          });
          setIsAuthenticated(true);
          setIsDevPreview(false);
          setIsLoading(false);
          return;
        } else {
          // Unexpected or malformed response: invalidate session
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
        }
      } catch (err) {
        // Explicit 401/403: remove invalid credentials
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
        }
      }
    }

    // 2. If real auth is absent/offline, check for safe development-only preview
    // Strictly requires import.meta.env.DEV === true; dead-code eliminated in production builds.
    if (import.meta.env.DEV && isDevPreviewAllowed()) {
      const devDismissed = sessionStorage.getItem('learnspace_dismiss_dev_preview') === 'true';
      if (!devDismissed) {
        setUser(DEV_PREVIEW_SUPER_ADMIN_USER);
        setIsAuthenticated(true);
        setIsDevPreview(true);
        setIsLoading(false);
        return;
      }
    }

    // 3. Default unauthenticated state (standard behavior in production)
    setUser(null);
    setIsAuthenticated(false);
    setIsDevPreview(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle successful login session setup
  const loginSession = useCallback((userData, tokenData) => {
    if (tokenData) {
      const accessToken = tokenData.access_token || tokenData.token;
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('token', accessToken);
      }
      if (tokenData.refresh_token) {
        localStorage.setItem('refresh_token', tokenData.refresh_token);
      }
    }

    if (userData) {
      const normalizedRole = normalizeRole(userData.role);
      setUser({
        ...userData,
        role: normalizedRole,
        rawRole: userData.role
      });
      setIsAuthenticated(true);
    }
  }, []);

  // Development preview controls (strictly no-op in production)
  const exitDevPreview = useCallback(() => {
    if (import.meta.env.DEV) {
      sessionStorage.setItem('learnspace_dismiss_dev_preview', 'true');
      setUser(null);
      setIsAuthenticated(false);
      setIsDevPreview(false);
    }
  }, []);

  const enterDevPreview = useCallback(() => {
    if (import.meta.env.DEV && isDevPreviewAllowed()) {
      sessionStorage.removeItem('learnspace_dismiss_dev_preview');
      setUser(DEV_PREVIEW_SUPER_ADMIN_USER);
      setIsAuthenticated(true);
      setIsDevPreview(true);
    }
  }, []);

  // Handle explicit logout session cleanup
  const logoutSession = useCallback(async () => {
    try {
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      if (import.meta.env.DEV) {
        sessionStorage.setItem('learnspace_dismiss_dev_preview', 'true');
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsDevPreview(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        isLoading,
        isDevPreview,
        exitDevPreview,
        enterDevPreview,
        checkAuth,
        loginSession,
        logoutSession,
        normalizeRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
