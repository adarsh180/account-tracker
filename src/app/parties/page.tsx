'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Users, Plus, X, Phone, MapPin, Edit2, Trash2, AlertCircle } from 'lucide-react'

interface Party {
  id: string; name: string; type: string; phone: string | null
  address: string | null; gstNumber: string | null; paymentTerms: number
  _count: { purchases: number; sales: number; payments: number }
}

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'BUYER' | 'SELLER'>('ALL')
  const [form, setForm] = useState({
    id: '', name: '', type: 'BUYER', phone: '', address: '', gstNumber: '', paymentTerms: '0',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const resetForm = () => setForm({ id: '', name: '', type: 'BUYER', phone: '', address: '', gstNumber: '', paymentTerms: '0' })

  const fetchParties = async () => {
    const res = await fetch('/api/parties')
    if (res.ok) setParties(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchParties() }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    const isEdit = !!form.id
    const res = await fetch('/api/parties', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, paymentTerms: Number(form.paymentTerms) }),
    })
    if (res.ok) {
      setShowForm(false)
      fetchParties()
      resetForm()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/parties?id=${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteId(null)
      fetchParties()
    }
  }

  const openEdit = (party: Party) => {
    setForm({
      id: party.id,
      name: party.name,
      type: party.type,
      phone: party.phone || '',
      address: party.address || '',
      gstNumber: party.gstNumber || '',
      paymentTerms: party.paymentTerms.toString(),
    })
    setShowForm(true)
  }

  const filtered = filter === 'ALL' ? parties : parties.filter(p => p.type === filter)

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Parties</motion.h1>
            <p className="page-subtitle">Manage buyers & sellers</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Party</button>
        </div>

        {/* Filter tabs */}
        <div className="tab-group" style={{ marginBottom: '20px', display: 'inline-flex' }}>
          {(['ALL', 'BUYER', 'SELLER'] as const).map(t => (
            <button key={t} className={`tab-item ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'ALL' ? 'All' : t === 'BUYER' ? 'Buyers' : 'Sellers'}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{form.id ? 'Edit Party' : 'Add Party'}</h2>
                  <button className="btn btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="input-glass" placeholder="Party name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="input-glass" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="BUYER">Buyer</option>
                      <option value="SELLER">Seller</option>
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="input-glass" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input className="input-glass" placeholder="Optional" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Terms (days)</label>
                    <input className="input-glass" type="number" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Address</label>
                  <textarea className="input-glass" placeholder="Full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmit}>{form.id ? 'Save Changes' : 'Add Party'}</button>
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
                <h2 className="modal-title" style={{ justifyContent: 'center' }}>Delete Party?</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Are you sure you want to delete this party? This action cannot be undone.
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
          <div className="stats-grid">{[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: '140px' }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card empty-state">
            <Users className="empty-state-icon" size={48} />
            <div className="empty-state-text">No parties found</div>
            <div className="empty-state-sub">Add buyers and sellers to get started</div>
          </div>
        ) : (
          <div className="stats-grid">
            {filtered.map((party, i) => (
              <motion.div key={party.id} className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'inline-block', marginRight: '8px' }}>{party.name}</h3>
                    <span className={`badge ${party.type === 'BUYER' ? 'badge-green' : 'badge-amber'}`}>{party.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-icon" onClick={() => openEdit(party)} style={{ width: '28px', height: '28px' }}><Edit2 size={14} /></button>
                    {party._count.sales === 0 && party._count.purchases === 0 && (
                      <button className="btn btn-icon" onClick={() => setDeleteId(party.id)} style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                {party.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}><Phone size={12} />{party.phone}</div>}
                {party.address && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '4px' }}><MapPin size={12} />{party.address}</div>}
                <div className="section-divider" style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  <div><span style={{ color: 'var(--text-tertiary)' }}>Purchases:</span> <strong>{party._count.purchases}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)' }}>Sales:</span> <strong>{party._count.sales}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)' }}>Terms:</span> <strong>{party.paymentTerms}d</strong></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
