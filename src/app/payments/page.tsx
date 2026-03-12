'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { CreditCard, Plus, X } from 'lucide-react'

interface Sale { id: string; commodity: string; totalAmount: string; bankAmount: string; party: { id: string; name: string }; isPaid: boolean }
interface Payment { id: string; amount: string; mode: string; reference: string | null; date: string; sale: { commodity: string; totalAmount: string }; party: { name: string } }

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ saleId: '', partyId: '', amount: '', mode: 'BANK', reference: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/sales').then(r => r.json()),
    ]).then(([p, s]) => { setPayments(p); setSales(s.filter((x: Sale) => !x.isPaid)); setLoading(false) })
  }, [])

  const selectedSale = sales.find(s => s.id === form.saleId)

  const handleSubmit = async () => {
    if (!form.saleId || !form.amount) return
    const sale = sales.find(s => s.id === form.saleId)
    if (!sale) return
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, partyId: sale.party.id }),
    })
    if (res.ok) {
      setShowForm(false)
      const [p, s] = await Promise.all([fetch('/api/payments').then(r => r.json()), fetch('/api/sales').then(r => r.json())])
      setPayments(p); setSales(s.filter((x: Sale) => !x.isPaid))
      setForm({ saleId: '', partyId: '', amount: '', mode: 'BANK', reference: '', date: new Date().toISOString().split('T')[0] })
    }
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Payments</motion.h1>
            <p className="page-subtitle">Track receivables & record payments</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Record Payment</button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Record Payment</h2>
                  <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                </div>
                <div className="form-group">
                  <label className="form-label">Against Sale</label>
                  <select className="input-glass" value={form.saleId} onChange={(e) => setForm({ ...form, saleId: e.target.value })}>
                    <option value="">Select unpaid sale</option>
                    {sales.map(s => <option key={s.id} value={s.id}>{s.party.name} - {s.commodity.replace('_', ' ')} - ₹{formatNumber(Number(s.totalAmount))}</option>)}
                  </select>
                </div>
                {selectedSale && <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(68,138,255,0.06)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>Total: ₹{formatNumber(Number(selectedSale.totalAmount))}</div>}
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input className="input-glass" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mode</label>
                    <select className="input-glass" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Reference</label>
                    <input className="input-glass" placeholder="UTR / Receipt #" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="input-glass" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-success" onClick={handleSubmit}>Record Payment</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <div className="shimmer" style={{ height: '300px' }} /> : payments.length === 0 ? (
          <div className="glass-card empty-state">
            <CreditCard className="empty-state-icon" size={48} />
            <div className="empty-state-text">No payments recorded</div>
            <div className="empty-state-sub">Record payments against sales to track receivables</div>
          </div>
        ) : (
          <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Party</th><th>Commodity</th><th>Amount</th><th>Mode</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td>{p.party.name}</td>
                    <td><span className="badge badge-blue">{p.sale.commodity.replace('_', ' ')}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>₹{formatNumber(Number(p.amount))}</td>
                    <td><span className={`badge ${p.mode === 'BANK' ? 'badge-blue' : 'badge-green'}`}>{p.mode}</span></td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{p.reference || '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  )
}
