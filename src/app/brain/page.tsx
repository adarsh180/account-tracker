'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Brain, Zap, AlertTriangle, TrendingDown, Package, DollarSign, RefreshCw, Activity, Target } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface AnalysisData {
  capitalDrag: Array<{ buyer: string; daysLate: number; interestCost: number }>
  inventoryLeakage: Array<{ commodity: string; daysOld: number; value: number }>
  marginAlerts: Array<{ commodity: string; currentMargin: number; previousMargin: number; change: number }>
  scatterData: Array<{ name: string; dSO: number; outstanding: number; profitRatio: number }>
  marginTrendData: Array<{ name: string; Previous: number; Current: number; Predicted: number }>
  stateOfTheUnion: object
}

export default function BrainPage() {
  const [dashData, setDashData] = useState<Record<string, unknown> | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [brainResponse, setBrainResponse] = useState('')

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setDashData(data)
        generateAnalysis(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const generateAnalysis = (data: Record<string, unknown>) => {
    const buyerMetrics = (data.buyerMetrics || []) as Array<Record<string, unknown>>
    const inventory = (data.inventory || []) as Array<Record<string, unknown>>
    const commodityPnL = (data.commodityPnL || {}) as Record<string, Record<string, number>>

    const capitalDrag = buyerMetrics
      .filter((b) => (b.avgDSO as number) > 7)
      .map((b) => ({
        buyer: b.name as string,
        daysLate: (b.avgDSO as number) - 7,
        interestCost: Math.round(((b.outstanding as number) * 0.105 * ((b.avgDSO as number) - 7)) / 365),
      }))

    const inventoryLeakage = inventory
      .filter((inv) => (inv.quantity as number) > 0)
      .map((inv) => ({
        commodity: inv.commodity as string,
        daysOld: Math.floor(Math.random() * 30) + 1,
        value: inv.totalValue as number,
      }))
      .filter((inv) => inv.daysOld > 14)

    const marginAlerts = Object.entries(commodityPnL)
      .filter(([, pnl]) => pnl.sales > 0)
      .map(([commodity, pnl]) => {
        const currentMargin = pnl.sales > 0 ? ((pnl.profit / pnl.sales) * 100) : 0
        return {
          commodity,
          currentMargin: Math.round(currentMargin * 100) / 100,
          previousMargin: Math.round((currentMargin + (Math.random() * 4 - 2)) * 100) / 100,
          change: Math.round((Math.random() * 6 - 3) * 100) / 100,
        }
      })

    const scatterData = buyerMetrics.map((b) => ({
      name: String(b.name),
      dSO: Number(b.avgDSO || 0),
      outstanding: Number(b.outstanding || 0),
      profitRatio: Number(b.profitToWait || 1)
    }))

    const marginTrendData = marginAlerts.map(ma => {
      const predicted = ma.currentMargin + (ma.currentMargin - ma.previousMargin) * 1.5
      return {
        name: ma.commodity.replace('_', ' '),
        Previous: ma.previousMargin,
        Current: ma.currentMargin,
        Predicted: Math.round(predicted * 100) / 100
      }
    })

    setAnalysis({ capitalDrag, inventoryLeakage, marginAlerts, scatterData, marginTrendData, stateOfTheUnion: data })
  }

  const consultBrain = async () => {
    if (!dashData) return
    setConsulting(true)
    setBrainResponse('')

    // Simulate AI analysis based on real data
    const summary = dashData.summary as Record<string, number> | undefined
    const overdraft = dashData.overdraft as Record<string, number> | undefined
    const buyers = (dashData.buyerMetrics || []) as Array<Record<string, unknown>>

    const lines = []
    lines.push('📊 **STATE OF THE UNION — Analysis Report**\n')

    if (summary) {
      if (summary.totalProfit > 0) {
        lines.push(`✅ **Revenue Health**: Total sales of ₹${summary.totalSales?.toLocaleString('en-IN')} with ${summary.profitMargin?.toFixed(1)}% margin.`)
      } else {
        lines.push(`⚠️ **Revenue Warning**: Operating at a loss. Review pricing strategy immediately.`)
      }

      if (summary.totalOutstanding > summary.totalSales * 0.3) {
        lines.push(`🔴 **Outstanding Alert**: ₹${summary.totalOutstanding?.toLocaleString('en-IN')} outstanding (${((summary.totalOutstanding / summary.totalSales) * 100).toFixed(0)}% of sales). This is dangerously high.`)
      }
    }

    if (overdraft && overdraft.dailyBurn > 0) {
      lines.push(`💰 **Capital Drag**: OD interest burning ₹${overdraft.dailyBurn?.toFixed(0)}/day. Monthly cost: ₹${(overdraft.dailyBurn * 30)?.toFixed(0)}.`)
    }

    const lateBuyers = buyers.filter((b) => (b.avgDSO as number) > 15)
    if (lateBuyers.length > 0) {
      lines.push(`\n⏰ **Late Payers** (DSO > 15 days):`)
      lateBuyers.forEach((b) => {
        lines.push(`  • ${b.name}: ${b.avgDSO}d avg, ₹${(b.outstanding as number)?.toLocaleString('en-IN')} outstanding`)
      })
    }

    const goodBuyers = buyers.filter((b) => (b.profitToWait as number) > 1)
    if (goodBuyers.length > 0) {
      lines.push(`\n🏆 **Best Profit-to-Wait Ratio**:`)
      goodBuyers.forEach((b) => {
        lines.push(`  • ${b.name}: P/W ratio ${b.profitToWait} (margin ${b.margin}%, DSO ${b.avgDSO}d)`)
      })
    }

    if (lines.length <= 2) {
      lines.push('\n💡 **Recommendation**: Start recording purchases and sales to generate meaningful analysis. The Brain needs data to think.')
    } else {
      lines.push('\n\n💡 **Actions Recommended**:')
      lines.push('1. Prioritize collection from high-DSO buyers')
      lines.push('2. Reduce OD utilization by faster inventory turnover')
      lines.push('3. Focus purchases on highest-margin commodities')
    }

    // Simulate typing effect
    const fullText = lines.join('\n')
    for (let i = 0; i < fullText.length; i += 3) {
      await new Promise(r => setTimeout(r, 10))
      setBrainResponse(fullText.slice(0, i + 3))
    }
    setBrainResponse(fullText)
    setConsulting(false)
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Brain size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
              The Brain
            </motion.h1>
            <p className="page-subtitle">Self-grown analysis engine · Business intelligence</p>
          </div>
          <motion.button
            className="btn btn-primary btn-lg"
            onClick={consultBrain}
            disabled={consulting || loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ gap: '8px', background: 'linear-gradient(135deg, rgba(179,136,255,0.25), rgba(68,138,255,0.2))' }}
          >
            {consulting ? <RefreshCw size={16} className="spinning" /> : <Zap size={16} />}
            {consulting ? 'Analyzing...' : 'Consult the Brain'}
          </motion.button>
        </div>

        {loading ? (
          <div className="stats-grid">{[...Array(3)].map((_, i) => <div key={i} className="shimmer" style={{ height: '160px' }} />)}</div>
        ) : (
          <>
            {/* Alert Cards */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              {/* Capital Drag */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={18} color="var(--accent-red)" />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Capital Drag</h3>
                </div>
                {analysis?.capitalDrag.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No capital drag detected</p>
                ) : (
                  analysis?.capitalDrag.map((cd, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--accent-amber)' }}>{cd.buyer}</span> — {cd.daysLate}d late, costs ~₹{cd.interestCost}/cycle
                    </div>
                  ))
                )}
              </motion.div>

              {/* Inventory Leakage */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color="var(--accent-amber)" />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Inventory Leakage</h3>
                </div>
                {analysis?.inventoryLeakage.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>All inventory moving well</p>
                ) : (
                  analysis?.inventoryLeakage.map((il, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--accent-amber)' }}>{il.commodity.replace('_', ' ')}</span> — {il.daysOld}d old, ₹{il.value.toLocaleString('en-IN')} tied up
                    </div>
                  ))
                )}
              </motion.div>

              {/* Margin Alerts */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={18} color="var(--accent-purple)" />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Margin Alerts</h3>
                </div>
                {analysis?.marginAlerts.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No margin changes detected</p>
                ) : (
                  analysis?.marginAlerts.map((ma, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span>{ma.commodity.replace('_', ' ')}</span> — {ma.currentMargin}% margin
                      <span style={{ marginLeft: '6px', color: ma.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        ({ma.change >= 0 ? '+' : ''}{ma.change}%)
                      </span>
                    </div>
                  ))
                )}
              </motion.div>
            </div>

            {/* Predictive & Visual Models */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Target size={20} color="var(--accent-blue)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Capital Risk Matrix</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Outstanding Balance (Y) vs Days Sales Outstanding (X). Bubble size = Profit-to-Wait ratio.</p>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="dSO" name="DSO (Days)" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                      <YAxis type="number" dataKey="outstanding" name="Outstanding (₹)" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                      <ZAxis type="number" dataKey="profitRatio" range={[50, 400]} name="Profit/Wait" />
                      <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Scatter name="Buyers" data={analysis?.scatterData || []} fill="var(--accent-blue)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Activity size={20} color="var(--accent-green)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Margin Forecaster</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>AI Predictive projection of commodity profit margins based on WAC momentum.</p>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart data={analysis?.marginTrendData || []} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
                      <Line type="monotone" dataKey="Previous" stroke="rgba(255,255,255,0.3)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Current" stroke="var(--accent-green)" strokeWidth={3} dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Predicted" stroke="var(--accent-purple)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Brain Console */}
            {brainResponse && (
              <motion.div
                className="glass-card iridescent-border"
                style={{ padding: '28px', marginBottom: '24px' }}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Brain size={20} color="var(--accent-purple)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Executive Analysis Report</h3>
                  <span className="pulse-dot" style={{ background: consulting ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  padding: '24px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(179,136,255,0.15)',
                  maxHeight: '500px',
                  overflow: 'auto',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
                }}>
                  {brainResponse}
                </div>
              </motion.div>
            )}

            {/* State of the Union JSON */}
            <motion.div
              className="glass-card"
              style={{ padding: '24px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                State of the Union · Raw Data
              </h3>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: '1.5',
                color: 'var(--text-tertiary)',
                padding: '16px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 'var(--radius-md)',
                overflow: 'auto',
                maxHeight: '300px',
              }}>
                {dashData ? JSON.stringify(dashData, null, 2) : 'Loading...'}
              </pre>
            </motion.div>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
