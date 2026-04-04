'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Building2, Plus, X, Trash2, IndianRupee } from 'lucide-react'

interface Expense {
  id: string; month: number; year: number; category: string
  amount: string; description: string | null; date: string
}

const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CATEGORIES = [
  { value: 'RENT', label: 'Godown Rent', color: '#ff4444', defaultAmt: '15000' },
  { value: 'OD_INTEREST', label: 'OD Interest', color: '#ffab00', defaultAmt: '' },
  { value: 'ELECTRICITY', label: 'Electricity', color: '#18ffff', defaultAmt: '' },
  { value: 'SALARY', label: 'Salary / Labor', color: '#b388ff', defaultAmt: '' },
  { value: 'MISC', label: 'Miscellaneous', color: '#448aff', defaultAmt: '' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), category: 'RENT', amount: '15000', description: '' })

  const fetchData = async () => {
    const res = await fetch(`/api/expenses?year=${selectedYear}`)
    if (res.ok) setExpenses(await res.json())
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [selectedYear])

  const handleSubmit = async () => {
    if (!form.amount || !form.category) return
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Group by month
  const monthlyTotals: Record<number, Record<string, number>> = {}
  expenses.forEach(e => {
    if (!monthlyTotals[e.month]) monthlyTotals[e.month] = {}
    monthlyTotals[e.month][e.category] = Number(e.amount)
  })

  const fyTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const categoryTotals: Record<string, number> = {}
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount)
  })

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Building2 size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
              Monthly Expenses
            </motion.h1>
            <p className="page-subtitle">Rent ₹15K/mo, OD Interest, Electricity & more</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select className="input-glass" style={{ minWidth: '100px' }} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Expense</button>
          </div>
        </div>

        {/* Category Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.value}
              className="stat-card"
              style={{ '--stat-color': cat.color, '--stat-color-dim': `${cat.color}26` } as React.CSSProperties}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="stat-label">{cat.label}</div>
              <div className="stat-value" style={{ color: cat.color }}>
                ₹{fmtN(categoryTotals[cat.value] || 0)}
              </div>
              <div className="stat-sub">FY {selectedYear} Total</div>
            </motion.div>
          ))}
          <motion.div
            className="stat-card"
            style={{ '--stat-color': '#00e676', '--stat-color-dim': 'rgba(0,230,118,0.15)' } as React.CSSProperties}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value" style={{ color: 'var(--accent-red)' }}>₹{fmtN(fyTotal)}</div>
            <div className="stat-sub">{expenses.length} entries</div>
          </motion.div>
        </div>

        {/* Add Expense Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Record Expense</h2>
                  <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="input-glass" value={form.category} onChange={e => {
                      const cat = CATEGORIES.find(c => c.value === e.target.value)
                      setForm({ ...form, category: e.target.value, amount: cat?.defaultAmt || form.amount })
                    }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input className="input-glass" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select className="input-glass" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                      {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input className="input-glass" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Description (optional)</label>
                  <input className="input-glass" placeholder="e.g. Godown rent for April" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmit}>Save Expense</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expenses List */}
        {loading ? (
          <div className="shimmer" style={{ height: '300px' }} />
        ) : expenses.length === 0 ? (
          <div className="glass-card empty-state">
            <Building2 className="empty-state-icon" size={48} />
            <div className="empty-state-text">No expenses recorded for {selectedYear}</div>
            <div className="empty-state-sub">Add monthly rent (₹15,000), electricity, and other costs</div>
          </div>
        ) : (
          <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th>Description</th><th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => {
                  const cat = CATEGORIES.find(c => c.value === e.category)
                  return (
                    <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td style={{ fontWeight: 600 }}>{MONTH_NAMES[e.month - 1]} {e.year}</td>
                      <td><span className="badge" style={{ background: `${cat?.color}20`, color: cat?.color }}>{cat?.label || e.category}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: cat?.color }}>
                        <IndianRupee size={12} style={{ display: 'inline' }} />{fmtN(Number(e.amount))}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{e.description || '—'}</td>
                      <td>
                        <button className="btn btn-icon" onClick={() => handleDelete(e.id)} style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }}>
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
