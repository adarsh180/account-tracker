'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  IndianRupee,
  Landmark,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

type FundingSource = 'OWN_SAVINGS' | 'EARNED_MONEY' | 'OD_MONEY' | 'MIXED'

type CommitteePaymentData = {
  id: string
  month: number
  year: number
  amount: number
  fundingSource: FundingSource
  ownSavingsAmount: number
  earnedMoneyAmount: number
  odMoneyAmount: number
  isPaid: boolean
  date: string
}

type Committee = {
  id: string
  committeeName: string
  maturityAmount: number
  startDate: string
  maturityDate: string
  totalMonths: number
  isActive: boolean
  notes: string | null
  totalPaid: number
  monthsLeft: number
  progress: number
  payments: CommitteePaymentData[]
}

type InvestmentUse = {
  id: string
  title: string
  category: string
  fundingSource: FundingSource
  amount: number
  ownSavingsAmount: number
  earnedMoneyAmount: number
  odMoneyAmount: number
  expectedReturn: number | null
  expectedReturnDate: string | null
  notes: string | null
  date: string
  risk: 'LOW' | 'WATCH' | 'MEDIUM' | 'HIGH'
  insight: string
}

type InvestmentsResponse = {
  uses: InvestmentUse[]
  manualUses: InvestmentUse[]
  sourceSummary: {
    ownSavings: number
    earnedMoney: number
    odMoney: number
    totalUsed: number
  }
  categorySummary: Array<{ category: string; amount: number; odMoney: number }>
  intelligence: string[]
  capitalSnapshot: {
    totalSales: number
    paymentsReceived: number
    earnedMoneyEstimate: number
    odLimit: number
    odUtilized: number
    odAvailable: number
  }
}

type InvestmentUseForm = {
  title: string
  category: string
  amount: string
  date: string
  fundingSource: FundingSource
  ownSavingsAmount: string
  earnedMoneyAmount: string
  odMoneyAmount: string
  expectedReturn: string
  expectedReturnDate: string
  notes: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SOURCE_LABELS: Record<FundingSource, string> = {
  OWN_SAVINGS: 'Own Savings',
  EARNED_MONEY: 'Earned Money',
  OD_MONEY: 'OD Money',
  MIXED: 'Mixed Source',
}
const CATEGORIES = ['COMMITTEE', 'BUSINESS_ASSET', 'PERSONAL', 'FAMILY', 'EMERGENCY', 'MARKET', 'OTHER']
const COLORS = ['#448aff', '#00e676', '#ffab00', '#b388ff', '#18ffff', '#ff4444', '#00bfa5']

const fmtN = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)
const fmtRs = (value: number) => `Rs. ${fmtN(value)}`
const today = () => new Date().toISOString().split('T')[0]

function sourceColor(source: FundingSource) {
  if (source === 'OD_MONEY') return 'var(--accent-red)'
  if (source === 'OWN_SAVINGS') return 'var(--accent-blue)'
  if (source === 'EARNED_MONEY') return 'var(--accent-green)'
  return 'var(--accent-purple)'
}

function riskColor(risk: InvestmentUse['risk']) {
  if (risk === 'HIGH') return 'var(--accent-red)'
  if (risk === 'WATCH' || risk === 'MEDIUM') return 'var(--accent-amber)'
  return 'var(--accent-green)'
}

