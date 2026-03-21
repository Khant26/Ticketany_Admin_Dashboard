import React from 'react';
import { Outlet } from 'react-router';
import Sidebar from './sidebar';

function AdminLayout() {
  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <Sidebar />

        {/* Content wrapper stretches to bottom */}
        <div
          className="transition-all duration-300 flex flex-col"
          style={{
            marginLeft: 'var(--sidebar-offset, 0)',
            minHeight: '100vh',
          }}
        >
          <main className="flex-1 p-6 pt-20 xl:pt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default AdminLayout;