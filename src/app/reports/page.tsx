'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { FileText, Download, BarChart2, BrainCircuit, Loader, Target, TrendingUp, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
const fmt = (n: number) => {
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

interface LedgerItem {
  id: string; date: string; type: string; description: string
  inflow: number; outflow: number; balance: number
}

interface ReportData {
  financialYear: string; startDate: string; endDate: string
  kpis: { totalTurnover: number; totalPurchasesCost: number; netProfitLoss: number }
  ledger: LedgerItem[]
}

interface FinancialData {
  financialYear: string
  monthly: Array<{
    month: string; sales: number; purchases: number; rent: number
    odInterest: number; committeePayments: number; homeDistributions: number
    grossProfit: number; netProfit: number
  }>
  annual: {
    turnover: number; purchases: number; grossProfit: number; grossMargin: number
    expenses: { rent: number; odInterest: number; total: number }
    committee: number; distributions: number; netProfit: number; netMargin: number
  }
  goalTracking: {
    currentTurnover: number; target: number; progress: number
    growthNeededPercent: number; monthlyGrowthTarget: number; odMonthlyEstimate: number
  }
}

const FY_OPTIONS = ['2024-2025', '2025-2026', '2026-2027']

export default function ReportsPage() {
  const currentMonth = new Date().getMonth()
  const defaultYear = currentMonth >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const [selectedFY, setSelectedFY] = useState(`${defaultYear}-${defaultYear + 1}`)
  const [data, setData] = useState<ReportData | null>(null)
  const [financials, setFinancials] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [brainResponse, setBrainResponse] = useState('')
  const [viewMode, setViewMode] = useState<'ledger' | 'pnl'>('pnl')

  useEffect(() => {
    setLoading(true)
    setBrainResponse('')
    Promise.all([
      fetch(`/api/reports?fy=${selectedFY}`).then(r => r.json()),
      fetch(`/api/financials?fy=${selectedFY}`).then(r => r.json()),
    ]).then(([report, fin]) => {
      setData(report)
      setFinancials(fin)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedFY])

  const getMonthlyData = () => {
    if (!data) return []
    const months: Record<string, { name: string; Turnover: number; Expenses: number }> = {}
    data.ledger.forEach(item => {
      const d = new Date(item.date)
      const mo = d.toLocaleString('en-US', { month: 'short' })
      const yr = d.getFullYear()
      const key = `${mo} ${yr}`
      if (!months[key]) months[key] = { name: key, Turnover: 0, Expenses: 0 }
      if (item.type === 'SALE') months[key].Turnover += item.inflow
      if (item.type === 'PURCHASE' || item.type === 'OD_REPAY') months[key].Expenses += item.outflow
    })
    return Object.values(months)
  }
  const chartData = getMonthlyData()

  // Enhanced AI Analysis
  const consultBrain = async () => {
    if (!data || !financials) return
    setConsulting(true)
    setBrainResponse('')

    const lines: string[] = []
    const a = financials.annual
    const g = financials.goalTracking

    lines.push(`🧠 **STRATEGIC BUSINESS INTELLIGENCE REPORT**`)
    lines.push(`📊 Financial Year: ${financials.financialYear}`)
    lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
    lines.push('═══════════════════════════════════════════\n')

    // 1. GOAL STATUS
    lines.push(`🎯 **₹1 CRORE TARGET — STATUS REPORT**`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`   Current Annual Turnover: ₹${formatNumber(g.currentTurnover)}`)
    lines.push(`   Target:                  ₹1,00,00,000 (1 Crore)`)
    lines.push(`   Progress:                ${g.progress.toFixed(1)}% achieved`)
    lines.push(`   Gap to Fill:             ₹${formatNumber(g.target - g.currentTurnover)}`)
    lines.push(`   Growth Needed:           ${g.growthNeededPercent.toFixed(0)}%\n`)

    if (g.progress < 35) {
      lines.push(`   ⚠️ STATUS: EARLY STAGE — You're at ₹${(g.currentTurnover / 100000).toFixed(1)}L of ₹1Cr.`)
      lines.push(`   📌 IMMEDIATE ACTIONS NEEDED:`)
      lines.push(`      1. Increase purchase volumes — buy in bulk from top 2-3 reliable sellers`)
      lines.push(`      2. Focus on HIGH-MARGIN commodities (Copper, Battery yield higher margins)`)
      lines.push(`      3. Negotiate better rates — even ₹1-2/KG improvement on 10MT = ₹10K-20K extra`)
      lines.push(`      4. Add 2-3 new BUYERS this quarter to diversify revenue streams`)
      lines.push(`      5. Reduce idle days — commodity sitting >7 days is costing you OD interest\n`)
    } else if (g.progress < 60) {
      lines.push(`   ✅ STATUS: ON TRACK — You've crossed ₹${(g.currentTurnover / 100000).toFixed(1)}L. Solid foundation!`)
      lines.push(`   📌 SCALE-UP STRATEGY:`)
      lines.push(`      1. Monthly turnover target: ₹${formatNumber(g.target / 12)} minimum`)
      lines.push(`      2. Flip inventory faster — target <5 day holding period`)
      lines.push(`      3. Leverage OD strategically — draw only for high-certainty, fast-flip deals`)
      lines.push(`      4. Reinvest cash profits instead of distributing — compound growth phase\n`)
    } else {
      lines.push(`   🏆 STATUS: STRONG — You're at ${g.progress.toFixed(0)}%! The goal is within reach.`)
      lines.push(`   📌 FINAL PUSH STRATEGY:`)
      lines.push(`      1. Maintain momentum — don't let monthly turnover drop below ₹${formatNumber(g.target / 15)}`)
      lines.push(`      2. Lock in your best buyers with better terms`)
      lines.push(`      3. Consider hiring help to handle increased volume\n`)
    }

    // 2. P&L DEEP DIVE
    lines.push(`\n💰 **PROFIT & LOSS DEEP DIVE**`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`   Revenue (Sales):     ₹${formatNumber(a.turnover)}`)
    lines.push(`   Cost of Goods:       ₹${formatNumber(a.purchases)}`)
    lines.push(`   ─────────────────────────────────`)
    lines.push(`   Gross Profit:        ₹${formatNumber(a.grossProfit)} (${a.grossMargin.toFixed(1)}% margin)`)
    lines.push(`   ─────────────────────────────────`)
    lines.push(`   Operating Expenses:`)
    lines.push(`     Godown Rent:       ₹${formatNumber(a.expenses.rent)} (₹15,000/month)`)
    lines.push(`     OD Interest:       ₹${formatNumber(a.expenses.odInterest)}`)
    lines.push(`     Total Expenses:    ₹${formatNumber(a.expenses.total)}`)
    lines.push(`   Committee Invested:  ₹${formatNumber(a.committee)}`)
    lines.push(`   Given to Home:       ₹${formatNumber(a.distributions)}`)
    lines.push(`   ═════════════════════════════════`)
    lines.push(`   **NET PROFIT:        ₹${formatNumber(a.netProfit)} (${a.netMargin.toFixed(1)}% margin)**\n`)

    if (a.netProfit < 0) {
      lines.push(`   🚨 NET LOSS ALERT! Your expenses + distributions exceed gross profit.`)
      lines.push(`   → Reduce home distributions temporarily until margins improve`)
      lines.push(`   → Negotiate lower rent or find shared godown space`)
      lines.push(`   → Clear OD aggressively — interest is eating profit\n`)
    }

    // 3. MARGIN ANALYSIS
    lines.push(`\n📈 **MARGIN OPTIMIZATION**`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    const targetMargin = 15
    if (a.grossMargin < 8) {
      lines.push(`   ❌ CRITICAL: Your gross margin of ${a.grossMargin.toFixed(1)}% is dangerously low.`)
      lines.push(`   → Industry average for scrap trading is 10-15%`)
      lines.push(`   → You need at least ₹${formatNumber(a.turnover * 0.15)} gross profit from current turnover`)
      lines.push(`   → ACTIONS:`)
      lines.push(`     1. Stop selling below WAC — every sale below cost is destroying capital`)
      lines.push(`     2. Better rate negotiation — buy ₹2-5/KG cheaper, sell ₹2-5/KG higher`)
      lines.push(`     3. Quality grading — separate high-quality from mixed scrap to get premium rates`)
    } else if (a.grossMargin < targetMargin) {
      lines.push(`   ⚡ Your ${a.grossMargin.toFixed(1)}% margin is decent but below optimal ${targetMargin}%.`)
      lines.push(`   → Target: Add ₹${formatNumber((targetMargin / 100 * a.turnover) - a.grossProfit)} more to gross profit`)
      lines.push(`   → Focus on Copper and Battery - these have highest margin potential`)
    } else {
      lines.push(`   ✅ Excellent! ${a.grossMargin.toFixed(1)}% gross margin is above industry standard.`)
      lines.push(`   → Now focus on VOLUME growth while maintaining margins`)
    }

    // 4. OD STRATEGY
    if (g.odMonthlyEstimate > 0) {
      lines.push(`\n\n🏦 **OD MANAGEMENT**`)
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      lines.push(`   Monthly OD Interest Estimate: ₹${formatNumber(g.odMonthlyEstimate)}`)
      lines.push(`   Annual OD Cost: ~₹${formatNumber(g.odMonthlyEstimate * 12)}`)
      const odPercent = a.turnover > 0 ? (g.odMonthlyEstimate * 12 / a.turnover) * 100 : 0
      lines.push(`   OD Cost as % of Turnover: ${odPercent.toFixed(1)}%`)
      if (odPercent > 5) {
        lines.push(`   ⚠️ OD is eating >${odPercent.toFixed(0)}% of your turnover!`)
        lines.push(`   → Rule: Never let OD interest exceed 3% of turnover`)
        lines.push(`   → Use OD only for deals that flip within 3-5 days`)
        lines.push(`   → Repay aggressively from cash collections`)
      }
    }

    // 5. MONTHLY PERFORMANCE TRENDS
    const profitableMonths = financials.monthly.filter(m => m.grossProfit > 0).length
    const bestMonth = financials.monthly.reduce((best, m) => m.grossProfit > best.grossProfit ? m : best, financials.monthly[0])
    const worstMonth = financials.monthly.reduce((worst, m) => m.grossProfit < worst.grossProfit ? m : worst, financials.monthly[0])

    lines.push(`\n\n📅 **MONTHLY PERFORMANCE SNAPSHOT**`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`   Profitable Months: ${profitableMonths} of 12`)
    if (bestMonth) lines.push(`   Best Month: ${bestMonth.month} (₹${formatNumber(bestMonth.grossProfit)} gross profit)`)
    if (worstMonth && worstMonth.grossProfit !== bestMonth?.grossProfit) {
      lines.push(`   Worst Month: ${worstMonth.month} (₹${formatNumber(worstMonth.grossProfit)})`)
    }

    // 6. ROADMAP TO 1 CRORE
    lines.push(`\n\n🗺️ **YOUR ROADMAP TO ₹1 CRORE**`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`   Current: ₹${(g.currentTurnover / 100000).toFixed(1)} Lakhs`)
    lines.push(`   Target:  ₹100 Lakhs (₹1 Crore)`)
    lines.push(``)
    lines.push(`   MONTHLY TARGETS:`)
    const monthlyTarget = g.target / 12
    lines.push(`   → Minimum Monthly Sales: ₹${formatNumber(monthlyTarget)} (₹${(monthlyTarget / 100000).toFixed(1)}L)`)
    lines.push(`   → Daily Sales Target: ₹${formatNumber(monthlyTarget / 26)} (26 working days)`)
    lines.push(``)
    lines.push(`   5-STEP ACTION PLAN:`)
    lines.push(`   ┌──────────────────────────────────────────┐`)
    lines.push(`   │ 1. BUY SMART     → Bulk deals, negotiate │`)
    lines.push(`   │ 2. SELL FAST     → <5 day inventory hold │`)
    lines.push(`   │ 3. MANAGE OD     → Interest <3% turnover │`)
    lines.push(`   │ 4. EXPAND BUYERS → Add 1-2 new per month │`)
    lines.push(`   │ 5. TRACK DAILY   → Use this app every day│`)
    lines.push(`   └──────────────────────────────────────────┘`)

    const text = lines.join('\n')
    for (let i = 0; i <= text.length; i += 6) {
      await new Promise(r => setTimeout(r, 8))
      setBrainResponse(text.slice(0, i + 6))
    }
    setBrainResponse(text)
    setConsulting(false)
  }

  // PDF Export
  const dwnPDF = async () => {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text(`Financial Report FY ${data.financialYear}`, 14, 25)
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 32)
    doc.setFontSize(11)
    doc.text(`Total Turnover: Rs. ${formatNumber(data.kpis.totalTurnover)}`, 14, 45)
    doc.text(`Total Purchases: Rs. ${formatNumber(data.kpis.totalPurchasesCost)}`, 14, 51)
    doc.text(`Net Profit/Loss: Rs. ${formatNumber(data.kpis.netProfitLoss)}`, 14, 57)

    if (financials) {
      doc.text(`Gross Margin: ${financials.annual.grossMargin.toFixed(1)}%`, 14, 63)
      doc.text(`Net Margin: ${financials.annual.netMargin.toFixed(1)}%`, 14, 69)
      doc.text(`Goal Progress: ${financials.goalTracking.progress.toFixed(0)}% of Rs.1 Crore`, 14, 75)
    }

    autoTable(doc, {
      startY: 82,
      head: [['Date', 'Type', 'Description', 'Inflow (Rs)', 'Outflow (Rs)', 'Balance (Rs)']],
      body: data.ledger.map(i => [
        new Date(i.date).toLocaleDateString('en-IN'), i.type, i.description,
        formatNumber(i.inflow), formatNumber(i.outflow), formatNumber(i.balance),
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [68, 138, 255] },
    })
    doc.save(`RISS_Report_FY_${data.financialYear}.pdf`)
  }

  // Excel Export
  const dwnExcel = () => {
    if (!data) return
    const wsData = data.ledger.map(i => ({
      Date: new Date(i.date).toLocaleDateString('en-IN'), Type: i.type,
      Description: i.description, 'Inflow (Rs)': i.inflow,
      'Outflow (Rs)': i.outflow, 'Running Balance (Rs)': i.balance,
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Ledger FY${data.financialYear}`)
    XLSX.writeFile(wb, `RISS_Ledger_FY_${data.financialYear}.xlsx`)
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Financial Reports</motion.h1>
            <p className="page-subtitle">Unified ledger, P&L statements & AI strategy engine</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select className="input-glass" style={{ minWidth: '150px' }} value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}>
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
            </select>
            <button className="btn btn-primary" onClick={dwnExcel} disabled={loading}><Download size={16} /> Excel</button>
            <button className="btn" onClick={dwnPDF} disabled={loading} style={{ background: 'rgba(255,68,68,0.1)', borderColor: 'rgba(255,68,68,0.2)', color: 'var(--accent-red)' }}><FileText size={16} /> PDF</button>
          </div>
        </div>

        {loading ? (
          <div className="shimmer" style={{ height: '400px' }} />
        ) : !data ? (
          <div className="glass-card" style={{ padding: '24px' }}>Error loading data.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { label: 'Annual Turnover', value: data.kpis.totalTurnover, color: 'var(--accent-green)', icon: <TrendingUp size={20} /> },
                { label: 'Total Purchases', value: data.kpis.totalPurchasesCost, color: 'var(--accent-amber)', icon: <FileText size={20} /> },
                { label: 'Net Profit/Loss', value: data.kpis.netProfitLoss, color: data.kpis.netProfitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', icon: <BarChart2 size={20} /> },
                ...(financials ? [{
                  label: '₹1Cr Progress', value: financials.goalTracking.progress,
                  color: financials.goalTracking.progress > 50 ? 'var(--accent-green)' : 'var(--accent-amber)',
                  icon: <Target size={20} />, isPercent: true,
                }] : []),
              ].map((card, i) => (
                <motion.div key={card.label} className="stat-card" style={{ '--stat-color': card.color, '--stat-color-dim': `${card.color}26` } as React.CSSProperties}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>{card.icon}</div>
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value" style={{ color: card.color }}>
                    {'isPercent' in card && card.isPercent ? `${card.value.toFixed(0)}%` : fmt(card.value)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Monthly Trends</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => `₹${(v / 1000)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(10,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(val: any) => [`₹${formatNumber(Number(val))}`]} />
                      <Legend />
                      <Line type="monotone" dataKey="Turnover" stroke="var(--accent-green)" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Expenses" stroke="var(--accent-amber)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* AI Strategic Analysis */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrainCircuit size={18} color="var(--accent-purple)" />
                    AI Strategy Engine
                  </h3>
                  <button className="btn" onClick={consultBrain} disabled={consulting} style={{ background: 'rgba(180,120,255,0.1)', color: 'var(--accent-purple)' }}>
                    {consulting ? <Loader className="spin" size={16} /> : <BrainCircuit size={16} />}
                    {consulting ? ' Analyzing...' : ' Analyze & Advise'}
                  </button>
                </div>
                <div style={{ height: '240px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}>
                  {brainResponse || (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      Click &quot;Analyze &amp; Advise&quot; for a comprehensive AI-powered strategic report covering:
                      {'\n'}• ₹1 Crore goal tracking & roadmap
                      {'\n'}• P&L deep dive with margin optimization
                      {'\n'}• OD management strategy
                      {'\n'}• Monthly performance insights
                      {'\n'}• Actionable growth plan with daily targets
                    </span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="tab-group">
                <button className={`tab-item ${viewMode === 'pnl' ? 'active' : ''}`} onClick={() => setViewMode('pnl')}>P&L Statement</button>
                <button className={`tab-item ${viewMode === 'ledger' ? 'active' : ''}`} onClick={() => setViewMode('ledger')}>Full Ledger</button>
              </div>
            </div>

            {/* P&L Statement View */}
            {viewMode === 'pnl' && financials && (
              <motion.div className="glass-card" style={{ padding: '28px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                  Profit & Loss Statement — FY {financials.financialYear}
                </h3>
                <div style={{ maxWidth: '600px' }}>
                  {[
                    { label: 'Revenue (Sales)', value: financials.annual.turnover, color: 'var(--accent-green)', bold: true },
                    { label: 'Less: Cost of Goods (Purchases)', value: -financials.annual.purchases, color: 'var(--accent-amber)' },
                    { label: 'GROSS PROFIT', value: financials.annual.grossProfit, color: financials.annual.grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', bold: true, divider: true },
                    { label: 'Less: Godown Rent', value: -financials.annual.expenses.rent, color: 'var(--text-secondary)' },
                    { label: 'Less: OD Interest', value: -financials.annual.expenses.odInterest, color: 'var(--text-secondary)' },
                    { label: 'Less: Committee Investments', value: -financials.annual.committee, color: 'var(--accent-purple)' },
                    { label: 'Less: Home Distributions', value: -financials.annual.distributions, color: 'var(--accent-pink, #ff69b4)' },
                    { label: 'NET PROFIT / (LOSS)', value: financials.annual.netProfit, color: financials.annual.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', bold: true, divider: true },
                  ].map((row, i) => (
                    <div key={i}>
                      {row.divider && <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: row.bold ? '15px' : '14px', fontWeight: row.bold ? 700 : 400 }}>
                        <span style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{row.label}</span>
                        <span style={{ color: row.color, fontFamily: 'var(--font-mono)' }}>
                          {row.value >= 0 ? '' : '('}₹{formatNumber(Math.abs(row.value))}{row.value >= 0 ? '' : ')'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Gross Margin</span>
                    <span style={{ fontWeight: 600 }}>{financials.annual.grossMargin.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Net Margin</span>
                    <span style={{ fontWeight: 600, color: financials.annual.netMargin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{financials.annual.netMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Full Ledger View */}
            {viewMode === 'ledger' && (
              <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'hidden' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Unified Ledger ({data.ledger.length} entries)</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th><th>Type</th><th>Description</th>
                        <th style={{ textAlign: 'right' }}>Inflow (₹)</th>
                        <th style={{ textAlign: 'right' }}>Outflow (₹)</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ledger.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>No transactions for this FY</td></tr>
                      ) : (
                        data.ledger.map((item, i) => (
                          <tr key={`${item.id}-${i}`}>
                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td><span className={`badge ${item.type === 'SALE' ? 'badge-green' : item.type === 'PURCHASE' ? 'badge-amber' : item.type.includes('OD') ? 'badge-blue' : ''}`}>{item.type}</span></td>
                            <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</td>
                            <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>{item.inflow > 0 ? formatNumber(item.inflow) : '—'}</td>
                            <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>{item.outflow > 0 ? formatNumber(item.outflow) : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(item.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
