import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GroundFloorProps {
  isTransitioning: boolean
  transitionProgress: number
}

function createSacredYogaGroundTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 1024
  canvasElement.height = 1024
  const context = canvasElement.getContext('2d')!

  const centerCoord = 512
  const platformPixelRadius = 506

  context.clearRect(0, 0, 1024, 1024)

  const backgroundGradient = context.createRadialGradient(
    centerCoord,
    centerCoord,
    0,
    centerCoord,
    centerCoord,
    platformPixelRadius,
  )
  backgroundGradient.addColorStop(0.0, 'rgba(14, 34, 82, 0.96)')
  backgroundGradient.addColorStop(0.35, 'rgba(10, 24, 64, 0.94)')
  backgroundGradient.addColorStop(0.70, 'rgba(7, 18, 50, 0.92)')
  backgroundGradient.addColorStop(0.92, 'rgba(5, 14, 40, 0.92)')
  backgroundGradient.addColorStop(1.0, 'rgba(18, 44, 108, 0.96)')

  context.fillStyle = backgroundGradient
  context.beginPath()
  context.arc(centerCoord, centerCoord, platformPixelRadius, 0, Math.PI * 2)
  context.fill()

  const contactAuraGradient = context.createRadialGradient(
    centerCoord,
    centerCoord,
    0,
    centerCoord,
    centerCoord,
    190,
  )
  contactAuraGradient.addColorStop(0.0, 'rgba(64, 180, 255, 0.35)')
  contactAuraGradient.addColorStop(0.6, 'rgba(32, 100, 220, 0.15)')
  contactAuraGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = contactAuraGradient
  context.beginPath()
  context.arc(centerCoord, centerCoord, 190, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgba(90, 210, 255, 0.92)'
  context.lineWidth = 3.5
  context.beginPath()
  context.arc(centerCoord, centerCoord, platformPixelRadius - 2, 0, Math.PI * 2)
  context.stroke()

  context.strokeStyle = 'rgba(64, 160, 255, 0.45)'
  context.lineWidth = 1.5
  context.beginPath()
  context.arc(centerCoord, centerCoord, platformPixelRadius - 8, 0, Math.PI * 2)
  context.stroke()

  const concentricRingRadii = [120, 240, 360, 450]
  for (let index = 0; index < concentricRingRadii.length; index++) {
    const ringRadius = concentricRingRadii[index]
    context.strokeStyle = index % 2 === 0
      ? 'rgba(64, 190, 255, 0.32)'
      : 'rgba(180, 80, 255, 0.24)'
    context.lineWidth = 1.2
    context.beginPath()
    context.arc(centerCoord, centerCoord, ringRadius, 0, Math.PI * 2)
    context.stroke()
  }

  const generatedCanvasTexture = new THREE.CanvasTexture(canvasElement)
  generatedCanvasTexture.generateMipmaps = false
  generatedCanvasTexture.minFilter = THREE.LinearFilter
  return generatedCanvasTexture
}

export function GroundFloor({
  isTransitioning,
  transitionProgress,
}: GroundFloorProps) {
  const groundTexture = useMemo(() => createSacredYogaGroundTexture(), [])
  const meshReference = useRef<THREE.Mesh>(null)
  const floorMaterialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!meshReference.current || !floorMaterialRef.current) return
    const elapsedTime = state.clock.getElapsedTime()
    meshReference.current.rotation.z = elapsedTime * 0.003

    if (!isTransitioning) {
      floorMaterialRef.current.opacity = 0.98
      return
    }

    const currentEasedProgress = Math.min(Math.max(transitionProgress, 0), 1)
    const dissolutionLimit = 0.35
    const materializationLimit = 0.65

    if (currentEasedProgress < dissolutionLimit) {
      const dissolveFraction = currentEasedProgress / dissolutionLimit
      floorMaterialRef.current.opacity = Math.max(0.0, (1.0 - dissolveFraction) * 0.98)
    } else if (currentEasedProgress > materializationLimit) {
      const materializeFraction =
        (currentEasedProgress - materializationLimit) / (1.0 - materializationLimit)
      floorMaterialRef.current.opacity = Math.min(0.98, materializeFraction * 0.98)
    } else {
      floorMaterialRef.current.opacity = 0.0
    }
  })

  return (
    <group position={[0, -0.001, 0]}>
      <mesh
        ref={meshReference}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.90, 96]} />
        <meshBasicMaterial
          ref={floorMaterialRef}
          map={groundTexture}
          transparent
          opacity={0.98}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  )
}
