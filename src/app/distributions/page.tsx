'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Home, Plus, X, Trash2, Heart, User, Users } from 'lucide-react'

interface Distribution { id: string; amount: number; recipient: string; description: string | null; date: string }
interface DistributionData {
  distributions: Distribution[]
  summary: { totalWife: number; totalSon: number; totalOther: number; grandTotal: number }
}

const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const RECIPIENTS = [
  { value: 'WIFE', label: 'Wife (Mother)', icon: Heart, color: '#ff69b4' },
  { value: 'SON', label: 'Son (You)', icon: User, color: '#448aff' },
  { value: 'OTHER', label: 'Other', icon: Users, color: '#b388ff' },
]

export default function DistributionsPage() {
  const currentMonth = new Date().getMonth()
  const defaultYear = currentMonth >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const [selectedFYStart, setSelectedFYStart] = useState(defaultYear)
  const [data, setData] = useState<DistributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', recipient: 'WIFE', description: '', date: new Date().toISOString().split('T')[0] })

  const fetchData = async () => {
    const res = await fetch(`/api/distributions?year=${selectedFYStart}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [selectedFYStart])

  const handleSubmit = async () => {
    if (!form.amount || !form.recipient) return
    await fetch('/api/distributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ amount: '', recipient: 'WIFE', description: '', date: new Date().toISOString().split('T')[0] })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/distributions?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Home size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
              Home Distributions
            </motion.h1>
            <p className="page-subtitle">Track cash / profit given to family members</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select className="input-glass" style={{ minWidth: '150px' }} value={selectedFYStart} onChange={e => setSelectedFYStart(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>FY {y}-{y + 1}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Give Cash</button>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {RECIPIENTS.map((r, i) => {
              const total = r.value === 'WIFE' ? data.summary.totalWife : r.value === 'SON' ? data.summary.totalSon : data.summary.totalOther
              const Icon = r.icon
              return (
                <motion.div
                  key={r.value}
                  className="stat-card"
                  style={{ '--stat-color': r.color, '--stat-color-dim': `${r.color}26` } as React.CSSProperties}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="stat-icon" style={{ background: `${r.color}15`, color: r.color }}><Icon size={20} /></div>
                  <div className="stat-label">{r.label}</div>
                  <div className="stat-value" style={{ color: r.color }}>₹{fmtN(total)}</div>
                  <div className="stat-sub">FY {selectedFYStart}-{selectedFYStart + 1}</div>
                </motion.div>
              )
            })}
            <motion.div
              className="stat-card"
              style={{ '--stat-color': 'var(--accent-green)', '--stat-color-dim': 'var(--accent-green-dim)' } as React.CSSProperties}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
            >
              <div className="stat-label">Total Distributed</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>₹{fmtN(data.summary.grandTotal)}</div>
              <div className="stat-sub">{data.distributions.length} entries</div>
            </motion.div>
          </div>
        )}

        {/* Add Distribution Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Record Cash Distribution</h2>
                  <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipient</label>
                    <select className="input-glass" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })}>
                      {RECIPIENTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input className="input-glass" type="number" placeholder="e.g. 5000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="input-glass" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optional)</label>
                    <input className="input-glass" placeholder="e.g. Monthly pocket money, groceries" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-success" onClick={handleSubmit}>Record Distribution</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Distribution History */}
        {loading ? (
          <div className="shimmer" style={{ height: '300px' }} />
        ) : !data || data.distributions.length === 0 ? (
          <div className="glass-card empty-state">
            <Home className="empty-state-icon" size={48} />
            <div className="empty-state-text">No distributions recorded</div>
            <div className="empty-state-sub">Track money given to family — daily, weekly, or monthly</div>
          </div>
        ) : (
          <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Recipient</th><th style={{ textAlign: 'right' }}>Amount</th><th>Description</th><th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.distributions.map((d, i) => {
                  const rec = RECIPIENTS.find(r => r.value === d.recipient)
                  const Icon = rec?.icon || Users
                  return (
                    <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${rec?.color}15` }}>
                            <Icon size={14} color={rec?.color} />
                          </div>
                          <span style={{ fontWeight: 500 }}>{rec?.label || d.recipient}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: rec?.color }}>₹{fmtN(d.amount)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{d.description || '—'}</td>
                      <td>
                        <button className="btn btn-icon" onClick={() => handleDelete(d.id)} style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  )
}
