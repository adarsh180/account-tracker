'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  Trophy, Target, TrendingUp, Star, CheckCircle2, Circle, Rocket,
  Calendar, Building2, Zap, Crown, ChevronRight, Flag,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

interface Milestone {
  fyYear: number; label: string
  turnoverTarget: number; profitTarget: number; valuationTarget: number
  actualTurnover: number; actualProfit: number
  turnoverProgress: number; keyGoals: string[]; achievements: string[]
  notes: string | null; isCompleted: boolean; isCurrentFY: boolean
  isOnTrack: boolean; growthFactor: number; id: string | null
}

interface VisionData {
  milestones: Milestone[]
  summary: {
    finalTarget: number; finalLabel: string; targetYear: number
    currentProgress: number; cagr: number
    currentFYTurnover: number; currentFYTarget: number
  }
}

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(0)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}
const fmtN = (n: number) => new Intl.NumberFormat('en-IN').format(n)

const YEAR_COLORS = ['#448aff', '#18ffff', '#69ff47', '#ffab00', '#ea4c89']
const STAGE_LABELS = ['Seed', 'Build', 'Scale', 'Dominate', 'Empire']
const STAGE_ICONS = [Zap, Building2, TrendingUp, Crown, Trophy]

// Chart data: trajectory from ₹35L → ₹50Cr
const TRAJECTORY_DATA = [
  { year: 'Current', target: 3500000, realistic: 3500000 },
  { year: 'FY25-26', target: 10000000, realistic: 10000000 },
  { year: 'FY26-27', target: 30000000, realistic: 25000000 },
  { year: 'FY27-28', target: 80000000, realistic: 65000000 },
  { year: 'FY28-29', target: 200000000, realistic: 170000000 },
  { year: 'FY29-30', target: 500000000, realistic: 500000000 },
]

