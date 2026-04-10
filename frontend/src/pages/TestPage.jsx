import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TappingTest   from '../components/TappingTest.jsx'
import MotionTest    from '../components/MotionTest.jsx'
import FaceTest      from '../components/FaceTest.jsx'
import Questionnaire from '../components/Questionnaire.jsx'
import { predict }   from '../utils/api.js'

const STEP_LABELS = ['Tapping', 'Motion', 'Face', 'Questions']

export default function TestPage() {
  const navigate = useNavigate()

  const [step,     setStep]     = useState(0)
  const [features, setFeatures] = useState({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Merge new feature data and advance to next step
  const mergeAndAdvance = (data) => {
    const updated = { ...features, ...data }
    setFeatures(updated)
    setStep(s => s + 1)
    return updated
  }

  // Handlers per step
  const handleTapping       = (f) => mergeAndAdvance(f)
  const handleMotion        = (f) => mergeAndAdvance(f)
  const handleFace          = (f) => mergeAndAdvance(f)
  const handleQuestionnaire = (f) => {
    const all = mergeAndAdvance(f)
    submitPrediction(all)
  }

  // Submit all features to Flask API
  const submitPrediction = async (allFeatures) => {
    setLoading(true)
    setError(null)
    try {
      const result = await predict(allFeatures)
      // Store result in sessionStorage for ResultPage to read
      sessionStorage.setItem('pd_result',   JSON.stringify(result))
      sessionStorage.setItem('pd_features', JSON.stringify(allFeatures))
      navigate('/result')
    } catch (e) {
      setError(e.message)
      setLoading(false)
      setStep(3)   // go back to questionnaire on error
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── STEP INDICATOR ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        {STEP_LABELS.map((label, i) => {
          const done    = step > i
          const current = step === i
          return (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  background: done
                    ? 'var(--cyan)'
                    : current
                      ? 'rgba(56,189,248,0.15)'
                      : 'var(--bg-card)',
                  border: `2px solid ${done || current ? 'var(--cyan)' : 'var(--border)'}`,
                  color: done ? 'var(--bg-deep)' : current ? 'var(--cyan)' : 'var(--text-muted)',
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : String(i + 1).padStart(2, '0')}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: current ? 'var(--cyan)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  marginBottom: 20,
                  background: step > i ? 'var(--cyan)' : 'var(--border)',
                  transition: 'background 0.3s',
                  minWidth: 16,
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.10)',
          border: '1px solid rgba(248,113,113,0.30)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          color: 'var(--red)',
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          <strong>Prediction error:</strong> {error}
          <br />
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            Make sure the Flask backend is running: <code style={{ fontFamily: 'var(--font-mono)' }}>python backend/app.py</code>
          </span>
        </div>
      )}

      {/* ── LOADING SPINNER ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--cyan)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Analysing…</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Running ensemble Random Forest + SVM prediction
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      {!loading && (
        <div className="card" style={{ padding: 32 }}>
          {step === 0 && <TappingTest   onComplete={handleTapping}       />}
          {step === 1 && <MotionTest    onComplete={handleMotion}         />}
          {step === 2 && <FaceTest      onComplete={handleFace}           />}
          {step === 3 && <Questionnaire onComplete={handleQuestionnaire}  />}
        </div>
      )}

      {/* ── DEBUG: show collected features ── */}
      {Object.keys(features).length > 0 && !loading && (
        <details style={{ marginTop: 20 }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}>
            Show collected features ({Object.keys(features).length} values)
          </summary>
          <pre style={{
            marginTop: 10,
            padding: 16,
            background: 'var(--bg-card)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            overflowX: 'auto',
          }}>
            {JSON.stringify(features, null, 2)}
          </pre>
        </details>
      )}

    </div>
  )
}
