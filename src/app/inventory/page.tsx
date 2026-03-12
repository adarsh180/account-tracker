'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Package, Plus, X } from 'lucide-react'

interface InventoryItem {
  id: string
  commodity: string
  unit: string
  quantity: number
  avgCost: number
  lastUpdated: string
}

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCommodity, setNewCommodity] = useState('')
  const [newUnit, setNewUnit] = useState('KG')

  const fetchItems = async () => {
    const res = await fetch('/api/inventory')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const addCommodity = async () => {
    if (!newCommodity.trim()) return
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commodity: newCommodity.trim().replace(/\s+/g, '_'), unit: newUnit }),
    })
    if (res.ok) {
      setNewCommodity('')
      setShowAdd(false)
      fetchItems()
    }
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Inventory</motion.h1>
            <p className="page-subtitle">Current stock levels & weighted average costs</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Commodity
          </button>
        </div>

        {/* Quick Add Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Quick Add Commodity</h2>
                  <button className="btn btn-icon" onClick={() => setShowAdd(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Commodity Name</label>
                    <input className="input-glass" placeholder="e.g. Zinc, Lead" value={newCommodity} onChange={(e) => setNewCommodity(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="input-glass" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                      <option value="KG">KG</option>
                      <option value="MT">Metric Tonnes</option>
                      <option value="PCS">Pieces</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addCommodity}>Add Commodity</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="stats-grid">{[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: '160px' }} />)}</div>
        ) : items.length === 0 ? (
          <div className="glass-card empty-state">
            <Package className="empty-state-icon" size={48} />
            <div className="empty-state-text">No inventory items</div>
            <div className="empty-state-sub">Add a commodity or create a purchase to build inventory</div>
          </div>
        ) : (
          <div className="stats-grid">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                className="glass-card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span className="badge badge-blue">{item.commodity.replace('_', ' ')}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.unit}</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {formatNumber(Number(item.quantity))}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  WAC: ₹{formatNumber(Number(item.avgCost))} / {item.unit}
                </div>
                <div className="section-divider" style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total Value</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    ₹{formatNumber(Number(item.quantity) * Number(item.avgCost))}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