export default function VisionPage() {
  const [data, setData] = useState<VisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/vision')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <AuthLayout>
        <div className="page-container">
          <div className="stats-grid">{[...Array(5)].map((_, i) => <div key={i} className="shimmer" style={{ height: '200px' }} />)}</div>
        </div>
      </AuthLayout>
    )
  }

  const { milestones, summary } = data
  const currentMilestone = milestones.find(m => m.isCurrentFY)

  return (
    <AuthLayout>
      <div className="page-container">

        {/* ═══ HERO HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '36px 36px 32px',
            marginBottom: '28px',
            background: 'linear-gradient(135deg, rgba(234,76,137,0.08) 0%, rgba(68,138,255,0.08) 50%, rgba(24,255,255,0.05) 100%)',
            border: '1px solid rgba(234,76,137,0.15)',
            borderRadius: 'var(--radius-xl)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow orbs */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,76,137,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '30%', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(68,138,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ padding: '10px', background: 'rgba(234,76,137,0.15)', borderRadius: '12px', border: '1px solid rgba(234,76,137,0.2)' }}>
                  <Trophy size={24} color="#ea4c89" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(234,76,137,0.8)', textTransform: 'uppercase', fontWeight: 600 }}>5-Year Vision</div>
                  <h1 style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.1, background: 'linear-gradient(90deg, #ea4c89, #448aff, #18ffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    ₹50 Crore Empire
                  </h1>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', lineHeight: 1.6 }}>
                From ₹35 Lakhs today → <strong style={{ color: 'var(--text-primary)' }}>₹50 Crore company valuation by 2030</strong>.
                Every purchase, every sale, every day matters. This is your roadmap.
              </p>
            </div>

            {/* Overall Stats */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Required CAGR</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ea4c89' }}>{summary.cagr.toFixed(0)}%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>per year</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Years Left</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffab00' }}>
                  {Math.max(0, summary.targetYear - new Date().getFullYear())}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to ₹50 Cr</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Now</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#18ffff' }}>{fmt(summary.currentFYTurnover || 3500000)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>turnover</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ GROWTH TRAJECTORY CHART ═══ */}
        <motion.div
          className="glass-card"
          style={{ padding: '28px', marginBottom: '28px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>₹50 Crore Growth Trajectory</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Target path vs realistic projection (compounding growth)</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '3px', background: '#ea4c89', borderRadius: '2px' }} />Target</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '3px', background: '#448aff', borderRadius: '2px' }} />Projected</div>
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAJECTORY_DATA} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea4c89" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea4c89" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="realisticGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#448aff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#448aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" stroke="rgba(255,255,255,0.35)" fontSize={12} />
                <YAxis
                  stroke="rgba(255,255,255,0.35)"
                  fontSize={11}
                  tickFormatter={v => {
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`
                    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                    return `₹${v}`
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8,12,24,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px' }}
                  formatter={(val: any) => [fmt(Number(val)), '']}
                />
                <ReferenceLine y={500000000} stroke="rgba(234,76,137,0.4)" strokeDasharray="6 4" label={{ value: '₹50 Cr 🏆', fill: '#ea4c89', fontSize: 11, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="target" stroke="#ea4c89" strokeWidth={2.5} fill="url(#targetGrad)" name="Target" dot={{ fill: '#ea4c89', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="realistic" stroke="#448aff" strokeWidth={2} fill="url(#realisticGrad)" name="Projected" strokeDasharray="6 3" dot={{ fill: '#448aff', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ═══ 5 MILESTONE CARDS ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
          {milestones.map((m, i) => {
            const StageIcon = STAGE_ICONS[i]
            const color = YEAR_COLORS[i]
            const isExpanded = selectedMilestone === i
            const circumference = 2 * Math.PI * 36
            const dashOffset = circumference - (circumference * m.turnoverProgress) / 100

            return (
              <motion.div
                key={m.fyYear}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                onClick={() => setSelectedMilestone(isExpanded ? null : i)}
                style={{
                  padding: '24px',
                  background: m.isCurrentFY
                    ? `linear-gradient(135deg, rgba(${color === '#448aff' ? '68,138,255' : color === '#18ffff' ? '24,255,255' : color === '#69ff47' ? '105,255,71' : color === '#ffab00' ? '255,171,0' : '234,76,137'},0.08) 0%, rgba(255,255,255,0.02) 100%)`
                    : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${m.isCurrentFY ? color + '30' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                whileHover={{ scale: 1.005 }}
              >
                {m.isCurrentFY && (
                  <div style={{ position: 'absolute', top: '12px', right: '16px', padding: '4px 10px', background: `${color}20`, border: `1px solid ${color}40`, borderRadius: '20px', fontSize: '10px', fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ← CURRENT FY
                  </div>
                )}
                {m.isCompleted && (
                  <div style={{ position: 'absolute', top: '12px', right: '16px', padding: '4px 10px', background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: '20px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-green)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ✓ COMPLETED
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Progress Ring */}
                  <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                      <circle
                        cx="40" cy="40" r="36" fill="none"
                        stroke={color} strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 5px ${color}80)`, transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <StageIcon size={16} color={color} />
                      <span style={{ fontSize: '10px', fontWeight: 700, color, marginTop: '2px' }}>{m.turnoverProgress.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Main Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Stage {i + 1} — {STAGE_LABELS[i]}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
                      {fmt(m.turnoverTarget)} Turnover
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Company Valuation: <strong style={{ color }}>{fmt(m.valuationTarget)}</strong>
                      &nbsp;·&nbsp; Net Profit Target: <strong>{fmt(m.profitTarget)}</strong>
                      &nbsp;·&nbsp; Growth: <strong style={{ color: '#ffab00' }}>{m.growthFactor}x</strong>
                    </div>
                  </div>

                  {/* Actual vs Target mini */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {m.actualTurnover > 0 ? (
                      <>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Actual</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: m.actualTurnover >= m.turnoverTarget ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                          {fmt(m.actualTurnover)}
                        </div>
                        <div style={{ fontSize: '11px', color: m.isOnTrack ? 'var(--accent-green)' : 'var(--accent-amber)', marginTop: '2px' }}>
                          {m.isOnTrack ? '✓ On Track' : '⚡ Needs Push'}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                        Future
                      </div>
                    )}
                  </div>

                  <ChevronRight size={18} color="var(--text-tertiary)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </div>

                {/* Expanded: Key Goals */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25 }}
                    style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                          Key Milestones
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {m.keyGoals.map((goal, gi) => (
                            <div key={gi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}>
                              {m.achievements.includes(goal)
                                ? <CheckCircle2 size={15} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '1px' }} />
                                : <Circle size={15} color={color} style={{ flexShrink: 0, marginTop: '1px', opacity: 0.5 }} />
                              }
                              <span style={{ color: m.achievements.includes(goal) ? 'var(--accent-green)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {goal}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                          Financial Targets
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { label: 'Monthly Revenue Needed', value: m.turnoverTarget / 12, color: 'var(--accent-green)' },
                            { label: 'Daily Sales Target', value: m.turnoverTarget / 312, color: 'var(--accent-blue)' },
                            { label: 'Profit Target (FY)', value: m.profitTarget, color: 'var(--accent-amber)' },
                            { label: 'Valuation Target', value: m.valuationTarget, color },
                          ].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                              <span style={{ fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)' }}>{fmt(item.value)}</span>
                            </div>
                          ))}
                        </div>
                        {m.notes && (
                          <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            📝 {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ═══ WHAT IT TAKES — OPERATIONAL METRICS ═══ */}
        <motion.div
          className="glass-card"
          style={{ padding: '28px', marginBottom: '28px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Rocket size={20} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>What It Takes — Year by Year</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>FY</th>
                  <th style={{ textAlign: 'right' }}>Monthly Sales Target</th>
                  <th style={{ textAlign: 'right' }}>Daily Sales Target</th>
                  <th style={{ textAlign: 'right' }}>Minimum Buyers</th>
                  <th style={{ textAlign: 'right' }}>Avg. Deal Size</th>
                  <th style={{ textAlign: 'right' }}>Growth from Prev.</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, i) => (
                  <motion.tr
                    key={m.fyYear}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.06 }}
                    style={m.isCurrentFY ? { background: `${YEAR_COLORS[i]}08` } : {}}
                  >
                    <td style={{ fontWeight: 700, color: YEAR_COLORS[i] }}>
                      {m.isCurrentFY && <Flag size={12} style={{ display: 'inline', marginRight: '6px' }} />}
                      {m.label}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.turnoverTarget / 12)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(m.turnoverTarget / 312)}</td>
                    <td style={{ textAlign: 'right' }}>{i === 0 ? '5+' : i === 1 ? '10+' : i === 2 ? '20+' : i === 3 ? '40+' : '80+'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>{fmt(m.turnoverTarget / (12 * (i === 0 ? 20 : i === 1 ? 40 : i === 2 ? 80 : i === 3 ? 160 : 300)))}</td>
                    <td style={{ textAlign: 'right', color: '#ffab00', fontWeight: 700 }}>{m.growthFactor}x</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ═══ THE COMPOUND EFFECT EXPLAINER ═══ */}
        <motion.div
          style={{
            padding: '28px',
            marginBottom: '28px',
            background: 'linear-gradient(135deg, rgba(105,255,71,0.05) 0%, rgba(24,255,255,0.04) 100%)',
            border: '1px solid rgba(105,255,71,0.12)',
            borderRadius: 'var(--radius-xl)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Star size={20} color="#69ff47" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>The Compound Effect — Your Daily Commitment</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: '📦', title: 'Buy Smart', desc: 'Negotiate ₹2/kg better on every deal. At 1L kg/year that\'s ₹2L extra profit.' },
              { icon: '⚡', title: 'Flip Fast', desc: 'Every extra day inventory sits costs OD interest. Target ≤5 day hold.' },
              { icon: '🤝', title: 'Add Buyers', desc: 'Add 1 new buyer per month. 12 new buyers = ₹X more revenue capacity.' },
              { icon: '📊', title: 'Track Daily', desc: 'Use this app every day. What you measure, you improve. No exceptions.' },
              { icon: '💰', title: 'Reinvest', desc: 'Keep 70% of profit in working capital during growth phase. Compound it.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.95 + i * 0.07 }}
                style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: '#69ff47' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══ BOTTOM CTA ═══ */}
        <motion.div
          style={{
            padding: '24px 28px',
            background: 'linear-gradient(90deg, rgba(234,76,137,0.06), rgba(68,138,255,0.06))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Your next milestone: <span style={{ color: YEAR_COLORS[0] }}>{fmt(currentMilestone?.turnoverTarget || 10000000)}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {currentMilestone ? (
                <>Progress: <strong style={{ color: YEAR_COLORS[0] }}>{currentMilestone.turnoverProgress.toFixed(1)}%</strong> of FY target · Gap: <strong>{fmt(Math.max(0, (currentMilestone?.turnoverTarget || 0) - (currentMilestone?.actualTurnover || 0)))}</strong> remaining</>
              ) : 'Start recording every transaction to track your progress automatically.'}
            </p>
          </div>
          <a href="/financials" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, rgba(234,76,137,0.2), rgba(68,138,255,0.2))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2Size18 /> View Full Financials →
          </a>
        </motion.div>

      </div>
    </AuthLayout>
  )
}

// tiny inline component to avoid import clutter
function BarChart2Size18() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
