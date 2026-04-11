// api.js — HTTP client for the Flask backend
// All requests go through Vite's /api proxy → localhost:5000

const BASE = '/api'

/**
 * POST /predict
 * Send feature object, receive ML prediction result.
 */
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

/**
 * GET /metrics
 * Returns stored model accuracy / AUC numbers.
 */
export async function getMetrics() {
  const res = await fetch(`${BASE}/metrics`)
  if (!res.ok) throw new Error('Failed to load metrics')
  return res.json()
}

/**
 * GET /history?n=N
 * Returns the last N prediction records.
 */
export async function getHistory(n = 20) {
  const res = await fetch(`${BASE}/history?n=${n}`)
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}

/**
 * GET /health
 * Checks if backend is alive and models are loaded.
 */
export async function healthCheck() {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.json()
  } catch {
    return { status: 'error', models_loaded: false }
  }
}
const API_URL = "https://neuroscan-6kho.onrender.com/predict";

export async function predict(data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ features: data }),
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return await res.json();
}