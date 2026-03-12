'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { ShoppingCart, Plus, X, Edit2, Trash2, AlertCircle, Search } from 'lucide-react'

interface Party { id: string; name: string; type: string }
interface Inventory { commodity: string; unit: string }
interface Purchase {
  id: string; commodity: string; unit: string; quantity: string; rate: string
  purchasePrice: string; laborCost: string; transportCost: string; loadingCost: string
  miscOverhead: string; gstPercent: string; gstAmount: string; tcsPercent: string; tcsAmount: string; totalCost: string; date: string; notes: string | null
  party: { name: string }
}

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    id: '', commodity: '', unit: 'KG', quantity: '', rate: '',
    laborCost: '0', transportCost: '0', loadingCost: '0', miscOverhead: '0', gstPercent: '0', tcsPercent: '0',
    partyId: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const resetForm = () => setForm({ 
    id: '', commodity: '', unit: 'KG', quantity: '', rate: '', laborCost: '0', 
    transportCost: '0', loadingCost: '0', miscOverhead: '0', gstPercent: '0', tcsPercent: '0', 
    partyId: '', date: new Date().toISOString().split('T')[0], notes: '' 
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/purchases').then(r => r.json()),
      fetch('/api/parties').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
    ]).then(([p, pa, inv]) => {
      setPurchases(p); setParties(pa.filter((x: Party) => x.type === 'SELLER')); setInventory(inv)
      setLoading(false)
    })
  }, [])

  const handleSubmit = async () => {
    if (!form.commodity || !form.quantity || !form.rate || !form.partyId) return
    const isEdit = !!form.id
    const res = await fetch('/api/purchases', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      const updated = await fetch('/api/purchases').then(r => r.json())
      setPurchases(updated)
      resetForm()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/purchases?id=${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteId(null)
      const updated = await fetch('/api/purchases').then(r => r.json())
      setPurchases(updated)
    }
  }

  const openEdit = (purchase: Purchase) => {
    setForm({
      id: purchase.id,
      commodity: purchase.commodity,
      unit: purchase.unit,
      quantity: purchase.quantity.toString(),
      rate: purchase.rate.toString(),
      laborCost: purchase.laborCost.toString(),
      transportCost: purchase.transportCost.toString(),
      loadingCost: purchase.loadingCost.toString(),
      miscOverhead: purchase.miscOverhead.toString(),
      gstPercent: purchase.gstPercent.toString(),
      tcsPercent: purchase.tcsPercent.toString(),
      partyId: purchase.party.name ? parties.find(p => p.name === purchase.party.name)?.id || '' : '',
      date: new Date(purchase.date).toISOString().split('T')[0],
      notes: purchase.notes || '',
    })
    setShowForm(true)
  }

  const purchasePrice = Number(form.quantity || 0) * Number(form.rate || 0)
  const gstAmount = purchasePrice * (Number(form.gstPercent || 0) / 100)
  const totalCostBeforeTCS = purchasePrice + gstAmount + Number(form.laborCost || 0) + Number(form.transportCost || 0) + Number(form.loadingCost || 0) + Number(form.miscOverhead || 0)
  const tcsAmount = totalCostBeforeTCS * (Number(form.tcsPercent || 0) / 100)
  const totalCost = totalCostBeforeTCS + tcsAmount

  const filteredPurchases = purchases.filter(p => 
    p.party.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Purchases</motion.h1>
            <p className="page-subtitle">Buy batches with full cost attribution</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> New Purchase</button>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input-glass"
            placeholder="Search by seller name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" style={{ maxWidth: '700px' }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{form.id ? 'Edit Purchase' : 'New Purchase'}</h2>
                  <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Commodity</label>
                    <select className="input-glass" value={form.commodity} onChange={(e) => {
                      const inv = inventory.find(i => i.commodity === e.target.value)
                      setForm({ ...form, commodity: e.target.value, unit: inv?.unit || 'KG' })
                    }}>
                      <option value="">Select commodity</option>
                      {inventory.map(inv => <option key={inv.commodity} value={inv.commodity}>{inv.commodity.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Seller</label>
                    <select className="input-glass" value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
                      <option value="">Select seller</option>
                      {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Quantity ({form.unit})</label>
                    <input className="input-glass" type="number" step="0.001" placeholder="0.000" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate (₹/{form.unit})</label>
                    <input className="input-glass" type="number" step="0.01" placeholder="0.00" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="input-glass" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST %</label>
                    <select className="input-glass" value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}>
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">TCS %</label>
                    <select className="input-glass" value={form.tcsPercent} onChange={(e) => setForm({ ...form, tcsPercent: e.target.value })}>
                      <option value="0">0%</option>
                      <option value="0.1">0.1%</option>
                      <option value="1">1%</option>
                    </select>
                  </div>
                </div>

                <div className="section-divider" />
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Cost Attribution</p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Labor Cost (₹)</label>
                    <input className="input-glass" type="number" step="0.01" value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Transport Cost (₹)</label>
                    <input className="input-glass" type="number" step="0.01" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loading/Unloading (₹)</label>
                    <input className="input-glass" type="number" step="0.01" value={form.loadingCost} onChange={(e) => setForm({ ...form, loadingCost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Misc. Overhead (₹)</label>
                    <input className="input-glass" type="number" step="0.01" value={form.miscOverhead} onChange={(e) => setForm({ ...form, miscOverhead: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(68,138,255,0.06)', border: '1px solid rgba(68,138,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Purchase Price {gstAmount > 0 && `+ GST (₹${formatNumber(gstAmount)})`} {tcsAmount > 0 && `+ TCS (₹${formatNumber(tcsAmount)})`}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{formatNumber(purchasePrice + gstAmount + tcsAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Cost (incl. all)</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-blue)' }}>₹{formatNumber(totalCost)}</div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="input-glass" placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmit}>{form.id ? 'Save Changes' : 'Record Purchase'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteId && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)}>
              <motion.div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <AlertCircle size={48} color="var(--accent-red)" style={{ margin: '0 auto 16px' }} />
                <h2 className="modal-title" style={{ justifyContent: 'center' }}>Delete Purchase?</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Deleting this purchase will NOT automatically adjust your inventory WAC backwards. You may need to manually verify inventory counts. Are you sure?
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn" onClick={() => setDeleteId(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ background: 'var(--accent-red)' }} onClick={handleDelete}>Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="shimmer" style={{ height: '300px' }} />
        ) : purchases.length === 0 ? (
          <div className="glass-card empty-state">
            <ShoppingCart className="empty-state-icon" size={48} />
            <div className="empty-state-text">No purchases recorded</div>
            <div className="empty-state-sub">Create your first purchase to build inventory</div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="glass-card empty-state">
            <Search className="empty-state-icon" size={48} style={{ opacity: 0.5 }} />
            <div className="empty-state-text">No results found</div>
            <div className="empty-state-sub">No seller matches "{searchQuery}"</div>
          </div>
        ) : (
          <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Commodity</th><th>Qty</th><th>Rate</th><th>Purchase ₹</th>
                  <th>GST</th><th>TCS</th><th>Attributed Cost</th><th>Total Cost</th><th>Seller</th><th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td><span className="badge badge-blue">{p.commodity.replace('_', ' ')}</span></td>
                    <td>{formatNumber(Number(p.quantity))} {p.unit}</td>
                    <td>₹{formatNumber(Number(p.rate))}</td>
                    <td>₹{formatNumber(Number(p.purchasePrice))}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{Number(p.gstPercent) > 0 ? `${p.gstPercent}% (₹${formatNumber(Number(p.gstAmount))})` : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{Number(p.tcsPercent) > 0 ? `${p.tcsPercent}% (₹${formatNumber(Number(p.tcsAmount))})` : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹{formatNumber(Number(p.laborCost) + Number(p.transportCost) + Number(p.loadingCost) + Number(p.miscOverhead))}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>₹{formatNumber(Number(p.totalCost))}</td>
                    <td>{p.party.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-icon" onClick={() => openEdit(p)} style={{ width: '28px', height: '28px' }}><Edit2 size={14} /></button>
                        <button className="btn btn-icon" onClick={() => setDeleteId(p.id)} style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  )
}
