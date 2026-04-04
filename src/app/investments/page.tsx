'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { PiggyBank, Plus, X, Calendar, CheckCircle2, Circle, Clock, IndianRupee } from 'lucide-react'

interface CommitteePaymentData { id: string; month: number; year: number; amount: number; isPaid: boolean; date: string }
interface Committee {
  id: string; committeeName: string; maturityAmount: number; startDate: string; maturityDate: string
  totalMonths: number; isActive: boolean; notes: string | null; totalPaid: number; monthsLeft: number
  progress: number; payments: CommitteePaymentData[]
}

const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function InvestmentsPage() {
  const [committees, setCommittees] = useState<Committee[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState<string>('')
  const [createForm, setCreateForm] = useState({
    committeeName: "Father's Committee", maturityAmount: '500000',
    startDate: new Date().toISOString().split('T')[0],
    maturityDate: '', totalMonths: '13', notes: '',
  })
  const [payForm, setPayForm] = useState({ month: '', year: '', amount: '', date: new Date().toISOString().split('T')[0] })

  const fetchData = async () => {
    const res = await fetch('/api/committee')
    if (res.ok) setCommittees(await res.json())
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    if (!createForm.maturityAmount || !createForm.startDate) return
    await fetch('/api/committee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_committee', ...createForm }),
    })
    setShowCreate(false)
    fetchData()
  }

  const handlePay = async () => {
    if (!payForm.month || !payForm.year || !payForm.amount || !selectedCommittee) return
    await fetch('/api/committee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_payment', committeeId: selectedCommittee, ...payForm }),
    })
    setShowPay(false)
    setPayForm({ month: '', year: '', amount: '', date: new Date().toISOString().split('T')[0] })
    fetchData()
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PiggyBank size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
              Committee Investments
            </motion.h1>
            <p className="page-subtitle">Track committee contributions & maturity progress</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Committee</button>
        </div>

        {/* Create Committee Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">New Committee</h2>
                  <button className="btn btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Committee Name</label><input className="input-glass" value={createForm.committeeName} onChange={e => setCreateForm({ ...createForm, committeeName: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Maturity Amount (₹)</label><input className="input-glass" type="number" value={createForm.maturityAmount} onChange={e => setCreateForm({ ...createForm, maturityAmount: e.target.value })} /></div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label className="form-label">Start Date</label><input className="input-glass" type="date" value={createForm.startDate} onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Maturity Date</label><input className="input-glass" type="date" value={createForm.maturityDate} onChange={e => setCreateForm({ ...createForm, maturityDate: e.target.value })} /></div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label className="form-label">Total Months</label><input className="input-glass" type="number" value={createForm.totalMonths} onChange={e => setCreateForm({ ...createForm, totalMonths: e.target.value })} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="input-glass" value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} />
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreate}>Create Committee</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Payment Modal */}
        <AnimatePresence>
          {showPay && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPay(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Record Monthly Payment</h2>
                  <button className="btn btn-icon" onClick={() => setShowPay(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select className="input-glass" value={payForm.month} onChange={e => setPayForm({ ...payForm, month: e.target.value })}>
                      <option value="">Select</option>
                      {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Year</label><input className="input-glass" type="number" placeholder="2026" value={payForm.year} onChange={e => setPayForm({ ...payForm, year: e.target.value })} /></div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label className="form-label">Amount (₹)</label><input className="input-glass" type="number" placeholder="Variable amount" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Payment Date</label><input className="input-glass" type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowPay(false)}>Cancel</button>
                  <button className="btn btn-success" onClick={handlePay}>Record Payment</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="stats-grid">{[...Array(2)].map((_, i) => <div key={i} className="shimmer" style={{ height: '300px' }} />)}</div>
        ) : committees.length === 0 ? (
          <div className="glass-card empty-state">
            <PiggyBank className="empty-state-icon" size={48} />
            <div className="empty-state-text">No committee investments</div>
            <div className="empty-state-sub">Create a committee to start tracking your father&apos;s monthly investments</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {committees.map((c, ci) => {
              const circumference = 2 * Math.PI * 50
              const strokeOffset = circumference - (circumference * c.progress) / 100
              const ringColor = c.progress >= 80 ? '#00e676' : c.progress >= 50 ? '#ffab00' : '#448aff'
              const avgPayment = c.payments.length > 0 ? c.totalPaid / c.payments.length : 0

              return (
                <motion.div key={c.id} className="glass-card iridescent-border" style={{ padding: '28px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{c.committeeName}</h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', gap: '16px', marginTop: '4px' }}>
                        <span><Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />{new Date(c.startDate).toLocaleDateString('en-IN')} → {new Date(c.maturityDate).toLocaleDateString('en-IN')}</span>
                        <span><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />{c.monthsLeft} months left</span>
                      </div>
                    </div>
                    <button className="btn btn-success btn-sm" onClick={() => { setSelectedCommittee(c.id); setShowPay(true) }}>
                      <Plus size={14} /> Pay Monthly
                    </button>
                  </div>

                  {/* Progress Section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke={ringColor} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round" className="gauge-ring" style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: ringColor }}>{c.progress.toFixed(0)}%</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Progress</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flex: 1 }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total Paid</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>₹{fmtN(c.totalPaid)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Maturity Amount</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)' }}>₹{fmtN(c.maturityAmount)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Avg. Monthly</span>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-amber)' }}>₹{fmtN(avgPayment)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History Grid */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Payment History</h4>
                    {c.payments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No payments recorded yet. Start by paying the first month.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {c.payments.map((p, pi) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: pi * 0.03 }}
                            style={{
                              padding: '12px',
                              background: p.isPaid ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${p.isPaid ? 'rgba(0,230,118,0.15)' : 'var(--glass-border)'}`,
                              borderRadius: 'var(--radius-md)',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                              {p.isPaid ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Circle size={14} color="var(--text-tertiary)" />}
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{MONTH_NAMES[p.month - 1]} {p.year}</span>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: p.isPaid ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                              <IndianRupee size={12} style={{ display: 'inline' }} />{fmtN(p.amount)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
