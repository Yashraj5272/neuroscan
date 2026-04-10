import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { healthCheck, getMetrics } from '../utils/api.js'

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
    title: 'Finger Tapping Test',
    desc: 'Tap speed, rhythm consistency and interval variation — primary Parkinson\'s motor biomarkers.',
    color: '#38bdf8',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: 'Motion & Tremor Analysis',
    desc: 'Gyroscope-based tremor frequency (4–8 Hz PD range) and movement stability scoring.',
    color: '#a78bfa',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 2-8 4v1h16v-1c0-2-2-4-8-4z"/>
      </svg>
    ),
    title: 'Facial Expression Analysis',
    desc: 'Webcam-based eye blink rate and facial mobility. Masked face is a key PD indicator.',
    color: '#34d399',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
    title: 'Symptom Questionnaire',
    desc: '10-question validated inventory across motor, postural and non-motor PD indicators.',
    color: '#fbbf24',
  },
]

const HOW_STEPS = [
  { n: '01', title: 'Finger Tapping',   desc: 'Tap a button for 15 seconds to measure motor timing.' },
  { n: '02', title: 'Motion Capture',   desc: 'Hold still for 10s — gyroscope detects tremor signals.' },
  { n: '03', title: 'Face Camera',      desc: 'Look at camera for 15s — blink rate + expression measured.' },
  { n: '04', title: 'Questionnaire',    desc: 'Answer 10 symptom questions about the last 3 months.' },
  { n: '05', title: 'ML Prediction',    desc: 'Ensemble RF + SVM outputs prediction + confidence score.' },
]

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState(null)
  const [metrics,   setMetrics]   = useState(null)

  useEffect(() => {
    healthCheck().then(setApiStatus)
    getMetrics().then(setMetrics).catch(() => {})
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* ── HERO ── */}
      <div className="fade-up" style={{ textAlign: 'center', padding: '60px 0 48px' }}>
        <span className="badge badge-cyan" style={{ marginBottom: 20 }}>
          Early Detection System — Educational Use Only
        </span>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', marginBottom: 20, lineHeight: 1.1 }}>
          AI-Powered<br />
          <span className="gradient-text">Parkinson's Detection</span>
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 17,
          maxWidth: 580,
          margin: '0 auto 36px',
          lineHeight: 1.75,
        }}>
          Multi-modal early screening combining motor tests, motion sensors,
          facial analysis and symptom history — analysed by a trained ensemble
          ML model in seconds.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/test" className="btn btn-primary btn-lg">
            Begin Screening →
          </Link>
          <a href="#how-it-works" className="btn btn-outline btn-lg">
            How It Works
          </a>
        </div>
      </div>

      {/* ── API STATUS BAR ── */}
      {apiStatus && (
        <div className="card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 44,
          padding: '14px 22px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="pulse-dot" style={{
              background: apiStatus.models_loaded ? 'var(--green)' : 'var(--red)',
            }} />
            <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              API {apiStatus.models_loaded ? 'Online · Models Loaded' : 'Offline — start Flask backend'}
            </span>
          </div>
          {metrics && (
            <>
              <span style={{ color: 'var(--border)', fontSize: 18 }}>·</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                RF: <span style={{ color: 'var(--cyan)' }}>{(metrics.rf_accuracy * 100).toFixed(1)}%</span>
              </span>
              <span style={{ color: 'var(--border)', fontSize: 18 }}>·</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                SVM: <span style={{ color: 'var(--cyan)' }}>{(metrics.svm_accuracy * 100).toFixed(1)}%</span>
              </span>
              <span style={{ color: 'var(--border)', fontSize: 18 }}>·</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                AUC: <span style={{ color: 'var(--cyan)' }}>{metrics.rf_auc}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* ── FEATURE CARDS ── */}
      <div className="grid-2" style={{ marginBottom: 64 }}>
        {FEATURES.map((f, i) => (
          <div key={i} className="card fade-up" style={{
            display: 'flex',
            gap: 18,
            alignItems: 'flex-start',
            animationDelay: `${i * 0.07}s`,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              flexShrink: 0,
              background: `${f.color}18`,
              border: `1px solid ${f.color}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: f.color,
            }}>
              {f.icon}
            </div>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <div id="how-it-works" style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 26, marginBottom: 8, textAlign: 'center' }}>How It Works</h2>
        <p style={{
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: 40,
          fontSize: 14,
          maxWidth: 480,
          margin: '0 auto 40px',
        }}>
          Five steps, around five minutes. All signals are merged into one feature vector
          and analysed by the ensemble model.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {HOW_STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'var(--bg-card2)',
                  border: '2px solid var(--border-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--cyan)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {s.n}
                </div>
                {i < HOW_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    width: 2,
                    minHeight: 28,
                    background: 'linear-gradient(var(--border-glow), var(--border))',
                  }} />
                )}
              </div>
              <div style={{ paddingBottom: 24, paddingLeft: 16, paddingTop: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{s.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="card" style={{
        textAlign: 'center',
        padding: '48px 32px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(167,139,250,0.06))',
        borderColor: 'var(--border-glow)',
      }}>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Ready to Begin?</h2>
        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: 28,
          maxWidth: 400,
          margin: '0 auto 28px',
          fontSize: 14,
          lineHeight: 1.7,
        }}>
          The full test takes approximately 5 minutes. Results are instant and saved locally.
        </p>
        <Link to="/test" className="btn btn-primary btn-lg">
          Start Screening Now →
        </Link>
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          ⚠ For educational purposes only. Not a medical diagnosis.
        </p>
      </div>

    </div>
  )
}
