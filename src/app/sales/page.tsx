'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { TrendingUp, Plus, X, Edit2, Trash2, AlertCircle, Search, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Party { id: string; name: string; type: string }
interface Inventory { commodity: string; unit: string }
interface Purchase { id: string; commodity: string; quantity: string; totalCost: string; batchId?: string; party: { name: string } }
interface Sale {
  id: string; commodity: string; unit: string; quantity: string; rate: string
  gstPercent: string; gstAmount: string; totalAmount: string; bankAmount: string; cashAmount: string; date: string; notes: string | null; sourceCommodity: string | null
  party: { name: string }; isPaid: boolean; purchaseId: string | null; batchId: string | null
}

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    id: '', commodity: '', sourceCommodity: '', unit: 'KG', quantity: '', rate: '', gstPercent: '0', bankAmount: '',
    partyId: '', purchaseId: '', batchId: '', date: new Date().toISOString().split('T')[0], notes: '',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const resetForm = () => setForm({
    id: '', commodity: '', sourceCommodity: '', unit: 'KG', quantity: '', rate: '', gstPercent: '0', bankAmount: '',
    partyId: '', purchaseId: '', batchId: '', date: new Date().toISOString().split('T')[0], notes: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/parties').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
      fetch('/api/purchases').then(r => r.json()),
    ]).then(([s, pa, inv, pu]) => {
      setSales(s); setParties(pa.filter((x: Party) => x.type === 'BUYER')); setInventory(inv); setPurchases(pu)
      setLoading(false)
    })
  }, [])

  const quantity = Number(form.quantity || 0)
  const rate = Number(form.rate || 0)
  const gstPercent = Number(form.gstPercent || 0)
  const salePrice = quantity * rate
  const gstAmount = salePrice * (gstPercent / 100)
  const totalAmount = salePrice + gstAmount
  
  const bankAmount = Number(form.bankAmount || 0)
  const cashAmount = Math.max(0, totalAmount - bankAmount)
  const bankPercent = totalAmount > 0 ? (bankAmount / totalAmount) * 100 : 0

  const handleSubmit = async () => {
    if (!form.commodity || !form.quantity || !form.rate || !form.partyId) return
    const isEdit = !!form.id
    const res = await fetch('/api/sales', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, bankAmount }),
    })
    if (res.ok) {
      setShowForm(false)
      const updated = await fetch('/api/sales').then(r => r.json())
      setSales(updated)
      resetForm()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/sales?id=${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteId(null)
      const updated = await fetch('/api/sales').then(r => r.json())
      setSales(updated)
    }
  }

  const openEdit = (sale: Sale) => {
    setForm({
      id: sale.id,
      commodity: sale.commodity,
      unit: sale.unit,
      quantity: sale.quantity.toString(),
      rate: sale.rate.toString(),
      gstPercent: sale.gstPercent.toString(),
      bankAmount: sale.bankAmount.toString(),
      partyId: sale.party.name ? parties.find(p => p.name === sale.party.name)?.id || '' : '',
      purchaseId: sale.purchaseId || '',
      batchId: sale.batchId || '',
      sourceCommodity: sale.sourceCommodity || '',
      date: new Date(sale.date).toISOString().split('T')[0],
      notes: sale.notes || '',
    })
    setShowForm(true)
  }

  const filteredSales = sales.filter(s => 
    s.party.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const generateInvoicePDF = (sale: Sale) => {
    const doc = new jsPDF()

    // Base64 Logo (Same as the one initialized in Phase 11)
    const logoBase64 = 'data:image/png;base64,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R2pW7dEa5wI/vPfee3e/+OKL+3x/vD/uO3h8fHzS18+12s4L55vPq0c///zzF0+fPv38qVOnnvd1i3A9I9Qk/qD24+HjZWVlbWZmZk3t705PT6/x9xVeu5/G61rEw//jY9+8ebPF++vExEQH14fP1yM/kce18h5/L/cK3vR1v8fr2iV84b+fL7t87S+8/fbbn62srHzY0Y1Hjx79oFKp/Kh/H+d/Tbzf/e233z4v+/u99+Z/V03k91iLz4s2q62p/z1b1rZ8A+/d10/fH9R2d/v307r++1l5v9tV/13i/a1/P01NTT23sLCwtb29vYTrJt9Yt1N7/1779vXr128fPnz4u1ar9avWw60//fTTr8+dO/fn5cuXf2K98/o29Uf/X/R78ffl883Nzbv8/X6uozLz2X5YhB9Y7/A1I/x93881q2Xv8/v7KysrH9+6deskL+yDfn38nB96w8vS61dG08w43T/eA0+v2v/P71+9fKjffL2B0sZ43/Wv44O4P13U3n7973y5vR5c+76wU4+r/721tbUr77zzzp8PHjz4R29h7Xy+tbm5uceH2q+jNvxzU/H6I/g8b067+g2Z/r/hNdbT2eG91P2e1n59/hX69/d5//7d1tbW1fX19Z+x1t94A9v7uH/v21kfuPf+fK4A8W5cI//888+H4/q+x4+D75Z16f6/Y/4//IeHhy/Nzs4unT//R2l84/H3x/783Llzb2i2u/Bvf/HixTfm5ubmPnj//ZeXFxdv8DfjX3nzzTdfZ703uW4y2y0XFha28bnv6zO+z93Xerl48eL2tWvXrtZqtatLS0vL+Lz3p0y+/8bKyspHjUbj2s7Ozv1n1f8e12u+Z6zP+L4V6yIvvvji2++9885bt27desm/P79Q+/d574nfeF7GZ1d+/fXXv/zggw/+6v8ffvvtN+/wefnHxcXFG9evX/+g7N7+253+Y1544YW3Njc3/Xz3gP+u8PfwMhfnR72R/xU+4z1j78r0eH2N6D0j9vffb7zxxm+vXbv2x9mzZzepR2ZzWz4T3uK9nF566aX36H+12t9H7x/e119//b0K+46vR+Tf/fOfX15aWrpC+1q+3r1794G/l7l3794j3ndWbX9269atN2k/n9t/79y5I4tG29iP1z/++OOjR6r98/uSfvPNN//Qj88XmN9s2y8Zp/s57Pfff3/r1q1bL/DDr/X2/pP6v6vU/Xb17x84fXh4WF25cuXDq1evfqR2H/TfD+K176/fffHFFx/ydbfe/BuvffjL1atXv1tbW9uq1Wrr/v+jvvXWWysv/f575c0//vgj8++u6k8P1L/y3Ww2H2D9M99H1/n0/35//PHH+S+rff6+9/eDBw8q9K9S99v4+yX171/Xrl377MqVK38wA8+lT1u7sP7z19bWPv/www//xPvB1/g/SdfZvnX9+vU/eD3+0Zvn+nB58O//z5n/xN/179m+d++e/x4YJ6T7Q+f+/fvZ+B/9L//J2+zP2Wwz9+7dy8bnZ//I6bS9/T7K9fve1r5f75eB9eD+0r65u7u7t72/n/k/S4zPT/7H1y0+U3+j7Sze21uI/d3oH/d2d3aO+n+3/f/sR2k/Wk/9n26p/U+1/3+s9/n6h/Hj75fR/1k+uOcfMv1h2//P9g983U9L+8n6vLq/y2+TddnZ2Tr4/LPPPgvbN9iSgUAgEAgEwhAABKFAiEAgQAQiBCAQiEAEEAIQiBAAAIgAAgQgBCAAQAQiEIIAAEAIEIAACAACBAAhAEAABAgAQAACAQAABAAEAEAgkFhACAQAECAEUg1AiEAAACAIBEIAAqFAhAAAQAQEIQQCAEIEQgAAiEAEEIAAAAQIBACEEIAABCBACAEIQgACIAAEYAFAIBACACBAQAAEQhEIAAIhAAQigAABCBEABIEIAYgAQoAACAABABGAAAQiEAIIAAACAQAIBCFAiAAMIEAIBECAQAQAIAIRIBABCEAIBAEAyA4IQQhAAAABAghAABEIASAAQgAAAIAABECIAAgAAhGEIIQAARABEAhEIBACAYAQAEAQAUCIAIAIgECAEIQIRAAAAQIIIEAIQAQAEIQIQKQQgAAEhD0CAYAAIRACQAACAAAEQAgEIkAAQQB2ECAEQiAQAhAAAAhAAIRACAAAQAAIRAACCAABEAAAIAIQIBAAAIQQAgQIQIhAAACICAAAQgiBCIRACAAhAQAQiBCAQAhAEEIEQIQIQAAEIQQQAhGIAACAQCAAEEAAhEAEEQAhBACEAAhACCFAICIEEQgEIUIIEAIQhBACgAgBCBCAEAJCIEQQIAQgCEKAAAEAIwAhAhEAAIQIQAQgBIIQgkAEACBCBEIEQiAgAEIEIEQgAAEAQEIEEAgRAlACAgEgEIUQgAABADsgRAQAIxABEEIIIQhEIBCIAAIAIAIBEAIQCEQAiEAgQAQgAhGACAQCERABABEAIAIIABCBAAhCBAAiAEIEIAIBEAACAwRABEIQAACEEACIQIAIgBCAEEKEYAQIEQAEIBCEQQQQIQgAEG9AEAgAAIBwICIAAIBABCCEEIAQiEAgBCKEAgQQEIAQAUCIAIBACEAAAAIBCIEAIgAQIAQgBIAQCAQCAQAAQSAEIQCIEAEAgAABECIAEEIIEIhAIBARAhACEQiBQAAAgBBEEIAAAAhACCACQAARIAAAEIhAIAIgEIEEBAKhhEAgAABAABGCQAQBIRAICAQIQIhEIBAIhAAAIIAEEAggkIEQCAQiBAIQAARAhAAAQAACEQAAAgCCEAIAEBECQQCAEIQAAEAQAQgEEAIQgEAAQAQhRAAChBBEAERABAJCEAAhQAQAIwAAgQgBQoAABEAIAaAQAAKhhEAEEIEIQQjEAwIEQAQgRCBCBAJBhEAIRAgBABACAAARiAAIQSCEEIAIAECAEQIQiADiRCAQCIRAIBAIhPj/F+7a70i+3hP0AAAAAElFTkSuQmCC'

    // Document Titles
    doc.setFontSize(22)
    doc.text('INVOICE', 14, 25)
    
    // Attempting to add the image explicitly with proper bounds.
    // Ensure base64 isn't corrupt and format matches
    ;(doc as any).addImage({
      imageData: logoBase64,
      format: 'PNG',
      x: 155,
      y: 10,
      w: 40,
      h: 12
    })

    // Sub-header details
    doc.setFontSize(10)
    doc.text(`Invoice ID: #INV-${sale.id.slice(0, 8).toUpperCase()}`, 14, 38)
    doc.text(`Date: ${new Date(sale.date).toLocaleDateString('en-IN')}`, 14, 44)
    doc.text(`Supplier: RISS (Royal Iron Steel Supply)`, 14, 50)
    doc.text(`Buyer: ${sale.party.name}`, 14, 56)

    // Define table columns and rows
    const tableColumns = ['Commodity', 'Batch ID', 'Quantity', 'Rate', 'GST %', 'Total Amount']
    const tableRows = [
      [
        sale.commodity.replace('_', ' '),
        sale.batchId || '—',
        `${formatNumber(Number(sale.quantity))} ${sale.unit}`,
        `Rs. ${formatNumber(Number(sale.rate))}`,
        `${sale.gstPercent}%`,
        `Rs. ${formatNumber(Number(sale.totalAmount))}`,
      ]
    ]

    // Render Table
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 65,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
    })

    const finalY = (doc as any).lastAutoTable.finalY || 80

    // Payment Summary Section
    const bankAmt = Number(sale.bankAmount)
    const paidAmt = sale.isPaid ? Number(sale.totalAmount) : (sale as any).payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    const balance = Number(sale.totalAmount) - paidAmt

    doc.setFontSize(11)
    doc.text(`Total Sale Value: Rs. ${formatNumber(Number(sale.totalAmount))}`, 14, finalY + 15)
    doc.text(`Payment Through Bank: Rs. ${formatNumber(bankAmt)}`, 14, finalY + 22)
    
    doc.setFontSize(12)
    doc.text(`Amount Received: Rs. ${formatNumber(paidAmt)}`, 14, finalY + 34)
    if (balance > 0) {
      doc.setTextColor(220, 53, 69)
      doc.text(`Balance Due: Rs. ${formatNumber(balance)}`, 14, finalY + 41)
    } else {
      doc.setTextColor(40, 167, 69)
      doc.text(`Status: FULLY PAID`, 14, finalY + 41)
    }

    // Add faint watermark centered on the page
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
    // A4 width ~210, height ~297. Image ~100x30
    doc.addImage(logoBase64, 'PNG', 55, 130, 100, 30)
    
    // Save PDF
    doc.save(`Invoice_${sale.party.name}_${new Date(sale.date).toISOString().split('T')[0]}.pdf`)
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Sales</motion.h1>
            <p className="page-subtitle">Split-profit transaction engine · Bank & Cash</p>
          </div>
          <button className="btn btn-success" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> New Sale</button>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input-glass"
            placeholder="Search by buyer name..."
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
                  <h2 className="modal-title">{form.id ? 'Edit Sale' : 'New Sale'}</h2>
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
                    <label className="form-label">Extracted From (Bulk Commodity)</label>
                    <select className="input-glass" value={form.sourceCommodity} onChange={(e) => setForm({ ...form, sourceCommodity: e.target.value })}>
                      <option value="">None (Standalone Box)</option>
                      {inventory.filter(i => i.commodity !== form.commodity).map(inv => (
                        <option key={inv.commodity} value={inv.commodity}>{inv.commodity.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Buyer</label>
                    <select className="input-glass" value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
                      <option value="">Select buyer</option>
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
                </div>

                {/* Link to purchase */}
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Link to Purchase Batch (optional)</label>
                  <select className="input-glass" value={form.purchaseId} onChange={(e) => {
                    const linkedPurchase = purchases.find(p => p.id === e.target.value)
                    setForm({ ...form, purchaseId: e.target.value, batchId: linkedPurchase?.batchId || '' })
                  }}>
                    <option value="">Use WAC (no specific batch)</option>
                    {purchases.filter(p => p.commodity === form.commodity).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.batchId ? `[${p.batchId}] ` : ''}{p.party.name} - {formatNumber(Number(p.quantity))} @ ₹{formatNumber(Number(p.totalCost))}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Split-Profit Panel */}
                <div className="section-divider" />
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Split-Profit Engine</p>

                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                    Bank Amount (₹) — visible to financial institutions
                  </label>
                  <input
                    className="input-glass"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.bankAmount}
                    onChange={(e) => setForm({ ...form, bankAmount: e.target.value })}
                    max={totalAmount}
                  />
                </div>

                {/* Visual Split */}
                <div style={{ height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', display: 'flex', marginBottom: '8px' }}>
                  <motion.div
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), rgba(68,138,255,0.6))' }}
                    animate={{ width: `${bankPercent}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                  <motion.div
                    style={{ height: '100%', background: 'linear-gradient(90deg, rgba(0,230,118,0.6), var(--accent-green))' }}
                    animate={{ width: `${100 - bankPercent}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total {gstAmount > 0 ? `(w/ GST)` : ''}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{formatNumber(totalAmount)}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(68,138,255,0.06)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>Bank</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-blue)' }}>₹{formatNumber(bankAmount)}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(0,230,118,0.06)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--accent-green)' }}>Cash</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)' }}>₹{formatNumber(cashAmount)}</div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="input-glass" placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-success" onClick={handleSubmit}>{form.id ? 'Save Changes' : 'Record Sale'}</button>
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
                <h2 className="modal-title" style={{ justifyContent: 'center' }}>Delete Sale?</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Are you sure you want to delete this sale? Note: this will NOT automatically restore inventory. You might need to adjust inventory counts.
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
        ) : sales.length === 0 ? (
          <div className="glass-card empty-state">
            <TrendingUp className="empty-state-icon" size={48} />
            <div className="empty-state-text">No sales recorded</div>
            <div className="empty-state-sub">Create your first sale to start tracking profits</div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="glass-card empty-state">
            <Search className="empty-state-icon" size={48} style={{ opacity: 0.5 }} />
            <div className="empty-state-text">No results found</div>
            <div className="empty-state-sub">No buyer matches "{searchQuery}"</div>
          </div>
        ) : (
          <motion.div className="glass-card" style={{ padding: '4px 0', overflow: 'auto' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch ID</th><th>Date</th><th>Commodity</th><th>Qty</th><th>Rate</th><th>GST</th>
                  <th>Total</th><th>Bank</th><th>Cash</th><th>Buyer</th><th>Status</th><th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      {s.batchId ? (
                        <span style={{ 
                          padding: '4px 8px', 
                          background: 'rgba(68,138,255,0.15)', 
                          color: 'var(--accent-blue)', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 600,
                          fontFamily: 'monospace'
                        }}>
                          {s.batchId}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge badge-green" style={{ width: 'fit-content' }}>{s.commodity.replace('_', ' ')}</span>
                        {s.sourceCommodity && (
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            Extracted: {s.sourceCommodity.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{formatNumber(Number(s.quantity))} {s.unit}</td>
                    <td>₹{formatNumber(Number(s.rate))}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{Number(s.gstPercent) > 0 ? `${s.gstPercent}% (₹${formatNumber(Number(s.gstAmount))})` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{formatNumber(Number(s.totalAmount))}</td>
                    <td style={{ color: 'var(--accent-blue)' }}>₹{formatNumber(Number(s.bankAmount))}</td>
                    <td style={{ color: 'var(--accent-green)' }}>₹{formatNumber(Number(s.cashAmount))}</td>
                    <td>{s.party.name}</td>
                    <td><span className={`badge ${s.isPaid ? 'badge-green' : 'badge-amber'}`}>{s.isPaid ? 'PAID' : 'PENDING'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-icon" onClick={() => generateInvoicePDF(s)} style={{ width: '28px', height: '28px', color: 'var(--accent-blue)' }} title="Download Invoice">
                          <FileText size={14} />
                        </button>
                        <button className="btn btn-icon" onClick={() => openEdit(s)} style={{ width: '28px', height: '28px' }} title="Edit Sale"><Edit2 size={14} /></button>
                        <button className="btn btn-icon" onClick={() => setDeleteId(s.id)} style={{ width: '28px', height: '28px', color: 'var(--accent-red)' }} title="Delete Sale"><Trash2 size={14} /></button>
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
