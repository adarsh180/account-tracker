'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  CreditCard,
  Landmark,
  Brain,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { href: '/sales', label: 'Sales', icon: TrendingUp },
  { href: '/parties', label: 'Parties', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/overdraft', label: 'Overdraft', icon: Landmark },
  { href: '/brain', label: 'Brain', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(68,138,255,0.3), rgba(179,136,255,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={16} color="var(--accent-blue)" />
            </div>
            <div>
              <div className="sidebar-logo">ScrapTrade</div>
              <div className="sidebar-subtitle">Executive Ledger</div>
            </div>
          </div>
        </motion.div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                href={item.href}
                className={isActive ? 'active' : ''}
              >
                <Icon className="nav-icon" size={18} />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,68,68,0.06)',
            border: '1px solid rgba(255,68,68,0.1)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-red)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,68,68,0.12)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,68,68,0.06)'
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
