'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  Landmark,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  RefreshCw,
  Users,
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalPurchases: number
    totalSales: number
    totalProfit: number
    profitMargin: number
    totalOutstanding: number
    totalInventoryValue: number
    ownCapital: number
  }
  bankVsReality: {
    bankProfit: number
    bankProfitMargin: number
    trueProfit: number
    trueProfitMargin: number
    totalBankAmount: number
    totalCashAmount: number
  }
  overdraft: {
    totalUtilized: number
    totalLimit: number
    dailyBurn: number
    accruedInterest: number
    accounts: Array<{
      id: string
      bankName: string
      utilized: number
      limit: number
      rate: number
      dailyBurn: number
      pendingInterest: number
      utilizationPercent: number
    }>
  }
  buyerMetrics: Array<{
    id: string
    name: string
    totalSales: number
    totalRevenue: number
    avgDSO: number
    outstanding: number
    margin: number
    profitToWait: number
    isLate: boolean
  }>
  inventory: Array<{
    commodity: string
    unit: string
    quantity: number
    avgCost: number
    totalValue: number
  }>
  recentTransactions: Array<{
    type: string
    commodity: string
    quantity: number
    amount: number
    party: string
    date: string
  }>
  commodityPnL: Record<string, { purchases: number; sales: number; profit: number }>
  timestamp: string
}

