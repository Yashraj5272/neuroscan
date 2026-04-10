import React, { useMemo } from 'react'
import { useTappingTest } from '../hooks/useTappingTest.js'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

export default function TappingTest({ onComplete }) {
  const {
    phase, countdown, timeLeft, taps, features, startTest, recordTap, reset
  } = useTappingTest(15)

  // Build chart data: inter-tap intervals
  const intervalData = useMemo(() => {
    if (taps.length < 2) return []
    return taps.slice(1).map((t, i) => ({
      index: i + 1,
      interval: taps[i + 1] - taps[i],
    }))
  }, [taps])

  const meanInterval = useMemo(() => {
    if (!intervalData.length) return 0
    return Math.round(intervalData.reduce((s, d) => s + d.interval, 0) / intervalData.length)
  }, [intervalData])

  const handleContinue = () => {
    if (features) onComplete(features)
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Step 1 — Finger Tapping Test</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        Tap the button as fast and as regularly as you comfortably can for <strong style={{ color: 'var(--cyan)' }}>15 seconds</strong>.
        This captures your tap speed, rhythm consistency, and motor timing — key early markers of Parkinson's.
      </p>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <button className="btn btn-primary btn-lg" onClick={startTest}>
            ▶ &nbsp;Start Tapping Test
          </button>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{
            fontSize: 96,
            fontFamily: 'var(--font-mono)',
            color: 'var(--cyan)',
            lineHeight: 1,
            fontWeight: 700,
          }}>
            {countdown}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 12, fontSize: 16 }}>
            Get ready to tap…
          </div>
        </div>
      )}

      {/* ── TAPPING ── */}
      {phase === 'tapping' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 52, color: 'var(--cyan)', fontWeight: 700, lineHeight: 1 }}>
              {timeLeft}s
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>remaining</div>
          </div>

          {/* Big tap button */}
          <button
            onPointerDown={e => {
              e.currentTarget.style.transform = 'scale(0.91)'
              e.currentTarget.style.boxShadow = '0 0 16px rgba(56,189,248,0.2)'
              recordTap()
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(56,189,248,0.4)'
            }}
            style={{
              width: 190,
              height: 190,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--cyan) 0%, #0ea5e9 100%)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-deep)',
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              boxShadow: '0 0 40px rgba(56,189,248,0.4)',
              transition: 'transform 0.06s, box-shadow 0.06s',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            TAP
          </button>

          {/* Live stats */}
          <div style={{ marginTop: 24, display: 'flex', gap: 32, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>{taps.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Taps</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: 'var(--cyan)' }}>
                {taps.length > 1 ? ((taps.length - 1) / Math.max(1, 15 - timeLeft)).toFixed(1) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tap/sec</div>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && features && (
        <div>
          {/* Result summary */}
          <div style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
              ✓ Test Complete
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              {[
                ['Tap Speed',       `${features.tap_speed} /s`],
                ['Total Taps',      features.tap_count],
                ['Consistency',     `${(features.tap_consistency * 100).toFixed(1)}%`],
                ['Interval Std Dev',`${features.tap_interval_std} ms`],
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
          </div>

          {/* Interval chart */}
          {intervalData.length > 3 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Inter-tap interval (ms) — flatter = more consistent
              </div>
              <div style={{
                height: 140,
                background: 'var(--bg-mid)',
                borderRadius: 10,
                padding: '10px 8px',
                border: '1px solid var(--border)',
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={intervalData}>
                    <XAxis dataKey="index" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={v => `Tap ${v}`}
                      formatter={v => [`${v} ms`, 'Interval']}
                    />
                    <ReferenceLine y={meanInterval} stroke="rgba(56,189,248,0.3)" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="interval"
                      stroke="var(--cyan)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--cyan)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                Mean interval: {meanInterval} ms
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleContinue}>Continue →</button>
            <button className="btn btn-outline" onClick={reset}>Redo Test</button>
          </div>
        </div>
      )}

      {/* Not enough taps */}
      {phase === 'done' && !features && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--red)', marginBottom: 16 }}>
            Not enough taps recorded (minimum 3 needed). Please try again.
          </p>
          <button className="btn btn-outline" onClick={reset}>Retry</button>
        </div>
      )}
    </div>
  )
}
