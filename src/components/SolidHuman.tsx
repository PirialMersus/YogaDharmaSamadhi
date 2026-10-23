import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PoseName } from '../geometry/poses'
import { getAssetUrl } from '../utils/assetPath'

interface SolidHumanProps {
  currentPose: PoseName
  previousPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
  onGeometriesReady?: () => void
}

interface PoseMetadataRecord {
  posOffset: number
  posCount: number
  normOffset: number
  normCount: number
  idxOffset: number
  idxCount: number
  height: number
}

interface SculptMetadata {
  poses: Record<PoseName, PoseMetadataRecord>
}

const POSE_SCALE_FACTORS: Partial<Record<PoseName, number>> = {
  tadasana: 0.92,
  sirsasana: 0.90,
  sarvangasana: 0.90,
  adho_mukha_vrksasana: 0.80,
  pincha_mayurasana: 0.84,
  virabhadrasana_i: 0.90,
}

function createCelestialFresnelMaterial(): THREE.MeshStandardMaterial {
  const celestialMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#030b20'),
    roughness: 0.28,
    metalness: 0.15,
    transparent: true,
    opacity: 1.0,
    depthWrite: true,
  })

  celestialMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      vec3 viewDirectionVector = normalize(vViewPosition);
      float fresnelIntensity = pow(1.0 - abs(dot(viewDirectionVector, normalize(vNormal))), 2.4);
      vec3 rimNeonColor = vec3(0.0, 0.9, 1.0);
      gl_FragColor.rgb += rimNeonColor * fresnelIntensity * 0.95;
      float verticalHeightPosition = vViewPosition.y;
      if (verticalHeightPosition < 0.3) {
        float baseAuraFactor = clamp((0.3 - verticalHeightPosition) / 0.3, 0.0, 1.0);
        gl_FragColor.rgb += vec3(0.85, 0.2, 0.95) * baseAuraFactor * 0.45;
      }
      gl_FragColor.rgb *= opacity;
      gl_FragColor.a = opacity;`,
    )
  }

  return celestialMaterial
}

export function SolidHuman({
  currentPose,
  previousPose,
  isTransitioning,
  transitionProgress,
  onGeometriesReady,
}: SolidHumanProps) {
  const geometriesCacheReference = useRef<Map<PoseName, THREE.BufferGeometry>>(new Map())
  const [geometriesReady, setGeometriesReady] = useState(false)

  const currentMeshMaterial = useRef<THREE.MeshStandardMaterial>(createCelestialFresnelMaterial())
  const previousMeshMaterial = useRef<THREE.MeshStandardMaterial>(createCelestialFresnelMaterial())

  useEffect(() => {
    let isCancelled = false

    Promise.all([
      fetch(getAssetUrl('/models/solid_sculpts.json?t=' + Date.now()), { cache: 'no-store' }).then((response) => response.json()),
      fetch(getAssetUrl('/models/solid_sculpts.bin?t=' + Date.now()), { cache: 'no-store' }).then((response) => response.arrayBuffer()),
    ])
      .then(([metadata, binaryBuffer]: [SculptMetadata, ArrayBuffer]) => {
        if (isCancelled) return

        const cacheMap = new Map<PoseName, THREE.BufferGeometry>()
        const poseNamesList = Object.keys(metadata.poses) as PoseName[]

        for (const poseName of poseNamesList) {
          const poseRecord = metadata.poses[poseName]
          if (!poseRecord) continue

          const positionArray = new Float32Array(
            binaryBuffer,
            poseRecord.posOffset,
            poseRecord.posCount,
          )
          const normalArray = new Float32Array(
            binaryBuffer,
            poseRecord.normOffset,
            poseRecord.normCount,
          )
          const indexArray = new Uint32Array(
            binaryBuffer,
            poseRecord.idxOffset,
            poseRecord.idxCount,
          )

          const geometryInstance = new THREE.BufferGeometry()
          const customScale = POSE_SCALE_FACTORS[poseName]

          if (customScale !== undefined) {
            const scaledPositions = new Float32Array(poseRecord.posCount)
            for (let coordIndex = 0; coordIndex < poseRecord.posCount; coordIndex += 3) {
              scaledPositions[coordIndex] = positionArray[coordIndex] * customScale
              scaledPositions[coordIndex + 1] = positionArray[coordIndex + 1] * customScale
              scaledPositions[coordIndex + 2] = positionArray[coordIndex + 2] * customScale
            }
            geometryInstance.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3))
          } else {
            geometryInstance.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
          }

          geometryInstance.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3))
          geometryInstance.setIndex(new THREE.BufferAttribute(indexArray, 1))

          cacheMap.set(poseName, geometryInstance)
        }

        geometriesCacheReference.current = cacheMap
        setGeometriesReady(true)
        if (onGeometriesReady) {
          onGeometriesReady()
        }
      })
      .catch((error) => {
        console.error('Error loading solid sculpts:', error)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useFrame(() => {
    if (!geometriesReady) return

    if (!isTransitioning) {
      currentMeshMaterial.current.opacity = 1.0
      currentMeshMaterial.current.depthWrite = true
      previousMeshMaterial.current.opacity = 0.0
      previousMeshMaterial.current.depthWrite = false
      return
    }

    const currentEasedProgress = Math.min(Math.max(transitionProgress, 0), 1)
    const dissolutionLimit = 0.35
    const materializationLimit = 0.65

    if (currentEasedProgress < dissolutionLimit) {
      const dissolveFraction = currentEasedProgress / dissolutionLimit
      previousMeshMaterial.current.opacity = Math.max(0.0, 1.0 - dissolveFraction)
      previousMeshMaterial.current.depthWrite = false
      currentMeshMaterial.current.opacity = 0.0
      currentMeshMaterial.current.depthWrite = false
    } else if (currentEasedProgress > materializationLimit) {
      const materializeFraction =
        (currentEasedProgress - materializationLimit) / (1.0 - materializationLimit)
      previousMeshMaterial.current.opacity = 0.0
      previousMeshMaterial.current.depthWrite = false
      currentMeshMaterial.current.opacity = Math.min(1.0, materializeFraction)
      currentMeshMaterial.current.depthWrite = materializeFraction > 0.95
    } else {
      previousMeshMaterial.current.opacity = 0.0
      previousMeshMaterial.current.depthWrite = false
      currentMeshMaterial.current.opacity = 0.0
      currentMeshMaterial.current.depthWrite = false
    }
  })

  if (!geometriesReady) return null

  const currentGeometry = geometriesCacheReference.current.get(currentPose)
  const previousGeometry = geometriesCacheReference.current.get(previousPose)

  const isCurrentRendered =
    currentGeometry !== undefined && (!isTransitioning || transitionProgress > 0.65)
  const isPreviousRendered =
    previousGeometry !== undefined &&
    isTransitioning &&
    transitionProgress < 0.35 &&
    previousGeometry !== currentGeometry

  return (
    <group>
      {isCurrentRendered && (
        <mesh
          geometry={currentGeometry}
          material={currentMeshMaterial.current}
          frustumCulled={false}
        />
      )}
      {isPreviousRendered && (
        <mesh
          geometry={previousGeometry}
          material={previousMeshMaterial.current}
          frustumCulled={false}
        />
      )}
    </group>
  )
}