const formatCurrency = (n: number) => {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

const formatNumber = (n: number) => {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTrueView, setShowTrueView] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setLastUpdate(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [fetchData])

  const odUtilPercent = data
    ? data.overdraft.totalLimit > 0
      ? (data.overdraft.totalUtilized / data.overdraft.totalLimit) * 100
      : 0
    : 0

  const circumference = 2 * Math.PI * 45
  const strokeOffset = circumference - (circumference * Math.min(odUtilPercent, 100)) / 100
  const odColor = odUtilPercent > 80 ? 'var(--accent-red)' : odUtilPercent > 60 ? 'var(--accent-amber)' : 'var(--accent-green)'

  return (
    <AuthLayout>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1
              className="page-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Dashboard
            </motion.h1>
            <p className="page-subtitle">
              Capital management & live analytics
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: '12px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}>
                <span className="pulse-dot" style={{ background: 'var(--accent-green)' }} />
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => { setLoading(true); fetchData() }}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>

        {loading && !data ? (
          <div className="stats-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer" style={{ height: '120px' }} />
            ))}
          </div>
        ) : data ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* === STAT CARDS === */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <motion.div
                className="stat-card"
                style={{ '--stat-color': 'var(--accent-green)', '--stat-color-dim': 'var(--accent-green-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="stat-icon"><TrendingUp size={20} /></div>
                <div className="stat-label">Total Sales</div>
                <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
                  {formatCurrency(data.summary.totalSales)}
                </div>
                <div className="stat-sub">₹{formatNumber(data.summary.totalSales)}</div>
              </motion.div>

              <motion.div
                className="stat-card"
                style={{ '--stat-color': 'var(--accent-amber)', '--stat-color-dim': 'var(--accent-amber-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="stat-icon"><ShoppingCart size={20} /></div>
                <div className="stat-label">Total Purchases</div>
                <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
                  {formatCurrency(data.summary.totalPurchases)}
                </div>
                <div className="stat-sub">₹{formatNumber(data.summary.totalPurchases)}</div>
              </motion.div>

              <motion.div
                className="stat-card"
                style={{ '--stat-color': data.summary.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', '--stat-color-dim': data.summary.totalProfit >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="stat-icon">
                  {data.summary.totalProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div className="stat-label">Net Profit</div>
                <div className="stat-value" style={{ color: data.summary.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {formatCurrency(data.summary.totalProfit)}
                </div>
                <div className="stat-sub">Margin: {data.summary.profitMargin.toFixed(1)}%</div>
              </motion.div>

              <motion.div
                className="stat-card"
                style={{ '--stat-color': 'var(--accent-blue)', '--stat-color-dim': 'var(--accent-blue-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="stat-icon"><Package size={20} /></div>
                <div className="stat-label">Inventory Value</div>
                <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                  {formatCurrency(data.summary.totalInventoryValue)}
                </div>
                <div className="stat-sub">{data.inventory.length} commodities</div>
              </motion.div>

              <motion.div
                className="stat-card"
                style={{ '--stat-color': 'var(--accent-red)', '--stat-color-dim': 'var(--accent-red-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="stat-icon"><CreditCard size={20} /></div>
                <div className="stat-label">Outstanding</div>
                <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
                  {formatCurrency(data.summary.totalOutstanding)}
                </div>
                <div className="stat-sub">Receivables pending</div>
              </motion.div>

              <motion.div
                className="stat-card"
                style={{ '--stat-color': 'var(--accent-purple)', '--stat-color-dim': 'var(--accent-purple-dim)' } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="stat-icon"><DollarSign size={20} /></div>
                <div className="stat-label">Own Capital</div>
                <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
                  {formatCurrency(data.summary.ownCapital)}
                </div>
                <div className="stat-sub">Net of OD utilization</div>
              </motion.div>
            </div>

            {/* === BANK vs REALITY + OD GAUGE === */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
              {/* Bank vs Reality */}
              <motion.div
                className="glass-card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Bank vs Reality
                  </h3>
                  <button
                    className="btn btn-sm"
                    onClick={() => setShowTrueView(!showTrueView)}
                    style={{ gap: '6px' }}
                  >
                    {showTrueView ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showTrueView ? 'Bank View' : 'True View'}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={showTrueView ? 'true' : 'bank'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{
                        padding: '16px',
                        background: 'rgba(68,138,255,0.06)',
                        border: '1px solid rgba(68,138,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          {showTrueView ? 'True Profit' : 'Bank Profit'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: showTrueView ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                          {formatCurrency(showTrueView ? data.bankVsReality.trueProfit : data.bankVsReality.bankProfit)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          Margin: {(showTrueView ? data.bankVsReality.trueProfitMargin : data.bankVsReality.bankProfitMargin).toFixed(1)}%
                        </div>
                      </div>
                      <div style={{
                        padding: '16px',
                        background: showTrueView ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid ' + (showTrueView ? 'rgba(0,230,118,0.1)' : 'var(--glass-border)'),
                        borderRadius: 'var(--radius-md)',
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          {showTrueView ? 'Cash Amount' : 'Bank Amount'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: showTrueView ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                          {formatCurrency(showTrueView ? data.bankVsReality.totalCashAmount : data.bankVsReality.totalBankAmount)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {showTrueView ? 'Private ledger' : 'Visible to banks'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* OD Gauge */}
              <motion.div
                className="glass-card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  <Landmark size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Overdraft Utilization
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {/* Gauge Ring */}
                  <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="45"
                        fill="none"
                        stroke={odColor}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        className="gauge-ring"
                        style={{ filter: `drop-shadow(0 0 6px ${odColor})` }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: odColor }}>
                        {odUtilPercent.toFixed(0)}%
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Used</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Utilized</span>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>
                        {formatCurrency(data.overdraft.totalUtilized)}
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                          / {formatCurrency(data.overdraft.totalLimit)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Daily Burn</span>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-red)' }}>
                          ₹{formatNumber(data.overdraft.dailyBurn)}/day
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Accrued Int.</span>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                          ₹{formatNumber(data.overdraft.accruedInterest)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* === INVENTORY + BUYERS === */}
            <div className="grid-2" style={{ marginBottom: '24px' }}>
              {/* Inventory */}
              <motion.div
                className="glass-card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                  <Package size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Inventory Status
                </h3>
                {data.inventory.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <Package className="empty-state-icon" size={40} />
                    <div className="empty-state-text">No inventory data</div>
                    <div className="empty-state-sub">Add purchases to build inventory</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Commodity</th>
                          <th>Qty</th>
                          <th>WAC</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.inventory.map((inv, i) => (
                          <motion.tr
                            key={inv.commodity}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.03 }}
                          >
                            <td>
                              <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                                {inv.commodity.replace('_', ' ')}
                              </span>
                            </td>
                            <td>{formatNumber(inv.quantity)} {inv.unit}</td>
                            <td>₹{formatNumber(inv.avgCost)}</td>
                            <td style={{ fontWeight: 600 }}>₹{formatNumber(inv.totalValue)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              {/* Buyer Performance */}
              <motion.div
                className="glass-card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                  <Clock size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Buyer Performance
                </h3>
                {data.buyerMetrics.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <Users size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.5, marginBottom: '12px' }} />
                    <div className="empty-state-text">No buyer data</div>
                    <div className="empty-state-sub">Record sales to see buyer metrics</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Buyer</th>
                          <th>DSO</th>
                          <th>Outstanding</th>
                          <th>P/W Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.buyerMetrics.map((buyer, i) => (
                          <motion.tr
                            key={buyer.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + i * 0.03 }}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {buyer.name}
                                {buyer.isLate && (
                                  <AlertTriangle size={14} color="var(--accent-amber)" />
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${buyer.avgDSO > 15 ? 'badge-amber' : 'badge-green'}`}>
                                {buyer.avgDSO}d
                              </span>
                            </td>
                            <td style={{ color: buyer.outstanding > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                              ₹{formatNumber(buyer.outstanding)}
                            </td>
                            <td style={{ fontWeight: 600 }}>{buyer.profitToWait.toFixed(2)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </div>

            {/* === RECENT TRANSACTIONS === */}
            <motion.div
              className="glass-card"
              style={{ padding: '24px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                Recent Transactions
              </h3>
              {data.recentTransactions.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <TrendingUp className="empty-state-icon" size={40} />
                  <div className="empty-state-text">No transactions yet</div>
                  <div className="empty-state-sub">Create purchases and sales to see activity</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Commodity</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Party</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + i * 0.03 }}
                      >
                        <td>
                          <span className={`badge ${tx.type === 'sale' ? 'badge-green' : 'badge-amber'}`}>
                            {tx.type === 'sale' ? 'SALE' : 'BUY'}
                          </span>
                        </td>
                        <td>{tx.commodity.replace('_', ' ')}</td>
                        <td>{formatNumber(tx.quantity)}</td>
                        <td style={{ fontWeight: 600 }}>₹{formatNumber(tx.amount)}</td>
                        <td>{tx.party}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </AuthLayout>
  )
}
