import React, { useState, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";

const API_BASE = "http://127.0.0.1:8000";

function StatusChange() {
  useEffect(() => {
    loadTickets();
  }, []);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [payModal, setPayModal] = useState({
    open: false,
    ticket: null,
    customer_payment: "",
    payment_date: "",
  });

  const [completeModal, setCompleteModal] = useState({
    open: false,
    ticket: null,
    selling_price: "",
    zone: "",
    row: "",
    seat: "",
  });

  const [confirmPending, setConfirmPending] = useState({
    open: false,
    ticket: null,
  });

  const [confirmCancel, setConfirmCancel] = useState({
    open: false,
    ticket: null,
  });

  const STATUS_DISPLAY = {
    pending: "Pending",
    paid: "Paid",
    complete: "Completed",
    cancel: "Cancelled",
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

  const authHeaders = (json = false) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const fetchAll = async (url) => {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  };

  const loadTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAll(`${API_BASE}/api/tickets/`);
      setTickets(list);
    } catch (e) {
      setError(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const patchTicket = async (id, payload) => {
    const res = await fetch(`${API_BASE}/api/tickets/${id}/`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Update failed");
  };

  const openPaidModal = (t) =>
    setPayModal({
      open: true,
      ticket: t,
      customer_payment: "",
      payment_date: "",
    });

  const openCompleteModal = (t) =>
    setCompleteModal({
      open: true,
      ticket: t,
      selling_price: "",
      zone: "",
      row: "",
      seat: "",
    });

  const openConfirmPending = (t) =>
    setConfirmPending({ open: true, ticket: t });

  const openConfirmCancel = (t) => setConfirmCancel({ open: true, ticket: t });

  const submitPaid = async () => {
    await patchTicket(payModal.ticket.id, {
      status: "paid",
      customer_payment: payModal.customer_payment,
      payment_date: payModal.payment_date,
    });
    setPayModal({ open: false, ticket: null });
    loadTickets();
  };

  const submitCompleted = async () => {
    await patchTicket(completeModal.ticket.id, {
      status: "complete",
      selling_price: completeModal.selling_price,
      zone: completeModal.zone,
      row: completeModal.row,
      seat: completeModal.seat,
    });
    setCompleteModal({ open: false, ticket: null });
    loadTickets();
  };

  const markCancelled = async (t) => {
    await patchTicket(t.id, { status: "cancel", refund_status: "in_process" });
    loadTickets();
  };

  const revertToPending = async () => {
    const t = confirmPending.ticket;
    if (!t) return;

    const payload = { status: "pending" };
    if ((t.status || "").toLowerCase() === "cancel") {
      payload.refund_status = "none";
    }

    await patchTicket(t.id, payload);
    setConfirmPending({ open: false, ticket: null });
    loadTickets();
  };

  const submitCancel = async () => {
    const t = confirmCancel.ticket;
    if (!t) return;

    await patchTicket(t.id, { status: "cancel", refund_status: "in_process" });
    setConfirmCancel({ open: false, ticket: null });
    loadTickets();
  };

  const changeRefundStatus = async (ticketId, status) => {
    await patchTicket(ticketId, { refund_status: status });
    loadTickets();
  };

  const filteredTickets = tickets.filter((t) =>
    activeTab === "all" ? true : (t.status || "").toLowerCase() === activeTab
  );

  return (
    <div className="max-w-full mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Ticket Status Management</h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "paid", "complete", "cancel"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                activeTab === tab
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {tab === "all" ? "All" : STATUS_DISPLAY[tab]}
            </button>
          ))}
        </div>

        <button
          onClick={loadTickets}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
        >
          <FiRefreshCw
            className={`${loading ? "animate-spin" : ""}`}
            size={16}
          />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto shadow-sm border border-gray-300 rounded-lg">
        <table className="bg-white w-full text-sm">
          <thead className=" border-b border-gray-400">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Passport Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Facebook Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Priority Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                1st
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filteredTickets.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500 text-sm"
                >
                  No tickets found.
                </td>
              </tr>
            ) : (
              (() => {
                const grouped = {};
                filteredTickets.forEach((t) => {
                  const id = t.order || "—";
                  grouped[id] = grouped[id] || [];
                  grouped[id].push(t);
                });

                return Object.keys(grouped)
                  .sort((a, b) => Number(b) - Number(a))
                  .flatMap((orderId) =>
                    grouped[orderId].map((t, i) => (
                      <tr key={t.id}>
                        {i === 0 && (
                          <td
                            rowSpan={grouped[orderId].length}
                            className="px-6 py-4 text-sm font-semibold text-gray-900"
                          >
                            {orderId}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {t.passport_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {t.facebook_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {t.priority_date || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {t.fst_pt || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                              t.status
                            )}`}
                          >
                            {STATUS_DISPLAY[(t.status || "").toLowerCase()]}
                            {t.status?.toLowerCase() === "cancel" &&
                            t.refund_status &&
                            t.refund_status !== "none"
                              ? ` (${t.refund_status
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())})`
                              : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          {(t.status || "").toLowerCase() === "pending" && (
                            <button
                              onClick={() => openPaidModal(t)}
                              className="px-3 py-1 hover:bg-gray-100 hover:scale-105 rounded border transition-all duration-200"
                            >
                              Mark Paid
                            </button>
                          )}

                          {(t.status || "").toLowerCase() === "paid" && (
                            <select
                              className="border hover:bg-gray-100 hover:scale-105 transition-all duration-200 rounded px-2 py-1"
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "pending") openConfirmPending(t);
                                if (v === "complete") openCompleteModal(t);
                                if (v === "cancel") openConfirmCancel(t);
                                e.target.value = "";
                              }}
                            >
                              <option value="" hidden>
                                Change status
                              </option>
                              <option value="pending">Pending</option>
                              <option value="complete">Completed</option>
                              <option value="cancel">Cancelled</option>
                            </select>
                          )}

                          {(t.status || "").toLowerCase() === "complete" && (
                            <select
                              className="border hover:bg-gray-100 hover:scale-105 transition-all duration-200 rounded px-2 py-1"
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "pending") openConfirmPending(t);
                                if (v === "cancel") openConfirmCancel(t);
                                e.target.value = "";
                              }}
                            >
                              <option value="" hidden>
                                Change status
                              </option>
                              <option value="pending">Pending</option>
                              <option value="cancel">Cancelled</option>
                            </select>
                          )}

                          {(t.status || "").toLowerCase() === "cancel" && (
                            <select
                              className="border hover:bg-gray-100 hover:scale-105 transition-all duration-200 rounded px-2 py-1"
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "pending") openConfirmPending(t);
                                if (v === "in_process")
                                  changeRefundStatus(t.id, "in_process");
                                if (v === "refunded")
                                  changeRefundStatus(t.id, "refunded");
                                e.target.value = "";
                              }}
                            >
                              <option value="" hidden>
                                Change Status
                              </option>
                              <option value="pending">Back to Pending</option>
                              <option value="in_process">In Process</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))
                  );
              })()
            )}
          </tbody>
        </table>
      </div>

      {payModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Mark Ticket as Paid</h2>
            <input
              className="rounded-md w-full border border-gray-300 p-2 mb-3"
              placeholder="Enter Customer payment"
              value={payModal.customer_payment}
              onChange={(e) =>
                setPayModal((m) => ({
                  ...m,
                  customer_payment: e.target.value,
                }))
              }
            />
            <input
              className="rounded-md w-full border border-gray-300 p-2 mb-4 "
              placeholder="Enter Payment date"
              value={payModal.payment_date}
              onChange={(e) =>
                setPayModal((m) => ({
                  ...m,
                  payment_date: e.target.value,
                }))
              }
            />
            <div className="flex justify-end gap-2 ">
              <button
                className=" border px-4 py-2 hover:bg-gray-100 transition-all transition-duration-200"
                onClick={() => setPayModal({ open: false, ticket: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-white bg-[#ee6786ff] hover:bg-[#ee6786ff]/90 transition-all transition-duration-200"
                onClick={submitPaid}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {completeModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <form
            className="bg-white p-6 rounded w-full max-w-md"
            onSubmit={submitCompleted}
          >
            <h2 className="text-lg font-semibold mb-4">
              Mark Ticket as Completed
            </h2>

            {[
              { key: "selling_price", placeholder: "Enter Selling price" },
              { key: "zone", placeholder: "Enter Zone" },
              { key: "row", placeholder: "Enter Row" },
              { key: "seat", placeholder: "Enter Seat" },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                className="rounded-md w-full border border-gray-300 p-2 mb-4"
                placeholder={placeholder}
                value={completeModal[key]}
                onChange={(e) =>
                  setCompleteModal((m) => ({
                    ...m,
                    [key]: e.target.value,
                  }))
                }
              />
            ))}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="border px-4 py-2 hover:bg-gray-100 transition-all duration-200"
                onClick={() => setCompleteModal({ open: false, ticket: null })}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 text-white bg-[#ee6786ff] hover:bg-[#ee6786ff]/90 transition-all duration-200"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmPending.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Revert to Pending</h2>
            <p className="mb-4">Are you sure you want to go back to pending?</p>
            <div className="flex justify-end gap-2">
              <button
                className="border px-4 py-2 hover:bg-gray-100 transition-all duration-200"
                onClick={() => setConfirmPending({ open: false, ticket: null })}
              >
                No
              </button>
              <button
                className="px-4 py-2 text-white bg-[#ee6786ff] hover:bg-[#ee6786ff]/90 transition-all duration-200"
                onClick={revertToPending}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancel.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Cancel Ticket</h2>
            <p className="mb-4">
              Are you sure you want to cancel this ticket? This will initiate a
              refund process.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="border px-4 py-2 hover:bg-gray-100 transition-all duration-200"
                onClick={() => setConfirmCancel({ open: false, ticket: null })}
              >
                No
              </button>
              <button
                className="px-4 py-2 text-white bg-[#ee6786ff] hover:bg-[#ee6786ff]/90 transition-all duration-200"
                onClick={submitCancel}
              >
                Yes, Cancel Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusChange;
