import React, { useState } from 'react'
import { QUESTIONS, computeQuestionnaireScore, CATEGORY_COLORS } from '../utils/questionnaire.js'

export default function Questionnaire({ onComplete }) {
  const [answers,   setAnswers]   = useState({})
  const [submitted, setSubmitted] = useState(false)

  const totalQ   = QUESTIONS.length
  const answered = Object.keys(answers).length
  const progress = answered / totalQ

  const handleAnswer = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = () => {
    if (answered < totalQ) return
    const score = computeQuestionnaireScore(answers)
    setSubmitted(true)
    onComplete({ questionnaire_score: score, raw_answers: answers })
  }

  // Submitted state — show summary inside this card before moving on
  if (submitted) {
    const score = computeQuestionnaireScore(answers)
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Step 4 — Questionnaire</h2>
        <div style={{
          background: 'rgba(52,211,153,0.07)',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
        }}>
          <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 16, fontSize: 15 }}>
            ✓ Questionnaire Submitted
          </div>
          <div className="mono" style={{ fontSize: 52, color: 'var(--cyan)', fontWeight: 700, lineHeight: 1 }}>
            {score.toFixed(1)}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
            Symptom Score (out of 20) · 0 = no symptoms · 20 = severe
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Step 4 — Symptom Questionnaire</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
        Answer all {totalQ} questions based on your experience over the <strong style={{ color: 'var(--cyan)' }}>last 3 months</strong>.
        Be as accurate as possible.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{answered} of {totalQ} answered</span>
          <span style={{ color: 'var(--cyan)' }}>{Math.round(progress * 100)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, var(--cyan), var(--cyan-bright))',
          }} />
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {QUESTIONS.map((q, i) => {
          const selected  = answers[q.id]
          const catColor  = CATEGORY_COLORS[q.category] || 'var(--cyan)'
          const isAnswered = selected !== undefined

          return (
            <div key={q.id} className="card" style={{
              padding: 20,
              borderColor: isAnswered ? 'var(--border-glow)' : 'var(--border)',
              transition: 'border-color 0.2s',
            }}>
              {/* Question header */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: `${catColor}18`,
                  border: `1px solid ${catColor}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: catColor,
                  fontWeight: 700,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: catColor,
                    marginBottom: 4,
                    display: 'block',
                  }}>
                    {q.category}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: 'var(--text-primary)' }}>
                    {q.question}
                  </p>
                </div>
              </div>

              {/* Answer options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {q.options.map(opt => {
                  const isSelected = selected === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(q.id, opt.value)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? catColor : 'var(--border)'}`,
                        background: isSelected ? `${catColor}12` : 'var(--bg-mid)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 13,
                        lineHeight: 1.4,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {/* Radio circle */}
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? catColor : 'var(--text-muted)'}`,
                        background: isSelected ? catColor : 'transparent',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={answered < totalQ}
        >
          {answered < totalQ
            ? `Answer all questions (${totalQ - answered} remaining)`
            : 'Submit & Analyse →'}
        </button>
      </div>
    </div>
  )
}
