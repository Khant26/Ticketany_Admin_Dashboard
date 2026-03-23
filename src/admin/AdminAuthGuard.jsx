import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { showSessionExpired } from '../utils/toastNotification';

function AdminAuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user_data');
        const adminFlag = localStorage.getItem('is_admin');

        if (!token || !userData) {
          setIsAuthenticated(false);
          return;
        }

        const parsed = JSON.parse(userData);

        // Check if user is super admin or staff
        if (parsed.is_superuser || parsed.is_staff || adminFlag === 'true') {
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          showSessionExpired();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    };

    checkAuth();
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