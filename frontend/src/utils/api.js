// api.js — HTTP client for the Flask backend
// Uses VITE_API_URL env variable for production (Render backend URL)
// Falls back to /api proxy for local development

const BASE = import.meta.env.VITE_API_URL || '/api'

export async function predict(features) {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getMetrics() {
  const res = await fetch(`${BASE}/metrics`)
  if (!res.ok) throw new Error('Failed to load metrics')
  return res.json()
}

export async function getHistory(n = 20) {
  const res = await fetch(`${BASE}/history?n=${n}`)
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

export async function healthCheck() {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.json()
  } catch {
    return { status: 'error', models_loaded: false }
  }
}