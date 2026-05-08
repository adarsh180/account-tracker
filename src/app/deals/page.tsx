'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import {
  BadgeIndianRupee,
  BriefcaseBusiness,
  HandCoins,
  Landmark,
  Plus,
  Scale,
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

type DealType = 'DIRECT_PURCHASE' | 'OD_TO_CASH_PURCHASE' | 'PARTNERSHIP' | 'BROKERAGE' | 'RESALE'
type FundingSource = 'OWN_MONEY' | 'EARNED_MONEY' | 'OD_MONEY' | 'OD_TO_CASH' | 'PARTNER_MONEY' | 'MIXED' | 'BROKERAGE_ONLY'

type DealPartner = {
  partnerName: string
  investedAmount: string
  sharePercent: string
  expectedReturn: string
  actualReturn: string
  notes: string
}

type Deal = {
  id: string
  dealName: string
  dealType: DealType
  status: string
  itemName: string
  quantity: number | null
  unit: string | null
  dealValue: number
  purchaseCost: number
  expectedSaleValue: number
  actualSaleValue: number
  brokerageAmount: number
  fundingSource: FundingSource
  ownMoneyAmount: number
  earnedMoneyAmount: number
  odMoneyAmount: number
  odToCashAmount: number
  partnerMoneyAmount: number
  cashPaidAmount: number
  onlinePaidAmount: number
  cashReceivedAmount: number
  onlineReceivedAmount: number
  shownToParty: string | null
  buyerPartyName: string | null
  sellerPartyName: string | null
  profitShareNotes: string | null
  notes: string | null
  date: string
  partners: Array<{
    id: string
    partnerName: string
    investedAmount: number
    sharePercent: number
    expectedReturn: number
    actualReturn: number
    notes: string | null
  }>
  grossResult: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'WATCH'
  insight: string
}

type DealsResponse = {
  deals: Deal[]
  summary: Record<string, number>
  typeSummary: Array<{ dealType: string; count: number; value: number; result: number }>
  intelligence: string[]
}

type DealForm = {
  dealName: string
  dealType: DealType
  status: string
  itemName: string
  quantity: string
  unit: string
  dealValue: string
  purchaseCost: string
  expectedSaleValue: string
  actualSaleValue: string
  brokerageAmount: string
  fundingSource: FundingSource
  ownMoneyAmount: string
  earnedMoneyAmount: string
  odMoneyAmount: string
  odToCashAmount: string
  partnerMoneyAmount: string
  cashPaidAmount: string
  onlinePaidAmount: string
  cashReceivedAmount: string
  onlineReceivedAmount: string
  shownToParty: string
  buyerPartyName: string
  sellerPartyName: string
  profitShareNotes: string
  notes: string
  date: string
  partners: DealPartner[]
}

const DEAL_LABELS: Record<DealType, string> = {
  DIRECT_PURCHASE: 'Direct Purchase',
  OD_TO_CASH_PURCHASE: 'OD To Cash Purchase',
  PARTNERSHIP: 'Partnership',
  BROKERAGE: 'Brokerage Only',
  RESALE: 'Resale',
}
const SOURCE_LABELS: Record<FundingSource, string> = {
  OWN_MONEY: 'Own Money',
  EARNED_MONEY: 'Earned Money',
  OD_MONEY: 'OD Money',
  OD_TO_CASH: 'OD To Cash',
  PARTNER_MONEY: 'Partner Money',
  MIXED: 'Mixed Source',
  BROKERAGE_ONLY: 'Brokerage Only',
}
const COLORS = ['#448aff', '#00e676', '#ffab00', '#b388ff', '#ff4444', '#18ffff']

const today = () => new Date().toISOString().split('T')[0]
const fmtN = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)
const fmtRs = (value: number) => `Rs. ${fmtN(value)}`

function emptyPartner(): DealPartner {
  return { partnerName: '', investedAmount: '', sharePercent: '', expectedReturn: '', actualReturn: '', notes: '' }
}

