import { createBrowserRouter } from "react-router";
import AdminLayout from "../admin/adminLayout";
import AdminAuthGuard from "../admin/AdminAuthGuard";
import AdminLogin from "../admin/AdminLogin";
import EventUpload from "../admin/eventupload";
import statuschange from "../admin/statuschange";
import uploadbanner from "../admin/uploadbanner";
import EditEvent from "../admin/EditEvent";
import adminHome from "../admin/adminHome";
import adminProfile from "../admin/adminProfile";
import CategoriesManagement from "../admin/categoriesManagement";
import addNewEvents from "../adminComponents/addNewEvents";
import AllTickets from "../admin/AllTickets";

let router = createBrowserRouter([
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
        Component: adminHome,
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
        Component: adminProfile,
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
