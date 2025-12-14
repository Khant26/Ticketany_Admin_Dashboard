import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router";

const SIDEBAR_WIDTH = "16rem"; // Tailwind w-64

function Sidebar() {
  const navigate = useNavigate();

  // Publish content offset. Always show sidebar width since it's permanent
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-offset", SIDEBAR_WIDTH);
    return () => {
      root.style.removeProperty("--sidebar-offset");
    };
  }, []);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('is_admin');

    // Redirect to login page
    navigate('/admin/login');
  };

  return (
    <aside
      style={{ top: "0", width: SIDEBAR_WIDTH }}
      className="fixed left-0 bottom-0 z-30 bg-white text-gray-900 border-r-2 border-black"
      aria-hidden={false}
    >
        <div className="flex items-center justify-center h-16 border-b-2 border-black px-4 bg-white">
          <h1 className="text-xl font-bold truncate">Admin Dashboard</h1>
        </div>

        <nav className="mt-4">
          <div className="px-4 py-2">
            <div className="space-y-1">
              <Link to="/admin" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Dashboard">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                <span>Dashboard</span>
              </Link>

              <Link to="/admin/statuschange" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Status Change">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M4 14v6h6M20 10V4h-6" />
                </svg>
                <span>Status Change</span>
              </Link>

              <Link to="/admin/uploadbanner" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Banner Management">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v9m0-9l-3 3m3-3l3 3" />
                </svg>
                <span>Banner</span>
              </Link>

              <Link to="/admin/categories" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Category Management">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Category</span>
              </Link>

              <Link to="/admin/eventupload" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Event Management">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 11h8M8 15h6" />
                </svg>
                <span>Event</span>
              </Link>

               <Link to="/admin/alltickets" className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100" title="Event Management">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 11h8M8 15h6" />
                </svg>
                <span>All Tickets</span>
              </Link>


            </div>
          </div>
        </nav>

        <div className="absolute bottom-0 w-full border-t-2 border-black bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <img src="https://ui-avatars.com/api/?name=Admin+User" alt="Admin" className="w-8 h-8 rounded-full border border-black" />
              <div className="ml-3">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-600">admin@example.com</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
  );
}

export default Sidebar;