function emptyForm(): DealForm {
  return {
    dealName: '',
    dealType: 'DIRECT_PURCHASE',
    status: 'OPEN',
    itemName: '',
    quantity: '',
    unit: 'KG',
    dealValue: '',
    purchaseCost: '',
    expectedSaleValue: '',
    actualSaleValue: '',
    brokerageAmount: '',
    fundingSource: 'OWN_MONEY',
    ownMoneyAmount: '',
    earnedMoneyAmount: '',
    odMoneyAmount: '',
    odToCashAmount: '',
    partnerMoneyAmount: '',
    cashPaidAmount: '',
    onlinePaidAmount: '',
    cashReceivedAmount: '',
    onlineReceivedAmount: '',
    shownToParty: '',
    buyerPartyName: '',
    sellerPartyName: '',
    profitShareNotes: '',
    notes: '',
    date: today(),
    partners: [emptyPartner()],
  }
}

function riskColor(risk: Deal['risk']) {
  if (risk === 'HIGH') return 'var(--accent-red)'
  if (risk === 'WATCH' || risk === 'MEDIUM') return 'var(--accent-amber)'
  return 'var(--accent-green)'
}

export default function DealsPage() {
  const [data, setData] = useState<DealsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<DealForm>(emptyForm())

  const fetchData = async () => {
    setLoading(true)
    const response = await fetch('/api/deals')
    if (response.ok) setData(await response.json())
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    fetch('/api/deals')
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (mounted && payload) setData(payload)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const sourceChart = useMemo(() => {
    const summary = data?.summary || {}
    return [
      { name: 'Own', value: Number(summary.ownMoney || 0) },
      { name: 'Earned', value: Number(summary.earnedMoney || 0) },
      { name: 'OD', value: Number(summary.odMoney || 0) },
      { name: 'OD Cash', value: Number(summary.odToCash || 0) },
      { name: 'Partner', value: Number(summary.partnerMoney || 0) },
    ].filter((item) => item.value > 0)
  }, [data])

  const saveDeal = async () => {
    if (!form.dealName || !form.itemName) return
    const response = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (response.ok) {
      setShowForm(false)
      setForm(emptyForm())
      fetchData()
    }
  }

  const deleteDeal = async (id: string) => {
    const response = await fetch(`/api/deals?id=${id}`, { method: 'DELETE' })
    if (response.ok) fetchData()
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header deal-header">
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Scale size={28} className="deal-title-icon" />
              Deal Finance
            </motion.h1>
            <p className="page-subtitle">Track direct deals, OD-to-cash purchases, partnerships, brokerage, cash, and online flow</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Deal</button>
        </div>

        <DealModal open={showForm} setOpen={setShowForm} form={form} setForm={setForm} onSave={saveDeal} />

        {loading ? (
          <div className="stats-grid">{[...Array(4)].map((_, index) => <div key={index} className="shimmer" style={{ height: '170px' }} />)}</div>
        ) : (
          <>
            <div className="stats-grid deal-summary-grid">
              <SummaryCard icon={BriefcaseBusiness} label="Tracked Deals" value={String(data?.summary.totalDeals || 0)} color="var(--accent-blue)" />
              <SummaryCard icon={BadgeIndianRupee} label="Gross Result" value={fmtRs(Number(data?.summary.grossResult || 0))} color={Number(data?.summary.grossResult || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <SummaryCard icon={Landmark} label="OD To Cash" value={fmtRs(Number(data?.summary.odToCash || 0))} color="var(--accent-red)" />
              <SummaryCard icon={HandCoins} label="Brokerage" value={fmtRs(Number(data?.summary.brokerage || 0))} color="var(--accent-green)" />
            </div>

            <div className="deal-grid">
              <div className="glass-card deal-panel">
                <div className="deal-panel-heading">
                  <Sparkles size={20} color="var(--accent-purple)" />
                  <h3>Deal Intelligence</h3>
                </div>
                <div className="deal-insight-list">
                  {(data?.intelligence || []).map((item, index) => (
                    <div className="deal-insight" key={index}>
                      <span>{index + 1}</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card deal-panel">
                <div className="deal-panel-heading">
                  <WalletCards size={20} color="var(--accent-blue)" />
                  <h3>Funding Source Mix</h3>
                </div>
                <div className="deal-chart">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={sourceChart} dataKey="value" nameKey="name" innerRadius={56} outerRadius={104} paddingAngle={3}>
                        {sourceChart.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value) => fmtRs(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="glass-card deal-panel">
              <div className="deal-panel-heading">
                <Scale size={20} color="var(--accent-green)" />
                <h3>Deal Type Performance</h3>
              </div>
              <div className="deal-chart">
                <ResponsiveContainer>
                  <BarChart data={data?.typeSummary || []} margin={{ top: 16, right: 16, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dealType" stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value) => fmtRs(Number(value))} />
                    <Bar dataKey="value" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="result" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <DealTable deals={data?.deals || []} onDelete={deleteDeal} />
          </>
        )}
      </div>
    </AuthLayout>
  )
}

function DealModal({
  open,
  setOpen,
  form,
  setForm,
  onSave,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  form: DealForm
  setForm: (form: DealForm) => void
  onSave: () => void
}) {
  const updatePartner = (index: number, patch: Partial<DealPartner>) => {
    setForm({
      ...form,
      partners: form.partners.map((partner, partnerIndex) => partnerIndex === index ? { ...partner, ...patch } : partner),
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="modal-content deal-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Deal Finance</h2>
              <button className="btn btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <div className="form-row">
              <div className="form-group"><label className="form-label">Deal Name</label><input className="input-glass" value={form.dealName} onChange={(event) => setForm({ ...form, dealName: event.target.value })} placeholder="Battery lot with partner, brokerage lead" /></div>
              <div className="form-group"><label className="form-label">Deal Type</label><select className="input-glass" value={form.dealType} onChange={(event) => setForm({ ...form, dealType: event.target.value as DealType, fundingSource: event.target.value === 'BROKERAGE' ? 'BROKERAGE_ONLY' : form.fundingSource })}>{Object.entries(DEAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Status</label><select className="input-glass" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option></select></div>
            </div>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Item</label><input className="input-glass" value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Quantity</label><input className="input-glass" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Unit</label><input className="input-glass" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Date</label><input className="input-glass" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            </div>

            <div className="section-divider" />
            <div className="form-row">
              <div className="form-group"><label className="form-label">Purchase Cost</label><input className="input-glass" type="number" value={form.purchaseCost} onChange={(event) => setForm({ ...form, purchaseCost: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Expected Sale</label><input className="input-glass" type="number" value={form.expectedSaleValue} onChange={(event) => setForm({ ...form, expectedSaleValue: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Actual Sale</label><input className="input-glass" type="number" value={form.actualSaleValue} onChange={(event) => setForm({ ...form, actualSaleValue: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Brokerage</label><input className="input-glass" type="number" value={form.brokerageAmount} onChange={(event) => setForm({ ...form, brokerageAmount: event.target.value })} /></div>
            </div>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Funding Source</label><select className="input-glass" value={form.fundingSource} onChange={(event) => setForm({ ...form, fundingSource: event.target.value as FundingSource })}>{Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Own Money</label><input className="input-glass" type="number" value={form.ownMoneyAmount} onChange={(event) => setForm({ ...form, ownMoneyAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Earned Money</label><input className="input-glass" type="number" value={form.earnedMoneyAmount} onChange={(event) => setForm({ ...form, earnedMoneyAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">OD Money</label><input className="input-glass" type="number" value={form.odMoneyAmount} onChange={(event) => setForm({ ...form, odMoneyAmount: event.target.value })} /></div>
            </div>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">OD Converted To Cash</label><input className="input-glass" type="number" value={form.odToCashAmount} onChange={(event) => setForm({ ...form, odToCashAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Partner Money</label><input className="input-glass" type="number" value={form.partnerMoneyAmount} onChange={(event) => setForm({ ...form, partnerMoneyAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Cash Paid</label><input className="input-glass" type="number" value={form.cashPaidAmount} onChange={(event) => setForm({ ...form, cashPaidAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Online Paid</label><input className="input-glass" type="number" value={form.onlinePaidAmount} onChange={(event) => setForm({ ...form, onlinePaidAmount: event.target.value })} /></div>
            </div>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group"><label className="form-label">Cash Received</label><input className="input-glass" type="number" value={form.cashReceivedAmount} onChange={(event) => setForm({ ...form, cashReceivedAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Online Received</label><input className="input-glass" type="number" value={form.onlineReceivedAmount} onChange={(event) => setForm({ ...form, onlineReceivedAmount: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Shown To Party</label><input className="input-glass" value={form.shownToParty} onChange={(event) => setForm({ ...form, shownToParty: event.target.value })} /></div>
              <div className="form-group"><label className="form-label">Buyer Name</label><input className="input-glass" value={form.buyerPartyName} onChange={(event) => setForm({ ...form, buyerPartyName: event.target.value })} /></div>
            </div>

            {form.dealType === 'PARTNERSHIP' && (
              <>
                <div className="section-divider" />
                <div className="deal-partner-header">
                  <p>Partners</p>
                  <button className="btn btn-sm" onClick={() => setForm({ ...form, partners: [...form.partners, emptyPartner()] })}><Plus size={14} /> Add Partner</button>
                </div>
                {form.partners.map((partner, index) => (
                  <div className="deal-partner-grid" key={index}>
                    <input className="input-glass" placeholder="Partner name" value={partner.partnerName} onChange={(event) => updatePartner(index, { partnerName: event.target.value })} />
                    <input className="input-glass" type="number" placeholder="Invested" value={partner.investedAmount} onChange={(event) => updatePartner(index, { investedAmount: event.target.value })} />
                    <input className="input-glass" type="number" placeholder="Share %" value={partner.sharePercent} onChange={(event) => updatePartner(index, { sharePercent: event.target.value })} />
                    <input className="input-glass" type="number" placeholder="Expected return" value={partner.expectedReturn} onChange={(event) => updatePartner(index, { expectedReturn: event.target.value })} />
                  </div>
                ))}
              </>
            )}

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Profit Share Notes</label>
              <textarea className="input-glass" value={form.profitShareNotes} onChange={(event) => setForm({ ...form, profitShareNotes: event.target.value })} />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Notes</label>
              <textarea className="input-glass" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={onSave}>Save Deal</button>
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

function DealTable({ deals, onDelete }: { deals: Deal[]; onDelete: (id: string) => void }) {
  return (
    <div className="glass-card deal-panel">
      <div className="deal-panel-heading">
        <BriefcaseBusiness size={20} color="var(--accent-blue)" />
        <h3>Deal Ledger</h3>
      </div>
      {deals.length === 0 ? (
        <div className="empty-state">
          <Scale className="empty-state-icon" size={46} />
          <div className="empty-state-text">No deals tracked yet</div>
          <div className="empty-state-sub">Add direct, partnership, brokerage, or OD-to-cash deals here</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Type</th>
                <th>Funding</th>
                <th>Cost</th>
                <th>Received</th>
                <th>Result</th>
                <th>Cash Flow</th>
                <th>Risk</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <strong>{deal.dealName}</strong>
                    <div className="deal-table-sub">{deal.itemName} · {new Date(deal.date).toLocaleDateString('en-IN')}</div>
                    {deal.partners.length > 0 && <div className="deal-table-sub">{deal.partners.map((partner) => `${partner.partnerName}: ${fmtRs(partner.investedAmount)}`).join(', ')}</div>}
                  </td>
                  <td><span className="badge badge-blue">{DEAL_LABELS[deal.dealType]}</span></td>
                  <td>{SOURCE_LABELS[deal.fundingSource]}</td>
                  <td>{fmtRs(deal.purchaseCost)}</td>
                  <td>{fmtRs(deal.cashReceivedAmount + deal.onlineReceivedAmount)}</td>
                  <td style={{ color: deal.grossResult >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>{fmtRs(deal.grossResult)}</td>
                  <td>
                    <div className="deal-table-sub">Cash {fmtRs(deal.cashReceivedAmount)}</div>
                    <div className="deal-table-sub">Online {fmtRs(deal.onlineReceivedAmount)}</div>
                  </td>
                  <td><span className="badge" style={{ color: riskColor(deal.risk), background: `${riskColor(deal.risk)}22` }}>{deal.risk}</span></td>
                  <td style={{ minWidth: '260px', color: 'var(--text-secondary)' }}>{deal.insight}</td>
                  <td><button className="btn btn-icon" onClick={() => onDelete(deal.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
