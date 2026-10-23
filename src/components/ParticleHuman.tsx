import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { easeInOutCubic, createParticleTexture } from '../geometry/humanShapes'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { getAssetUrl } from '../utils/assetPath'

interface ParticleHumanProps {
  currentPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
  previousPose: PoseName
}

const STATIC_PARTICLE_COUNT = 18000
const BODY_PARTICLES_COUNT = Math.floor(STATIC_PARTICLE_COUNT * 0.88)
const GROUND_PARTICLES_COUNT = STATIC_PARTICLE_COUNT - BODY_PARTICLES_COUNT
const FLOOR_EXACT_RADIUS = 0.90
const RESTING_PARTICLE_OPACITY = 0.22
const ACTIVE_PARTICLE_OPACITY = 1.0
const RESTING_PARTICLE_SIZE = 0.015
const ACTIVE_PARTICLE_SIZE = 0.024

const POSE_SCALE_FACTORS: Partial<Record<PoseName, number>> = {
  tadasana: 0.92,
  sirsasana: 0.90,
  sarvangasana: 0.90,
  adho_mukha_vrksasana: 0.80,
  pincha_mayurasana: 0.84,
  virabhadrasana_i: 0.90,
}

type PoseBufferMap = Record<
  PoseName,
  { readonly positions: Float32Array; readonly colors: Float32Array }
>

interface ParticleMetadataRecord {
  posOffset: number
  posCount: number
  colOffset: number
  colCount: number
}

type ParticleMetadata = Record<string, ParticleMetadataRecord>

export function ParticleHuman({
  currentPose,
  isTransitioning,
  transitionProgress,
  previousPose,
}: ParticleHumanProps) {
  const [bakedData, setBakedData] = useState<PoseBufferMap | null>(null)

  useEffect(() => {
    let isMounted = true

    Promise.all([
      fetch(getAssetUrl('/models/poses_baked_meta.json?t=' + Date.now()), { cache: 'no-store' }).then((response) => response.json()),
      fetch(getAssetUrl('/models/poses_baked.bin?t=' + Date.now()), { cache: 'no-store' }).then((response) => response.arrayBuffer()),
    ])
      .then(([metaData, binaryBuffer]: [ParticleMetadata, ArrayBuffer]) => {
        if (!isMounted) return
        const map = {} as PoseBufferMap
        for (const name of POSE_CYCLE) {
          const record = metaData[name]
          if (record) {
            let finalPositions: Float32Array
            const customScale = POSE_SCALE_FACTORS[name]

            if (customScale !== undefined) {
              finalPositions = new Float32Array(record.posCount)
              const rawPositions = new Float32Array(binaryBuffer, record.posOffset * 4, record.posCount)
              for (let coordIndex = 0; coordIndex < record.posCount; coordIndex += 3) {
                finalPositions[coordIndex] = rawPositions[coordIndex] * customScale
                finalPositions[coordIndex + 1] = rawPositions[coordIndex + 1] * customScale
                finalPositions[coordIndex + 2] = rawPositions[coordIndex + 2] * customScale
              }
            } else {
              finalPositions = new Float32Array(binaryBuffer, record.posOffset * 4, record.posCount)
            }

            map[name] = {
              positions: finalPositions,
              colors: new Float32Array(binaryBuffer, record.colOffset * 4, record.colCount),
            }
          }
        }
        setBakedData(map)
      })
      .catch((error) => {
        console.warn('Error loading baked particles:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

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
    if (!bakedData) return
    const initialPose = bakedData[currentPose] ?? bakedData['tadasana']
    if (initialPose && initialPose.positions.length >= STATIC_PARTICLE_COUNT * 3) {
      workingPositions.set(initialPose.positions.subarray(0, STATIC_PARTICLE_COUNT * 3))
      workingColors.set(initialPose.colors.subarray(0, STATIC_PARTICLE_COUNT * 3))

      if (geometryRef.current) {
        const positionAttribute = geometryRef.current.getAttribute(
          'position',
        ) as THREE.BufferAttribute
        const colorAttribute = geometryRef.current.getAttribute(
          'color',
        ) as THREE.BufferAttribute
        positionAttribute.needsUpdate = true
        colorAttribute.needsUpdate = true
      }
    }
  }, [bakedData, currentPose, workingPositions, workingColors])

  useFrame((state) => {
    if (!geometryRef.current || !bakedData) return

    const sourcePose = bakedData[previousPose] ?? bakedData['tadasana']
    const targetPose = bakedData[currentPose] ?? bakedData['tadasana']
    if (!sourcePose || !targetPose) return

    let transitionActivityFactor = 0.0
    if (isTransitioning) {
      if (transitionProgress < 0.25) {
        const appearanceNormalizedProgress = transitionProgress / 0.25
        transitionActivityFactor =
          appearanceNormalizedProgress *
          appearanceNormalizedProgress *
          (3.0 - 2.0 * appearanceNormalizedProgress)
      } else if (transitionProgress <= 0.72) {
        transitionActivityFactor = 1.0
      } else {
        const disappearanceNormalizedProgress = Math.max(
          0.0,
          (1.0 - transitionProgress) / 0.28,
        )
        transitionActivityFactor =
          disappearanceNormalizedProgress *
          disappearanceNormalizedProgress *
          (3.0 - 2.0 * disappearanceNormalizedProgress)
      }
    }

    const currentParticleOpacity =
      RESTING_PARTICLE_OPACITY +
      (ACTIVE_PARTICLE_OPACITY - RESTING_PARTICLE_OPACITY) * transitionActivityFactor
    const currentParticleSize =
      RESTING_PARTICLE_SIZE +
      (ACTIVE_PARTICLE_SIZE - RESTING_PARTICLE_SIZE) * transitionActivityFactor

    const time = state.clock.getElapsedTime()
    const positionAttribute = geometryRef.current.getAttribute(
      'position',
    ) as THREE.BufferAttribute
    const colorAttribute = geometryRef.current.getAttribute(
      'color',
    ) as THREE.BufferAttribute

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
        const sourceX = sourcePose.positions[coord]
        const sourceY = sourcePose.positions[coord + 1]
        const sourceZ = sourcePose.positions[coord + 2]

        const targetX = targetPose.positions[coord]
        const targetY = targetPose.positions[coord + 1]
        const targetZ = targetPose.positions[coord + 2]

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
        const sourceR = sourcePose.colors[coord]
        const sourceG = sourcePose.colors[coord + 1]
        const sourceB = sourcePose.colors[coord + 2]

        const targetR = targetPose.colors[coord]
        const targetG = targetPose.colors[coord + 1]
        const targetB = targetPose.colors[coord + 2]

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

  if (!bakedData) return null

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
