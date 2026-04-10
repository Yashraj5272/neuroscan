import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts'

// Human-readable labels for each ML feature
const FEATURE_LABELS = {
  tap_speed:            'Tap Speed',
  tap_consistency:      'Tap Consistency',
  tap_interval_std:     'Interval Std Dev',
  tap_interval_cv:      'Interval CV',
  tremor_frequency:     'Tremor Frequency',
  tremor_amplitude:     'Tremor Amplitude',
  movement_stability:   'Movement Stability',
  gyro_variance:        'Gyro Variance',
  eye_blink_rate:       'Eye Blink Rate',
  expression_mobility:  'Expression Mobility',
  questionnaire_score:  'Symptom Score',
}

// Feature grouping for per-category bar chart
const CATEGORIES = {
  'Finger Tapping':  ['tap_speed', 'tap_consistency', 'tap_interval_std', 'tap_interval_cv'],
  'Motion / Tremor': ['tremor_frequency', 'tremor_amplitude', 'movement_stability', 'gyro_variance'],
  'Facial Analysis': ['eye_blink_rate', 'expression_mobility'],
  'Questionnaire':   ['questionnaire_score'],
}

// Semicircle confidence gauge
function ConfidenceGauge({ confidence, isParkinson }) {
  const color = isParkinson
    ? (confidence > 70 ? '#f87171' : '#fbbf24')
    : '#34d399'
  // SVG arc: 251 ≈ π × 80 (half circumference of r=80)
  const filled = (confidence / 100) * 251

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 200 110" width="200" style={{ overflow: 'visible' }}>
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="18" strokeLinecap="round" />
        {/* Filled arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none" stroke={color}
          strokeWidth="18" strokeLinecap="round"
          strokeDasharray={`${filled} 251`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)' }}
        />
        {/* Value */}
        <text x="100" y="84" textAnchor="middle"
          fill={color} fontSize="24" fontWeight="700"
          fontFamily="Space Mono, monospace">
          {confidence.toFixed(1)}%
        </text>
        <text x="100" y="100" textAnchor="middle"
          fill="#475569" fontSize="11"
          fontFamily="DM Sans, sans-serif">
          confidence
        </text>
      </svg>
    </div>
  )
}

export default function ResultPage() {
  const navigate = useNavigate()
  const [result,   setResult]   = useState(null)
  const [features, setFeatures] = useState({})

  useEffect(() => {
    const r = sessionStorage.getItem('pd_result')
    const f = sessionStorage.getItem('pd_features')
    if (!r) { navigate('/test'); return }
    setResult(JSON.parse(r))
    if (f) setFeatures(JSON.parse(f))
  }, [navigate])

  if (!result) return null

  const isPD   = result.prediction === 1
  const conf   = result.confidence
  const color  = isPD ? (conf > 70 ? 'var(--red)' : 'var(--amber)') : 'var(--green)'
  const badge  = isPD ? (conf > 70 ? 'badge-red' : 'badge-amber')   : 'badge-green'

  const scores = result.individual_scores || {}

  // Radar chart data (all 11 features)
  const radarData = Object.entries(FEATURE_LABELS).map(([key, label]) => ({
    subject: label,
    risk:    scores[key] ?? 0,
  }))

  // Bar chart data (per category)
  const catData = Object.entries(CATEGORIES).map(([cat, keys]) => {
    const avg = keys.reduce((s, k) => s + (scores[k] ?? 0), 0) / keys.length
    return { name: cat, risk: +avg.toFixed(1) }
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <span className={`badge ${badge}`} style={{ marginBottom: 10 }}>
          {result.risk_level} Risk
        </span>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>Screening Result</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Ensemble Random Forest + SVM · {new Date(result.timestamp * 1000).toLocaleString()}
        </p>
      </div>

      {/* ── MAIN RESULT CARD ── */}
      <div className="card" style={{
        background: `linear-gradient(135deg, ${isPD ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)'} 0%, var(--bg-card) 100%)`,
        borderColor: color.replace('var(--', '').replace(')', '') === 'red'
          ? 'rgba(248,113,113,0.35)'
          : isPD ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.35)',
        marginBottom: 22,
      }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Gauge */}
          <ConfidenceGauge confidence={conf} isParkinson={isPD} />

          {/* Verdict */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{
              fontSize: 28,
              fontWeight: 800,
              color,
              marginBottom: 10,
              fontFamily: 'var(--font-display)',
            }}>
              {result.label}
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              lineHeight: 1.75,
              marginBottom: 18,
            }}>
              {isPD
                ? `Signs consistent with early Parkinson's disease were detected with ${conf.toFixed(1)}% confidence. Please consult a qualified neurologist for clinical evaluation.`
                : `No significant Parkinson's indicators detected. The model is ${conf.toFixed(1)}% confident this profile is healthy. Continue regular health monitoring.`
              }
            </p>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[
                ['Random Forest', `${result.rf_probability.toFixed(1)}% PD`],
                ['SVM',           `${result.svm_probability.toFixed(1)}% PD`],
                ['Overall Score', `${result.overall_risk_score} / 100`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                  <div className="mono" style={{ fontSize: 16, color: 'var(--cyan)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 18,
          padding: '11px 15px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.20)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--amber)',
          lineHeight: 1.6,
        }}>
          ⚠ {result.disclaimer}
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid-2" style={{ marginBottom: 22 }}>
        {/* Radar — all features */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Risk Profile — All Features</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                />
                <Radar
                  name="Risk"
                  dataKey="risk"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.22}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar — per category */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Average Risk by Category</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical" barSize={22}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={105}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={v => [`${v} / 100`, 'Avg Risk']}
                />
                <Bar dataKey="risk" radius={[0, 8, 8, 0]}>
                  {catData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.risk > 60 ? '#f87171' : entry.risk > 35 ? '#fbbf24' : '#34d399'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── INDIVIDUAL FEATURE RISK BARS ── */}
      <div className="card" style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 15, marginBottom: 20 }}>Individual Feature Risk Scores</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const score = scores[key] ?? 0
            const barColor = score > 65 ? 'var(--red)' : score > 35 ? 'var(--amber)' : 'var(--green)'
            const raw = features[key]
            return (
              <div key={key}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                    {raw !== undefined && (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {typeof raw === 'number' ? raw.toFixed(3) : raw}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: barColor }}>
                      {score}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${score}%`, background: barColor }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODEL AGREEMENT ── */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Model Agreement</h3>
        <div className="grid-2" style={{ gap: 14 }}>
          {[
            { model: 'Random Forest (200 trees)', prob: result.rf_probability,  pred: result.rf_prediction  },
            { model: 'SVM — RBF Kernel',          prob: result.svm_probability, pred: result.svm_prediction },
          ].map(({ model, prob, pred }) => {
            const c = pred === 1 ? 'var(--red)' : 'var(--green)'
            return (
              <div key={model} style={{
                background: 'var(--bg-mid)',
                borderRadius: 12,
                padding: 18,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{model}</div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: c,
                  marginBottom: 4,
                  fontFamily: 'var(--font-display)',
                }}>
                  {pred === 1 ? "Parkinson's" : 'Healthy'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  PD probability: <span className="mono" style={{ color: 'var(--cyan)' }}>{prob.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/test"    className="btn btn-primary">Run New Test</Link>
        <Link to="/history" className="btn btn-outline">View History</Link>
        <button
          className="btn btn-outline"
          style={{ marginLeft: 'auto' }}
          onClick={() => window.print()}
        >
          Print Report
        </button>
      </div>

    </div>
  )
}
