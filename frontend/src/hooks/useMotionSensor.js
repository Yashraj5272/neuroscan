// useMotionSensor.js
// Uses the browser DeviceMotion API to capture gyroscope + accelerometer data,
// then extracts tremor frequency, amplitude, and movement stability features.
// Falls back to realistic simulation when the sensor is unavailable.

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * @param {number} captureDuration  How many seconds to record (default 10)
 */
export function useMotionSensor(captureDuration = 10) {
  const [phase, setPhase]       = useState('idle')   // idle | loading | capturing | done | unsupported
  const [timeLeft, setTimeLeft] = useState(captureDuration)
  const [features, setFeatures] = useState(null)
  const [liveData, setLiveData] = useState({ acc: 0, rot: 0 })

  const samplesRef = useRef({ accel: [], gyro: [] })
  const timerRef   = useRef(null)
  const supported  = typeof DeviceMotionEvent !== 'undefined'

  // ── Process raw samples into ML features ──────────────────────────────────
  const processMotion = useCallback((samples) => {
    const { accel, gyro } = samples
    if (accel.length < 5) return simulateMotionFeatures()

    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length
    const variance = (arr, m) => arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length

    const accMag = accel.map(([x, y, z]) => Math.sqrt(x ** 2 + y ** 2 + z ** 2))
    const rotMag = gyro.map(([a, b, c]) => Math.sqrt(a ** 2 + b ** 2 + c ** 2))

    const accMean = mean(accMag)
    const accVar  = variance(accMag, accMean)
    const rotVar  = variance(rotMag, mean(rotMag))

    // Zero-crossing rate → estimate tremor frequency
    let crossings = 0
    for (let i = 1; i < accMag.length; i++) {
      if ((accMag[i] - accMean) * (accMag[i - 1] - accMean) < 0) crossings++
    }
    const tremorFreq = (crossings / 2) / captureDuration

    // Stability: high variance = low stability
    const stability = Math.max(0, Math.min(1, 1 / (1 + accVar * 0.5)))

    return {
      tremor_frequency:   +tremorFreq.toFixed(3),
      tremor_amplitude:   +Math.min(1, Math.sqrt(accVar) / 10).toFixed(4),
      movement_stability: +stability.toFixed(4),
      gyro_variance:      +Math.min(1, rotVar / 20).toFixed(4),
    }
  }, [captureDuration])

  // ── Realistic simulation (healthy baseline) ────────────────────────────────
  const simulateMotionFeatures = () => ({
    tremor_frequency:   +(0.8 + Math.random() * 0.8).toFixed(3),
    tremor_amplitude:   +(0.05 + Math.random() * 0.10).toFixed(4),
    movement_stability: +(0.82 + Math.random() * 0.12).toFixed(4),
    gyro_variance:      +(0.04 + Math.random() * 0.08).toFixed(4),
    simulated: true,
  })

  // ── DeviceMotion event handler ─────────────────────────────────────────────
  const handleMotion = useCallback((e) => {
    const acc = e.accelerationIncludingGravity
    const rot = e.rotationRate
    if (acc) {
      samplesRef.current.accel.push([acc.x || 0, acc.y || 0, acc.z || 0])
      setLiveData(prev => ({
        ...prev,
        acc: +Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2).toFixed(2)
      }))
    }
    if (rot) {
      samplesRef.current.gyro.push([rot.alpha || 0, rot.beta || 0, rot.gamma || 0])
      setLiveData(prev => ({
        ...prev,
        rot: +Math.sqrt((rot.alpha || 0) ** 2 + (rot.beta || 0) ** 2 + (rot.gamma || 0) ** 2).toFixed(2)
      }))
    }
  }, [])

  // ── Start capture ──────────────────────────────────────────────────────────
  const startCapture = useCallback(async () => {
    samplesRef.current = { accel: [], gyro: [] }
    setFeatures(null)

    // iOS 13+ requires explicit permission
    if (typeof DeviceMotionEvent?.requestPermission === 'function') {
      try {
        const perm = await DeviceMotionEvent.requestPermission()
        if (perm !== 'granted') { setPhase('unsupported'); return }
      } catch {
        setPhase('unsupported'); return
      }
    }

    if (!supported) {
      // Desktop or browser without sensor — simulate
      setFeatures(simulateMotionFeatures())
      setPhase('done')
      return
    }

    window.addEventListener('devicemotion', handleMotion)
    setPhase('capturing')
    setTimeLeft(captureDuration)

    let t = captureDuration
    timerRef.current = setInterval(() => {
      t -= 1
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        window.removeEventListener('devicemotion', handleMotion)
        setFeatures(processMotion(samplesRef.current))
        setPhase('done')
      }
    }, 1000)
  }, [supported, handleMotion, processMotion, captureDuration])

  // ── Skip / simulate ────────────────────────────────────────────────────────
  const skip = useCallback(() => {
    clearInterval(timerRef.current)
    window.removeEventListener('devicemotion', handleMotion)
    setFeatures(simulateMotionFeatures())
    setPhase('done')
  }, [handleMotion])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    window.removeEventListener('devicemotion', handleMotion)
    samplesRef.current = { accel: [], gyro: [] }
    setPhase('idle')
    setFeatures(null)
    setTimeLeft(captureDuration)
    setLiveData({ acc: 0, rot: 0 })
  }, [handleMotion, captureDuration])

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current)
    window.removeEventListener('devicemotion', handleMotion)
  }, [handleMotion])

  return { phase, timeLeft, features, liveData, startCapture, skip, reset, supported }
}
