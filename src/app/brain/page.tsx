'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  DollarSign,
  LineChart as LineChartIcon,
  Package,
  RefreshCw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

type Severity = 'critical' | 'warning' | 'opportunity' | 'stable'
type ReportStatus = 'good' | 'watch' | 'danger' | 'neutral'

type AnalysisData = {
  capitalDrag: Array<{ buyer: string; daysLate: number; interestCost: number }>
  inventoryLeakage: Array<{ commodity: string; daysOld: number; value: number }>
  marginAlerts: Array<{ commodity: string; currentMargin: number; change: number }>
  scatterData: Array<{ name: string; dSO: number; outstanding: number; profitRatio: number }>
  commodityPnLData: Array<{ name: string; Purchases: number; Sales: number; Profit: number }>
  anomalies: Array<{ type: string; commodity: string; message: string }>
}

type BusinessAiReport = {
  title: string
  modelUsed: string
  confidence: 'high' | 'medium' | 'low'
  briefOverview: string
  commandFocus: string
  executiveSummary: Array<{ heading: string; value?: string; insight: string }>
  financialReport: Array<{ heading: string; status: ReportStatus; insight: string; metric?: string }>
  priorityActions: Array<{ action: string; reason: string; expectedImpact: string }>
  risks: Array<{ risk: string; severity: 'critical' | 'high' | 'medium' | 'low'; mitigation: string }>
  opportunities: Array<{ opportunity: string; move: string; expectedUpside: string }>
  questionsToAskNext: string[]
}

type BrainApiResponse = {
  report: BusinessAiReport
  snapshot: {
    summary: {
      totalSales: number
      grossProfit: number
      profitMargin: number
      outstandingReceivables: number
      inventoryValue: number
    }
    overdraft: {
      utilizationPercent: number
      monthlyInterestBurn: number
    }
    financialYear: {
      label: string
      netProfit: number
      netMargin: number
    }
    issues: Array<{ title: string; severity: Severity; detail: string }>
  }
}

type DashboardBuyerMetric = {
  name: string
  avgDSO: number
  outstanding: number
  profitToWait: number
}

type DashboardCommodityVelocity = {
  commodity: string
  quantity: number
  stagnationDays: number
  value: number
}

type DashboardCommodityPnl = {
  purchases: number
  sales: number
  profit: number
}

type DashboardAnomaly = {
  type: string
  commodity: string
  message: string
}

type DashboardData = {
  summary?: {
    totalProfit?: number
    totalSales?: number
    profitMargin?: number
  }
  overdraft?: {
    totalUtilized?: number
    dailyBurn?: number
  }
  buyerMetrics?: DashboardBuyerMetric[]
  commodityVelocity?: DashboardCommodityVelocity[]
  commodityPnL?: Record<string, DashboardCommodityPnl>
  anomalies?: DashboardAnomaly[]
}

function formatCurrency(value: number) {
  return `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`
}

function formatCompactCurrency(value: number) {
  const amount = Math.abs(value || 0)
  if (amount >= 10000000) return `Rs. ${(value / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `Rs. ${(value / 100000).toFixed(2)} L`
  return formatCurrency(value)
}

function severityColor(severity: Severity | 'critical' | 'high' | 'medium' | 'low') {
  if (severity === 'critical' || severity === 'high') return 'var(--accent-red)'
  if (severity === 'warning' || severity === 'medium') return 'var(--accent-amber)'
  if (severity === 'opportunity') return 'var(--accent-blue)'
  return 'var(--accent-green)'
}

function statusColor(status: ReportStatus) {
  if (status === 'danger') return 'var(--accent-red)'
  if (status === 'watch') return 'var(--accent-amber)'
  if (status === 'good') return 'var(--accent-green)'
  return 'var(--accent-blue)'
}

function sanitizeUiText(value: string) {
  return value.replace(/[*#`_~|<>]/g, '').trim()
}

