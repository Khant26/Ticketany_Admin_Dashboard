import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../utils/toastNotification';
import { notifyAdminAuthChanged } from '../services/adminSession';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
      const response = await fetch(`${baseUrl}auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Normalize token and user payload
        const token = data.access_token || data.token || data.access || null;
        const refresh = data.refresh_token || data.refresh || null;

        // Try to read flags from response; if missing, fetch current user with token
        let userInfo = data.user ?? data;

        if (
          (userInfo.is_superuser === undefined && userInfo.is_staff === undefined) &&
          token
        ) {
          try {
            const meRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'}auth/me/`, {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });
            if (meRes.ok) {
              userInfo = await meRes.json();
            }
          } catch (_) {
            // ignore; fallback to existing payload
          }
        }

        // Require superuser (aligns with the UI text)
        const isSuperAdmin = userInfo?.is_superuser === true;

        if (!isSuperAdmin) {
          const errorMsg = 'Access denied. Super admin privileges required.';
          setError(errorMsg);
          showError(errorMsg);
          return;
        }

        // Store token and user data
        if (token) {
          localStorage.setItem('access_token', token);
        }
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        }
        localStorage.setItem('user_data', JSON.stringify(userInfo));
        localStorage.setItem('is_admin', 'true');
        notifyAdminAuthChanged({ reason: 'login' });

        showSuccess(`Welcome! You've successfully signed in as admin.`);
        navigate('/admin');
      } else {
        const errorMsg = data.error || data.detail || data.message || 'Authentication failed';
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto w-16 h-16 bg-gray-800 text-white flex items-center justify-center font-bold text-lg rounded">
            TA
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Super Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in as Super Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;