'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Landmark, Plus, X, ArrowUp, ArrowDown } from 'lucide-react'

interface ODAccount {
  id: string; bankName: string; odLimit: string; currentUtilized: string
  interestRate: string; pendingInterest: number; dailyInterestBurn: number
  utilizationPercent: number; transactions: Array<{
    id: string; amount: string; type: string; description: string | null; date: string
  }>
}

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function OverdraftPage() {
  const [accounts, setAccounts] = useState<ODAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showTx, setShowTx] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [accountForm, setAccountForm] = useState({ bankName: '', odLimit: '', interestRate: '', currentUtilized: '0' })
  const [txForm, setTxForm] = useState({ amount: '', type: 'DRAW', description: '' })

  const fetchAccounts = async () => {
    const res = await fetch('/api/overdraft')
    if (res.ok) setAccounts(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const addAccount = async () => {
    if (!accountForm.bankName || !accountForm.odLimit || !accountForm.interestRate) return
    await fetch('/api/overdraft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_account', ...accountForm }),
    })
    setShowAdd(false)
    fetchAccounts()
    setAccountForm({ bankName: '', odLimit: '', interestRate: '', currentUtilized: '0' })
  }

  const addTransaction = async () => {
    if (!txForm.amount || !selectedAccount) return
    await fetch('/api/overdraft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transaction', accountId: selectedAccount, ...txForm }),
    })
    setShowTx(false)
    fetchAccounts()
    setTxForm({ amount: '', type: 'DRAW', description: '' })
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Overdraft</motion.h1>
            <p className="page-subtitle">OD account management & interest tracking</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add OD Account</button>
        </div>

        {/* Add Account Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Add OD Account</h2>
                  <button className="btn btn-icon" onClick={() => setShowAdd(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Bank Name</label><input className="input-glass" placeholder="e.g. SBI, HDFC" value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">OD Limit (₹)</label><input className="input-glass" type="number" placeholder="500000" value={accountForm.odLimit} onChange={(e) => setAccountForm({ ...accountForm, odLimit: e.target.value })} /></div>
                </div>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label className="form-label">Interest Rate (% p.a.)</label><input className="input-glass" type="number" step="0.01" placeholder="10.5" value={accountForm.interestRate} onChange={(e) => setAccountForm({ ...accountForm, interestRate: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Current Utilized (₹)</label><input className="input-glass" type="number" value={accountForm.currentUtilized} onChange={(e) => setAccountForm({ ...accountForm, currentUtilized: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addAccount}>Add Account</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Modal */}
        <AnimatePresence>
          {showTx && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTx(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">OD Transaction</h2>
                  <button className="btn btn-icon" onClick={() => setShowTx(false)}><X size={18} /></button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="input-glass" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                      <option value="DRAW">Draw (Utilize)</option>
                      <option value="REPAY">Repay</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Amount (₹)</label><input className="input-glass" type="number" step="0.01" placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Description</label>
                  <input className="input-glass" placeholder="Purpose of transaction" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setShowTx(false)}>Cancel</button>
                  <button className={`btn ${txForm.type === 'DRAW' ? 'btn-danger' : 'btn-success'}`} onClick={addTransaction}>{txForm.type === 'DRAW' ? 'Draw' : 'Repay'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <div className="stats-grid">{[...Array(2)].map((_, i) => <div key={i} className="shimmer" style={{ height: '200px' }} />)}</div> : accounts.length === 0 ? (
          <div className="glass-card empty-state">
            <Landmark className="empty-state-icon" size={48} />
            <div className="empty-state-text">No OD accounts</div>
            <div className="empty-state-sub">Add an overdraft account to track utilization & interest</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {accounts.map((acc, i) => {
              const circumference = 2 * Math.PI * 45
              const strokeOffset = circumference - (circumference * Math.min(acc.utilizationPercent, 100)) / 100
              const color = acc.utilizationPercent > 80 ? 'var(--accent-red)' : acc.utilizationPercent > 60 ? 'var(--accent-amber)' : 'var(--accent-green)'

              return (
                <motion.div key={acc.id} className="glass-card" style={{ padding: '24px' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{acc.bankName}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{Number(acc.interestRate)}% p.a.</span>
                    </div>
                    <button className="btn btn-sm" onClick={() => { setSelectedAccount(acc.id); setShowTx(true) }}><Plus size={14} /> Transaction</button>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                      <svg width="100" height="100" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round" className="gauge-ring" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color }}>{acc.utilizationPercent.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flex: 1 }}>
                      <div><span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Utilized</span><div style={{ fontSize: '18px', fontWeight: 700, color }}>₹{formatNumber(Number(acc.currentUtilized))}</div></div>
                      <div><span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Limit</span><div style={{ fontSize: '18px', fontWeight: 700 }}>₹{formatNumber(Number(acc.odLimit))}</div></div>
                      <div><span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Available</span><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)' }}>₹{formatNumber(Number(acc.odLimit) - Number(acc.currentUtilized))}</div></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', background: 'rgba(255,68,68,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,68,68,0.08)' }}>
                    <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Daily Burns</span><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-red)' }}>₹{formatNumber(acc.dailyInterestBurn)}/day</div></div>
                    <div><span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pending Interest</span><div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-amber)' }}>₹{formatNumber(acc.pendingInterest)}</div></div>
                  </div>

                  {acc.transactions.length > 0 && (
                    <>
                      <div className="section-divider" />
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recent Transactions</h4>
                      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {acc.transactions.slice(0, 10).map(tx => (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tx.type === 'DRAW' ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)' }}>
                                {tx.type === 'DRAW' ? <ArrowUp size={14} color="var(--accent-red)" /> : <ArrowDown size={14} color="var(--accent-green)" />}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{tx.description || tx.type}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(tx.date).toLocaleDateString('en-IN')}</div>
                              </div>
                            </div>
                            <span style={{ fontWeight: 600, color: tx.type === 'DRAW' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                              {tx.type === 'DRAW' ? '+' : '-'}₹{formatNumber(Number(tx.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
