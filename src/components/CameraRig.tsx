import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface CameraRigProps {
  reducedMotion: boolean
}

export function CameraRig({ reducedMotion }: CameraRigProps) {
  const { camera, gl } = useThree()
  const orbitAngleRef = useRef(0.3)
  const orbitRadiusRef = useRef(3.0)
  const userDeltaXRef = useRef(0)
  const userDeltaYRef = useRef(0)
  const targetUserDeltaXRef = useRef(0)
  const targetUserDeltaYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const dx = (e.clientX - lastPointerRef.current.x) * 0.005
      const dy = (e.clientY - lastPointerRef.current.y) * 0.004
      targetUserDeltaXRef.current += dx
      targetUserDeltaYRef.current = Math.max(-0.55, Math.min(0.55, targetUserDeltaYRef.current + dy))
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
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

    const totalAngle = orbitAngleRef.current + userDeltaXRef.current
    const elevation = 0.16 + userDeltaYRef.current
    const clampedElevation = Math.max(-0.45, Math.min(0.75, elevation))

    const r = orbitRadiusRef.current
    const x = r * Math.cos(totalAngle) * Math.cos(clampedElevation)
    const y = r * Math.sin(clampedElevation) + 0.65
    const z = r * Math.sin(totalAngle) * Math.cos(clampedElevation)

    camera.position.set(x, y, z)
    camera.lookAt(0, 0.65, 0)
  })

  return null
}
