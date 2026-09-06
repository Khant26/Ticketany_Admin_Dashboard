import { createBrowserRouter, Navigate } from "react-router";
import AdminLayout from "../admin/adminLayout";
import AdminAuthGuard from "../admin/AdminAuthGuard";
import AdminLogin from "../admin/AdminLogin";
import EventUpload from "../admin/eventupload";
import statuschange from "../admin/statuschange";
import uploadbanner from "../admin/uploadbanner";
import EditEvent from "../admin/EditEvent";
import AdminHome from "../admin/adminHome";
import AdminProfile from "../admin/adminProfile";
import CategoriesManagement from "../admin/categoriesManagement";
import addNewEvents from "../adminComponents/addNewEvents";
import AllTickets from "../admin/AllTickets";

let router = createBrowserRouter([
  {
    path: "/",
    Component: () => <Navigate to="/admin" replace />,
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin",
    Component: () => (
      <AdminAuthGuard>
        <AdminLayout />
      </AdminAuthGuard>
    ),
    children: [
      {
        path: "/admin",
        Component: AdminHome,
      },
      {
        path: "/admin/eventupload",
        Component: EventUpload,
      },
      {
        path: "/admin/statuschange",
        Component: statuschange,
      },
      {
        path: "/admin/uploadbanner",
        Component: uploadbanner,
      },
      {
        path: "/admin/categories",
        Component: CategoriesManagement,
      },
      {
        path: "/admin/events/:id/edit",
        Component: EditEvent,
      },
      {
        path: "/admin/adminProfile",
        Component: AdminProfile,
      },
      {
        path: "/admin/addNewEvents",
        Component: addNewEvents,
      },
      {
        path: "/admin/alltickets",
        Component: AllTickets,
      },
    ],
  },
  // Redirect root to admin
  {
    path: "/",
    Component: () => <AdminAuthGuard><AdminLayout /></AdminAuthGuard>,
  },
]);

export default router;
