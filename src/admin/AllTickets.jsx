import React, { useEffect, useMemo, useState } from "react";
import { FiDownload, FiRefreshCw, FiX } from "react-icons/fi";


const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';

function AllTickets() {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

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
      const [ts, os, cs, es] = await Promise.all([
        fetchAll(`${API_BASE}tickets/`),
        fetchAll(`${API_BASE}orders/`),
        fetchAll(`${API_BASE}customers/`),
        fetchAll(`${API_BASE}events/`),
      ]);
      setTickets(Array.isArray(ts) ? ts : []);
      setOrders(Array.isArray(os) ? os : []);
      setCustomers(Array.isArray(cs) ? cs : []);
      setEvents(Array.isArray(es) ? es : []);
    } catch (e) {
      setError(e.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  const exportTicketsCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}tickets/export_csv/`, {
        method: "GET",
        headers: {
          ...authHeaders(),
        },
        credentials: "omit",
      });

      if (!res.ok) throw new Error(`Failed to export CSV (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const disposition = res.headers?.get?.("content-disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename=([^;]+)/i);
      const rawName = (match?.[1] || match?.[2] || "").trim();
      const fileName = rawName
        ? decodeURIComponent(rawName.replace(/^"|"$/g, ""))
        : `tickets_export_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Unable to export CSV");
    } finally {
      setExporting(false);
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

  const eventNameById = useMemo(() => {
    const map = {};
    for (const e of events) {
      const eid = toId(e?.id);
      if (eid != null) map[eid] = e?.event_name || null;
    }
    return map;
  }, [events]);

  const selectedEventName = useMemo(() => {
    const eid = toId(selectedTicket?.event);
    if (eid == null) return "—";
    return eventNameById[eid] || `Event #${eid}`;
  }, [selectedTicket, eventNameById]);

  const selectedTicketStatus = (selectedTicket?.status || "").toLowerCase();

  const columnCount = useMemo(() => {
    switch (filter) {
      case "paid":
        // Order ID, Email, Passport, Facebook, Member, Status, Details, Customer Payment, Payment Date
        return 9;
      case "complete":
        // Order ID, Email, Passport, Facebook, Member, Status, Details, Selling Price, Zone, Row, Seat
        return 11;
      case "cancel":
        // Order ID, Email, Passport, Facebook, Member, Customer Payment, Status, Details
        return 8;
      case "pending":
      case "all":
      default:
        // Order ID, Email, Passport, Facebook, Member, Status, Details
        return 7;
    }
  }, [filter]);

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

  const baseStatusLabel = (ticket) => {
    const statusKey = (ticket?.status || "").toLowerCase();
    return STATUS_LABELS[statusKey] || ticket?.status || "—";
  };

  const formatRefundLabel = (refundStatus) => {
    const refundKey = (refundStatus || "").toLowerCase();
    return REFUND_LABELS[refundKey] || refundStatus || "None";
  };

  const formatStatusLabel = (ticket) => {
    const statusKey = (ticket?.status || "").toLowerCase();
    const label = baseStatusLabel(ticket);

    if (statusKey === "cancel" && ticket?.refund_status && ticket.refund_status !== "none") {
      return `${label} (${formatRefundLabel(ticket.refund_status)})`;
    }

    return label;
  };

  const mobileDetailFields = (ticket) => {
    const fields = [
      { label: "Email", value: ticket._customer_email ?? "—" },
      { label: "Passport Name", value: ticket.passport_name ?? "—" },
      { label: "Facebook Name", value: ticket.facebook_name ?? "—" },
      { label: "Member Code", value: ticket.member_code ?? "—" },
    ];

    if (filter === "paid") {
      fields.push(
        { label: "Customer Payment", value: ticket.customer_payment ?? "—" },
        { label: "Payment Date", value: ticket.payment_date ?? "—" }
      );
    }

    if (filter === "complete") {
      fields.push(
        { label: "Selling Price", value: ticket.selling_price ?? "—" },
        { label: "Zone", value: ticket.zone ?? "—" },
        { label: "Row", value: ticket.row ?? "—" },
        { label: "Seat", value: ticket.seat ?? "—" }
      );
    }

    if (filter === "cancel") {
      fields.push(
        { label: "Customer Payment", value: ticket.customer_payment ?? "—" },
        { label: "Refund", value: formatRefundLabel(ticket.refund_status) }
      );
    }

    return fields;
  };

  const selectedStatusLabel = selectedTicket ? formatStatusLabel(selectedTicket) : "—";

  return (
    <div className="max-w-full mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold text-black mb-4">
        All Orders and Tickets
      </h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex flex-col gap-1 md:hidden">
          <label htmlFor="ticket-filter" className="text-sm font-medium text-gray-700">
            Filter by status
          </label>
          <select
            id="ticket-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-400 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="complete">Completed</option>
            <option value="cancel">Cancelled</option>
          </select>
        </div>

        <div className="hidden md:flex gap-2 flex-wrap">
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

        <div className="flex items-center gap-2">
          <button
            onClick={exportTicketsCsv}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export all tickets to CSV"
          >
            <FiDownload size={16} />
            {exporting ? "Exporting…" : "Export"}
          </button>

          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {loading && <div className="mb-4 text-gray-600">Loading…</div>}

      <div className="md:hidden space-y-3">
        {!loading && byFilter.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
            No tickets in this status.
          </div>
        ) : (
          byFilter.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Order ID
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {ticket._order_id ?? "—"}
                  </p>
                </div>

                <span
                  className={`inline-flex max-w-[55%] items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                    ticket.status
                  )}`}
                >
                  <span className="truncate">{baseStatusLabel(ticket)}</span>
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {mobileDetailFields(ticket).map((field) => (
                  <div
                    key={`${ticket.id}-${field.label}`}
                    className="rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {field.label}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-900">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>

              {ticket.refund_status && ticket.refund_status !== "none" ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Refund
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${refundBadgeClass(
                      ticket.refund_status
                    )}`}
                  >
                    {formatRefundLabel(ticket.refund_status)}
                  </span>
                </div>
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
                >
                  View details
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Details
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Details
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
                  Details
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
                  Details
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Details
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
                        {formatStatusLabel(t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm hover:bg-gray-50"
                      >
                        View details
                      </button>
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
                        {formatStatusLabel(t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm hover:bg-gray-50"
                      >
                        View details
                      </button>
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
                        {formatStatusLabel(t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm hover:bg-gray-50"
                      >
                        View details
                      </button>
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
                        {formatStatusLabel(t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm hover:bg-gray-50"
                      >
                        View details
                      </button>
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
                        {formatStatusLabel(t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm hover:bg-gray-50"
                      >
                        View details
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!loading && byFilter.length === 0 && (
              <tr>
                <td
                  className="px-6 py-8 text-center text-gray-500 text-sm"
                  colSpan={columnCount}
                >
                  No tickets in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedTicket(null)}
          />

          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                    Ticket details
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    {selectedEventName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Order ID: {selectedTicket._order_id ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${statusBadgeClass(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedStatusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto bg-slate-50 px-6 py-6">
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Customer info
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Passport Name
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 break-words">
                          {selectedTicket.passport_name ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Facebook Name
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 break-words">
                          {selectedTicket.facebook_name ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Member Code
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 break-words">
                          {selectedTicket.member_code ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Overview
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Order ID
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">
                          {selectedTicket._order_id ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </div>
                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${statusBadgeClass(
                              selectedTicket.status
                            )}`}
                          >
                            {selectedStatusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedTicketStatus === "complete" ||
                  selectedTicketStatus === "paid") && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {selectedTicketStatus === "complete"
                        ? "Completion details"
                        : "Payment details"}
                    </p>
                    <div
                      className={`mt-4 grid gap-4 ${
                        selectedTicketStatus === "complete"
                          ? "sm:grid-cols-2 lg:grid-cols-4"
                          : "sm:grid-cols-2"
                      }`}
                    >
                      {selectedTicketStatus === "complete" && (
                        <>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Selling Price
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900">
                              {selectedTicket.selling_price ?? "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Zone
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900">
                              {selectedTicket.zone ?? "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Row
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900">
                              {selectedTicket.row ?? "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Seat
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900">
                              {selectedTicket.seat ?? "—"}
                            </div>
                          </div>
                        </>
                      )}

                      {selectedTicketStatus === "paid" && (
                        <>
                          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                              Customer Payment
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900 break-words">
                              {selectedTicket.customer_payment ?? "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                              Payment Date
                            </div>
                            <div className="mt-2 text-lg font-bold text-slate-900 break-words">
                              {selectedTicket.payment_date ?? "—"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Price priorities
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        All available ticket priority prices
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-rose-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                        1st priority
                      </div>
                      <div className="mt-3 text-2xl font-bold text-slate-900 break-words">
                        {selectedTicket.fst_pt ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                        2nd priority
                      </div>
                      <div className="mt-3 text-2xl font-bold text-slate-900 break-words">
                        {selectedTicket.snd_pt ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-fuchsia-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                        3rd priority
                      </div>
                      <div className="mt-3 text-2xl font-bold text-slate-900 break-words">
                        {selectedTicket.trd_pt ?? selectedTicket.thrd_pt ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllTickets;
