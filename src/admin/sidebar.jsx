import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router";
import logo from "../assets/logo.jpg";


const SIDEBAR_WIDTH = "16rem"; // Tailwind w-64
const DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
      : false
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const updateViewportState = (event) => {
      const matches = event.matches ?? mediaQuery.matches;
      setIsDesktop(matches);
      if (matches) {
        setIsOpen(false);
      }
    };

    updateViewportState(mediaQuery);
    mediaQuery.addEventListener("change", updateViewportState);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportState);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-offset", isDesktop ? SIDEBAR_WIDTH : "0px");
    return () => {
      root.style.removeProperty("--sidebar-offset");
    };
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [location.pathname, isDesktop]);

  useEffect(() => {
    if (isDesktop || !isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (isDesktop) {
      document.body.style.removeProperty("overflow");
      return undefined;
    }

    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isDesktop, isOpen]);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("is_admin");

    // Redirect to login page
    navigate("/admin/login");
  };

  const handleCloseSidebar = () => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="xl:hidden fixed top-4 left-4 z-50 inline-flex items-center justify-center rounded-md border-2 border-black bg-white p-2 text-gray-900 shadow-sm transition-shadow hover:shadow-md"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
        aria-controls="admin-sidebar"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {!isDesktop && isOpen ? (
        <button
          type="button"
          className="xl:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
          aria-label="Close sidebar overlay"
          onClick={handleCloseSidebar}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        style={{ top: "0", width: SIDEBAR_WIDTH }}
        className={`fixed left-0 bottom-0 z-50 h-screen bg-white text-gray-900 border-r-2 border-black shadow-xl transition-transform duration-300 ease-in-out xl:translate-x-0 xl:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isDesktop && !isOpen}
      >
        <div className="flex items-center justify-center h-16 border-b-2 border-black px-4 bg-white">
           <img src={logo} alt="Logo" className="h-10 w-auto mr-3" />
          <h1 className="text-xl font-bold truncate">Admin Dashboard</h1>
        </div>

        <nav className="mt-4 pb-24">
          <div className="px-4 py-2">
            <div className="space-y-1">
              <NavLink
                to="/admin"
                end
                onClick={handleCloseSidebar}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm rounded-lg transition-colors
       ${isActive ? " font-semibold text-[#ee6786ff]" : "hover:bg-gray-200"}`
                }
                title="Dashboard"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                  />
                </svg>
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/admin/statuschange"
                onClick={handleCloseSidebar}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm rounded-lg transition-colors 
       ${isActive ? " font-semibold text-[#ee6786ff]" : "hover:bg-gray-200"}`
                }
                title="Status Change"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v6h6M20 20v-6h-6M4 14v6h6M20 10V4h-6"
                  />
                </svg>
                <span>Change Status</span>
              </NavLink>

              <NavLink
                to="/admin/eventupload"
                onClick={handleCloseSidebar}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm rounded-lg transition-colors 
       ${isActive ? " font-semibold text-[#ee6786ff]" : "hover:bg-gray-200"}`
                }
                title="Event Management"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7h8M8 11h8M8 15h6"
                  />
                </svg>
                <span>Events</span>
              </NavLink>

              <NavLink
                to="/admin/uploadbanner"
                onClick={handleCloseSidebar}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm rounded-lg transition-colors 
       ${isActive ? " font-semibold text-[#ee6786ff]" : "hover:bg-gray-200"}`
                }
                title="Banner Management"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v9m0-9l-3 3m3-3l3 3"
                  />
                </svg>
                <span>Banners</span>
              </NavLink>

              <NavLink
                to="/admin/categories"
                onClick={handleCloseSidebar}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm rounded-lg transition-colors 
       ${isActive ? " font-semibold text-[#ee6786ff]" : "hover:bg-gray-200"}`
                }
                title="Category Management"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span>Category</span>
              </NavLink>
            </div>
          </div>
        </nav>

        <div className="absolute bottom-0 w-full border-t-2 border-black bg-white">
          <div className="flex items-center justify-center px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Logout"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-base text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
