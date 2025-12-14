import React, { useEffect, useMemo, useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000'

function AllTickets() {
  const [tickets, setTickets] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  const authHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken')
    const h = {}
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  const fetchAll = async (url) => {
    const res = await fetch(url, { headers: authHeaders(), credentials: 'omit' })
    if (!res.ok) throw new Error(`Failed to fetch (${res.status})`)
    const data = await res.json()
    if (Array.isArray(data)) return data
    if (data?.results) return data.results
    return []
  }

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [ts, os, cs] = await Promise.all([
        fetchAll(`${API_BASE}/api/tickets/`),
        fetchAll(`${API_BASE}/api/orders/`),
        fetchAll(`${API_BASE}/api/customers/`),
      ])
      setTickets(Array.isArray(ts) ? ts : [])
      setOrders(Array.isArray(os) ? os : [])
      setCustomers(Array.isArray(cs) ? cs : [])
    } catch (e) {
      setError(e.message || 'Unable to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const toId = (v) => {
    if (v == null) return null
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const m = v.match(/(\d+)(?!.*\d)/)
      return m ? Number(m[1]) : null
    }
    return null
  }

  const orderToCustomer = useMemo(() => {
    const map = {}
    for (const o of orders) {
      const oid = toId(o?.id)
      const cid = toId(o?.customer)
      if (oid != null && cid != null) map[oid] = cid
    }
    return map
  }, [orders])

  const customerToEmail = useMemo(() => {
    const map = {}
    for (const c of customers) {
      const cid = toId(c?.id)
      if (cid != null) map[cid] = c?.email || null
    }
    return map
  }, [customers])

  const enhancedTickets = useMemo(() => {
    return tickets.map((t) => {
      const oid = toId(t?.order)
      const cid = orderToCustomer[oid]
      const email = cid != null ? customerToEmail[cid] : null
      return { ...t, _order_id: oid, _customer_email: email }
    })
  }, [tickets, orderToCustomer, customerToEmail])

  const byFilter = useMemo(() => {
    const lower = (filter || '').toLowerCase()
    return enhancedTickets.filter((t) => (t.status || '').toLowerCase() === lower)
  }, [enhancedTickets, filter])

  const STATUS_LABELS = { pending: 'Pending', paid: 'Paid', complete: 'Completed', cancel: 'Cancelled' }
  const REFUND_LABELS = { none: 'None', in_process: 'In Process', refunded: 'Refunded' }

  const statusBadgeClass = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'complete':
        return 'bg-green-100 text-green-800'
      case 'cancel':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const refundBadgeClass = (r) => {
    switch ((r || '').toLowerCase()) {
      case 'in_process':
        return 'bg-orange-100 text-orange-800'
      case 'refunded':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-black mb-4">All Tickets</h1>

      <div className="flex items-center gap-3 mb-4">
        <select
          className="px-3 py-2 border rounded-md"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          title="Filter by status"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="complete">Completed</option>
          <option value="cancel">Cancelled</option>
        </select>
        <button type="button" className="px-4 py-2 rounded-md border border-gray-300" onClick={loadAll}>Refresh</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}
      {loading && <div className="mb-4 text-gray-600">Loading…</div>}

      {/* Table */}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-[980px] w-full text-left">
          <thead className="bg-gray-50">
            {filter === 'pending' && (
              <tr className="text-gray-700">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Passport Name</th>
                <th className="px-3 py-2">Facebook Name</th>
                <th className="px-3 py-2">Member Code</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            )}
            {filter === 'paid' && (
              <tr className="text-gray-700">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Passport Name</th>
                <th className="px-3 py-2">Facebook Name</th>
                <th className="px-3 py-2">Member Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Customer Payment</th>
                <th className="px-3 py-2">Payment Date</th>
              </tr>
            )}
            {filter === 'complete' && (
              <tr className="text-gray-700">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Passport Name</th>
                <th className="px-3 py-2">Facebook Name</th>
                <th className="px-3 py-2">Member Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Selling Price</th>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Seat</th>
              </tr>
            )}
            {filter === 'cancel' && (
              <tr className="text-gray-700">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Passport Name</th>
                <th className="px-3 py-2">Facebook Name</th>
                <th className="px-3 py-2">Member Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Customer Payment</th>
                <th className="px-3 py-2">Refund Status</th>
              </tr>
            )}
          </thead>
          <tbody>
            {byFilter.map((t) => (
              <tr key={t.id} className="border-t">
                {filter === 'pending' && (
                  <>
                    <td className="px-3 py-2">{t._order_id ?? '—'}</td>
                    <td className="px-3 py-2 break-all">{t._customer_email ?? '—'}</td>
                    <td className="px-3 py-2">{t.passport_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.facebook_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.member_code ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[(t.status || '').toLowerCase()] || t.status || '—'}
                        </span>
                      </td>
                  </>
                )}
                {filter === 'paid' && (
                  <>
                    <td className="px-3 py-2">{t._order_id ?? '—'}</td>
                    <td className="px-3 py-2 break-all">{t._customer_email ?? '—'}</td>
                    <td className="px-3 py-2">{t.passport_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.facebook_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.member_code ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[(t.status || '').toLowerCase()] || t.status || '—'}
                        </span>
                      </td>
                    <td className="px-3 py-2">{t.customer_payment ?? '—'}</td>
                    <td className="px-3 py-2">{t.payment_date ?? '—'}</td>
                  </>
                )}
                {filter === 'complete' && (
                  <>
                    <td className="px-3 py-2">{t._order_id ?? '—'}</td>
                    <td className="px-3 py-2 break-all">{t._customer_email ?? '—'}</td>
                    <td className="px-3 py-2">{t.passport_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.facebook_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.member_code ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[(t.status || '').toLowerCase()] || t.status || '—'}
                        </span>
                      </td>
                    <td className="px-3 py-2">{t.selling_price ?? '—'}</td>
                    <td className="px-3 py-2">{t.zone ?? '—'}</td>
                    <td className="px-3 py-2">{t.row ?? '—'}</td>
                    <td className="px-3 py-2">{t.seat ?? '—'}</td>
                  </>
                )}
                {filter === 'cancel' && (
                  <>
                    <td className="px-3 py-2">{t._order_id ?? '—'}</td>
                    <td className="px-3 py-2 break-all">{t._customer_email ?? '—'}</td>
                    <td className="px-3 py-2">{t.passport_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.facebook_name ?? '—'}</td>
                    <td className="px-3 py-2">{t.member_code ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[(t.status || '').toLowerCase()] || t.status || '—'}
                        </span>
                      </td>
                    <td className="px-3 py-2">{t.customer_payment ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${refundBadgeClass(t.refund_status)}`}>
                          {REFUND_LABELS[(t.refund_status || '').toLowerCase()] || t.refund_status || '—'}
                        </span>
                      </td>
                  </>
                )}
              </tr>
            ))}
            {!loading && byFilter.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-600" colSpan={10}>No tickets in this status.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AllTickets