export default function InvestmentsPage() {
  const [committees, setCommittees] = useState<Committee[]>([])
  const [tracker, setTracker] = useState<InvestmentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [showUse, setShowUse] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState('')

  const [createForm, setCreateForm] = useState({
    committeeName: "Father's Committee",
    maturityAmount: '500000',
    startDate: today(),
    maturityDate: '',
    totalMonths: '13',
    notes: '',
  })
  const [payForm, setPayForm] = useState({
    month: '',
    year: String(new Date().getFullYear()),
    amount: '',
    date: today(),
    fundingSource: 'EARNED_MONEY' as FundingSource,
    ownSavingsAmount: '',
    earnedMoneyAmount: '',
    odMoneyAmount: '',
  })
  const [useForm, setUseForm] = useState({
    title: '',
    category: 'BUSINESS_ASSET',
    amount: '',
    date: today(),
    fundingSource: 'EARNED_MONEY' as FundingSource,
    ownSavingsAmount: '',
    earnedMoneyAmount: '',
    odMoneyAmount: '',
    expectedReturn: '',
    expectedReturnDate: '',
    notes: '',
  })

  const fetchData = async () => {
    setLoading(true)
    const [committeeRes, investmentRes] = await Promise.all([
      fetch('/api/committee'),
      fetch('/api/investments'),
    ])
    if (committeeRes.ok) setCommittees(await committeeRes.json())
    if (investmentRes.ok) setTracker(await investmentRes.json())
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    Promise.all([
      fetch('/api/committee'),
      fetch('/api/investments'),
    ])
      .then(async ([committeeRes, investmentRes]) => {
        if (!mounted) return
        if (committeeRes.ok) setCommittees(await committeeRes.json())
        if (investmentRes.ok) setTracker(await investmentRes.json())
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const sourceChartData = useMemo(() => {
    if (!tracker) return []
    return [
      { name: 'Own Savings', value: tracker.sourceSummary.ownSavings },
      { name: 'Earned Money', value: tracker.sourceSummary.earnedMoney },
      { name: 'OD Money', value: tracker.sourceSummary.odMoney },
    ].filter((item) => item.value > 0)
  }, [tracker])

  const handleCreate = async () => {
    if (!createForm.maturityAmount || !createForm.startDate || !createForm.maturityDate) return
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
    setPayForm({
      month: '',
      year: String(new Date().getFullYear()),
      amount: '',
      date: today(),
      fundingSource: 'EARNED_MONEY',
      ownSavingsAmount: '',
      earnedMoneyAmount: '',
      odMoneyAmount: '',
    })
    fetchData()
  }

  const handleUse = async () => {
    if (!useForm.title || !useForm.amount) return
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(useForm),
    })
    setShowUse(false)
    setUseForm({
      title: '',
      category: 'BUSINESS_ASSET',
      amount: '',
      date: today(),
      fundingSource: 'EARNED_MONEY',
      ownSavingsAmount: '',
      earnedMoneyAmount: '',
      odMoneyAmount: '',
      expectedReturn: '',
      expectedReturnDate: '',
      notes: '',
    })
    fetchData()
  }

  const deleteUse = async (id: string) => {
    if (id.startsWith('committee-')) return
    await fetch(`/api/investments?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header investment-header">
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PiggyBank size={28} className="investment-title-icon" />
              Investment Money Tracker
            </motion.h1>
            <p className="page-subtitle">Know exactly where your money is going and whether it came from OD, savings, or earned cash</p>
          </div>
          <div className="investment-actions">
            <button className="btn" onClick={() => setShowCreate(true)}><Plus size={16} /> New Committee</button>
            <button className="btn btn-primary" onClick={() => setShowUse(true)}><WalletCards size={16} /> Add Money Use</button>
          </div>
        </div>

        <InvestmentUseModal open={showUse} setOpen={setShowUse} form={useForm} setForm={setUseForm} onSave={handleUse} />
        <CommitteeModal open={showCreate} setOpen={setShowCreate} form={createForm} setForm={setCreateForm} onSave={handleCreate} />
        <PaymentModal open={showPay} setOpen={setShowPay} form={payForm} setForm={setPayForm} onSave={handlePay} />

        {loading ? (
          <div className="stats-grid">{[...Array(4)].map((_, index) => <div key={index} className="shimmer" style={{ height: '180px' }} />)}</div>
        ) : (
          <>
            <div className="stats-grid investment-summary-grid">
              <SummaryCard icon={BriefcaseBusiness} label="Total Tracked Use" value={fmtRs(tracker?.sourceSummary.totalUsed || 0)} color="var(--accent-blue)" />
              <SummaryCard icon={ShieldCheck} label="Own Savings Used" value={fmtRs(tracker?.sourceSummary.ownSavings || 0)} color="var(--accent-blue)" />
              <SummaryCard icon={IndianRupee} label="Earned Money Used" value={fmtRs(tracker?.sourceSummary.earnedMoney || 0)} color="var(--accent-green)" />
              <SummaryCard icon={Landmark} label="OD Money Used" value={fmtRs(tracker?.sourceSummary.odMoney || 0)} color="var(--accent-red)" />
            </div>

            <div className="investment-intel-grid">
              <div className="glass-card investment-panel">
                <div className="investment-panel-heading">
                  <Sparkles size={20} color="var(--accent-purple)" />
                  <h3>Intelligent Money Signal</h3>
                </div>
                <div className="investment-insight-list">
                  {(tracker?.intelligence || []).map((item, index) => (
                    <div key={index} className="investment-insight">
                      <span>{index + 1}</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card investment-panel">
                <div className="investment-panel-heading">
                  <CreditCard size={20} color="var(--accent-amber)" />
                  <h3>Capital Snapshot</h3>
                </div>
                <div className="investment-capital-grid">
                  <MiniMetric label="Payments Received" value={fmtRs(tracker?.capitalSnapshot.paymentsReceived || 0)} />
                  <MiniMetric label="Earned Money Estimate" value={fmtRs(tracker?.capitalSnapshot.earnedMoneyEstimate || 0)} />
                  <MiniMetric label="OD Utilized" value={fmtRs(tracker?.capitalSnapshot.odUtilized || 0)} />
                  <MiniMetric label="OD Available" value={fmtRs(tracker?.capitalSnapshot.odAvailable || 0)} />
                </div>
              </div>
            </div>

            <div className="investment-chart-grid">
              <div className="glass-card investment-panel">
                <div className="investment-panel-heading">
                  <WalletCards size={20} color="var(--accent-blue)" />
                  <h3>Money Source Split</h3>
                </div>
                <div className="investment-chart">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={sourceChartData} dataKey="value" nameKey="name" outerRadius={105} innerRadius={58} paddingAngle={3}>
                        {sourceChartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value) => fmtRs(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card investment-panel">
                <div className="investment-panel-heading">
                  <BriefcaseBusiness size={20} color="var(--accent-green)" />
                  <h3>Use By Category</h3>
                </div>
                <div className="investment-chart">
                  <ResponsiveContainer>
                    <BarChart data={tracker?.categorySummary || []} margin={{ top: 16, right: 16, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="category" stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                      <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value) => fmtRs(Number(value))} />
                      <Bar dataKey="amount" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="odMoney" fill="var(--accent-red)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <MoneyUseTable uses={tracker?.uses || []} onDelete={deleteUse} />
            <CommitteeSection committees={committees} onPay={(id) => { setSelectedCommittee(id); setShowPay(true) }} />
          </>
        )}
      </div>
    </AuthLayout>
  )
}

function SourceFields({
  fundingSource,
  amount,
  values,
  setValues,
}: {
  fundingSource: FundingSource
  amount: string
  values: { ownSavingsAmount: string; earnedMoneyAmount: string; odMoneyAmount: string }
  setValues: (values: { ownSavingsAmount: string; earnedMoneyAmount: string; odMoneyAmount: string }) => void
}) {
  if (fundingSource !== 'MIXED') {
    return (
      <div className="investment-source-note">
        {SOURCE_LABELS[fundingSource]} will be assigned the full amount of {amount ? fmtRs(Number(amount)) : 'Rs. 0'}.
      </div>
    )
  }

  return (
    <div className="form-row" style={{ marginTop: '12px' }}>
      <div className="form-group">
        <label className="form-label">Own Savings Split</label>
        <input className="input-glass" type="number" value={values.ownSavingsAmount} onChange={(event) => setValues({ ...values, ownSavingsAmount: event.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Earned Money Split</label>
        <input className="input-glass" type="number" value={values.earnedMoneyAmount} onChange={(event) => setValues({ ...values, earnedMoneyAmount: event.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">OD Money Split</label>
        <input className="input-glass" type="number" value={values.odMoneyAmount} onChange={(event) => setValues({ ...values, odMoneyAmount: event.target.value })} />
      </div>
    </div>
  )
}

function InvestmentUseModal({
  open,
  setOpen,
  form,
  setForm,
  onSave,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  form: InvestmentUseForm
  setForm: (form: InvestmentUseForm) => void
  onSave: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Money Use</h2>
              <button className="btn btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Where Money Went</label><input className="input-glass" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Machine advance, committee, family expense" /></div>
              <div className="form-group"><label className="form-label">Category</label><select className="input-glass" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></div>
            </div>
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Amount</label><input className="input-glass" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Date</label><input className="input-glass" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Money Source</label><select className="input-glass" value={form.fundingSource} onChange={(event) => setForm({ ...form, fundingSource: event.target.value as FundingSource })}>{Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            </div>
            <SourceFields fundingSource={form.fundingSource} amount={form.amount} values={form} setValues={(values) => setForm({ ...form, ...values })} />
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Expected Return</label><input className="input-glass" type="number" value={form.expectedReturn} onChange={(event) => setForm({ ...form, expectedReturn: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Expected Return Date</label><input className="input-glass" type="date" value={form.expectedReturnDate} onChange={(event) => setForm({ ...form, expectedReturnDate: event.target.value })} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Notes</label>
              <textarea className="input-glass" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave}>Save Money Use</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CommitteeModal({
  open,
  setOpen,
  form,
  setForm,
  onSave,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  form: { committeeName: string; maturityAmount: string; startDate: string; maturityDate: string; totalMonths: string; notes: string }
  setForm: (form: { committeeName: string; maturityAmount: string; startDate: string; maturityDate: string; totalMonths: string; notes: string }) => void
  onSave: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Committee</h2>
              <button className="btn btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Committee Name</label><input className="input-glass" value={form.committeeName} onChange={(event) => setForm({ ...form, committeeName: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Maturity Amount</label><input className="input-glass" type="number" value={form.maturityAmount} onChange={(event) => setForm({ ...form, maturityAmount: event.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Start Date</label><input className="input-glass" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Maturity Date</label><input className="input-glass" type="date" value={form.maturityDate} onChange={(event) => setForm({ ...form, maturityDate: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Total Months</label><input className="input-glass" type="number" value={form.totalMonths} onChange={(event) => setForm({ ...form, totalMonths: event.target.value })} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Notes</label>
              <textarea className="input-glass" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave}>Create Committee</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PaymentModal({
  open,
  setOpen,
  form,
  setForm,
  onSave,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  form: { month: string; year: string; amount: string; date: string; fundingSource: FundingSource; ownSavingsAmount: string; earnedMoneyAmount: string; odMoneyAmount: string }
  setForm: (form: { month: string; year: string; amount: string; date: string; fundingSource: FundingSource; ownSavingsAmount: string; earnedMoneyAmount: string; odMoneyAmount: string }) => void
  onSave: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Committee Payment</h2>
              <button className="btn btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Month</label><select className="input-glass" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })}><option value="">Select</option>{MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Year</label><input className="input-glass" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></div>
            </div>
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Amount</label><input className="input-glass" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Payment Date</label><input className="input-glass" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Money Source</label><select className="input-glass" value={form.fundingSource} onChange={(event) => setForm({ ...form, fundingSource: event.target.value as FundingSource })}>{Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            </div>
            <SourceFields fundingSource={form.fundingSource} amount={form.amount} values={form} setValues={(values) => setForm({ ...form, ...values })} />
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-success" onClick={onSave}>Record Payment</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color, '--stat-color-dim': `${color}22` } as CSSProperties}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-icon"><Icon size={20} /></div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="investment-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MoneyUseTable({ uses, onDelete }: { uses: InvestmentUse[]; onDelete: (id: string) => void }) {
  return (
    <div className="glass-card investment-panel">
      <div className="investment-panel-heading">
        <WalletCards size={20} color="var(--accent-blue)" />
        <h3>Money Use Ledger</h3>
      </div>
      {uses.length === 0 ? (
        <div className="empty-state">
          <WalletCards className="empty-state-icon" size={44} />
          <div className="empty-state-text">No money use recorded</div>
          <div className="empty-state-sub">Add your first use to start source-aware tracking</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Use</th>
                <th>Source</th>
                <th>Amount</th>
                <th>OD Used</th>
                <th>Risk</th>
                <th>Insight</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {uses.map((use) => (
                <tr key={use.id}>
                  <td>
                    <strong>{use.title}</strong>
                    <div className="investment-table-sub">{use.category.replaceAll('_', ' ')} · {new Date(use.date).toLocaleDateString('en-IN')}</div>
                  </td>
                  <td><span className="badge" style={{ color: sourceColor(use.fundingSource), background: `${sourceColor(use.fundingSource)}22` }}>{SOURCE_LABELS[use.fundingSource]}</span></td>
                  <td>{fmtRs(use.amount)}</td>
                  <td style={{ color: use.odMoneyAmount > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)' }}>{fmtRs(use.odMoneyAmount)}</td>
                  <td><span className="badge" style={{ color: riskColor(use.risk), background: `${riskColor(use.risk)}22` }}>{use.risk}</span></td>
                  <td style={{ minWidth: '260px', color: 'var(--text-secondary)' }}>{use.insight}</td>
                  <td>
                    {!use.id.startsWith('committee-') && (
                      <button className="btn btn-icon" onClick={() => onDelete(use.id)}><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CommitteeSection({ committees, onPay }: { committees: Committee[]; onPay: (id: string) => void }) {
  if (committees.length === 0) {
    return (
      <div className="glass-card empty-state">
        <PiggyBank className="empty-state-icon" size={48} />
        <div className="empty-state-text">No committee investments</div>
        <div className="empty-state-sub">Create a committee to start tracking monthly investments</div>
      </div>
    )
  }

  return (
    <div className="investment-committee-list">
      {committees.map((committee, index) => {
        const circumference = 2 * Math.PI * 50
        const strokeOffset = circumference - (circumference * committee.progress) / 100
        const ringColor = committee.progress >= 80 ? '#00e676' : committee.progress >= 50 ? '#ffab00' : '#448aff'
        const avgPayment = committee.payments.length > 0 ? committee.totalPaid / committee.payments.length : 0

        return (
          <motion.div key={committee.id} className="glass-card iridescent-border investment-committee-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <div className="investment-committee-header">
              <div>
                <h3>{committee.committeeName}</h3>
                <div className="investment-table-sub">
                  <Calendar size={12} /> {new Date(committee.startDate).toLocaleDateString('en-IN')} to {new Date(committee.maturityDate).toLocaleDateString('en-IN')}
                  <Clock size={12} /> {committee.monthsLeft} months left
                </div>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => onPay(committee.id)}><Plus size={14} /> Pay Monthly</button>
            </div>

            <div className="investment-progress-row">
              <div className="investment-progress-ring">
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={ringColor} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round" className="gauge-ring" />
                </svg>
                <div>
                  <span style={{ color: ringColor }}>{committee.progress.toFixed(0)}%</span>
                  <small>Progress</small>
                </div>
              </div>
              <div className="investment-committee-metrics">
                <MiniMetric label="Total Paid" value={fmtRs(committee.totalPaid)} />
                <MiniMetric label="Maturity Amount" value={fmtRs(committee.maturityAmount)} />
                <MiniMetric label="Average Monthly" value={fmtRs(avgPayment)} />
              </div>
            </div>

            <div className="investment-payment-grid">
              {committee.payments.length === 0 ? (
                <div className="investment-source-note">No payments recorded yet.</div>
              ) : (
                committee.payments.map((payment) => (
                  <div key={payment.id} className="investment-payment-tile">
                    <div>
                      {payment.isPaid ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Circle size={14} color="var(--text-tertiary)" />}
                      <span>{MONTH_NAMES[payment.month - 1]} {payment.year}</span>
                    </div>
                    <strong>{fmtRs(payment.amount)}</strong>
                    <small style={{ color: sourceColor(payment.fundingSource) }}>{SOURCE_LABELS[payment.fundingSource]}</small>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
