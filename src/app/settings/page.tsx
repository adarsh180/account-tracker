'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/AuthLayout'
import { Settings, Shield, Lock, Unlock, AlertTriangle, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const [locked, setLocked] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' })

  useEffect(() => {
    fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    })
      .then(r => r.json())
      .then(data => { setLocked(data.locked); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleLock = async () => {
    if (!locked) {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      })
      if (res.ok) {
        setLocked(true)
        setMessage('🔒 System locked. All access is blocked.')
      }
    } else {
      if (!passphrase) {
        setMessage('Enter recovery passphrase')
        return
      }
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', passphrase }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.error) {
          setMessage('❌ Invalid passphrase')
        } else {
          setLocked(false)
          setPassphrase('')
          setMessage('🔓 System unlocked')
        }
      } else {
        setMessage('❌ Invalid passphrase')
      }
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <AuthLayout>
      <div className="page-container">
        <div className="page-header">
          <motion.h1 className="page-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Settings size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
            Settings
          </motion.h1>
          <p className="page-subtitle">System configuration & security</p>
        </div>

        {/* Emergency Lock */}
        <motion.div
          className="glass-card iridescent-border"
          style={{ padding: '28px', marginBottom: '24px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: locked ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {locked ? <Lock size={22} color="var(--accent-red)" /> : <Shield size={22} color="var(--accent-green)" />}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Emergency Lock</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {locked ? 'System is currently LOCKED. All access is blocked.' : 'System is operational. Lock to block all access immediately.'}
              </p>
            </div>
          </div>

          {locked && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                padding: '14px 16px', background: 'var(--accent-red-dim)',
                border: '1px solid rgba(255,68,68,0.2)', borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
              }}>
                <AlertTriangle size={18} color="var(--accent-red)" />
                <span style={{ fontSize: '13px', color: 'var(--accent-red)', fontWeight: 500 }}>
                  System is locked. Enter recovery passphrase to unlock.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <KeyRound size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Recovery Passphrase
                </label>
                <input
                  className="input-glass"
                  type="password"
                  placeholder="Enter recovery passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            className={`btn ${locked ? 'btn-success' : 'btn-danger'} btn-lg`}
            onClick={toggleLock}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {locked ? <><Unlock size={18} /> Unlock System</> : <><Lock size={18} /> Lock System</>}
          </button>

          {message && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: '12px', fontSize: '13px', textAlign: 'center', color: message.includes('❌') ? 'var(--accent-red)' : 'var(--accent-green)' }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>

        {/* System Info */}
        <motion.div
          className="glass-card"
          style={{ padding: '28px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>System Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Application', value: 'Scrap-Trade Executive v1.0' },
              { label: 'Database', value: 'TiDB Cloud (MySQL)' },
              { label: 'Auth', value: 'NextAuth v5 (Credentials)' },
              { label: 'Framework', value: 'Next.js 16' },
              { label: 'Admin Email', value: 'admin@scraptrade.local' },
              { label: 'Recovery Passphrase', value: 'SCRAP-UNLOCK-2026' },
            ].map(item => (
              <div key={item.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}
