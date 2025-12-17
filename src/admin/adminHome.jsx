import React, { useState, useEffect } from "react";
import AllTickets from "./AllTickets";
import { useRef } from "react";

const API_BASE = "http://127.0.0.1:8000";

function adminHome() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [customers, setCustomers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        fetchAll(`${API_BASE}/api/customers/`),
        fetchAll(`${API_BASE}/api/events/`),
        fetchAll(`${API_BASE}/api/tickets/`),
        fetchAll(`${API_BASE}/api/orders/`),
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

  // Aggregate tickets by event
  const eventsAgg = events.map((event) => {
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
      eventDate: event.event_date || "—",
      eventLocation: event.event_location || "—",
      rows: mergedRows,
    };
  });

  useEffect(() => {
    loadData();
  }, []);

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
                className=" shadow-sm border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-white px-4 py-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {block.eventName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {block.eventDate} • {block.eventLocation}
                  </p>
                </div>
                <div className="overflow-x-auto">
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
                            {orderGroup.rows.map((r, ticketIdx) => (
                              <tr
                                key={`${groupIdx}-${ticketIdx}`}
                                className="hover:bg-gray-100 transition-colors"
                              >
                                {ticketIdx === 0 && (
                                  <td
                                    className="px-4 py-3 text-sm text-gray-900 font-medium"
                                    rowSpan={orderGroup.rows.length}
                                  >
                                    {orderGroup.orderId}
                                  </td>
                                )}
                                {ticketIdx === 0 && (
                                  <td
                                    className="px-4 py-3 text-sm text-gray-900"
                                    rowSpan={orderGroup.rows.length}
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
                                    {r.status}
                                    {r.status?.toLowerCase() === "cancel" &&
                                    r.refundStatus &&
                                    r.refundStatus !== "none"
                                      ? ` (${r.refundStatus
                                          .replace("_", " ")
                                          .replace(/\b\w/g, (l) =>
                                            l.toUpperCase()
                                          )})`
                                      : ""}
                                  </span>
                                </td>
                              </tr>
                            ))}
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
                  {customers.map((customer) => {
                    const customerOrders = orders.filter(
                      (o) => o.customer === customer.id
                    );
                    const customerTickets = tickets.filter((t) =>
                      customerOrders.some((o) => o.id === t.order)
                    );
                    const pendingCount = customerTickets.filter(
                      (t) => (t.status || "").toLowerCase() === "pending"
                    ).length;
                    const paidCount = customerTickets.filter(
                      (t) => (t.status || "").toLowerCase() === "paid"
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
