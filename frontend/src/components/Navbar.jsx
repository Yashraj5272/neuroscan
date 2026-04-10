import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { to: '/',        label: 'Home'     },
    { to: '/test',    label: 'Run Test' },
    { to: '/history', label: 'History'  },
  ]

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: scrolled ? 'rgba(8,12,20,0.95)' : 'rgba(8,12,20,0.70)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.3s',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Brain icon SVG */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C9.5 2 7.5 3.8 7.5 6c0 .7.2 1.4.5 2C5.8 8.5 4.5 10.1 4.5 12c0 1.5.7 2.8 1.8 3.7-.2.4-.3.9-.3 1.3 0 1.9 1.5 3 3 3 .4 0 .8-.1 1.2-.2.7.8 1.7 1.2 2.8 1.2s2.1-.4 2.8-1.2c.4.1.8.2 1.2.2 1.5 0 3-1.1 3-3 0-.4-.1-.9-.3-1.3 1.1-.9 1.8-2.2 1.8-3.7 0-1.9-1.3-3.5-3-4 .3-.6.5-1.3.5-2 0-2.2-2-4-4.5-4z"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}>
            Neuro<span style={{ color: 'var(--cyan)' }}>Scan</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(({ to, label }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
                color: active ? 'var(--cyan)' : 'var(--text-secondary)',
                background: active ? 'rgba(56,189,248,0.10)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                {label}
              </Link>
            )
          })}
          <Link to="/test" className="btn btn-primary" style={{ marginLeft: 12, padding: '8px 20px', fontSize: 13 }}>
            Start Screening
          </Link>
        </div>
      </div>
    </nav>
  )
}
