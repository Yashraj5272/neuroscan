import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, getMetrics } from '../utils/api.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    Promise.all([getHistory(20), getMetrics()])
      .then(([h, m]) => {
        setHistory([...h].reverse())   // newest first
        setMetrics(m)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Prediction History</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14 }}>
        Last 20 screening results stored on the backend server.
      </p>

      {/* ── MODEL METRICS ── */}
      {metrics && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, marginBottom: 18 }}>Trained Model Performance</h3>

          {/* Metric grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}>
            {[
              { label: 'RF Accuracy',  value: `${(metrics.rf_accuracy  * 100).toFixed(1)}%` },
              { label: 'RF AUC',       value: metrics.rf_auc },
              { label: 'RF CV Mean',   value: `${(metrics.rf_cv_mean   * 100).toFixed(1)}%` },
              { label: 'SVM Accuracy', value: `${(metrics.svm_accuracy * 100).toFixed(1)}%` },
              { label: 'SVM AUC',      value: metrics.svm_auc },
              { label: 'SVM CV Mean',  value: `${(metrics.svm_cv_mean  * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--bg-mid)',
                borderRadius: 10,
                padding: '13px 15px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cyan)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Accuracy comparison bar */}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Model Accuracy Comparison
          </div>
          <div style={{ height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                barSize={22}
                data={[
                  { name: 'Random Forest', acc: +(metrics.rf_accuracy  * 100).toFixed(1) },
                  { name: 'SVM (RBF)',     acc: +(metrics.svm_accuracy * 100).toFixed(1) },
                ]}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={105}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={v => [`${v}%`, 'Accuracy']}
                />
                <Bar dataKey="acc" radius={[0, 8, 8, 0]}>
                  <Cell fill="var(--cyan)" />
                  <Cell fill="var(--amber)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          color: 'var(--red)',
          fontSize: 14,
        }}>
          {error} — Make sure Flask backend is running on port 5000.
        </div>
      )}

      {/* ── HISTORY LIST ── */}
      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🧠</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: 14 }}>
            No prediction history yet. Run your first screening.
          </p>
          <Link to="/test" className="btn btn-primary">Start Screening</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((item, i) => {
            const r    = item.result
            const isPD = r?.prediction === 1
            const col  = isPD ? 'var(--red)' : 'var(--green)'
            const date = new Date(item.timestamp * 1000).toLocaleString()

            return (
              <div key={i} className="card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '15px 20px',
                flexWrap: 'wrap',
              }}>
                {/* Status dot */}
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: col,
                  boxShadow: `0 0 8px ${col}`,
                }} />

                {/* Label + date */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600, color: col, marginBottom: 2, fontSize: 15 }}>
                    {r?.label || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date}</div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    ['Confidence', `${r?.confidence?.toFixed(1) ?? '—'}%`, col],
                    ['Risk',       r?.risk_level ?? '—', 'var(--cyan)'],
                    ['Score',      r?.overall_risk_score ?? '—', 'var(--text-secondary)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ textAlign: 'center' }}>
                      <div className="mono" style={{ fontSize: 17, color: c, fontWeight: 700 }}>{v}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
