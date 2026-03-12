'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Mail, KeyRound, AlertTriangle, ArrowRight, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locked, setLocked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        if (res.error.includes('SYSTEM_LOCKED')) {
          setLocked(true)
          setError('System is emergency locked. Contact administrator.')
        } else {
          setError('Invalid credentials')
        }
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(68,138,255,0.08) 0%, transparent 70%)',
        top: '10%',
        left: '20%',
        pointerEvents: 'none',
        animation: 'bgDrift 20s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(179,136,255,0.06) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none',
        animation: 'bgDrift 25s ease-in-out infinite alternate-reverse',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '0 20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="glass-card iridescent-border" style={{ padding: '48px 40px' }}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ textAlign: 'center', marginBottom: '40px' }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(68,138,255,0.2), rgba(179,136,255,0.15))',
              border: '1px solid rgba(68,138,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Shield size={28} color="var(--accent-blue)" />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Scrap-Trade Executive
            </h1>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              marginTop: '6px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Industrial Ledger System
            </p>
          </motion.div>

          <AnimatePresence>
            {locked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'var(--accent-red-dim)',
                  border: '1px solid rgba(255,68,68,0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} color="var(--accent-red)" />
                <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>
                  System is emergency locked
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="form-group"
              style={{ marginBottom: '16px' }}
            >
              <label className="form-label">
                <Mail size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Email
              </label>
              <input
                type="email"
                className="input-glass"
                placeholder="admin@scraptrade.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="form-group"
              style={{ marginBottom: '24px' }}
            >
              <label className="form-label">
                <KeyRound size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Password
              </label>
              <input
                type="password"
                className="input-glass"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </motion.div>

            <AnimatePresence>
              {error && !locked && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--accent-red-dim)',
                    border: '1px solid rgba(255,68,68,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    color: 'var(--accent-red)',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loading ? (
                <motion.div
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <Lock size={16} />
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <p style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
          }}>
            Secured system · Single admin access · v1.0
          </p>
        </div>
      </motion.div>
    </div>
  )
}