export default function BrainPage() {
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [consulting, setConsulting] = useState(false)
  const [question, setQuestion] = useState('')
  const [aiResult, setAiResult] = useState<BrainApiResponse | null>(null)
  const [aiError, setAiError] = useState('')

  const [simMarginBump, setSimMarginBump] = useState(0)
  const [simODRate, setSimODRate] = useState(10.5)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((response) => response.json())
      .then((data: DashboardData) => {
        setDashData(data)
        setAnalysis(generateAnalysis(data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const simProjection = useMemo(() => {
    if (!dashData?.summary || !dashData?.overdraft) return null

    const currentProfit = Number(dashData.summary.totalProfit || 0)
    const currentSales = Number(dashData.summary.totalSales || 0)
    const newProfitMargin = Number(dashData.summary.profitMargin || 0) + simMarginBump
    const simulatedProfit = (currentSales * newProfitMargin) / 100
    const profitDiff = simulatedProfit - currentProfit
    const totalOD = Number(dashData.overdraft.totalUtilized || 0)
    const currentODBurn = Number(dashData.overdraft.dailyBurn || 0) * 30
    const newODBurn = totalOD * (simODRate / 365 / 100) * 30

    return {
      profitDiff,
      odDiff: currentODBurn - newODBurn,
    }
  }, [dashData, simMarginBump, simODRate])

  const consultBrain = async () => {
    setConsulting(true)
    setAiError('')

    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The command center could not run.')
      setAiResult(data)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'The command center could not run.')
    } finally {
      setConsulting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header brain-header">
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Brain size={28} className="brain-title-icon" />
              AI Command Center
            </motion.h1>
            <p className="page-subtitle">Gemma business intelligence for finance, stock, collections, OD, and growth decisions</p>
          </div>
          <div className="brain-header-actions">
            <span className="badge badge-purple">gemma-for-business</span>
            <button className="btn btn-primary btn-lg" onClick={consultBrain} disabled={consulting || loading}>
              {consulting ? <RefreshCw size={16} className="spinning" /> : <Sparkles size={16} />}
              {consulting ? 'Thinking' : 'Ask AI'}
            </button>
          </div>
        </div>

        <div className="brain-prompt glass-card-flat">
          <div className="brain-prompt-icon">
            <Send size={18} />
          </div>
          <textarea
            className="input-glass brain-prompt-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask what you want to know, for example: which buyer should I call today, what stock should I move first, or how can I reduce OD pressure this month."
          />
          <button className="btn btn-primary" onClick={consultBrain} disabled={consulting || loading}>
            {consulting ? <RefreshCw size={16} className="spinning" /> : <Zap size={16} />}
            Run
          </button>
        </div>

        {loading ? (
          <div className="stats-grid">{[...Array(4)].map((_, index) => <div key={index} className="shimmer" style={{ height: '160px' }} />)}</div>
        ) : (
          <>
            <LocalSignalCards analysis={analysis} />
            <ModelCharts analysis={analysis} />
            <Simulator
              simMarginBump={simMarginBump}
              setSimMarginBump={setSimMarginBump}
              simODRate={simODRate}
              setSimODRate={setSimODRate}
              simProjection={simProjection}
            />
            {aiError && (
              <div className="glass-card brain-error">
                <AlertTriangle size={18} />
                <span>{aiError}</span>
              </div>
            )}
            {aiResult && <AiReportPanel data={aiResult} onAsk={(nextQuestion) => setQuestion(nextQuestion)} />}
          </>
        )}
      </div>
    </AuthLayout>
  )
}

function generateAnalysis(data: DashboardData): AnalysisData {
  const buyerMetrics = data.buyerMetrics || []
  const commodityVelocity = data.commodityVelocity || []
  const commodityPnL = data.commodityPnL || {}

  const capitalDrag = buyerMetrics
    .filter((buyer) => buyer.avgDSO > 7 && buyer.outstanding > 0)
    .map((buyer) => ({
      buyer: buyer.name,
      daysLate: buyer.avgDSO - 7,
      interestCost: Math.round((buyer.outstanding * 0.105 * (buyer.avgDSO - 7)) / 365),
    }))

  const inventoryLeakage = commodityVelocity
    .filter((item) => item.quantity > 0 && item.stagnationDays > 14)
    .map((item) => ({
      commodity: item.commodity,
      daysOld: item.stagnationDays,
      value: item.value,
    }))

  const marginAlerts = Object.entries(commodityPnL)
    .filter(([, pnl]) => pnl.sales > 0)
    .map(([commodity, pnl]) => {
      const currentMargin = pnl.sales > 0 ? (pnl.profit / pnl.sales) * 100 : 0
      const velocity = commodityVelocity.find((item) => item.commodity === commodity)
      const stagnationDays = velocity?.stagnationDays ?? 0
      const stagnationPenalty = stagnationDays > 30 ? 2 : stagnationDays > 14 ? 1 : 0

      return {
        commodity,
        currentMargin: Math.round(currentMargin * 100) / 100,
        change: Math.round((currentMargin - stagnationPenalty) * 100) / 100,
      }
    })

  const scatterData = buyerMetrics.map((buyer) => ({
    name: buyer.name,
    dSO: buyer.avgDSO || 0,
    outstanding: buyer.outstanding || 0,
    profitRatio: Math.max(1, buyer.profitToWait || 1),
  }))

  const commodityPnLData = Object.entries(commodityPnL)
    .filter(([, pnl]) => pnl.sales > 0 || pnl.purchases > 0)
    .map(([commodity, pnl]) => ({
      name: commodity.replaceAll('_', ' '),
      Purchases: Math.round(pnl.purchases || 0),
      Sales: Math.round(pnl.sales || 0),
      Profit: Math.round(pnl.profit || 0),
    }))

  return {
    capitalDrag,
    inventoryLeakage,
    marginAlerts,
    scatterData,
    commodityPnLData,
    anomalies: data.anomalies || [],
  }
}

function LocalSignalCards({ analysis }: { analysis: AnalysisData | null }) {
  const cards = [
    {
      title: 'Capital Drag',
      icon: DollarSign,
      color: 'var(--accent-red)',
      empty: 'No capital drag detected',
      items: analysis?.capitalDrag.map((item) => ({
        label: item.buyer,
        detail: `${item.daysLate} days late, interest drag near ${formatCurrency(item.interestCost)}`,
      })),
    },
    {
      title: 'Inventory Leakage',
      icon: Package,
      color: 'var(--accent-amber)',
      empty: 'All inventory is moving well',
      items: analysis?.inventoryLeakage.map((item) => ({
        label: item.commodity.replaceAll('_', ' '),
        detail: `${item.daysOld} days old, ${formatCurrency(item.value)} tied up`,
      })),
    },
    {
      title: 'Margin Alerts',
      icon: TrendingDown,
      color: 'var(--accent-purple)',
      empty: 'No margin pressure detected',
      items: analysis?.marginAlerts.map((item) => ({
        label: item.commodity.replaceAll('_', ' '),
        detail: `${item.currentMargin}% current margin`,
      })),
    },
    {
      title: 'Pricing Anomalies',
      icon: ShieldAlert,
      color: 'var(--accent-blue)',
      empty: 'No pricing irregularities detected',
      items: analysis?.anomalies.map((item) => ({
        label: item.commodity.replaceAll('_', ' '),
        detail: item.message,
      })),
    },
  ]

  return (
    <div className="stats-grid brain-signal-grid">
      {cards.map((card, index) => {
        const Icon = card.icon
        const items = card.items || []

        return (
          <motion.div
            key={card.title}
            className="glass-card brain-signal-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="brain-card-heading">
              <div className="brain-card-icon" style={{ color: card.color, background: `${card.color}22` }}>
                <Icon size={18} />
              </div>
              <h3>{card.title}</h3>
            </div>
            {items.length === 0 ? (
              <p className="brain-muted">{card.empty}</p>
            ) : (
              <div className="brain-mini-list">
                {items.slice(0, 4).map((item, itemIndex) => (
                  <div key={`${card.title}-${itemIndex}`} className="brain-mini-item">
                    <span>{sanitizeUiText(item.label)}</span>
                    <small>{sanitizeUiText(item.detail)}</small>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

function ModelCharts({ analysis }: { analysis: AnalysisData | null }) {
  return (
    <div className="brain-chart-grid">
      <motion.div className="glass-card brain-chart-card" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="brain-section-heading">
          <Target size={20} color="var(--accent-blue)" />
          <div>
            <h3>Capital Risk Matrix</h3>
            <p>Outstanding balance against payment delay, sized by profit to wait ratio.</p>
          </div>
        </div>
        <div className="brain-chart">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="dSO" name="DSO" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis type="number" dataKey="outstanding" name="Outstanding" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <ZAxis type="number" dataKey="profitRatio" range={[60, 420]} name="Profit Wait" />
              <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Scatter name="Buyers" data={analysis?.scatterData || []} fill="var(--accent-blue)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div className="glass-card brain-chart-card" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
        <div className="brain-section-heading">
          <LineChartIcon size={20} color="var(--accent-green)" />
          <div>
            <h3>Commodity P&L Tracker</h3>
            <p>Actual purchases, sales, and profit from the live ledger. No projected or mocked values.</p>
          </div>
        </div>
        <div className="brain-chart">
          <ResponsiveContainer>
            <BarChart data={analysis?.commodityPnLData || []} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
              <Bar dataKey="Purchases" fill="var(--accent-red)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sales" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}

function Simulator({
  simMarginBump,
  setSimMarginBump,
  simODRate,
  setSimODRate,
  simProjection,
}: {
  simMarginBump: number
  setSimMarginBump: (value: number) => void
  simODRate: number
  setSimODRate: (value: number) => void
  simProjection: { profitDiff: number; odDiff: number } | null
}) {
  return (
    <motion.div className="glass-card brain-simulator" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="brain-section-heading">
        <SlidersHorizontal size={20} color="var(--accent-amber)" />
        <div>
          <h3>What If Simulator</h3>
          <p>Test margin movement and OD negotiation impact before making decisions.</p>
        </div>
      </div>
      <div className="brain-simulator-controls">
        <div className="brain-control">
          <div className="brain-control-row">
            <span>Gross margin shift</span>
            <strong style={{ color: simMarginBump >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {simMarginBump > 0 ? '+' : ''}
              {simMarginBump}%
            </strong>
          </div>
          <input type="range" min="-5" max="10" step="0.5" value={simMarginBump} onChange={(event) => setSimMarginBump(Number(event.target.value))} />
          {simProjection && simMarginBump !== 0 && <p>{formatCurrency(simProjection.profitDiff)} projected net movement</p>}
        </div>
        <div className="brain-control">
          <div className="brain-control-row">
            <span>OD interest rate</span>
            <strong style={{ color: 'var(--accent-blue)' }}>{simODRate}%</strong>
          </div>
          <input type="range" min="6" max="18" step="0.5" value={simODRate} onChange={(event) => setSimODRate(Number(event.target.value))} />
          {simProjection && simODRate !== 10.5 && <p>{formatCurrency(Math.abs(simProjection.odDiff))} monthly interest movement</p>}
        </div>
      </div>
    </motion.div>
  )
}

function AiReportPanel({ data, onAsk }: { data: BrainApiResponse; onAsk: (question: string) => void }) {
  const report = data.report
  const snapshot = data.snapshot

  return (
    <motion.div className="brain-report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass-card brain-report-hero">
        <div>
          <div className="brain-kicker">
            <Brain size={16} />
            <span>{sanitizeUiText(report.modelUsed)}</span>
            <span>{report.confidence} confidence</span>
          </div>
          <h2>{sanitizeUiText(report.title)}</h2>
          <p>{sanitizeUiText(report.briefOverview)}</p>
        </div>
        <div className="brain-focus-card">
          <span>Command Focus</span>
          <strong>{sanitizeUiText(report.commandFocus)}</strong>
        </div>
      </div>

      <div className="stats-grid">
        <MetricTile icon={CircleDollarSign} label="Turnover" value={formatCompactCurrency(snapshot.summary.totalSales)} color="var(--accent-blue)" />
        <MetricTile icon={BarChart3} label="Gross Profit" value={formatCompactCurrency(snapshot.summary.grossProfit)} color={snapshot.summary.grossProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <MetricTile icon={ClipboardList} label="Receivables" value={formatCompactCurrency(snapshot.summary.outstandingReceivables)} color="var(--accent-amber)" />
        <MetricTile icon={Activity} label="FY Net Margin" value={`${snapshot.financialYear.netMargin}%`} color={snapshot.financialYear.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      </div>

      <ReportSection title="Executive Summary" icon={CheckCircle2}>
        <div className="brain-report-grid">
          {report.executiveSummary.map((item, index) => (
            <div className="brain-report-card" key={`${item.heading}-${index}`}>
              <span>{sanitizeUiText(item.heading)}</span>
              {item.value && <strong>{sanitizeUiText(item.value)}</strong>}
              <p>{sanitizeUiText(item.insight)}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Financial Report" icon={BarChart3}>
        <div className="brain-finance-list">
          {report.financialReport.map((item, index) => (
            <div className="brain-finance-row" key={`${item.heading}-${index}`}>
              <div className="brain-status-dot" style={{ background: statusColor(item.status) }} />
              <div>
                <strong>{sanitizeUiText(item.heading)}</strong>
                <p>{sanitizeUiText(item.insight)}</p>
              </div>
              {item.metric && <span>{sanitizeUiText(item.metric)}</span>}
            </div>
          ))}
        </div>
      </ReportSection>

      <div className="brain-two-column">
        <ReportSection title="Priority Actions" icon={Target}>
          <div className="brain-action-list">
            {report.priorityActions.map((item, index) => (
              <div className="brain-action-card" key={`${item.action}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{sanitizeUiText(item.action)}</strong>
                  <p>{sanitizeUiText(item.reason)}</p>
                  <small>{sanitizeUiText(item.expectedImpact)}</small>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Risk Register" icon={ShieldAlert}>
          <div className="brain-risk-list">
            {report.risks.map((item, index) => (
              <div className="brain-risk-card" key={`${item.risk}-${index}`}>
                <div className="brain-risk-heading">
                  <strong>{sanitizeUiText(item.risk)}</strong>
                  <span style={{ color: severityColor(item.severity) }}>{item.severity}</span>
                </div>
                <p>{sanitizeUiText(item.mitigation)}</p>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>

      <ReportSection title="Opportunity Map" icon={Sparkles}>
        <div className="brain-report-grid">
          {report.opportunities.map((item, index) => (
            <div className="brain-report-card" key={`${item.opportunity}-${index}`}>
              <span>{sanitizeUiText(item.opportunity)}</span>
              <p>{sanitizeUiText(item.move)}</p>
              <small>{sanitizeUiText(item.expectedUpside)}</small>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Ask Next" icon={Send}>
        <div className="brain-question-list">
          {report.questionsToAskNext.map((nextQuestion, index) => (
            <button
              key={`${nextQuestion}-${index}`}
              className="btn"
              onClick={() => {
                onAsk(nextQuestion)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {sanitizeUiText(nextQuestion)}
            </button>
          ))}
        </div>
      </ReportSection>
    </motion.div>
  )
}

function MetricTile({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color, '--stat-color-dim': `${color}22` } as CSSProperties}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
    </div>
  )
}

function ReportSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="brain-report-section">
      <div className="brain-section-heading">
        <Icon size={20} color="var(--accent-blue)" />
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  )
}
