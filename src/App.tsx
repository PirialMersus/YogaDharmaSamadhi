import { useState, useEffect, useRef, useCallback } from 'react'
import { Scene } from './components/Scene'
import { Controls } from './components/Controls'
import { PoseAnnotationPanel } from './components/PoseAnnotationPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LanguageProvider } from './i18n/LanguageContext'
import { POSE_CYCLE, type PoseName } from './geometry/poses'

const TRANSITION_DURATION_MS = 2500
const HOLD_DURATION_MS = 6800

function getPixelRatio(): number {
  const isMobile = window.innerWidth < 768
  return Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
}

function detectReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function YogaPracticeExperience() {
  const [currentPose, setCurrentPose] = useState<PoseName>('tadasana')
  const [previousPose, setPreviousPose] = useState<PoseName>('tadasana')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionProgress, setTransitionProgress] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [pixelRatio] = useState(() => getPixelRatio())
  const [reducedMotion] = useState(() => detectReducedMotion())

  const currentPoseRef = useRef<PoseName>('tadasana')
  currentPoseRef.current = currentPose

  const isAutoPlayingRef = useRef(isAutoPlaying)
  isAutoPlayingRef.current = isAutoPlaying

  const isTransitioningRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionStartTimeRef = useRef<number | null>(null)

  const startTransitionTo = useCallback(
    (targetPose: PoseName) => {
      if (targetPose === currentPoseRef.current) return

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }

      const fromPose = currentPoseRef.current
      isTransitioningRef.current = true
      setIsTransitioning(true)
      setPreviousPose(fromPose)
      setCurrentPose(targetPose)
      setTransitionProgress(0)

      const duration = reducedMotion ? 1000 : TRANSITION_DURATION_MS
      transitionStartTimeRef.current = performance.now()

      const animateStep = (now: number) => {
        const elapsed = now - (transitionStartTimeRef.current ?? now)
        const progress = Math.min(elapsed / duration, 1.0)
        setTransitionProgress(progress)

        if (progress < 1.0) {
          animationFrameRef.current = requestAnimationFrame(animateStep)
        } else {
          setIsTransitioning(false)
          setTransitionProgress(1.0)
          setPreviousPose(targetPose)
          isTransitioningRef.current = false

          if (isAutoPlayingRef.current) {
            autoPlayTimerRef.current = setTimeout(() => {
              if (!isAutoPlayingRef.current) return
              const currentIndex = POSE_CYCLE.indexOf(targetPose)
              const nextIndex = (currentIndex + 1) % POSE_CYCLE.length
              startTransitionTo(POSE_CYCLE[nextIndex])
            }, HOLD_DURATION_MS)
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animateStep)
    },
    [reducedMotion],
  )

  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
      return
    }

    if (!isTransitioningRef.current) {
      autoPlayTimerRef.current = setTimeout(() => {
        if (!isAutoPlayingRef.current) return
        const currentIndex = POSE_CYCLE.indexOf(currentPoseRef.current)
        const nextIndex = (currentIndex + 1) % POSE_CYCLE.length
        startTransitionTo(POSE_CYCLE[nextIndex])
      }, HOLD_DURATION_MS)
    }

    return () => {
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
    }
  }, [isAutoPlaying, startTransitionTo])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
    }
  }, [])

  const handlePoseSelect = useCallback(
    (selectedPose: PoseName) => {
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
      startTransitionTo(selectedPose)
    },
    [startTransitionTo],
  )

  const handlePreviousPose = useCallback(() => {
    if (autoPlayTimerRef.current !== null) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
    const currentIndex = POSE_CYCLE.indexOf(currentPoseRef.current)
    const previousIndex = (currentIndex - 1 + POSE_CYCLE.length) % POSE_CYCLE.length
    startTransitionTo(POSE_CYCLE[previousIndex])
  }, [startTransitionTo])

  const handleNextPose = useCallback(() => {
    if (autoPlayTimerRef.current !== null) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
    const currentIndex = POSE_CYCLE.indexOf(currentPoseRef.current)
    const nextIndex = (currentIndex + 1) % POSE_CYCLE.length
    startTransitionTo(POSE_CYCLE[nextIndex])
  }, [startTransitionTo])

  const handleToggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((previousState) => {
      const nextState = !previousState
      isAutoPlayingRef.current = nextState
      if (!nextState && autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
      return nextState
    })
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LanguageSwitcher />
      <Scene
        currentPose={currentPose}
        previousPose={previousPose}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
        reducedMotion={reducedMotion}
        pixelRatio={pixelRatio}
      />
      <PoseAnnotationPanel
        currentPose={currentPose}
        isTransitioning={isTransitioning}
      />
      <Controls
        currentPose={currentPose}
        isAutoPlaying={isAutoPlaying}
        onPoseSelect={handlePoseSelect}
        onPreviousPose={handlePreviousPose}
        onNextPose={handleNextPose}
        onToggleAutoPlay={handleToggleAutoPlay}
      />
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <YogaPracticeExperience />
    </LanguageProvider>
  )
}
