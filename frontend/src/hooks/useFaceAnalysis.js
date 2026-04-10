// useFaceAnalysis.js — FIXED
// Key fix: phase is set to 'capturing' FIRST so the video/canvas elements
// are mounted in the DOM before getUserMedia and video.play() are called.
// Canvas draws the raw video feed directly, no black screen.

import { useState, useRef, useCallback, useEffect } from 'react'

export function useFaceAnalysis(captureDuration = 15) {
  const [phase, setPhase] = useState('idle')
  const [timeLeft, setTimeLeft] = useState(captureDuration)
  const [features, setFeatures] = useState(null)
  const [error, setError] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timerRef = useRef(null)
  const rafRef = useRef(null)
  const streamRef = useRef(null)
  const faceMeshRef = useRef(null)
  const dataRef = useRef({ blinks: 0, expressionDeltas: [], prevNose: null })
  const prevEARRef = useRef(null)

  // ── Eye Aspect Ratio ────────────────────────────────────────────────────
  const eyeAspectRatio = (lm, indices) => {
    const pts = indices.map(i => lm[i])
    if (!pts[0] || !pts[3]) return 0
    const d = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
    return (d(pts[1], pts[5]) + d(pts[2], pts[4])) / (2 * d(pts[0], pts[3]))
  }

  // ── Draw video frame onto canvas (mirrored like a selfie camera) ────────
  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()
  }, [])

  // ── MediaPipe results ───────────────────────────────────────────────────
  const onResults = useCallback((results) => {
    drawFrame()
    if (!results.multiFaceLandmarks?.length) return
    const lm = results.multiFaceLandmarks[0]

    const leftEAR = eyeAspectRatio(lm, [362, 385, 387, 263, 373, 380])
    const rightEAR = eyeAspectRatio(lm, [33, 160, 158, 133, 153, 144])
    const ear = (leftEAR + rightEAR) / 2

    if (prevEARRef.current !== null && prevEARRef.current > 0.21 && ear < 0.21) {
      dataRef.current.blinks++
    }
    prevEARRef.current = ear

    const nose = lm[1]
    if (dataRef.current.prevNose) {
      const prev = dataRef.current.prevNose
      dataRef.current.expressionDeltas.push(
        Math.sqrt((nose.x - prev.x) ** 2 + (nose.y - prev.y) ** 2)
      )
    }
    dataRef.current.prevNose = { x: nose.x, y: nose.y }

    // Draw dot on nose
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.arc((1 - nose.x) * canvas.width, nose.y * canvas.height, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#38bdf8'
      ctx.fill()
    }
  }, [drawFrame])

  // ── Feature computation ─────────────────────────────────────────────────
  const processResults = useCallback(() => {
    const { blinks, expressionDeltas } = dataRef.current
    const blinkRate = (blinks / captureDuration) * 60
    const avgDelta = expressionDeltas.length > 0
      ? expressionDeltas.reduce((a, b) => a + b, 0) / expressionDeltas.length : 0
    return {
      eye_blink_rate: +blinkRate.toFixed(2),
      expression_mobility: +Math.max(0, Math.min(1, avgDelta * 50)).toFixed(4),
      face_detected: true,
    }
  }, [captureDuration])

  const simulateFaceFeatures = () => ({
    eye_blink_rate: +(14 + Math.random() * 5).toFixed(2),
    expression_mobility: +(0.72 + Math.random() * 0.15).toFixed(4),
    face_detected: false,
    simulated: true,
  })

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // ── RAF render loop ─────────────────────────────────────────────────────
  const startRAFLoop = useCallback(() => {
    const loop = async () => {
      const fm = faceMeshRef.current
      if (fm && videoRef.current?.readyState >= 2) {
        try { await fm.send({ image: videoRef.current }) } catch { }
      } else {
        drawFrame()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [drawFrame])

  // ── Start capture ───────────────────────────────────────────────────────
  // CRITICAL FIX: set phase to 'capturing' FIRST so <video> and <canvas>
  // are mounted in the DOM before we try to assign srcObject to videoRef.
  const startCapture = useCallback(async () => {
    setError(null)
    setFeatures(null)
    dataRef.current = { blinks: 0, expressionDeltas: [], prevNose: null }
    prevEARRef.current = null
    faceMeshRef.current = null

    // Mount video+canvas elements immediately
    setPhase('capturing')
    setTimeLeft(captureDuration)

    // Wait one tick for React to render the video element into the DOM
    await new Promise(r => setTimeout(r, 100))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('Video element not mounted')

      video.srcObject = stream
      video.muted = true
      video.playsInline = true

      // Wait for metadata (dimensions available)
      await new Promise((resolve) => {
        if (video.readyState >= 1) { resolve(); return }
        video.onloadedmetadata = resolve
        setTimeout(resolve, 3000)
      })

      await video.play()

      // Sync canvas to actual video size
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 640
        canvasRef.current.height = video.videoHeight || 480
      }

      // Try MediaPipe (optional)
      try {
        const mp = await import('@mediapipe/face_mesh')
        const fm = new mp.FaceMesh({
          locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}`
        })
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        fm.onResults(onResults)
        await fm.initialize()
        faceMeshRef.current = fm
        console.log('MediaPipe loaded successfully')
      } catch (mpErr) {
        console.warn('MediaPipe not available, drawing raw video:', mpErr.message)
      }

      startRAFLoop()

      let t = captureDuration
      timerRef.current = setInterval(() => {
        t -= 1
        setTimeLeft(t)
        if (t <= 0) {
          clearInterval(timerRef.current)
          cancelAnimationFrame(rafRef.current)
          const f = faceMeshRef.current ? processResults() : simulateFaceFeatures()
          stopStream()
          setFeatures(f)
          setPhase('done')
        }
      }, 1000)

    } catch (e) {
      console.error('Camera error:', e)
      setError(e.message || 'Camera access denied')
      cancelAnimationFrame(rafRef.current)
      stopStream()
      setFeatures(simulateFaceFeatures())
      setPhase('done')
    }
  }, [captureDuration, onResults, processResults, startRAFLoop, stopStream])

  const skip = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    stopStream()
    setFeatures(simulateFaceFeatures())
    setPhase('done')
  }, [stopStream])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    stopStream()
    faceMeshRef.current = null
    setPhase('idle')
    setFeatures(null)
    setError(null)
    setTimeLeft(captureDuration)
    dataRef.current = { blinks: 0, expressionDeltas: [], prevNose: null }
  }, [stopStream, captureDuration])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    stopStream()
  }, [stopStream])

  return { phase, timeLeft, features, error, videoRef, canvasRef, startCapture, skip, reset }
}
