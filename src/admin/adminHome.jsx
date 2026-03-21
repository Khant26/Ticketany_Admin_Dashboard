import React, { useState, useEffect } from "react";
import AllTickets from "./AllTickets";
import { useRef } from "react";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/";

function adminHome() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [customers, setCustomers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [togglingEventId, setTogglingEventId] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const tabRefs = useRef({});
  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 });

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

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [cs, es, ts, os] = await Promise.all([
        fetchAll(`${API_BASE}customers/`),
        fetchAll(`${API_BASE}events/`),
        fetchAll(`${API_BASE}tickets/`),
        fetchAll(`${API_BASE}orders/`),
      ]);
      setCustomers(Array.isArray(cs) ? cs : []);
      setEvents(Array.isArray(es) ? es : []);
      setTickets(Array.isArray(ts) ? ts : []);
      setOrders(Array.isArray(os) ? os : []);
    } catch (e) {
      setError(e.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get status badge color
  const statusChip = (status) => {
    const statusLower = (status || "").toLowerCase();
    switch (statusLower) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium";
      case "paid":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium";
      case "complete":
        return "bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium";
      case "cancel":
        return "bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium";
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium";
    }
  };

  const formatRefundStatus = (refundStatus) => {
    if (!refundStatus || refundStatus === "none") return null;
    return refundStatus.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTicketStatus = (status, refundStatus) => {
    const refundLabel = formatRefundStatus(refundStatus);
    if ((status || "").toLowerCase() === "cancel" && refundLabel) {
      return `${status} (${refundLabel})`;
    }
    return status;
  };

  // Aggregate tickets by event
  const eventsAgg = events.map((event) => {
    const isHidden = !!event.is_hidden;
    const eventTickets = tickets.filter((t) => t.event === event.id);

    // Create a map of order IDs to their tickets
    const orderGroupMap = {};
    eventTickets.forEach((ticket) => {
      const orderId = ticket.order || "—";
      if (!orderGroupMap[orderId]) {
        // Find the order to get customer email
        const order = orders.find((o) => o.id === ticket.order);
        const customer = customers.find((c) => c.id === order?.customer);
        const email = customer?.email || "—";

        orderGroupMap[orderId] = {
          orderId,
          email,
          rows: [],
        };
      }
      orderGroupMap[orderId].rows.push({
        passportName: ticket.passport_name || "—",
        facebookName: ticket.facebook_name || "—",
        memberCode: ticket.member_code || "—",
        priorityDate: ticket.priority_date || "—",
        price: ticket.fst_pt || "—",
        status: ticket.status || "pending",
        refundStatus: ticket.refund_status || "none",
      });
    });

    // Convert map to array of merged rows
    const mergedRows = Object.values(orderGroupMap);

    return {
      eventId: event.id,
      eventName: event.event_name || "Unknown Event",
      isHidden,
      eventDate: event.event_date || "—",
      eventLocation: event.event_location || "—",
      rows: mergedRows,
    };
  });

  useEffect(() => {
    loadData();
  }, []);

  const toggleEventHide = async (eventId) => {
    setTogglingEventId(eventId);
    setError("");
    try {
      const res = await fetch(`${API_BASE}events/${eventId}/toggle_hide/`, {
        method: "POST",
        headers: {
          ...authHeaders(),
        },
      });
      if (!res.ok) throw new Error(`Failed to toggle hide (${res.status})`);
      await loadData();
    } catch (e) {
      setError(e.message || "Unable to toggle event hide");
    } finally {
      setTogglingEventId(null);
    }
  };

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setUnderlineStyle({
        width: `${activeEl.offsetWidth}px`,
        left: `${activeEl.offsetLeft}px`,
      });
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm">
        <div className="relative flex items-end gap-6 sm:gap-12 mb-4 sm:mb-8 px-4 sm:px-8 pt-8">
          {["tickets", "events", "customers"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              ref={(el) => (tabRefs.current[tab] = el)}
              className={`relative pb-4 px-1 font-medium text-lg sm:text-xl transition-colors duration-300 ${
                activeTab === tab
                  ? "text-gray-900 cursor-default"
                  : "text-gray-600 hover:text-gray-900 cursor-pointer"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}

          <div
            className="absolute bottom-0 h-[2px] bg-pink-600 rounded transition-all duration-300"
            style={{
              width: underlineStyle.width,
              left: underlineStyle.left,
            }}
          />
        </div>

        <div className="border-b border-gray-200" />
      </div>

      {activeTab === "tickets" && <AllTickets />}

      {activeTab === "events" && (
        <div className="space-y-8 mt-6">
          {loading && (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {!loading && eventsAgg.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              No events found.
            </div>
          )}

          {!loading &&
            eventsAgg.map((block) => (
              <div
                key={block.eventId}
                className="shadow-sm border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-white px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {block.eventName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {block.eventDate} • {block.eventLocation}
                      </p>
                    </div>
                    <div>
                      {/* Modern hide/unhide pill with icon and loading state */}
                      <button
                        onClick={() => toggleEventHide(block.eventId)}
                        disabled={!!togglingEventId}
                        className={`ml-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all focus:outline-none ${
                          block.isHidden
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                        } ${togglingEventId === block.eventId ? 'opacity-80 cursor-wait' : ''}`}
                        title={block.isHidden ? 'Unhide event' : 'Hide event'}
                      >
                        {togglingEventId === block.eventId ? (
                          <FiLoader className="w-4 h-4 animate-spin" />
                        ) : block.isHidden ? (
                          <FiEyeOff className="w-4 h-4" />
                        ) : (
                          <FiEye className="w-4 h-4" />
                        )}
                        <span className="text-sm">{block.isHidden ? 'Unhide' : 'Hide'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {block.rows.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                      No tickets for this event
                    </div>
                  ) : (
                    block.rows.map((orderGroup, groupIdx) => (
                      <article
                        key={groupIdx}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Order ID
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {orderGroup.orderId}
                            </p>
                          </div>
                          <div className="max-w-[60%] text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Email
                            </p>
                            <p className="mt-1 break-words text-sm text-gray-900">
                              {orderGroup.email || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {orderGroup.rows.map((r, ticketIdx) => (
                            <div
                              key={`${block.eventId}-${groupIdx}-${ticketIdx}`}
                              className="rounded-xl bg-gray-50 px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {r.passportName}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {r.facebookName}
                                  </p>
                                </div>
                                <span className={statusChip(r.status)}>
                                  {formatTicketStatus(r.status, r.refundStatus)}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Member Code
                                  </p>
                                  <p className="mt-1 text-sm text-gray-900 break-words">
                                    {r.memberCode}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Priority Date
                                  </p>
                                  <p className="mt-1 text-sm text-gray-900 break-words">
                                    {r.priorityDate}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Price
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900 break-words">
                                    {r.price}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="bg-white min-w-full">
                    <thead className="border-b border-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Facebook Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Member Code
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Priority Date
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {block.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            No tickets for this event
                          </td>
                        </tr>
                      ) : (
                        block.rows.map((orderGroup, groupIdx) => (
                          <React.Fragment key={groupIdx}>
                            {orderGroup.rows.map((r, ticketIdx) => {
                              const rowKey = `${block.eventId}-${groupIdx}-${ticketIdx}`;
                              const isHovered = hoveredRow === rowKey;
                              const isOrderHovered =
                                hoveredRow &&
                                hoveredRow.startsWith(
                                  `${block.eventId}-${groupIdx}-`,
                                );

                              return (
                                <tr
                                  key={rowKey}
                                  onMouseEnter={() => setHoveredRow(rowKey)}
                                  onMouseLeave={() => setHoveredRow(null)}
                                  className={`transition-colors duration-150 ${
                                    isHovered ? "bg-gray-100" : ""
                                  }`}
                                >
                                  {ticketIdx === 0 && (
                                    <td
                                      rowSpan={orderGroup.rows.length}
                                      className={`px-4 py-3 text-sm text-gray-900 font-medium transition-colors duration-150 ${
                                        isOrderHovered ? "bg-gray-100" : ""
                                      }`}
                                    >
                                      {orderGroup.orderId}
                                    </td>
                                  )}

                                  {ticketIdx === 0 && (
                                    <td
                                      rowSpan={orderGroup.rows.length}
                                      className={`px-4 py-3 text-sm text-gray-900 transition-colors duration-150 ${
                                        isOrderHovered ? "bg-gray-100" : ""
                                      }`}
                                    >
                                      {orderGroup.email || "—"}
                                    </td>
                                  )}

                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {r.passportName}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {r.facebookName}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {r.memberCode}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {r.priorityDate}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                    {r.price}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={statusChip(r.status)}>
                                      {formatTicketStatus(r.status, r.refundStatus)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === "customers" && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          {loading && (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          )}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          {!loading && customers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No customers found
            </div>
          )}
          {!loading && customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className=" border-b border-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Paid
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...customers]
                    .sort((a, b) => b.id - a.id)
                    .map((customer) => {
                      const customerOrders = orders.filter(
                        (o) => o.customer === customer.id,
                      );
                      const customerTickets = tickets.filter((t) =>
                        customerOrders.some((o) => o.id === t.order),
                      );
                      const pendingCount = customerTickets.filter(
                        (t) => (t.status || "").toLowerCase() === "pending",
                      ).length;
                      const paidCount = customerTickets.filter(
                        (t) => (t.status || "").toLowerCase() === "paid",
                      ).length;

                      return (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-100 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                              {(customer.name || "U")[0].toUpperCase()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.name || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.email || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {pendingCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {paidCount}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default adminHome;
