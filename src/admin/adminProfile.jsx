import React, { useEffect, useMemo, useRef, useState } from "react";

function adminProfile() {
  const tabRefs = useRef({});
  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 });

  // Tabs: customers | ids | events
  const [activeTab, setActiveTab] = useState("customers");

  // Data
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]); // customers list from /api/customers/

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Orders currently being deleted (ids)
  const [deletingIds, setDeletingIds] = useState([]);
  const [deletingCustomers, setDeletingCustomers] = useState([]);

  // Modal state (View on Customers)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerFocus, setCustomerFocus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el)
      setUnderlineStyle({
        width: `${el.offsetWidth}px`,
        left: `${el.offsetLeft}px`,
      });
  }, [activeTab]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';

  const normalizeId = (value) => {
    if (value == null) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const m = value.match(/(\d+)(?!.*\d)/);
      return m
        ? Number(m[1])
        : Number.isFinite(Number(value))
        ? Number(value)
        : null;
    }
    if (typeof value === "object") {
      if (typeof value.id === "number") return value.id;
      if (typeof value.pk === "number") return value.pk;
      if (value.user && typeof value.user.id === "number") return value.user.id;
      const s = String(value);
      const m = s.match(/(\d+)(?!.*\d)/);
      return m ? Number(m[1]) : null;
    }
    return null;
  };

  // Fetch everything needed
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const parseMaybeJson = async (res) => {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return res.json();
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    };

    const toArray = (data) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data.items)) return data.items;
      return [];
    };

    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [ordersRes, ticketsRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE_URL}orders/`, { headers }),
          fetch(`${API_BASE_URL}tickets/`, { headers }),
          fetch(`${API_BASE_URL}events/`, { headers }),
        ]);

        const [ordersRaw, ticketsRaw, eventsRaw] = await Promise.all([
          parseMaybeJson(ordersRes),
          parseMaybeJson(ticketsRes),
          parseMaybeJson(eventsRes),
        ]);

        if (!ordersRes.ok)
          throw new Error(
            typeof ordersRaw === "string"
              ? ordersRaw
              : JSON.stringify(ordersRaw)
          );
        if (!ticketsRes.ok)
          throw new Error(
            typeof ticketsRaw === "string"
              ? ticketsRaw
              : JSON.stringify(ticketsRaw)
          );
        if (!eventsRes.ok)
          throw new Error(
            typeof eventsRaw === "string"
              ? eventsRaw
              : JSON.stringify(eventsRaw)
          );

        setOrders(toArray(ordersRaw));
        setTickets(toArray(ticketsRaw));
        setEvents(toArray(eventsRaw));
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // Fetch customers list for emails and base roster
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}customers/`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : toArray(data));
      } catch {
        // optional
      }
    })();
  }, []);

  const usersById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const id = normalizeId(u?.id);
      if (id != null) map.set(id, u);
    });
    return map;
  }, [users]);

  const eventsById = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const id = normalizeId(ev?.id);
      if (id != null) map.set(id, ev);
    });
    return map;
  }, [events]);

  // Link helpers (best-effort; supports multiple backend shapes)
  const getTicketPrice = (t) => {
    // Try explicit price field; fallback to fst_pt like in user Profile
    return t?.price || t?.fst_pt || t?.snd_pt || t?.trd_pt || "";
  };

  const getTicketEventId = (t) => {
    return (
      normalizeId(t?.event) ||
      normalizeId(t?.event_id) ||
      normalizeId(t?.eventId) ||
      null
    );
  };

  const getOrderEventId = (o) => {
    return (
      normalizeId(o?.event) ||
      normalizeId(o?.event_id) ||
      normalizeId(o?.eventId) ||
      null
    );
  };

  const getOrderCustomerId = (o) => normalizeId(o?.customer);

  // Delete an order by id (calls backend and removes from local state)
  const deleteOrder = async (orderId) => {
    const id = Number(orderId);
    if (!id) return alert("Invalid order id");
    if (!confirm(`Delete order #${id}? This cannot be undone.`)) return;

    // avoid duplicate deletes
    if (deletingIds.includes(id)) return;
    setDeletingIds((s) => [...s, id]);

    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}orders/${id}/`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete order ${id}`);
      }

      // Remove order and its tickets from local state
      setOrders((prev) => prev.filter((o) => normalizeId(o?.id) !== id));
      setTickets((prev) => prev.filter((t) => normalizeId(t?.order) !== id));
    } catch (e) {
      console.error(e);
      alert(`Delete failed: ${e?.message || e}`);
    } finally {
      setDeletingIds((s) => s.filter((x) => x !== id));
    }
  };

  const deleteCustomer = async (customerId) => {
    const id = Number(customerId);
    if (!id) return alert("Invalid customer id");
    if (!confirm(`Delete customer #${id}? This will remove their account.`))
      return;

    // avoid duplicate deletes
    if (deletingCustomers.includes(id)) return;
    setDeletingCustomers((s) => [...s, id]);

    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}customers/${id}/`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete customer ${id}`);
      }

      // Remove customer from local state
      setUsers((prev) => prev.filter((u) => normalizeId(u?.id) !== id));

      // Optionally remove their orders and tickets
      setOrders((prev) => prev.filter((o) => normalizeId(o?.customer) !== id));
      setTickets((prev) =>
        prev.filter((t) => {
          const order = orders.find(
            (o) => normalizeId(o?.id) === normalizeId(t?.order)
          );
          return order && normalizeId(order?.customer) !== id;
        })
      );
    } catch (e) {
      console.error(e);
      alert(`Customer delete failed: ${e?.message || e}`);
    } finally {
      setDeletingCustomers((s) => s.filter((x) => x !== id));
    }
  };

  // Build quick lookups
  const ticketsByOrder = useMemo(() => {
    return tickets.reduce((acc, t) => {
      const oid = normalizeId(t?.order);
      if (!oid) return acc;
      if (!acc[oid]) acc[oid] = [];
      acc[oid].push(t);
      return acc;
    }, {});
  }, [tickets]);

  // Customers tab data: list ALL customers with aggregated counts from orders/tickets
  const customersAgg = useMemo(() => {
    // Build counts map from orders -> tickets
    const counts = new Map();
    orders.forEach((o) => {
      const cid = getOrderCustomerId(o);
      if (!cid) return;
      if (!counts.has(cid))
        counts.set(cid, {
          pending: 0,
          paid: 0,
          received: 0,
          cancelled: 0,
          total: 0,
        });
      const group = counts.get(cid);
      const ts = ticketsByOrder[o.id] || [];
      ts.forEach((t) => {
        const status = String(t?.status || "").toLowerCase();
        if (status.includes("cancel")) group.cancelled += 1;
        else if (status.includes("receive")) group.received += 1;
        else if (status.includes("paid")) group.paid += 1;
        else group.pending += 1;
        group.total += 1;
      });
    });

    // Render rows for every customer from /api/customers/
    return (users || []).map((u) => {
      const customerId = normalizeId(u?.id);
      const email =
        (u?.email || u?.name || u?.username || "").toString() || "—";
      const c = (customerId != null && counts.get(customerId)) || {
        pending: 0,
        paid: 0,
        received: 0,
        cancelled: 0,
        total: 0,
      };
      return { customerId, email, ...c };
    });
  }, [orders, ticketsByOrder, users]);

  // IDs tab rows: one row per ticket
  const idRows = useMemo(() => {
    const rows = [];
    orders.forEach((o) => {
      const oid = o?.id;
      const ts = ticketsByOrder[oid] || [];
      ts.forEach((t) => {
        const eid = getOrderEventId(o) || getTicketEventId(t);
        const ev = eventsById.get(eid);
        rows.push({
          orderId: oid,
          eventName: ev?.event_name || ev?.name || "Event",
          passportName: t?.passport_name || "—",
          memberCode: t?.member_code || "—",
          priorityDate: t?.priority_date || "",
          price: getTicketPrice(t),
          status: t?.status || "Pending",
        });
      });
    });
    return rows;
  }, [orders, ticketsByOrder, eventsById]);

  // Events tab rows: grouped by event id
  const eventsAgg = useMemo(() => {
    const map = new Map();
    // Walk all tickets, infer event id from ticket or its order
    tickets.forEach((t) => {
      const oid = normalizeId(t?.order);
      const order = orders.find((o) => normalizeId(o?.id) === oid);
      const eid =
        getTicketEventId(t) || (order ? getOrderEventId(order) : null);
      if (!eid) return;
      if (!map.has(eid)) map.set(eid, []);
      map.get(eid).push({
        orderId: oid,
        passportName: t?.passport_name || "—",
        memberCode: t?.member_code || "—",
        price: getTicketPrice(t),
        status: t?.status || "Pending",
      });
    });
    // Present as array with event meta
    return Array.from(map.entries()).map(([eid, rows]) => {
      const ev = eventsById.get(Number(eid));
      const name = ev?.event_name || ev?.name || `Event #${eid}`;
      return { eventId: Number(eid), eventName: name, rows };
    });
  }, [tickets, orders, eventsById]);

  const statusChip = (status) => {
    const s = String(status || "").toLowerCase();
    const base = "inline-block px-3 py-1 rounded border text-sm font-medium";
    if (s.includes("cancel")) return `${base} border-red-500 text-red-600`;
    if (s.includes("receive")) return `${base} border-pink-500 text-pink-600`;
    if (s.includes("paid")) return `${base} border-green-500 text-green-600`;
    return `${base} border-orange-500 text-orange-600`;
  };

  const CustomerModal = () => {
    if (!showCustomerModal || !customerFocus) return null;
    const { customerId } = customerFocus;
    // Flatten all tickets for this customer
    const myOrderIds = orders
      .filter((o) => getOrderCustomerId(o) === customerId)
      .map((o) => o.id);
    const myTickets = myOrderIds.flatMap((oid) => ticketsByOrder[oid] || []);
    const nameOrEmail =
      usersById.get(customerId)?.email ||
      usersById.get(customerId)?.username ||
      usersById.get(customerId)?.name ||
      `User #${customerId}`;

    return (
      <div className="fixed inset-0 flex items-center justify-center px-4 bg-black/50 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Customer: {nameOrEmail}</h3>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {myTickets.length === 0 && (
              <div className="text-gray-500">No tickets.</div>
            )}
            {myTickets.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-3 items-center border-b py-2 text-sm"
              >
                <div className="col-span-1 font-medium">
                  #{normalizeId(t?.order) || "-"}
                </div>
                <div className="col-span-2 truncate">
                  {t?.passport_name || "—"}
                </div>
                <div className="col-span-1">{t?.member_code || "—"}</div>
                <div className="col-span-1">{t?.priority_date || "—"}</div>
                <div className="col-span-1 text-right flex items-center justify-end gap-2">
                  <div>
                    {getTicketPrice(t) ? `${getTicketPrice(t)} THB` : "—"}
                  </div>
                  <button
                    onClick={() => deleteOrder(normalizeId(t?.order))}
                    disabled={deletingIds.includes(
                      Number(normalizeId(t?.order))
                    )}
                    className="text-red-600 hover:text-red-800 px-2 py-1 text-sm rounded"
                  >
                    {deletingIds.includes(Number(normalizeId(t?.order)))
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <button
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setShowCustomerModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-14 bg-gray-50">
      <div className="w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header (mirrors user Profile) */}
        <div className="bg-white shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-8">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 text-white flex items-center justify-center font-bold text-lg rounded">
                TA
              </div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-black relative pb-2 after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-[#f28fa5]">
                Admin
              </h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow-sm">
          <div className="relative flex items-end gap-12 mb-8 px-8 pt-8">
            {[
              { key: "customers", label: "Customers" },
              { key: "events", label: "Events" },
            ].map((t) => (
              <button
                key={t.key}
                ref={(el) => (tabRefs.current[t.key] = el)}
                onClick={() => setActiveTab(t.key)}
                className={`relative pb-4 px-1 font-medium text-2xl transition-colors ${
                  activeTab === t.key
                    ? "text-gray-700"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div
              className="absolute bottom-0 h-[2px] bg-[#f28fa5] rounded transition-all duration-300"
              style={{ width: underlineStyle.width, left: underlineStyle.left }}
            />
          </div>
          <div className="border-b border-[#f28fa5]" />
        </div>

        {/* Content */}
        <div className="bg-white shadow-sm pt-1 px-3 sm:px-4 pb-6">
          {loading && (
            <div className="text-center py-12 text-gray-500">Loading…</div>
          )}
          {error && (
            <div className="text-center py-12 text-red-600">{error}</div>
          )}

          {!loading && !error && activeTab === "customers" && (
            <div className="space-y-3 mt-4">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 text-gray-700 font-semibold">
                <div>User ID</div>
                <div>Email</div>
                <div className="">Pending</div>
                <div className="">Paid</div>
                <div className="">Received</div>
                <div className="text-right">Action</div>
              </div>
              <div className="border-b" />
              {/* Rows */}
              {customersAgg.map((c) => (
                <div
                  key={c.customerId}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center px-4 py-3"
                >
                  <div className="font-medium">#{c.customerId}</div>
                  <div className="truncate">{c.email || "—"}</div>
                  <div className="text-orange-600">{c.pending}</div>
                  <div className="text-green-600">{c.paid}</div>
                  <div className="text-pink-600">{c.received}</div>
                  <div className="md:text-right flex space-x-2">
                    <button
                      onClick={() => {
                        setCustomerFocus({ customerId: c.customerId });
                        setShowCustomerModal(true);
                      }}
                      className="px-3 py-1 rounded border hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteCustomer(c.customerId)}
                      disabled={deletingCustomers.includes(
                        Number(c.customerId)
                      )}
                      className="px-3 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50"
                    >
                      {deletingCustomers.includes(Number(c.customerId))
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
              {customersAgg.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  No customers.
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "events" && (
            <div className="space-y-8 mt-6">
              {eventsAgg.map((block) => (
                <div
                  key={block.eventId}
                  className="border border-gray-200 rounded-lg"
                >
                  <div className="px-4 py-3 font-semibold text-lg">
                    {block.eventName}
                  </div>
                  <div className="border-t">
                    <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 text-gray-700 font-semibold">
                      <div>ID</div>
                      <div>Passport Name</div>
                      <div>Member Code</div>
                      <div className="text-right">Price</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    {block.rows.map((r, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center px-4 py-3 border-t"
                      >
                        <div className="font-medium">#{r.orderId}</div>
                        <div className="truncate">{r.passportName}</div>
                        <div>{r.memberCode}</div>
                        <div className="text-right">
                          {r.price ? `${r.price} THB` : "—"}
                        </div>
                        <div className="md:col-span-2 text-right flex items-center justify-end gap-2">
                          <span className={statusChip(r.status)}>
                            {r.status}
                          </span>
                          <button
                            onClick={() => deleteOrder(r.orderId)}
                            disabled={deletingIds.includes(Number(r.orderId))}
                            className="text-red-600 hover:text-red-800 px-2 py-1 text-sm rounded"
                          >
                            {deletingIds.includes(Number(r.orderId))
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {block.rows.length === 0 && (
                      <div className="px-4 py-6 text-gray-500">
                        No orders for this event.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {eventsAgg.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  No events.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCustomerModal && <CustomerModal />}
    </div>
  );
}

export default adminProfile;
