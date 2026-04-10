// useTappingTest.js
// Captures pointer-down timestamps during a timed test and computes motor features.

import { useState, useRef, useCallback } from 'react'

/**
 * @param {number} duration  Test duration in seconds (default 15)
 */
export function useTappingTest(duration = 15) {
  const [phase, setPhase]         = useState('idle')      // idle | countdown | tapping | done
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft]   = useState(duration)
  const [taps, setTaps]           = useState([])
  const [features, setFeatures]   = useState(null)

  const tapsRef    = useRef([])
  const timerRef   = useRef(null)
  const countRef   = useRef(null)

  // Compute numerical features from an array of tap timestamps (ms)
  const computeFeatures = useCallback((tapList) => {
    if (tapList.length < 3) return null

    const intervals = []
    for (let i = 1; i < tapList.length; i++) {
      intervals.push(tapList[i] - tapList[i - 1])
    }

    const n       = tapList.length
    const elapsed = (tapList[tapList.length - 1] - tapList[0]) / 1000  // seconds
    const tapSpeed = elapsed > 0 ? (n - 1) / elapsed : 0

    const mean     = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length
    const std      = Math.sqrt(variance)
    const cv       = mean > 0 ? std / mean : 0

    // Consistency: higher = more regular tapping
    const consistency = Math.max(0, Math.min(1, 1 - cv))

    return {
      tap_speed:        +tapSpeed.toFixed(3),
      tap_consistency:  +consistency.toFixed(3),
      tap_interval_std: +std.toFixed(2),
      tap_interval_cv:  +cv.toFixed(4),
      tap_count:        n,
      tap_intervals:    intervals.map(v => +v.toFixed(1)),  // raw intervals for chart
    }
  }, [])

  const startTest = useCallback(() => {
    // Reset
    tapsRef.current = []
    setTaps([])
    setFeatures(null)
    setPhase('countdown')
    setCountdown(3)

    let c = 3
    countRef.current = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) {
        clearInterval(countRef.current)
        setPhase('tapping')
        setTimeLeft(duration)

        let t = duration
        timerRef.current = setInterval(() => {
          t -= 1
          setTimeLeft(t)
          if (t <= 0) {
            clearInterval(timerRef.current)
            setPhase('done')
            const f = computeFeatures(tapsRef.current)
            setFeatures(f)
          }
        }, 1000)
      }
    }, 1000)
  }, [duration, computeFeatures])

  const recordTap = useCallback(() => {
    if (phase !== 'tapping') return
    const t = Date.now()
    tapsRef.current.push(t)
    setTaps(prev => [...prev, t])
  }, [phase])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    clearInterval(countRef.current)
    setPhase('idle')
    setCountdown(3)
    setTimeLeft(duration)
    setTaps([])
    setFeatures(null)
    tapsRef.current = []
  }, [duration])

  return {
    phase,
    countdown,
    timeLeft,
    taps,
    features,
    startTest,
    recordTap,
    reset,
  }
}
