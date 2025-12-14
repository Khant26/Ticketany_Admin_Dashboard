import React, { useEffect, useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000'

function StatusChange() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [payModal, setPayModal] = useState({ open: false, ticket: null, customer_payment: '', payment_date: '' })
  const [completeModal, setCompleteModal] = useState({ open: false, ticket: null, selling_price: '', zone: '', row: '', seat: '' })
  const [confirmPending, setConfirmPending] = useState({ open: false, ticket: null })

  const STATUS_DISPLAY = { pending: 'Pending', paid: 'Paid', complete: 'Completed', cancel: 'Cancelled' }
  const REFUND_DISPLAY = { none: 'None', in_process: 'In Process', refunded: 'Refunded' }

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

  const authHeaders = (json = false) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken')
    const h = {}
    if (token) h['Authorization'] = `Bearer ${token}`
    if (json) h['Content-Type'] = 'application/json'
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

  const loadTickets = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchAll(`${API_BASE}/api/tickets/`)
      setTickets(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e.message || 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const patchTicket = async (id, payload) => {
    const res = await fetch(`${API_BASE}/api/tickets/${id}/`, {
      method: 'PATCH',
      headers: authHeaders(true),
      credentials: 'omit',
      body: JSON.stringify(payload),
    })
    const ct = res.headers.get('content-type') || ''
    const body = ct.includes('application/json') ? await res.json() : await res.text()
    if (!res.ok) {
      const msg = typeof body === 'string' ? body : JSON.stringify(body)
      throw new Error(msg || `Failed to update ticket (${res.status})`)
    }
    return body
  }

  const openPaidModal = (t) => setPayModal({ open: true, ticket: t, customer_payment: '', payment_date: '' })
  const openCompleteModal = (t) => setCompleteModal({ open: true, ticket: t, selling_price: '', zone: '', row: '', seat: '' })
  const openConfirmPending = (t) => setConfirmPending({ open: true, ticket: t })

  const submitPaid = async () => {
    if (!payModal.ticket) return
    const id = payModal.ticket.id
    try {
      await patchTicket(id, {
        status: 'paid',
        customer_payment: payModal.customer_payment || '',
        payment_date: payModal.payment_date || '',
      })
      setPayModal({ open: false, ticket: null, customer_payment: '', payment_date: '' })
      await loadTickets()
    } catch (e) {
      alert(e.message || 'Failed to mark Paid')
    }
  }

  const submitCompleted = async () => {
    if (!completeModal.ticket) return
    const id = completeModal.ticket.id
    try {
      await patchTicket(id, {
        status: 'complete',
        selling_price: completeModal.selling_price || '',
        zone: completeModal.zone || '',
        row: completeModal.row || '',
        seat: completeModal.seat || '',
      })
      setCompleteModal({ open: false, ticket: null, selling_price: '', zone: '', row: '', seat: '' })
      await loadTickets()
    } catch (e) {
      alert(e.message || 'Failed to mark Completed')
    }
  }

  const markCancelled = async (t) => {
    try {
      await patchTicket(t.id, { status: 'cancel', refund_status: 'in_process' })
      await loadTickets()
    } catch (e) {
      alert(e.message || 'Failed to cancel ticket')
    }
  }

  const revertToPending = async () => {
    if (!confirmPending.ticket) return
    const id = confirmPending.ticket.id
    try {
      await patchTicket(id, { status: 'pending' })
      setConfirmPending({ open: false, ticket: null })
      await loadTickets()
    } catch (e) {
      alert(e.message || 'Failed to revert to Pending')
    }
  }

  const updateRefundStatus = async (t, val) => {
    try {
      await patchTicket(t.id, { refund_status: val })
      await loadTickets()
    } catch (e) {
      alert(e.message || 'Failed to update refund status')
    }
  }

  useEffect(() => { loadTickets() }, [])

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-black mb-4">Ticket Status Management</h1>

      <div className="flex items-center gap-3 mb-4">
        <button type="button" className="px-4 py-2 rounded-md border border-gray-300" onClick={loadTickets} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}
      {loading && <div className="mb-4 text-gray-600">Loading tickets…</div>}

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-[980px] w-full text-left">
          <thead className="bg-gray-50">
            <tr className="text-gray-700">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Passport Name</th>
              <th className="px-3 py-2">Facebook Name</th>
              <th className="px-3 py-2">Priority Date</th>
              <th className="px-3 py-2">1st</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Refund</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const statusLower = (t.status || '').toLowerCase()
              const refundLower = (t.refund_status || '').toLowerCase()
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.id}</td>
                  <td className="px-3 py-2">{t.passport_name || '—'}</td>
                  <td className="px-3 py-2">{t.facebook_name || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{t.priority_date || '—'}</td>
                  <td className="px-3 py-2">{t.fst_pt || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(t.status)}`}>
                      {STATUS_DISPLAY[statusLower] || t.status || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {statusLower === 'cancel' ? (
                      <select
                        className="px-2 py-1 border rounded-md"
                        value={refundLower || ''}
                        onChange={(e) => updateRefundStatus(t, e.target.value)}
                      >
                        <option value="" disabled>
                          -
                        </option>
                        <option value="in_process">{REFUND_DISPLAY['in_process']}</option>
                        <option value="refunded">{REFUND_DISPLAY['refunded']}</option>
                      </select>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {statusLower === 'pending' && (
                      <button
                        type="button"
                        onClick={() => openPaidModal(t)}
                        className="px-3 py-1 rounded-md text-white"
                        style={{ backgroundColor: '#e51f4b' }}
                      >
                        Mark Paid
                      </button>
                    )}
                    {statusLower === 'paid' && (
                      <select
                        className="px-2 py-1 border rounded-md"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) return
                          if (v === 'complete') openCompleteModal(t)
                          if (v === 'cancel') markCancelled(t)
                          e.target.value = ''
                        }}
                      >
                        <option value="" disabled>Set final status</option>
                        <option value="complete">Completed</option>
                        <option value="cancel">Cancelled</option>
                      </select>
                    )}
                    {statusLower !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => openConfirmPending(t)}
                        className="px-3 py-1 rounded-md border border-gray-300"
                        title="Back to Pending"
                      >
                        Back to Pending
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && tickets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-600" colSpan={8}>No tickets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {payModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50" onClick={() => setPayModal({ open: false, ticket: null, customer_payment: '', payment_date: '' })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Mark Ticket as Paid</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Payment</label>
                <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={payModal.customer_payment} onChange={(e) => setPayModal((m) => ({ ...m, customer_payment: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={payModal.payment_date} onChange={(e) => setPayModal((m) => ({ ...m, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="px-4 py-2 rounded border border-gray-300" onClick={() => setPayModal({ open: false, ticket: null, customer_payment: '', payment_date: '' })}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded text-white" style={{ backgroundColor: '#e51f4b' }} onClick={submitPaid}>Save & Mark Paid</button>
            </div>
          </div>
        </div>
      )}

      {completeModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50" onClick={() => setCompleteModal({ open: false, ticket: null, selling_price: '', zone: '', row: '', seat: '' })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Mark Ticket as Completed</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={completeModal.selling_price} onChange={(e) => setCompleteModal((m) => ({ ...m, selling_price: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={completeModal.zone} onChange={(e) => setCompleteModal((m) => ({ ...m, zone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Row</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={completeModal.row} onChange={(e) => setCompleteModal((m) => ({ ...m, row: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seat</label>
                  <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={completeModal.seat} onChange={(e) => setCompleteModal((m) => ({ ...m, seat: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="px-4 py-2 rounded border border-gray-300" onClick={() => setCompleteModal({ open: false, ticket: null, selling_price: '', zone: '', row: '', seat: '' })}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded text-white" style={{ backgroundColor: '#16a34a' }} onClick={submitCompleted}>Save & Complete</button>
            </div>
          </div>
        </div>
      )}

      {confirmPending.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50" onClick={() => setConfirmPending({ open: false, ticket: null })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Confirm Revert</h2>
            <p className="text-gray-700 mb-6">Are you sure you want to go back to pending status?</p>
            <div className="flex justify-end gap-3">
              <button type="button" className="px-4 py-2 rounded border border-gray-300" onClick={() => setConfirmPending({ open: false, ticket: null })}>No</button>
              <button type="button" className="px-4 py-2 rounded text-white" style={{ backgroundColor: '#374151' }} onClick={revertToPending}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusChange