import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { loadSculptGeometryData, getCachedSculptGeometryData, preloadPoseAssets } from '../services/poseAssetLoader'

interface SolidHumanProps {
  currentPose: PoseName
  previousPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
  onGeometriesReady?: () => void
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
  const [, setRevision] = useState(0)

  const currentMeshMaterial = useRef<THREE.MeshStandardMaterial>(createCelestialFresnelMaterial())
  const previousMeshMaterial = useRef<THREE.MeshStandardMaterial>(createCelestialFresnelMaterial())

  useEffect(() => {
    let isCancelled = false

    const nextIndex = (POSE_CYCLE.indexOf(currentPose) + 1) % POSE_CYCLE.length
    const nextPoseName = POSE_CYCLE[nextIndex]
    preloadPoseAssets(nextPoseName)

    loadSculptGeometryData(currentPose).then((geometry) => {
      if (isCancelled) return
      geometriesCacheReference.current.set(currentPose, geometry)
      setRevision((prev) => prev + 1)
      if (onGeometriesReady) {
        onGeometriesReady()
      }
    })

    if (previousPose && !geometriesCacheReference.current.has(previousPose)) {
      loadSculptGeometryData(previousPose).then((geometry) => {
        if (isCancelled) return
        geometriesCacheReference.current.set(previousPose, geometry)
        setRevision((prev) => prev + 1)
      })
    }

    return () => {
      isCancelled = true
    }
  }, [currentPose, previousPose, onGeometriesReady])

  useFrame(() => {
    const currentGeometry = geometriesCacheReference.current.get(currentPose) || getCachedSculptGeometryData(currentPose)
    if (!currentGeometry) return

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

  const currentGeometry =
    geometriesCacheReference.current.get(currentPose) || getCachedSculptGeometryData(currentPose)
  const previousGeometry =
    geometriesCacheReference.current.get(previousPose) || getCachedSculptGeometryData(previousPose)

  const isCurrentRendered =
    currentGeometry !== undefined && (!isTransitioning || transitionProgress > 0.65)
  const isPreviousRendered =
    previousGeometry !== undefined &&
    isTransitioning &&
    transitionProgress < 0.35 &&
    previousGeometry !== currentGeometry

  return (
    <group>
      {isCurrentRendered && currentGeometry && (
        <mesh
          geometry={currentGeometry}
          material={currentMeshMaterial.current}
          frustumCulled={false}
        />
      )}
      {isPreviousRendered && previousGeometry && (
        <mesh
          geometry={previousGeometry}
          material={previousMeshMaterial.current}
          frustumCulled={false}
        />
      )}
    </group>
  )
}
