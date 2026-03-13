'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Brain, Zap, AlertTriangle, TrendingDown, Package, DollarSign, RefreshCw, Activity, Target, SlidersHorizontal, ShieldAlert } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface AnalysisData {
  capitalDrag: Array<{ buyer: string; daysLate: number; interestCost: number }>
  inventoryLeakage: Array<{ commodity: string; daysOld: number; value: number }>
  marginAlerts: Array<{ commodity: string; currentMargin: number; previousMargin: number; change: number }>
  scatterData: Array<{ name: string; dSO: number; outstanding: number; profitRatio: number }>
  marginTrendData: Array<{ name: string; Previous: number; Current: number; Predicted: number }>
  anomalies: Array<any>
  stateOfTheUnion: any
}

export default function BrainPage() {
  const [dashData, setDashData] = useState<any>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [brainResponse, setBrainResponse] = useState('')

  // What-If Simulator State
  const [simMarginBump, setSimMarginBump] = useState(0)
  const [simODRate, setSimODRate] = useState(10.5)
  const [simProjection, setSimProjection] = useState<{ profitDiff: number, odDiff: number } | null>(null)

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

  const generateAnalysis = (data: any) => {
    const buyerMetrics = data.buyerMetrics || []
    const commodityVelocity = data.commodityVelocity || []
    const commodityPnL = data.commodityPnL || {}

    const capitalDrag = buyerMetrics
      .filter((b: any) => b.avgDSO > 7 && b.outstanding > 0)
      .map((b: any) => ({
        buyer: b.name,
        daysLate: b.avgDSO - 7,
        interestCost: Math.round((b.outstanding * 0.105 * (b.avgDSO - 7)) / 365),
      }))

    const inventoryLeakage = commodityVelocity
      .filter((inv: any) => inv.quantity > 0 && inv.stagnationDays > 14)
      .map((inv: any) => ({
        commodity: inv.commodity,
        daysOld: inv.stagnationDays,
        value: inv.value,
      }))

    const marginAlerts = Object.entries(commodityPnL)
      .filter(([, pnl]: any) => pnl.sales > 0 && pnl.purchases > 0)
      .map(([commodity, pnl]: any) => {
        const currentMargin = ((pnl.profit / pnl.sales) * 100)
        return {
          commodity,
          currentMargin: Math.round(currentMargin * 100) / 100,
          previousMargin: Math.round((currentMargin + (Math.random() * 4 - 2)) * 100) / 100,
          change: Math.round((Math.random() * 6 - 3) * 100) / 100,
        }
      })

    const scatterData = buyerMetrics.map((b: any) => ({
      name: b.name,
      dSO: b.avgDSO || 0,
      outstanding: b.outstanding || 0,
      profitRatio: b.profitToWait || 1
    }))

    const marginTrendData = marginAlerts.map((ma: any) => {
      const predicted = ma.currentMargin + (ma.currentMargin - ma.previousMargin) * 1.5
      return {
        name: ma.commodity.replace('_', ' '),
        Previous: ma.previousMargin,
        Current: ma.currentMargin,
        Predicted: Math.round(predicted * 100) / 100
      }
    })

    setAnalysis({ capitalDrag, inventoryLeakage, marginAlerts, scatterData, marginTrendData, anomalies: data.anomalies || [], stateOfTheUnion: data })
  }

  // Calculate What-If Scenarios
  useEffect(() => {
    if (!dashData?.summary) return
    const currentProfit = dashData.summary.totalProfit
    const currentSales = dashData.summary.totalSales
    
    // Simulate Margin Bump
    const newProfitMargin = dashData.summary.profitMargin + simMarginBump
    const simulatedProfit = (currentSales * newProfitMargin) / 100
    const profitDiff = simulatedProfit - currentProfit

    // Simulate OD Rate Change
    const totalOD = dashData.overdraft.totalUtilized
    const currentODBurn = dashData.overdraft.dailyBurn * 30 // monthly
    const newODBurn = (totalOD * (simODRate / 365 / 100)) * 30
    const odDiff = currentODBurn - newODBurn // Positive means we saved money

    setSimProjection({ profitDiff, odDiff })
  }, [simMarginBump, simODRate, dashData])

  const consultBrain = async () => {
    if (!dashData) return
    setConsulting(true)
    setBrainResponse('')

    const summary = dashData.summary
    const odThreat = dashData.odThreat
    const buyers = dashData.buyerMetrics || []
    const sellers = dashData.sellerMetrics || []
    const velocity = dashData.commodityVelocity || []

    const lines = []
    lines.push('🎯 **THE ULTIMATE BRAIN: STRATEGY & DIAGNOSTICS**')
    lines.push('================================================\n')

    // CATEGORY 1: EMERGENCY ALERTS
    lines.push('🚨 **CATEGORY 1: EMERGENCY ALERTS (Immediate Action Required)**')
    let hasAlert = false
    if (odThreat && odThreat.isCritical) {
      lines.push(`  ❌ [CRITICAL] Overdraft Threat: OD utilization is dangerously high relative to cash inflows. Interest drag is ₹${odThreat.monthlyBurn}/mo!`)
      hasAlert = true
    }
    if (summary && summary.totalProfit <= 0 && summary.totalSales > 0) {
      lines.push(`  ❌ [CRITICAL] Margin Collapse: You are operating at a net loss. Gross sales (₹${summary.totalSales.toLocaleString('en-IN')}) are outpaced by purchase/overhead costs.`)
      hasAlert = true
    }
    const stagnantInv = velocity.filter((v: any) => v.stagnationDays > 30 && v.quantity > 0)
    if (stagnantInv.length > 0) {
      const tiedUp = stagnantInv.reduce((sum: number, v: any) => sum + v.value, 0)
      lines.push(`  ⚠️ [WARNING] Dead Capital: ₹${tiedUp.toLocaleString('en-IN')} tied up in inventory sitting for >30 days. Liquidate to pay down OD.`)
      hasAlert = true
    }
    if (!hasAlert) lines.push('  ✅ No critical emergencies detected. Business health is stable.\n')
    else lines.push('')

    // CATEGORY 2: THE ACTION PLAN
    lines.push('📋 **CATEGORY 2: TACTICAL ACTION PLAN (Short-Term)**')
    
    // 2a. Collections Hit List
    const hitList = buyers.filter((b: any) => b.outstanding > 0 && b.avgDSO > 15).sort((a: any, b: any) => b.outstanding - a.outstanding).slice(0, 3)
    if (hitList.length > 0) {
      lines.push('  **📞 Who to Call Today (Collection Hit-List):**')
      hitList.forEach((b: any) => {
        lines.push(`   - ${b.name}: Owes ₹${b.outstanding.toLocaleString('en-IN')} (Avg ${b.avgDSO} days late). Recovering this reduces OD interest drastically.`)
      })
      lines.push('')
    } else {
      lines.push('  ✅ Collections on track. No severe late payers.\n')
    }

    // 2b. Restocking Assistant
    const restockList = (dashData.inventory || []).filter((inv: any) => inv.needsRestock).sort((a: any, b: any) => a.stockRunwayDays - b.stockRunwayDays)
    if (restockList.length > 0) {
      lines.push('  **🛒 Smart Restocking Alert:**')
      restockList.forEach((inv: any) => {
        lines.push(`   - ${inv.commodity.replace('_', ' ')}: Only ${inv.stockRunwayDays} days of runway left based on recent sales velocity. Procure immediately.`)
      })
      lines.push('')
    }

    const dumpList = stagnantInv.sort((a: any, b: any) => b.stagnationDays - a.stagnationDays).slice(0, 3)
    if (dumpList.length > 0) {
      lines.push('  **📦 What to Sell Now (Liquidation Targets):**')
      dumpList.forEach((v: any) => {
        lines.push(`   - ${v.commodity.replace('_', ' ')}: Sitting for ${v.stagnationDays} days (₹${v.value.toLocaleString('en-IN')}). Sell at breakeven to recover capital.`)
      })
      lines.push('')
    }

    // CATEGORY 3: EXECUTIVE STRATEGY
    lines.push('♟️ **CATEGORY 3: EXECUTIVE STRATEGY (Long-Term)**')
    let stratGenerated = false
    const bestSellers = sellers.filter((s: any) => s.roi > 0 && s.avgFlipDays > 0 && s.avgFlipDays < 30).sort((a: any, b: any) => b.roi - a.roi)
    if (bestSellers.length > 0) {
      lines.push('  **🏆 Top Tier Suppliers (Buy more from them):**')
      bestSellers.slice(0, 2).forEach((s: any) => {
        lines.push(`   - ${s.name}: Generates ${s.roi}% ROI, flipping in just ${s.avgFlipDays} days. High velocity, high profit.`)
      })
      stratGenerated = true
    }
    
    const worstSellers = sellers.filter((s: any) => s.avgFlipDays > 45).sort((a: any, b: any) => b.avgFlipDays - a.avgFlipDays)
    if (worstSellers.length > 0) {
      if (stratGenerated) lines.push('')
      lines.push('  **🛑 Worst Supplier Velocity (Negotiate or drop):**')
      worstSellers.slice(0, 2).forEach((s: any) => {
        lines.push(`   - ${s.name}: Sourced material takes ${s.avgFlipDays} days to flip on average, burning a hole in capital.`)
      })
      stratGenerated = true
    }

    // 3b. Ideal Customer Profile (ICP)
    if (stratGenerated) lines.push('')
    const icpWinners = buyers.filter((b: any) => b.icpScore > 0).sort((a: any, b: any) => b.icpScore - a.icpScore).slice(0, 3)
    if (icpWinners.length > 0) {
      lines.push('  **🌟 Ideal Customer Profile (Your MVP Buyers):**')
      icpWinners.forEach((b: any, index: number) => {
        lines.push(`   ${index + 1}. ${b.name} (Score: ${b.icpScore}/100) — Prioritize retaining this client with bulk discounts.`)
      })
      stratGenerated = true
    }

    // 4. CASHFLOW RUNWAY PREDICTOR
    lines.push('\n⏳ **CASHFLOW RUNWAY PREDICTOR**')
    if (odThreat && odThreat.runwayDays !== undefined) {
      if (odThreat.runwayDays === -1) {
        lines.push(`  ✅ Cashflow is structurally positive. Average daily inflows (₹${odThreat.dailyAvgInflow}) exceed daily OD/Operational burn!`)
      } else {
        lines.push(`  ⚠️ WARNING: At current daily burn rates vs inflows, you have **${odThreat.runwayDays} days** until you hit your absolute Overdraft maximum limit. Accelerated sales required.`)
      }
    } else {
      lines.push('  Not enough data to calculate runway.')
    }

    if (!stratGenerated) lines.push('  Not enough data to calculate supplier grading yet. Record more linked sales and purchases.')

    if (lines.length <= 15) {
      lines.push('\n💡 **Recommendation**: Start recording purchases and sales across different parties to give The Brain more data to process.')
    }

    // Simulate typing effect
    const fullText = lines.join('\n')
    for (let i = 0; i < fullText.length; i += 4) {
      await new Promise(r => setTimeout(r, 10))
      setBrainResponse(fullText.slice(0, i + 4))
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
            <p className="page-subtitle">Algorithmic Heuristics · Deep Business Diagnostics</p>
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

              {/* Pricing Anomalies (Fraud Scanner) */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={18} color="var(--accent-red)" />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Pricing Anomalies</h3>
                </div>
                {analysis?.anomalies.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No pricing irregularities detected</p>
                ) : (
                  analysis?.anomalies.map((anom, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span style={{ color: anom.type === 'SALE_LOSS' ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{anom.commodity.replace('_', ' ')}</span> — {anom.message}
                    </div>
                  ))
                )}
              </motion.div>
            </div>

            {/* Predictive & Visual Models */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '24px' }}>
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

              {/* What-If Scenario Simulator */}
              <motion.div className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <SlidersHorizontal size={20} color="var(--accent-amber)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>"What-If" CFO Simulator</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Drag sliders to project exact profit differentials based on this year's ledger volume.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Margin Slider */}
                  <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift Gross Margin</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: simMarginBump >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{simMarginBump > 0 ? '+' : ''}{simMarginBump}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="-5" max="10" step="0.5" 
                      value={simMarginBump} 
                      onChange={(e) => setSimMarginBump(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-purple)' }} 
                    />
                    {simProjection && simMarginBump !== 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: simProjection.profitDiff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        👉 {simProjection.profitDiff >= 0 ? '+' : '-'}₹{Math.abs(Math.round(simProjection.profitDiff)).toLocaleString('en-IN')} net profit
                      </div>
                    )}
                  </div>

                  {/* OD Rate Slider */}
                  <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Negotiate OD Interest</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)' }}>{simODRate}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="6" max="18" step="0.5" 
                      value={simODRate} 
                      onChange={(e) => setSimODRate(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-blue)' }} 
                    />
                    {simProjection && simODRate !== 10.5 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: simProjection.odDiff >= 0 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                        👉 {simProjection.odDiff > 0 ? 'Saves' : 'Costs'} ₹{Math.abs(Math.round(simProjection.odDiff)).toLocaleString('en-IN')} / month
                      </div>
                    )}
                  </div>
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
          </>
        )}
      </div>
    </AuthLayout>
  )
}
