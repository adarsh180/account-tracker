'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  BarChart3, TrendingUp, TrendingDown, Target, ArrowUpRight,
  Wallet, Building2, Banknote, PiggyBank, Home,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

interface MonthlyRow {
  month: string; monthNum: number; year: number
  sales: number; purchases: number; rent: number; odInterest: number
  electricity: number; salary: number; miscExpense: number
  committeePayments: number; homeDistributions: number
  grossProfit: number; netProfit: number
}

interface FinancialData {
  financialYear: string
  monthly: MonthlyRow[]
  quarterly: Array<{ name: string; sales: number; purchases: number; expenses: number; grossProfit: number; netProfit: number }>
  annual: {
    turnover: number; purchases: number; grossProfit: number; grossMargin: number
    expenses: { rent: number; odInterest: number; electricity: number; salary: number; misc: number; total: number }
    committee: number; distributions: number; netProfit: number; netMargin: number
  }
  cashFlow: { totalInflow: number; totalOutflow: number; netCashFlow: number }
  goalTracking: {
    currentTurnover: number; target: number; progress: number
    growthNeededPercent: number; monthlyGrowthTarget: number; odMonthlyEstimate: number
  }
}

const fmt = (n: number) => {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const FY_OPTIONS = ['2024-2025', '2025-2026', '2026-2027']
const PIE_COLORS = ['#ff4444', '#ffab00', '#18ffff', '#b388ff', '#448aff']

export default function FinancialsPage() {
  const currentMonth = new Date().getMonth()
  const defaultYear = currentMonth >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const [selectedFY, setSelectedFY] = useState(`${defaultYear}-${defaultYear + 1}`)
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/financials?fy=${selectedFY}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedFY])

  if (loading || !data) {
    return (
      <AuthLayout>
        <div className="page-container">
          <div className="page-header">
            <h1 className="page-title">Financials</h1>
            <p className="page-subtitle">Loading financial analytics...</p>
          </div>
          <div className="stats-grid">{[...Array(6)].map((_, i) => <div key={i} className="shimmer" style={{ height: '120px' }} />)}</div>
        </div>
      </AuthLayout>
    )
  }

  const expenseBreakdown = [
    { name: 'Rent', value: data.annual.expenses.rent },
    { name: 'OD Interest', value: data.annual.expenses.odInterest },
    { name: 'Electricity', value: data.annual.expenses.electricity },
    { name: 'Salary', value: data.annual.expenses.salary },
    { name: 'Misc', value: data.annual.expenses.misc },
  ].filter(e => e.value > 0)

  const goalPercent = Math.min(data.goalTracking.progress, 100)
  const goalCircumference = 2 * Math.PI * 58
  const goalStrokeOffset = goalCircumference - (goalCircumference * goalPercent) / 100
  const goalColor = goalPercent > 75 ? '#00e676' : goalPercent > 50 ? '#ffab00' : goalPercent > 25 ? '#448aff' : '#ff4444'

  return (
    <AuthLayout>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <BarChart3 size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
              Financials
            </motion.h1>
            <p className="page-subtitle">Annual turnover, monthly P&L breakdown & goal tracking</p>
          </div>
          <select className="input-glass" style={{ minWidth: '150px' }} value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}>
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
          </select>
        </div>

        {/* === HERO KPIs === */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Annual Turnover', value: data.annual.turnover, color: 'var(--accent-green)', icon: <TrendingUp size={20} /> },
            { label: 'Total Purchases', value: data.annual.purchases, color: 'var(--accent-amber)', icon: <Wallet size={20} /> },
            { label: 'Gross Profit', value: data.annual.grossProfit, color: data.annual.grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', icon: <ArrowUpRight size={20} /> },
            { label: 'Total Expenses', value: data.annual.expenses.total, color: 'var(--accent-red)', icon: <Building2 size={20} /> },
            { label: 'Net Profit', value: data.annual.netProfit, color: data.annual.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', icon: data.annual.netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} /> },
            { label: 'Home Given', value: data.annual.distributions, color: 'var(--accent-purple)', icon: <Home size={20} /> },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              className="stat-card"
              style={{ '--stat-color': card.color, '--stat-color-dim': `${card.color}26` } as React.CSSProperties}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>{card.icon}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value" style={{ color: card.color }}>{fmt(card.value)}</div>
              <div className="stat-sub">₹{fmtN(card.value)}</div>
            </motion.div>
          ))}
        </div>

        {/* === GOAL TRACKER + EXPENSE BREAKDOWN === */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          {/* Goal Tracker */}
          <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color={goalColor} /> ₹1 Crore Goal Tracker
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle
                    cx="70" cy="70" r="58" fill="none"
                    stroke={goalColor} strokeWidth="12"
                    strokeDasharray={goalCircumference}
                    strokeDashoffset={goalStrokeOffset}
                    strokeLinecap="round"
                    className="gauge-ring"
                    style={{ filter: `drop-shadow(0 0 8px ${goalColor})` }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: goalColor }}>{goalPercent.toFixed(0)}%</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>of Target</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Current Turnover</span>
                  <div style={{ fontSize: '22px', fontWeight: 700 }}>{fmt(data.goalTracking.currentTurnover)}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Growth Needed</span>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    {data.goalTracking.growthNeededPercent.toFixed(0)}% more
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Monthly Growth Target</span>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {data.goalTracking.monthlyGrowthTarget.toFixed(1)}% / month
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Expense Breakdown Donut */}
          <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={18} color="var(--accent-red)" /> Expense Composition
            </h3>
            {expenseBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No expenses recorded for this FY</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '160px', height: '160px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {expenseBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(val: any) => [`₹${fmtN(Number(val))}`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {expenseBreakdown.map((e, i) => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{e.name}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>₹{fmtN(e.value)}</span>
                    </div>
                  ))}
                  <div className="section-divider" style={{ margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-red)' }}>₹{fmtN(data.annual.expenses.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* === CASH FLOW BAR === */}
        <motion.div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PiggyBank size={18} color="var(--accent-blue)" /> Cash Flow Overview
            </h3>
            <div className="tab-group">
              <button className={`tab-item ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>Monthly</button>
              <button className={`tab-item ${viewMode === 'quarterly' ? 'active' : ''}`} onClick={() => setViewMode('quarterly')}>Quarterly</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginBottom: '4px' }}>Total Inflow</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)' }}>{fmt(data.cashFlow.totalInflow)}</div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginBottom: '4px' }}>Total Outflow</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-red)' }}>{fmt(data.cashFlow.totalOutflow)}</div>
            </div>
            <div style={{ padding: '16px', background: data.cashFlow.netCashFlow >= 0 ? 'rgba(68,138,255,0.06)' : 'rgba(255,68,68,0.06)', border: `1px solid ${data.cashFlow.netCashFlow >= 0 ? 'rgba(68,138,255,0.1)' : 'rgba(255,68,68,0.1)'}`, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: data.cashFlow.netCashFlow >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)', marginBottom: '4px' }}>Net Cash Flow</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: data.cashFlow.netCashFlow >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>{fmt(data.cashFlow.netCashFlow)}</div>
            </div>
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'monthly' ? (
                <BarChart data={data.monthly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => `₹${(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(val: any) => [`₹${fmtN(Number(val))}`]}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#00e676" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#ffab00" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={data.quarterly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => `₹${(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(val: any) => [`₹${fmtN(Number(val))}`]}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#00e676" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#ffab00" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ff4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* === PROFIT TREND LINE === */}
        <motion.div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Monthly P&L Trend</h3>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => `₹${(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(val: any) => [`₹${fmtN(Number(val))}`]}
                />
                <Legend />
                <Line type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#00e676" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#448aff" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* === QUARTERLY CARDS === */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {data.quarterly.map((q, i) => (
            <motion.div
              key={q.name}
              className="glass-card"
              style={{ padding: '20px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{q.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Sales</span><div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{fmt(q.sales)}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Purchases</span><div style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>{fmt(q.purchases)}</div></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>Expenses</span><div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{fmt(q.expenses)}</div></div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Net Profit</span>
                  <div style={{ fontWeight: 700, color: q.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {q.netProfit >= 0 ? '+' : ''}{fmt(q.netProfit)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* === MONTHLY BREAKDOWN TABLE === */}
        <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Monthly Breakdown — FY {data.financialYear}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th><th style={{ textAlign: 'right' }}>Sales</th><th style={{ textAlign: 'right' }}>Purchases</th>
                  <th style={{ textAlign: 'right' }}>Rent</th><th style={{ textAlign: 'right' }}>OD Int.</th>
                  <th style={{ textAlign: 'right' }}>Committee</th><th style={{ textAlign: 'right' }}>Home</th>
                  <th style={{ textAlign: 'right' }}>Gross P&L</th><th style={{ textAlign: 'right' }}>Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((m, i) => (
                  <motion.tr key={`${m.year}-${m.monthNum}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.02 }}>
                    <td style={{ fontWeight: 600 }}>{m.month} {m.year}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>{m.sales > 0 ? `₹${fmtN(m.sales)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>{m.purchases > 0 ? `₹${fmtN(m.purchases)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{m.rent > 0 ? `₹${fmtN(m.rent)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{m.odInterest > 0 ? `₹${fmtN(m.odInterest)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-purple)' }}>{m.committeePayments > 0 ? `₹${fmtN(m.committeePayments)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>{m.homeDistributions > 0 ? `₹${fmtN(m.homeDistributions)}` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: m.grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {m.grossProfit !== 0 ? `${m.grossProfit >= 0 ? '+' : ''}₹${fmtN(Math.abs(m.grossProfit))}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: m.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {m.netProfit !== 0 ? `${m.netProfit >= 0 ? '+' : '-'}₹${fmtN(Math.abs(m.netProfit))}` : '—'}
                    </td>
                  </motion.tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', fontWeight: 800 }}>
                  <td>TOTAL</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>₹{fmtN(data.annual.turnover)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>₹{fmtN(data.annual.purchases)}</td>
                  <td style={{ textAlign: 'right' }}>₹{fmtN(data.annual.expenses.rent)}</td>
                  <td style={{ textAlign: 'right' }}>₹{fmtN(data.annual.expenses.odInterest)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-purple)' }}>₹{fmtN(data.annual.committee)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>₹{fmtN(data.annual.distributions)}</td>
                  <td style={{ textAlign: 'right', color: data.annual.grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>₹{fmtN(data.annual.grossProfit)}</td>
                  <td style={{ textAlign: 'right', color: data.annual.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>₹{fmtN(data.annual.netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}
