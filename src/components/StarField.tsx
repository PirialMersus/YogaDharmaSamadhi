import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BACKGROUND_STAR_COUNT = 9000
const BRIGHT_STAR_COUNT = 2500
const MAJOR_BEACON_COUNT = 400

function createStarTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 64
  canvasElement.height = 64
  const context = canvasElement.getContext('2d')!

  const radialGradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.15, 'rgba(235, 245, 255, 0.9)')
  radialGradient.addColorStop(0.4, 'rgba(140, 190, 255, 0.4)')
  radialGradient.addColorStop(0.7, 'rgba(80, 120, 240, 0.12)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 64, 64)

  return new THREE.CanvasTexture(canvasElement)
}

function createNebulaTexture(colorCenter: string, colorMid: string): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 512
  canvasElement.height = 512
  const context = canvasElement.getContext('2d')!

  const radialGradient = context.createRadialGradient(256, 256, 10, 256, 256, 250)
  radialGradient.addColorStop(0.0, colorCenter)
  radialGradient.addColorStop(0.45, colorMid)
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvasElement)
}

export function StarField() {
  const backgroundGeometryRef = useRef<THREE.BufferGeometry>(null)
  const brightGeometryRef = useRef<THREE.BufferGeometry>(null)
  const nebulaGroupRef = useRef<THREE.Group>(null)

  const starTexture = useMemo(() => createStarTexture(), [])
  const indigoNebulaTexture = useMemo(
    () => createNebulaTexture('rgba(70, 40, 140, 0.28)', 'rgba(30, 15, 80, 0.12)'),
    []
  )
  const cyanNebulaTexture = useMemo(
    () => createNebulaTexture('rgba(25, 90, 150, 0.25)', 'rgba(10, 40, 90, 0.1)'),
    []
  )
  const magentaNebulaTexture = useMemo(
    () => createNebulaTexture('rgba(110, 30, 100, 0.22)', 'rgba(50, 15, 60, 0.08)'),
    []
  )

  const backgroundStars = useMemo(() => {
    const starPositions = new Float32Array(BACKGROUND_STAR_COUNT * 3)
    const starColors = new Float32Array(BACKGROUND_STAR_COUNT * 3)

    for (let starIndex = 0; starIndex < BACKGROUND_STAR_COUNT; starIndex++) {
      const sphericalTheta = Math.random() * Math.PI * 2
      const sphericalPhi = Math.acos(2 * Math.random() - 1)
      const celestialRadius = 45 + Math.random() * 110

      starPositions[starIndex * 3] = celestialRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta)
      starPositions[starIndex * 3 + 1] = celestialRadius * Math.cos(sphericalPhi)
      starPositions[starIndex * 3 + 2] = celestialRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta)

      const colorSpectrumRoll = Math.random()
      if (colorSpectrumRoll < 0.25) {
        starColors[starIndex * 3] = 0.65 + Math.random() * 0.2
        starColors[starIndex * 3 + 1] = 0.78 + Math.random() * 0.2
        starColors[starIndex * 3 + 2] = 1.0
      } else if (colorSpectrumRoll < 0.45) {
        starColors[starIndex * 3] = 1.0
        starColors[starIndex * 3 + 1] = 0.88 + Math.random() * 0.1
        starColors[starIndex * 3 + 2] = 0.65 + Math.random() * 0.2
      } else if (colorSpectrumRoll < 0.6) {
        starColors[starIndex * 3] = 0.95
        starColors[starIndex * 3 + 1] = 0.75
        starColors[starIndex * 3 + 2] = 1.0
      } else {
        const starLuminance = 0.6 + Math.random() * 0.4
        starColors[starIndex * 3] = starLuminance
        starColors[starIndex * 3 + 1] = starLuminance
        starColors[starIndex * 3 + 2] = starLuminance
      }
    }

    return { positions: starPositions, colors: starColors }
  }, [])

  const brightStars = useMemo(() => {
    const starPositions = new Float32Array(BRIGHT_STAR_COUNT * 3)
    const starColors = new Float32Array(BRIGHT_STAR_COUNT * 3)

    for (let starIndex = 0; starIndex < BRIGHT_STAR_COUNT; starIndex++) {
      const sphericalTheta = Math.random() * Math.PI * 2
      const sphericalPhi = Math.acos(2 * Math.random() - 1)
      const celestialRadius = 38 + Math.random() * 95

      starPositions[starIndex * 3] = celestialRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta)
      starPositions[starIndex * 3 + 1] = celestialRadius * Math.cos(sphericalPhi)
      starPositions[starIndex * 3 + 2] = celestialRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta)

      const colorCategory = Math.random()
      if (colorCategory < 0.35) {
        starColors[starIndex * 3] = 0.75
        starColors[starIndex * 3 + 1] = 0.9
        starColors[starIndex * 3 + 2] = 1.0
      } else if (colorCategory < 0.65) {
        starColors[starIndex * 3] = 1.0
        starColors[starIndex * 3 + 1] = 0.92
        starColors[starIndex * 3 + 2] = 0.78
      } else {
        starColors[starIndex * 3] = 1.0
        starColors[starIndex * 3 + 1] = 1.0
        starColors[starIndex * 3 + 2] = 1.0
      }
    }

    return { positions: starPositions, colors: starColors }
  }, [])

  const majorBeaconStars = useMemo(() => {
    const starPositions = new Float32Array(MAJOR_BEACON_COUNT * 3)
    const starColors = new Float32Array(MAJOR_BEACON_COUNT * 3)

    for (let starIndex = 0; starIndex < MAJOR_BEACON_COUNT; starIndex++) {
      const sphericalTheta = Math.random() * Math.PI * 2
      const sphericalPhi = Math.acos(2 * Math.random() - 1)
      const celestialRadius = 32 + Math.random() * 80

      starPositions[starIndex * 3] = celestialRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta)
      starPositions[starIndex * 3 + 1] = celestialRadius * Math.cos(sphericalPhi)
      starPositions[starIndex * 3 + 2] = celestialRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta)

      starColors[starIndex * 3] = 0.9 + Math.random() * 0.1
      starColors[starIndex * 3 + 1] = 0.95 + Math.random() * 0.05
      starColors[starIndex * 3 + 2] = 1.0
    }

    return { positions: starPositions, colors: starColors }
  }, [])

  const brightStarPhases = useMemo(
    () => new Float32Array(BRIGHT_STAR_COUNT).map(() => Math.random() * Math.PI * 2),
    []
  )
  const brightStarFrequencies = useMemo(
    () => new Float32Array(BRIGHT_STAR_COUNT).map(() => 0.4 + Math.random() * 1.8),
    []
  )

  useFrame((state) => {
    const clockTime = state.clock.getElapsedTime()

    if (brightGeometryRef.current) {
      const colorAttribute = brightGeometryRef.current.getAttribute('color') as THREE.BufferAttribute
      for (let starIndex = 0; starIndex < BRIGHT_STAR_COUNT; starIndex++) {
        const twinkleFactor =
          0.55 + 0.45 * Math.sin(clockTime * brightStarFrequencies[starIndex] + brightStarPhases[starIndex])
        const originalR = brightStars.colors[starIndex * 3]
        const originalG = brightStars.colors[starIndex * 3 + 1]
        const originalB = brightStars.colors[starIndex * 3 + 2]

        colorAttribute.array[starIndex * 3] = originalR * twinkleFactor
        colorAttribute.array[starIndex * 3 + 1] = originalG * twinkleFactor
        colorAttribute.array[starIndex * 3 + 2] = originalB * twinkleFactor
      }
      colorAttribute.needsUpdate = true
    }

    if (nebulaGroupRef.current) {
      nebulaGroupRef.current.rotation.y = clockTime * 0.0015
    }
  })

  return (
    <group>
      <group ref={nebulaGroupRef}>
        <mesh position={[0, 15, -80]} rotation={[0.2, 0.3, 0]}>
          <planeGeometry args={[130, 95]} />
          <meshBasicMaterial
            map={indigoNebulaTexture}
            transparent
            opacity={0.75}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[-65, -10, 45]} rotation={[-0.3, -0.6, 0.4]}>
          <planeGeometry args={[115, 80]} />
          <meshBasicMaterial
            map={cyanNebulaTexture}
            transparent
            opacity={0.68}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[70, 25, 30]} rotation={[0.4, 0.8, -0.2]}>
          <planeGeometry args={[120, 85]} />
          <meshBasicMaterial
            map={magentaNebulaTexture}
            transparent
            opacity={0.62}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <points>
        <bufferGeometry ref={backgroundGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            array={backgroundStars.positions}
            count={BACKGROUND_STAR_COUNT}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={backgroundStars.colors}
            count={BACKGROUND_STAR_COUNT}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          map={starTexture}
          vertexColors
          transparent
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <points>
        <bufferGeometry ref={brightGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            array={brightStars.positions}
            count={BRIGHT_STAR_COUNT}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={brightStars.colors}
            count={BRIGHT_STAR_COUNT}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          map={starTexture}
          vertexColors
          transparent
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={majorBeaconStars.positions}
            count={MAJOR_BEACON_COUNT}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={majorBeaconStars.colors}
            count={MAJOR_BEACON_COUNT}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.24}
          map={starTexture}
          vertexColors
          transparent
          alphaTest={0.001}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
