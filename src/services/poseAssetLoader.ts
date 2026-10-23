import * as THREE from 'three'
import type { PoseName } from '../geometry/poses'
import { getAssetUrl } from '../utils/assetPath'

interface ParticleManifestItem {
  posCount: number
  colCount: number
  file: string
}

interface SculptManifestItem {
  posCount: number
  normCount: number
  idxCount: number
  height: number
  file: string
}

interface ChunksManifest {
  particles: Record<string, ParticleManifestItem>
  sculpts: Record<string, SculptManifestItem>
}

export interface LoadedParticlePose {
  positions: Float32Array
  colors: Float32Array
}

const POSE_SCALE_FACTORS: Partial<Record<PoseName, number>> = {
  tadasana: 0.92,
  sirsasana: 0.90,
  sarvangasana: 0.90,
  adho_mukha_vrksasana: 0.80,
  pincha_mayurasana: 0.84,
  virabhadrasana_i: 0.90,
}

let cachedManifestPromise: Promise<ChunksManifest> | null = null
const particleMemoryCache = new Map<PoseName, LoadedParticlePose>()
const sculptMemoryCache = new Map<PoseName, THREE.BufferGeometry>()
const pendingParticleRequests = new Map<PoseName, Promise<LoadedParticlePose>>()
const pendingSculptRequests = new Map<PoseName, Promise<THREE.BufferGeometry>>()

async function fetchManifest(): Promise<ChunksManifest> {
  if (!cachedManifestPromise) {
    cachedManifestPromise = fetch(getAssetUrl('/models/chunks/manifest.json'))
      .then((response) => response.json())
      .catch((error) => {
        cachedManifestPromise = null
        throw error
      })
  }
  return cachedManifestPromise
}

export async function loadParticlePoseData(poseName: PoseName): Promise<LoadedParticlePose> {
  const existingCached = particleMemoryCache.get(poseName)
  if (existingCached) {
    return existingCached
  }

  const existingPending = pendingParticleRequests.get(poseName)
  if (existingPending) {
    return existingPending
  }

  const requestPromise = (async () => {
    const manifest = await fetchManifest()
    const metadata = manifest.particles[poseName]
    if (!metadata) {
      throw new Error(`Particle metadata not found for pose: ${poseName}`)
    }

    const binaryResponse = await fetch(getAssetUrl(`/models/chunks/particles/${metadata.file}`))
    const arrayBuffer = await binaryResponse.arrayBuffer()

    const rawPositions = new Float32Array(arrayBuffer, 0, metadata.posCount)
    const rawColors = new Float32Array(arrayBuffer, metadata.posCount * 4, metadata.colCount)

    const scaleFactor = POSE_SCALE_FACTORS[poseName]
    let finalPositions: Float32Array

    if (scaleFactor !== undefined && scaleFactor !== 1.0) {
      finalPositions = new Float32Array(metadata.posCount)
      for (let coordinateIndex = 0; coordinateIndex < metadata.posCount; coordinateIndex += 3) {
        finalPositions[coordinateIndex] = rawPositions[coordinateIndex] * scaleFactor
        finalPositions[coordinateIndex + 1] = rawPositions[coordinateIndex + 1] * scaleFactor
        finalPositions[coordinateIndex + 2] = rawPositions[coordinateIndex + 2] * scaleFactor
      }
    } else {
      finalPositions = rawPositions
    }

    const loadedPose: LoadedParticlePose = {
      positions: finalPositions,
      colors: rawColors,
    }

    particleMemoryCache.set(poseName, loadedPose)
    pendingParticleRequests.delete(poseName)
    return loadedPose
  })()

  pendingParticleRequests.set(poseName, requestPromise)
  return requestPromise
}

export async function loadSculptGeometryData(poseName: PoseName): Promise<THREE.BufferGeometry> {
  const existingGeometry = sculptMemoryCache.get(poseName)
  if (existingGeometry) {
    return existingGeometry
  }

  const existingPending = pendingSculptRequests.get(poseName)
  if (existingPending) {
    return existingPending
  }

  const requestPromise = (async () => {
    const manifest = await fetchManifest()
    const metadata = manifest.sculpts[poseName]
    if (!metadata) {
      throw new Error(`Sculpt metadata not found for pose: ${poseName}`)
    }

    const binaryResponse = await fetch(getAssetUrl(`/models/chunks/sculpts/${metadata.file}`))
    const arrayBuffer = await binaryResponse.arrayBuffer()

    const positionsByteOffset = 0
    const normalsByteOffset = metadata.posCount * 4
    const indicesByteOffset = (metadata.posCount + metadata.normCount) * 4

    const rawPositions = new Float32Array(arrayBuffer, positionsByteOffset, metadata.posCount)
    const normalsArray = new Float32Array(arrayBuffer, normalsByteOffset, metadata.normCount)
    const indicesArray = new Uint32Array(arrayBuffer, indicesByteOffset, metadata.idxCount)

    const scaleFactor = POSE_SCALE_FACTORS[poseName]
    let finalPositions: Float32Array

    if (scaleFactor !== undefined && scaleFactor !== 1.0) {
      finalPositions = new Float32Array(metadata.posCount)
      for (let coordinateIndex = 0; coordinateIndex < metadata.posCount; coordinateIndex += 3) {
        finalPositions[coordinateIndex] = rawPositions[coordinateIndex] * scaleFactor
        finalPositions[coordinateIndex + 1] = rawPositions[coordinateIndex + 1] * scaleFactor
        finalPositions[coordinateIndex + 2] = rawPositions[coordinateIndex + 2] * scaleFactor
      }
    } else {
      finalPositions = rawPositions
    }

    const bufferGeometry = new THREE.BufferGeometry()
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3))
    bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normalsArray, 3))
    bufferGeometry.setIndex(new THREE.BufferAttribute(indicesArray, 1))

    sculptMemoryCache.set(poseName, bufferGeometry)
    pendingSculptRequests.delete(poseName)
    return bufferGeometry
  })()

  pendingSculptRequests.set(poseName, requestPromise)
  return requestPromise
}

export function getCachedParticlePoseData(poseName: PoseName): LoadedParticlePose | null {
  return particleMemoryCache.get(poseName) || null
}

export function getCachedSculptGeometryData(poseName: PoseName): THREE.BufferGeometry | null {
  return sculptMemoryCache.get(poseName) || null
}

export function preloadPoseAssets(poseName: PoseName): void {
  void loadParticlePoseData(poseName)
  void loadSculptGeometryData(poseName)
}
