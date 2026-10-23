import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleTexture } from '../geometry/humanShapes'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { loadParticlePoseData, getCachedParticlePoseData, preloadPoseAssets } from '../services/poseAssetLoader'

interface ParticleHumanProps {
  currentPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
  previousPose: PoseName
  onPoseReady?: () => void
}

const STATIC_PARTICLE_COUNT = 18000
const BODY_PARTICLES_COUNT = Math.floor(STATIC_PARTICLE_COUNT * 0.88)
const GROUND_PARTICLES_COUNT = STATIC_PARTICLE_COUNT - BODY_PARTICLES_COUNT
const FLOOR_EXACT_RADIUS = 0.90
const RESTING_PARTICLE_OPACITY = 0.22
const ACTIVE_PARTICLE_OPACITY = 1.0
const RESTING_PARTICLE_SIZE = 0.015
const ACTIVE_PARTICLE_SIZE = 0.024

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function ParticleHuman({
  currentPose,
  isTransitioning,
  transitionProgress,
  previousPose,
  onPoseReady,
}: ParticleHumanProps) {
  const loadedParticlesMapRef = useRef<Map<PoseName, { positions: Float32Array; colors: Float32Array }>>(new Map())
  const [, setRevision] = useState(0)

  useEffect(() => {
    let isCancelled = false

    const nextIndex = (POSE_CYCLE.indexOf(currentPose) + 1) % POSE_CYCLE.length
    const nextPoseName = POSE_CYCLE[nextIndex]
    preloadPoseAssets(nextPoseName)

    loadParticlePoseData(currentPose).then((data) => {
      if (isCancelled) return
      loadedParticlesMapRef.current.set(currentPose, data)
      setRevision((prev) => prev + 1)
      if (onPoseReady) {
        onPoseReady()
      }
    })

    if (previousPose && !loadedParticlesMapRef.current.has(previousPose)) {
      loadParticlePoseData(previousPose).then((data) => {
        if (isCancelled) return
        loadedParticlesMapRef.current.set(previousPose, data)
        setRevision((prev) => prev + 1)
      })
    }

    return () => {
      isCancelled = true
    }
  }, [currentPose, previousPose, onPoseReady])

  const workingPositions = useMemo(
    () => new Float32Array(STATIC_PARTICLE_COUNT * 3),
    [],
  )
  const workingColors = useMemo(
    () => new Float32Array(STATIC_PARTICLE_COUNT * 3),
    [],
  )

  const groundSpiralOffsets = useMemo(() => {
    const offsets = new Float32Array(GROUND_PARTICLES_COUNT * 2)
    const goldenRatioAngle = 2.399963229728653
    for (let index = 0; index < GROUND_PARTICLES_COUNT; index++) {
      const radiusFraction = Math.sqrt((index + 0.5) / GROUND_PARTICLES_COUNT) * FLOOR_EXACT_RADIUS
      const currentAngle = index * goldenRatioAngle
      offsets[index * 2] = Math.cos(currentAngle) * radiusFraction
      offsets[index * 2 + 1] = Math.sin(currentAngle) * radiusFraction
    }
    return offsets
  }, [])

  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const particleMaterialRef = useRef<THREE.PointsMaterial>(null)
  const particleTexture = useMemo(() => createParticleTexture(), [])

  const flickerPhases = useMemo(
    () =>
      new Float32Array(STATIC_PARTICLE_COUNT).map(
        () => Math.random() * Math.PI * 2,
      ),
    [],
  )
  const flickerFrequencies = useMemo(
    () =>
      new Float32Array(STATIC_PARTICLE_COUNT).map(
        () => 1.5 + Math.random() * 3.5,
      ),
    [],
  )
  const breathingPhases = useMemo(
    () =>
      new Float32Array(STATIC_PARTICLE_COUNT).map(
        () => Math.random() * Math.PI * 2,
      ),
    [],
  )
  const vortexPhases = useMemo(
    () =>
      new Float32Array(STATIC_PARTICLE_COUNT).map(
        () => (Math.random() - 0.5) * Math.PI * 2,
      ),
    [],
  )

  useEffect(() => {
    const poseData = loadedParticlesMapRef.current.get(currentPose) || getCachedParticlePoseData(currentPose)
    if (poseData && poseData.positions.length >= STATIC_PARTICLE_COUNT * 3) {
      workingPositions.set(poseData.positions.subarray(0, STATIC_PARTICLE_COUNT * 3))
      workingColors.set(poseData.colors.subarray(0, STATIC_PARTICLE_COUNT * 3))

      if (geometryRef.current) {
        const positionAttribute = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
        const colorAttribute = geometryRef.current.getAttribute('color') as THREE.BufferAttribute
        positionAttribute.needsUpdate = true
        colorAttribute.needsUpdate = true
      }
    }
  }, [currentPose, workingPositions, workingColors])

  useFrame((state) => {
    if (!geometryRef.current) return

    const sourceData = loadedParticlesMapRef.current.get(previousPose) || loadedParticlesMapRef.current.get(currentPose) || getCachedParticlePoseData(previousPose) || getCachedParticlePoseData(currentPose)
    const targetData = loadedParticlesMapRef.current.get(currentPose) || getCachedParticlePoseData(currentPose) || sourceData

    if (!targetData) return
    const effectiveSource = sourceData || targetData

    let transitionActivityFactor = 0
    if (isTransitioning) {
      const appearanceNormalizedProgress = Math.min(Math.max(transitionProgress / 0.25, 0), 1)
      const disappearanceNormalizedProgress = Math.min(Math.max((transitionProgress - 0.75) / 0.25, 0), 1)
      if (transitionProgress < 0.25) {
        transitionActivityFactor = appearanceNormalizedProgress * appearanceNormalizedProgress * (3.0 - 2.0 * appearanceNormalizedProgress)
      } else if (transitionProgress < 0.75) {
        transitionActivityFactor = 1.0
      } else {
        transitionActivityFactor = 1.0 - disappearanceNormalizedProgress * disappearanceNormalizedProgress * (3.0 - 2.0 * disappearanceNormalizedProgress)
      }
    }

    const currentParticleOpacity =
      RESTING_PARTICLE_OPACITY +
      (ACTIVE_PARTICLE_OPACITY - RESTING_PARTICLE_OPACITY) * transitionActivityFactor
    const currentParticleSize =
      RESTING_PARTICLE_SIZE +
      (ACTIVE_PARTICLE_SIZE - RESTING_PARTICLE_SIZE) * transitionActivityFactor

    const time = state.clock.getElapsedTime()
    const positionAttribute = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
    const colorAttribute = geometryRef.current.getAttribute('color') as THREE.BufferAttribute

    const easedT = easeInOutCubic(Math.min(Math.max(transitionProgress, 0), 1.0))
    const transitionPulse = isTransitioning ? Math.sin(transitionProgress * Math.PI) : 0

    const breathCycle = Math.sin(time * 1.15)
    const energyMultiplier = 1.0 + transitionPulse * 0.65

    for (let index = 0; index < STATIC_PARTICLE_COUNT; index++) {
      const coord = index * 3
      const isBodyParticle = index < BODY_PARTICLES_COUNT

      let currentX: number
      let currentY: number
      let currentZ: number

      if (isBodyParticle) {
        const sourceX = effectiveSource.positions[coord]
        const sourceY = effectiveSource.positions[coord + 1]
        const sourceZ = effectiveSource.positions[coord + 2]

        const targetX = targetData.positions[coord]
        const targetY = targetData.positions[coord + 1]
        const targetZ = targetData.positions[coord + 2]

        if (isTransitioning) {
          currentX = sourceX + (targetX - sourceX) * easedT
          currentY = sourceY + (targetY - sourceY) * easedT
          currentZ = sourceZ + (targetZ - sourceZ) * easedT

          if (transitionPulse > 0.001) {
            const particleVortexWave =
              Math.sin(vortexPhases[index] + easedT * Math.PI * 2) *
              transitionPulse *
              0.045
            currentX += particleVortexWave
            currentY += Math.cos(vortexPhases[index] * 2 + easedT * Math.PI) * transitionPulse * 0.035
            currentZ += particleVortexWave * 0.75
          }
        } else {
          currentX = targetX
          currentY = targetY
          currentZ = targetZ
        }

        if (currentY > 0.35 && currentY < 1.45) {
          const heightGradient = (currentY - 0.35) / 1.1
          const breathingAmplitude = Math.sin(heightGradient * Math.PI) * 0.008
          currentX += Math.cos(breathingPhases[index]) * breathingAmplitude * breathCycle
          currentZ += Math.sin(breathingPhases[index]) * breathingAmplitude * breathCycle
        }
      } else {
        const groundIndex = index - BODY_PARTICLES_COUNT
        const targetGroundX = groundSpiralOffsets[groundIndex * 2]
        const targetGroundZ = groundSpiralOffsets[groundIndex * 2 + 1]

        if (isTransitioning) {
          const liftHeight = transitionPulse * (0.12 + (groundIndex % 7) * 0.035)
          const lateralWaviness = Math.sin(vortexPhases[index] + easedT * Math.PI * 2) * transitionPulse * 0.08
          currentX = targetGroundX + lateralWaviness
          currentY = 0.002 + liftHeight
          currentZ = targetGroundZ + lateralWaviness * 0.7
        } else {
          currentX = targetGroundX
          currentY = 0.002
          currentZ = targetGroundZ
        }
      }

      workingPositions[coord] = currentX
      workingPositions[coord + 1] = currentY
      workingPositions[coord + 2] = currentZ

      const flicker =
        0.82 + Math.sin(time * flickerFrequencies[index] + flickerPhases[index]) * 0.18

      let baseColorR: number
      let baseColorG: number
      let baseColorB: number

      if (isBodyParticle) {
        const sourceR = effectiveSource.colors[coord]
        const sourceG = effectiveSource.colors[coord + 1]
        const sourceB = effectiveSource.colors[coord + 2]

        const targetR = targetData.colors[coord]
        const targetG = targetData.colors[coord + 1]
        const targetB = targetData.colors[coord + 2]

        if (isTransitioning) {
          baseColorR = (sourceR + (targetR - sourceR) * easedT) * flicker * energyMultiplier
          baseColorG = (sourceG + (targetG - sourceG) * easedT) * flicker * energyMultiplier
          baseColorB = (sourceB + (targetB - sourceB) * easedT) * flicker * energyMultiplier
        } else {
          baseColorR = targetR * flicker
          baseColorG = targetG * flicker
          baseColorB = targetB * flicker
        }
      } else {
        const groundDistanceFraction = Math.sqrt(currentX * currentX + currentZ * currentZ) / FLOOR_EXACT_RADIUS
        baseColorR = (0.20 + groundDistanceFraction * 0.25) * flicker
        baseColorG = (0.65 + groundDistanceFraction * 0.20) * flicker
        baseColorB = 0.98 * flicker
      }

      let particleVisibilityScale: number
      if (isBodyParticle) {
        particleVisibilityScale = 0.72 + transitionPulse * 0.28
      } else {
        particleVisibilityScale = transitionPulse * 1.25
      }

      workingColors[coord] = Math.min(1.0, baseColorR * particleVisibilityScale)
      workingColors[coord + 1] = Math.min(1.0, baseColorG * particleVisibilityScale)
      workingColors[coord + 2] = Math.min(1.0, baseColorB * particleVisibilityScale)
    }

    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true

    if (particleMaterialRef.current) {
      particleMaterialRef.current.opacity = currentParticleOpacity
      particleMaterialRef.current.size = currentParticleSize
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={workingPositions}
          count={STATIC_PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={workingColors}
          count={STATIC_PARTICLE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={particleMaterialRef}
        size={RESTING_PARTICLE_SIZE}
        opacity={RESTING_PARTICLE_OPACITY}
        map={particleTexture}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
