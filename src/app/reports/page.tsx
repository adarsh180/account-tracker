'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { FileText, Download, BarChart2, BrainCircuit, Loader } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

interface LedgerItem {
  id: string
  date: string
  type: string
  description: string
  inflow: number
  outflow: number
  balance: number
}

interface ReportData {
  financialYear: string
  startDate: string
  endDate: string
  kpis: {
    totalTurnover: number
    totalPurchasesCost: number
    netProfitLoss: number
  }
  ledger: LedgerItem[]
}

const FY_OPTIONS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
]

export default function ReportsPage() {
  const currentMonth = new Date().getMonth()
  const defaultYear = currentMonth >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
  
  const [selectedFY, setSelectedFY] = useState(`${defaultYear}-${defaultYear + 1}`)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [consulting, setConsulting] = useState(false)
  const [brainResponse, setBrainResponse] = useState('')

  useEffect(() => {
    fetchData(selectedFY)
  }, [selectedFY])

  const fetchData = async (fy: string) => {
    setLoading(true)
    setBrainResponse('')
    try {
      const res = await fetch(`/api/reports?fy=${fy}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Monthly Aggregation for Chart
  const getMonthlyData = () => {
    if (!data) return []
    const months: Record<string, { name: string, Turnover: number, Expenses: number }> = {}
    
    data.ledger.forEach(item => {
      const d = new Date(item.date)
      const yr = d.getFullYear()
      const mo = d.toLocaleString('en-US', { month: 'short' })
      const key = `${mo} ${yr}` // e.g., Apr 2025
      
      if (!months[key]) months[key] = { name: key, Turnover: 0, Expenses: 0 }
      
      if (item.type === 'SALE') months[key].Turnover += item.inflow
      if (item.type === 'PURCHASE' || item.type === 'OD_REPAY') months[key].Expenses += item.outflow
    })

    return Object.values(months)
  }

  const chartData = getMonthlyData()

  // Export to PDF
  const dwnPDF = () => {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Financial Report FY ${data.financialYear}`, 14, 20)
    
    doc.setFontSize(11)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28)
    doc.text(`Total Turnover: Rs. ${formatNumber(data.kpis.totalTurnover)}`, 14, 38)
    doc.text(`Total Purchases: Rs. ${formatNumber(data.kpis.totalPurchasesCost)}`, 14, 44)
    doc.text(`Net Profit/Loss: Rs. ${formatNumber(data.kpis.netProfitLoss)}`, 14, 50)

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Type', 'Description', 'Inflow (Rs)', 'Outflow (Rs)', 'Balance (Rs)']],
      body: data.ledger.map(i => [
        new Date(i.date).toLocaleDateString('en-IN'),
        i.type,
        i.description,
        formatNumber(i.inflow),
        formatNumber(i.outflow),
        formatNumber(i.balance)
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [68, 138, 255] }
    })

    doc.save(`RISS_Report_FY_${data.financialYear}.pdf`)
  }

  // Export to Excel
  const dwnExcel = () => {
    if (!data) return
    const wsData = data.ledger.map(i => ({
      Date: new Date(i.date).toLocaleDateString('en-IN'),
      Type: i.type,
      Description: i.description,
      'Inflow (Rs)': i.inflow,
      'Outflow (Rs)': i.outflow,
      'Running Balance (Rs)': i.balance
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Ledger FY${data.financialYear}`)
    XLSX.writeFile(wb, `RISS_Ledger_FY_${data.financialYear}.xlsx`)
  }

  // AI Insight Simulation
  const consultBrain = async () => {
    if (!data) return
    setConsulting(true)
    setBrainResponse('')

    const lines = []
    lines.push(`🧠 **AI Strategic Deep Dive | FY ${data.financialYear}**\n`)
    
    const margin = data.kpis.totalTurnover > 0 ? ((data.kpis.netProfitLoss / data.kpis.totalTurnover) * 100).toFixed(2) : 0
    lines.push(`✅ **Gross Turnover**: ₹${formatNumber(data.kpis.totalTurnover)}`)
    
    if (data.kpis.netProfitLoss > 0) {
      lines.push(`✨ **Net Profit**: ₹${formatNumber(data.kpis.netProfitLoss)} (Margin: ${margin}%)`)
      lines.push('💡 AI Insight: Excellent operational scale. Focus next quarter on reducing OD liabilities to boost net margins by 1-2%.')
    } else {
      lines.push(`⚠️ **Net Loss**: ₹${formatNumber(Math.abs(data.kpis.netProfitLoss))}`)
      lines.push('🚨 Immediate Action Required: Re-evaluate purchasing costs relative to sale pricing. Significant capital drag impacting profitability.')
    }

    const saleCount = data.ledger.filter(l => l.type === 'SALE').length
    const purCount = data.ledger.filter(l => l.type === 'PURCHASE').length
    lines.push(`\n**Volume Matrix**: ${saleCount} Sales outpaced by ${purCount} Purchase events.`)

    const text = lines.join('\n')
    for (let i = 0; i <= text.length; i += 4) {
      await new Promise(r => setTimeout(r, 10))
      setBrainResponse(text.slice(0, i + 4))
    }
    setBrainResponse(text)
    setConsulting(false)
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Financial Reports</motion.h1>
            <p className="page-subtitle">Unified IFY ledger, Turnovers & PnL exports</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select className="input-glass" style={{ minWidth: '150px' }} value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}>
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
            </select>
            <button className="btn btn-primary" onClick={dwnExcel} disabled={loading}><Download size={16} /> Excel</button>
            <button className="btn btn-primary" onClick={dwnPDF} disabled={loading} style={{ background: 'var(--accent-red)' }}><FileText size={16} /> PDF</button>
          </div>
        </div>

        {loading ? (
          <div className="shimmer" style={{ height: '400px' }} />
        ) : !data ? (
          <div className="glass-card">Error loading data.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <motion.div className="glass-card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="stat-header">
                  <div className="stat-title">Annual Turnover (Sales)</div>
                  <BarChart2 className="stat-icon" size={20} style={{ color: 'var(--accent-green)' }} />
                </div>
                <div className="stat-value" style={{ color: 'var(--accent-green)' }}>₹{formatNumber(data.kpis.totalTurnover)}</div>
              </motion.div>
              
              <motion.div className="glass-card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="stat-header">
                  <div className="stat-title">Total Base Purchases</div>
                  <FileText className="stat-icon" size={20} style={{ color: 'var(--accent-amber)' }} />
                </div>
                <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>₹{formatNumber(data.kpis.totalPurchasesCost)}</div>
              </motion.div>

              <motion.div className="glass-card stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="stat-header">
                  <div className="stat-title">Net Profit/Loss</div>
                  <BarChart2 className="stat-icon" size={20} style={{ color: data.kpis.netProfitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                </div>
                <div className="stat-value" style={{ color: data.kpis.netProfitLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {data.kpis.netProfitLoss >= 0 ? '+' : '-'}₹{formatNumber(Math.abs(data.kpis.netProfitLoss))}
                </div>
              </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
              {/* Line Chart */}
              <motion.div className="glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Monthly Trends</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={v => `₹${(v/1000)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '14px' }}
                        formatter={(val: any) => [`₹${formatNumber(Number(val))}`]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Turnover" stroke="var(--accent-green)" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Expenses" stroke="var(--accent-amber)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* AI Insight */}
              <motion.div className="glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrainCircuit size={18} color="var(--accent-purple)" />
                    Deep AI Analysis
                  </h3>
                  <button className="btn" onClick={consultBrain} disabled={consulting} style={{ background: 'rgba(180, 120, 255, 0.1)', color: 'var(--accent-purple)' }}>
                    {consulting ? <Loader className="spin" size={16} /> : <BrainCircuit size={16} />}
                    {consulting ? ' Analyzing...' : ' Analyze FY'}
                  </button>
                </div>
                <div className="output-panel" style={{ height: '240px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {brainResponse || <span style={{ color: 'var(--text-tertiary)' }}>Click "Analyze FY" to stream strategic insights based on this financial year's ledger...</span>}
                </div>
              </motion.div>
            </div>

            {/* Unified Ledger */}
            <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'hidden' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Unified Ledger Details ({data.ledger.length} entries)</h3>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                <table className="data-table">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', zIndex: 1 }}>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Inflow (₹)</th>
                      <th style={{ textAlign: 'right' }}>Outflow (₹)</th>
                      <th style={{ textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>No transactions found for this Financial Year</td></tr>
                    ) : (
                      data.ledger.map((item, i) => (
                        <tr key={`${item.id}-${i}`}>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                          <td>
                            <span className={`badge ${
                              item.type === 'SALE' ? 'badge-green' : 
                              item.type === 'PURCHASE' ? 'badge-amber' : 
                              item.type.includes('OD') ? 'badge-blue' : ''
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>{item.inflow > 0 ? formatNumber(item.inflow) : '-'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>{item.outflow > 0 ? formatNumber(item.outflow) : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(item.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </div>
        )}
      </div>
    </AuthLayout>
  )
}
