import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { showSessionExpired } from '../utils/toastNotification';
import {
  ADMIN_AUTH_CHANGED_EVENT,
  clearAdminSession,
  getAdminAccessToken,
  getStoredAdminUser,
  getTokenExpiryDelay,
  hasAdminPrivileges,
  isTokenExpired,
  verifyAdminSessionWithServer,
} from '../services/adminSession';

function AdminAuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let expiryTimeoutId;

    const invalidateSession = (showToast = true) => {
      clearAdminSession();
      setIsAuthenticated(false);
      setIsAdmin(false);
      if (showToast) {
        showSessionExpired();
      }
    };

    const scheduleExpiryLogout = (token) => {
      window.clearTimeout(expiryTimeoutId);
      const delay = getTokenExpiryDelay(token);
      if (delay <= 0) {
        invalidateSession(true);
        return;
      }

      expiryTimeoutId = window.setTimeout(() => {
        invalidateSession(true);
      }, delay);
    };

    const checkAuth = async (showToast = false) => {
      try {
        const token = getAdminAccessToken();
        const userData = getStoredAdminUser();

        if (!token || !userData) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          return;
        }

        // Check if user is super admin or staff
        if (!hasAdminPrivileges(userData)) {
          invalidateSession(showToast);
          return;
        }

        if (isTokenExpired(token)) {
          invalidateSession(showToast);
          return;
        }

        const verified = await verifyAdminSessionWithServer(token);
        if (!verified) {
          invalidateSession(showToast);
          return;
        }

        setIsAuthenticated(true);
        setIsAdmin(true);
        scheduleExpiryLogout(token);
      } catch (error) {
        console.error('Auth check error:', error);
        invalidateSession(showToast);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAuth(true);
      }
    };

    const handleFocus = () => {
      void checkAuth(true);
    };

    const handleAuthChanged = () => {
      void checkAuth(false);
    };

    const validationIntervalId = window.setInterval(() => {
      void checkAuth(true);
    }, 30000);

    void checkAuth(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(validationIntervalId);
      window.clearTimeout(expiryTimeoutId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Render children if authenticated and admin
  return children;
}

export default AdminAuthGuard;