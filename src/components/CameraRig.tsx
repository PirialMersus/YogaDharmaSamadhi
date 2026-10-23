import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface CameraRigProps {
  reducedMotion: boolean
}

export function CameraRig({ reducedMotion }: CameraRigProps) {
  const { camera, gl, size } = useThree()
  const orbitAngleRef = useRef(0.92)
  const userDeltaXRef = useRef(0)
  const userDeltaYRef = useRef(0)
  const targetUserDeltaXRef = useRef(0)
  const targetUserDeltaYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

    const onPointerDown = (event: PointerEvent) => {
      isDraggingRef.current = true
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return
      const dx = (event.clientX - lastPointerRef.current.x) * 0.005
      const dy = (event.clientY - lastPointerRef.current.y) * 0.004
      targetUserDeltaXRef.current += dx
      targetUserDeltaYRef.current = Math.max(-0.55, Math.min(0.55, targetUserDeltaYRef.current + dy))
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl])

  useFrame((_, delta) => {
    const orbitSpeed = reducedMotion ? 0.04 : 0.14
    orbitAngleRef.current += delta * orbitSpeed

    userDeltaXRef.current += (targetUserDeltaXRef.current - userDeltaXRef.current) * 0.06
    userDeltaYRef.current += (targetUserDeltaYRef.current - userDeltaYRef.current) * 0.06

    const isMobileViewport = size.width < 768
    const baseTargetHeight = isMobileViewport ? 0.58 : 0.65
    const baseRadius = isMobileViewport ? 3.35 : 3.0

    const totalAngle = orbitAngleRef.current + userDeltaXRef.current
    const elevation = 0.16 + userDeltaYRef.current
    const clampedElevation = Math.max(-0.45, Math.min(0.75, elevation))

    const x = baseRadius * Math.cos(totalAngle) * Math.cos(clampedElevation)
    const y = baseRadius * Math.sin(clampedElevation) + baseTargetHeight
    const z = baseRadius * Math.sin(totalAngle) * Math.cos(clampedElevation)

    camera.position.set(x, y, z)
    camera.lookAt(0, baseTargetHeight, 0)
  })

  return null
}
