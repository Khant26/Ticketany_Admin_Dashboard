import React, { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";


const API_BASE = "http://127.0.0.1:8000";

function AllTickets() {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const authHeaders = () => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");
    const h = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const fetchAll = async (url) => {
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data?.results) return data.results;
    return [];
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [ts, os, cs] = await Promise.all([
        fetchAll(`${API_BASE}/api/tickets/`),
        fetchAll(`${API_BASE}/api/orders/`),
        fetchAll(`${API_BASE}/api/customers/`),
      ]);
      setTickets(Array.isArray(ts) ? ts : []);
      setOrders(Array.isArray(os) ? os : []);
      setCustomers(Array.isArray(cs) ? cs : []);
    } catch (e) {
      setError(e.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toId = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const m = v.match(/(\d+)(?!.*\d)/);
      return m ? Number(m[1]) : null;
    }
    return null;
  };

  const orderToCustomer = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const oid = toId(o?.id);
      const cid = toId(o?.customer);
      if (oid != null && cid != null) map[oid] = cid;
    }
    return map;
  }, [orders]);

  const customerToEmail = useMemo(() => {
    const map = {};
    for (const c of customers) {
      const cid = toId(c?.id);
      if (cid != null) map[cid] = c?.email || null;
    }
    return map;
  }, [customers]);

  const enhancedTickets = useMemo(() => {
    return tickets.map((t) => {
      const oid = toId(t?.order);
      const cid = orderToCustomer[oid];
      const email = cid != null ? customerToEmail[cid] : null;
      return { ...t, _order_id: oid, _customer_email: email };
    });
  }, [tickets, orderToCustomer, customerToEmail]);

  const byFilter = useMemo(() => {
    if (filter === "all") return enhancedTickets;
    const lower = (filter || "").toLowerCase();
    return enhancedTickets.filter(
      (t) => (t.status || "").toLowerCase() === lower
    );
  }, [enhancedTickets, filter]);

  const STATUS_LABELS = {
    pending: "Pending",
    paid: "Paid",
    complete: "Completed",
    cancel: "Cancelled",
  };
  const REFUND_LABELS = {
    none: "None",
    in_process: "In Process",
    refunded: "Refunded",
  };

  const statusBadgeClass = (s) => {
    switch ((s || "").toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-blue-100 text-blue-800";
      case "complete":
        return "bg-green-100 text-green-800";
      case "cancel":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const refundBadgeClass = (r) => {
    switch ((r || "").toLowerCase()) {
      case "in_process":
        return "bg-orange-100 text-orange-800";
      case "refunded":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-black mb-4">
        All Orders and Tickets
      </h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "paid", "complete", "cancel"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                filter === status
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {status === "all"
                ? "All"
                : status === "complete"
                ? "Completed"
                : status === "cancel"
                ? "Cancelled"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <button
  onClick={loadAll}
  disabled={loading}
  className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <FiRefreshCw
    size={16}
    className={loading ? "animate-spin" : ""}
  />
  {loading ? "Refreshing…" : "Refresh"}
</button>

      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {loading && <div className="mb-4 text-gray-600">Loading…</div>}

      <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
        <table className="min-w-[980px] w-full text-left bg-white">
          <thead className="border-b border-gray-400">
            {filter === "all" && (
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Passport Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Facebook Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Member Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            )}

            {filter === "pending" && (
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Passport Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Facebook Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Member Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            )}
            {filter === "paid" && (
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Passport Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Facebook Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Member Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Customer Payment
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Payment Date
                </th>
              </tr>
            )}
            {filter === "complete" && (
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Passport Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Facebook Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Member Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Zone
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Row
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Seat
                </th>
              </tr>
            )}
            {filter === "cancel" && (
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Passport Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Facebook Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Member Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Customer Payment
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {byFilter.map((t) => (
              <tr key={t.id} className="hover:bg-gray-100 transition-colors">
                {filter === "all" && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t._order_id ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {t._customer_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.passport_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.facebook_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.member_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          t.status
                        )}`}
                      >
                        {STATUS_LABELS[(t.status || "").toLowerCase()] ||
                          t.status ||
                          "—"}
                        {t.status?.toLowerCase() === "cancel" &&
                        t.refund_status &&
                        t.refund_status !== "none"
                          ? ` (${t.refund_status
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())})`
                          : ""}
                      </span>
                    </td>
                  </>
                )}

                {filter === "pending" && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t._order_id ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {t._customer_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.passport_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.facebook_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.member_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          t.status
                        )}`}
                      >
                        {STATUS_LABELS[(t.status || "").toLowerCase()] ||
                          t.status ||
                          "—"}
                      </span>
                    </td>
                  </>
                )}
                {filter === "paid" && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t._order_id ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {t._customer_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.passport_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.facebook_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.member_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          t.status
                        )}`}
                      >
                        {STATUS_LABELS[(t.status || "").toLowerCase()] ||
                          t.status ||
                          "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.customer_payment ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.payment_date ?? "—"}
                    </td>
                  </>
                )}
                {filter === "complete" && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t._order_id ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {t._customer_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.passport_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.facebook_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.member_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          t.status
                        )}`}
                      >
                        {STATUS_LABELS[(t.status || "").toLowerCase()] ||
                          t.status ||
                          "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.selling_price ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.zone ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.row ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.seat ?? "—"}
                    </td>
                  </>
                )}
                {filter === "cancel" && (
                  <>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t._order_id ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 break-all">
                      {t._customer_email ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.passport_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.facebook_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.member_code ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {t.customer_payment ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                          t.status
                        )}`}
                      >
                        {STATUS_LABELS[(t.status || "").toLowerCase()] ||
                          t.status ||
                          "—"}
                        {t.status?.toLowerCase() === "cancel" &&
                        t.refund_status &&
                        t.refund_status !== "none"
                          ? ` (${t.refund_status
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())})`
                          : ""}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!loading && byFilter.length === 0 && (
              <tr>
                <td
                  className="px-6 py-8 text-center text-gray-500 text-sm"
                  colSpan={10}
                >
                  No tickets in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AllTickets;
