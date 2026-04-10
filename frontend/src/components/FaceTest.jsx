import React from 'react'
import { useFaceAnalysis } from '../hooks/useFaceAnalysis.js'

export default function FaceTest({ onComplete }) {
  const {
    phase, timeLeft, features, error,
    videoRef, canvasRef,
    startCapture, skip, reset,
  } = useFaceAnalysis(15)

  const handleContinue = () => {
    if (features) onComplete(features)
  }

  // The video + canvas are ALWAYS rendered in the DOM (just hidden when not in use).
  // This is critical — videoRef must point to a mounted element before srcObject is set.
  const showPreview = phase === 'capturing'

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Step 3 — Facial Expression Analysis</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
        Look at the camera naturally for <strong style={{ color: 'var(--cyan)' }}>15 seconds</strong>.
        The system measures your eye blink rate and facial expression mobility —
        both are often reduced in Parkinson's (facial masking).
      </p>

      {/* ── ALWAYS-MOUNTED VIDEO + CANVAS (hidden when not in use) ── */}
      {/* IMPORTANT: keep these mounted at all times so videoRef stays valid */}
      <div style={{
        display: showPreview ? 'block' : 'none',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div className="mono" style={{ fontSize: 44, color: 'var(--cyan)', fontWeight: 700, lineHeight: 1 }}>
          {timeLeft}s
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Look at the camera — blink naturally
        </div>

        {/* Camera preview — canvas draws the live mirrored feed */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          margin: '0 auto 18px',
          borderRadius: 14,
          overflow: 'hidden',
          border: '2px solid var(--border-glow)',
          background: '#000',
          aspectRatio: '4/3',
        }}>
          {/* Hidden raw video element — provides the stream source */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            playsInline
            muted
            autoPlay
          />
          {/* Canvas renders the mirrored video + any landmarks */}
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Scan line animation */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)',
            animation: 'scan 3s ease-in-out infinite',
            top: 0,
            pointerEvents: 'none',
          }} />
        </div>

        <button className="btn btn-outline" onClick={skip} style={{ fontSize: 13 }}>
          Stop Early
        </button>
      </div>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div style={{
          background: 'var(--bg-mid)',
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
          marginBottom: 20,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📷</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
            Camera access will be requested. Blink normally — do not stare.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 22 }}>
            If you prefer, click Skip to use simulated values instead.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={startCapture}>
              Allow Camera & Start
            </button>
            <button className="btn btn-outline" onClick={skip}>
              Skip (Simulate)
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && features && (
        <div>
          {error && (
            <div style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--amber)',
            }}>
              ⚠ Camera unavailable ({error}). Simulated values used.
            </div>
          )}

          <div style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
              ✓ Analysis Complete {features.simulated ? '(Simulated)' : '(Live Camera)'}
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              {[
                ['Eye Blink Rate', `${features.eye_blink_rate} /min`],
                ['Expression Mobility', `${(features.expression_mobility * 100).toFixed(1)}%`],
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
              Normal blink rate: 12–24 /min &nbsp;·&nbsp; Normal expression mobility: &gt;65%
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
