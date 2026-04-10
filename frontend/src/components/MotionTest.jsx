import React from 'react'
import { useMotionSensor } from '../hooks/useMotionSensor.js'

export default function MotionTest({ onComplete }) {
  const {
    phase, timeLeft, features, liveData, startCapture, skip, reset, supported
  } = useMotionSensor(10)

  const handleContinue = () => {
    if (features) onComplete(features)
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Step 2 — Motion & Tremor Detection</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
        Hold your device still for <strong style={{ color: 'var(--cyan)' }}>10 seconds</strong>.
        The gyroscope measures tremor frequency, tremor amplitude, and movement stability.
      </p>

      {!supported && (
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: 'var(--amber)',
        }}>
          ⚠ DeviceMotion API not available in this browser/environment.
          Clicking "Start" will simulate realistic motor feature values.
        </div>
      )}

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '24px 0' }}>
          <button className="btn btn-primary btn-lg" onClick={startCapture}>
            Start Motion Capture
          </button>
          <button className="btn btn-outline btn-lg" onClick={skip}>
            Skip (Simulate)
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Requesting sensor access…</div>
        </div>
      )}

      {/* ── CAPTURING ── */}
      {phase === 'capturing' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div className="mono" style={{ fontSize: 60, color: 'var(--cyan)', fontWeight: 700, lineHeight: 1 }}>
              {timeLeft}s
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Hold perfectly still…</div>
          </div>

          {/* Live sensor bars */}
          <div style={{ maxWidth: 400, margin: '0 auto 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Acceleration (m/s²)', value: liveData.acc, max: 20, color: 'var(--cyan)' },
              { label: 'Rotation Rate (°/s)',  value: liveData.rot, max: 50, color: 'var(--amber)' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="mono" style={{ color }}>{value.toFixed(2)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, (value / max) * 100)}%`,
                    background: color,
                  }} />
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-outline" onClick={skip} style={{ fontSize: 13 }}>
            Stop Early & Use Results
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {(phase === 'done' || phase === 'unsupported') && features && (
        <div>
          <div style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
              ✓ Motion Captured {features.simulated ? '(Simulated)' : ''}
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              {[
                ['Tremor Frequency',  `${features.tremor_frequency} Hz`],
                ['Tremor Amplitude',  `${(features.tremor_amplitude * 100).toFixed(1)}%`],
                ['Movement Stability',`${(features.movement_stability * 100).toFixed(1)}%`],
                ['Gyro Variance',      features.gyro_variance],
              ].map(([k, v]) => (
                <div key={k} style={{
                  background: 'var(--bg-mid)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--cyan)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Healthy range — Tremor: &lt;2.5 Hz · Stability: &gt;75% · Gyro variance: &lt;0.20
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleContinue}>Continue →</button>
            <button className="btn btn-outline" onClick={reset}>Redo</button>
          </div>
        </div>
      )}
    </div>
  )
}
