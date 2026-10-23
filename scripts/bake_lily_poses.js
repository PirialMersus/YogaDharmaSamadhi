import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

globalThis.self = globalThis
class ProgressEventMock {
  constructor(eventType, eventData) {
    this.type = eventType
    Object.assign(this, eventData)
  }
}
globalThis.ProgressEvent = ProgressEventMock

const TOTAL_PARTICLES_COUNT = 18000
const BODY_PARTICLES_COUNT = Math.floor(TOTAL_PARTICLES_COUNT * 0.88)
const GROUND_PARTICLES_COUNT = TOTAL_PARTICLES_COUNT - BODY_PARTICLES_COUNT
const REFERENCE_STANDING_HEIGHT = 5.62
const TARGET_HUMAN_HEIGHT = 1.75
const UNIFIED_MODEL_SCALE_FACTOR = TARGET_HUMAN_HEIGHT / REFERENCE_STANDING_HEIGHT

const ASANA_DEFINITIONS = [
  { key: 'virabhadrasana_ii', file: 'virabhadrasana_ii.glb', name: 'Вирабхадрасана II' },
  { key: 'virabhadrasana_i', file: 'virabhadrasana_i.glb', name: 'Вирабхадрасана I' },
  { key: 'padangusthasana', file: 'padangusthasana.glb', name: 'Падангуштхасана' },
  { key: 'uttanasana', file: 'uttanasana.glb', name: 'Уттанасана' },
  { key: 'astavakrasana', file: 'astavakrasana.glb', name: 'Аштавакрасана' },
  { key: 'urdhva_dhanurasana', file: 'urdhva_dhanurasana.glb', name: 'Урдхва Дханурасана' },
  { key: 'savasana', file: 'savasana.glb', name: 'Шавасана' },
  { key: 'vriksasana', file: 'vriksasana.glb', name: 'Врикшасана' },
  { key: 'halasana', file: 'halasana.glb', name: 'Халасана' },
  { key: 'dhanurasana', file: 'dhanurasana.glb', name: 'Дханурасана' },
  { key: 'bujangasana', file: 'bujangasana.glb', name: 'Бхуджангасана' },
  { key: 'marjaryasana', file: 'marjaryasana.glb', name: 'Марджариасана' },
  { key: 'trikonasana', file: 'trikonasana.glb', name: 'Уттхита Триконасана' },
  { key: 'paschimottanasana', file: 'paschimottanasana.glb', name: 'Пашчимоттанасана' },
  { key: 'vasisthasana', file: 'vasisthasana.glb', name: 'Васиштхасана' },
  { key: 'tadasana', file: 'tadasana.glb', name: 'Тадасана' }
]

async function loadGlbMesh(glbFilePath) {
  const binaryBuffer = fs.readFileSync(glbFilePath)
  const gltfLoader = new GLTFLoader()
  const parsedGltf = await new Promise((resolve, reject) => {
    gltfLoader.parse(
      binaryBuffer.buffer.slice(binaryBuffer.byteOffset, binaryBuffer.byteOffset + binaryBuffer.byteLength),
      '',
      resolve,
      reject
    )
  })

  parsedGltf.scene.updateMatrixWorld(true)

  const candidateGeometries = []
  parsedGltf.scene.traverse((sceneNode) => {
    if (sceneNode.isMesh && sceneNode.geometry) {
      const lowerCaseName = (sceneNode.name || '').toLowerCase()
      const isMatOrAccessory = lowerCaseName.includes('mat') ||
                               lowerCaseName.includes('blanket') ||
                               lowerCaseName.includes('brick') ||
                               lowerCaseName.includes('chair')
      const vertexCount = sceneNode.geometry.attributes.position.count
      if (!isMatOrAccessory && vertexCount > 1000) {
        const clonedGeometry = sceneNode.geometry.clone()
        clonedGeometry.applyMatrix4(sceneNode.matrixWorld)
        candidateGeometries.push(clonedGeometry)
      }
    }
  })

  if (candidateGeometries.length === 0) {
    let largestMesh = null
    let maximumVertexCount = 0
    parsedGltf.scene.traverse((sceneNode) => {
      if (sceneNode.isMesh && sceneNode.geometry) {
        const vertexCount = sceneNode.geometry.attributes.position.count
        if (vertexCount > maximumVertexCount) {
          maximumVertexCount = vertexCount
          largestMesh = sceneNode
        }
      }
    })
    if (largestMesh) {
      const clonedGeometry = largestMesh.geometry.clone()
      clonedGeometry.applyMatrix4(largestMesh.matrixWorld)
      candidateGeometries.push(clonedGeometry)
    }
  }

  const mergedHumanGeometry = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  return mergedHumanGeometry
}

function processAndCenterGeometry(rawGeometry) {
  const boundingBox = new THREE.Box3().setFromBufferAttribute(rawGeometry.attributes.position)
  const centerX = (boundingBox.min.x + boundingBox.max.x) * 0.5
  const centerZ = (boundingBox.min.z + boundingBox.max.z) * 0.5
  const baseOffsetY = boundingBox.min.y

  const positionAttribute = rawGeometry.attributes.position
  const totalVertices = positionAttribute.count
  const scaledPositions = new Float32Array(totalVertices * 3)

  for (let vertexIndex = 0; vertexIndex < totalVertices; vertexIndex++) {
    const rawX = positionAttribute.getX(vertexIndex)
    const rawY = positionAttribute.getY(vertexIndex)
    const rawZ = positionAttribute.getZ(vertexIndex)

    scaledPositions[vertexIndex * 3] = (rawX - centerX) * UNIFIED_MODEL_SCALE_FACTOR
    scaledPositions[vertexIndex * 3 + 1] = (rawY - baseOffsetY) * UNIFIED_MODEL_SCALE_FACTOR
    scaledPositions[vertexIndex * 3 + 2] = (rawZ - centerZ) * UNIFIED_MODEL_SCALE_FACTOR
  }

  const normalizedGeometry = new THREE.BufferGeometry()
  normalizedGeometry.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3))
  if (rawGeometry.index) {
    normalizedGeometry.setIndex(rawGeometry.index.clone())
  }
  normalizedGeometry.computeVertexNormals()
  return normalizedGeometry
}

function sampleGeometryToParticles(normalizedGeometry) {
  const meshInstance = new THREE.Mesh(
    normalizedGeometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  )
  const surfaceSampler = new MeshSurfaceSampler(meshInstance).build()

  const particlePositions = []
  const particleColors = []
  const sampledPosition = new THREE.Vector3()
  const sampledNormal = new THREE.Vector3()

  let minimumHeight = Infinity
  let maximumHeight = -Infinity

  for (let particleIndex = 0; particleIndex < BODY_PARTICLES_COUNT; particleIndex++) {
    surfaceSampler.sample(sampledPosition, sampledNormal)
    const px = Number(sampledPosition.x.toFixed(4))
    const py = Number(sampledPosition.y.toFixed(4))
    const pz = Number(sampledPosition.z.toFixed(4))

    particlePositions.push(px, py, pz)
    minimumHeight = Math.min(minimumHeight, py)
    maximumHeight = Math.max(maximumHeight, py)

    const heightRatio = Math.min(Math.max(py / TARGET_HUMAN_HEIGHT, 0), 1)
    const colorIntensity = 0.65 + Math.random() * 0.35
    const isSpineCore = Math.abs(px) < 0.08 && py > 0.35

    if (isSpineCore && Math.random() < 0.35) {
      particleColors.push(
        Number((0.98 * colorIntensity).toFixed(3)),
        Number((0.98 * colorIntensity).toFixed(3)),
        Number((1.0 * colorIntensity).toFixed(3))
      )
    } else if (heightRatio < 0.25) {
      particleColors.push(
        Number((0.75 * colorIntensity).toFixed(3)),
        Number((0.35 * colorIntensity).toFixed(3)),
        Number((0.95 * colorIntensity).toFixed(3))
      )
    } else {
      particleColors.push(
        Number((0.30 * colorIntensity).toFixed(3)),
        Number((0.70 * colorIntensity).toFixed(3)),
        Number((1.0 * colorIntensity).toFixed(3))
      )
    }
  }

  const baseGroundY = minimumHeight + 0.03
  for (let groundIndex = 0; groundIndex < GROUND_PARTICLES_COUNT; groundIndex++) {
    const radialDistance = 0.2 + Math.sqrt(Math.random()) * 1.5
    const groundAngle = Math.random() * Math.PI * 2
    const verticalJitter = (Math.random() - 0.5) * 0.04
    particlePositions.push(
      Number((radialDistance * Math.cos(groundAngle)).toFixed(4)),
      Number((baseGroundY + verticalJitter).toFixed(4)),
      Number((radialDistance * Math.sin(groundAngle) * 0.85 + 0.05).toFixed(4))
    )
    const groundIntensity = 0.5 + Math.random() * 0.35
    if (Math.random() < 0.6) {
      particleColors.push(
        Number((0.75 * groundIntensity).toFixed(3)),
        Number((0.35 * groundIntensity).toFixed(3)),
        Number((0.9 * groundIntensity).toFixed(3))
      )
    } else {
      particleColors.push(
        Number((0.25 * groundIntensity).toFixed(3)),
        Number((0.55 * groundIntensity).toFixed(3)),
        Number((1.0 * groundIntensity).toFixed(3))
      )
    }
  }

  return {
    positions: particlePositions,
    colors: particleColors,
    height: Number(maximumHeight.toFixed(4))
  }
}

async function main() {
  const modelsDirectory = path.resolve('public/models/lily')
  const availableAsanas = []

  for (const asanaDef of ASANA_DEFINITIONS) {
    const fullGlbPath = path.join(modelsDirectory, asanaDef.file)
    if (fs.existsSync(fullGlbPath) && fs.statSync(fullGlbPath).size > 100000) {
      availableAsanas.push({ ...asanaDef, fullPath: fullGlbPath })
    }
  }

  console.log(`Found ${availableAsanas.length} valid GLB models in ${modelsDirectory}`)

  const bakedParticlesCollection = {}
  const sculptBinaryChunks = []
  const sculptPosesMetadata = {}
  let runningBinaryOffset = 0

  for (const asanaItem of availableAsanas) {
    console.log(`Processing ${asanaItem.name} (${asanaItem.key})...`)
    const rawGeometry = await loadGlbMesh(asanaItem.fullPath)
    const normalizedGeometry = processAndCenterGeometry(rawGeometry)

    const particleData = sampleGeometryToParticles(normalizedGeometry)
    bakedParticlesCollection[asanaItem.key] = {
      positions: particleData.positions,
      colors: particleData.colors
    }

    const positionAttribute = normalizedGeometry.attributes.position
    const normalAttribute = normalizedGeometry.attributes.normal
    const indexAttribute = normalizedGeometry.index

    let finalIndices
    if (indexAttribute) {
      finalIndices = new Uint32Array(indexAttribute.array)
    } else {
      finalIndices = new Uint32Array(positionAttribute.count)
      for (let i = 0; i < positionAttribute.count; i++) finalIndices[i] = i
    }

    const positionsFloatArray = new Float32Array(positionAttribute.array)
    const normalsFloatArray = new Float32Array(normalAttribute.array)

    const posOffset = runningBinaryOffset
    const posCount = positionsFloatArray.length
    runningBinaryOffset += positionsFloatArray.byteLength

    const normOffset = runningBinaryOffset
    const normCount = normalsFloatArray.length
    runningBinaryOffset += normalsFloatArray.byteLength

    const idxOffset = runningBinaryOffset
    const idxCount = finalIndices.length
    runningBinaryOffset += finalIndices.byteLength

    sculptPosesMetadata[asanaItem.key] = {
      posOffset,
      posCount,
      normOffset,
      normCount,
      idxOffset,
      idxCount,
      height: particleData.height
    }

    sculptBinaryChunks.push(Buffer.from(positionsFloatArray.buffer))
    sculptBinaryChunks.push(Buffer.from(normalsFloatArray.buffer))
    sculptBinaryChunks.push(Buffer.from(finalIndices.buffer))

    console.log(`  Done: ${posCount / 3} vertices, ${idxCount / 3} faces, height: ${particleData.height}m`)
  }

  const bakedJsonOutputPath = path.resolve('public/models/poses_baked.json')
  fs.writeFileSync(bakedJsonOutputPath, JSON.stringify(bakedParticlesCollection))
  console.log(`Wrote particles to ${bakedJsonOutputPath}`)

  const sculptJsonOutputPath = path.resolve('public/models/solid_sculpts.json')
  fs.writeFileSync(sculptJsonOutputPath, JSON.stringify({ poses: sculptPosesMetadata }))
  console.log(`Wrote sculpt metadata to ${sculptJsonOutputPath}`)

  const sculptBinOutputPath = path.resolve('public/models/solid_sculpts.bin')
  const mergedSculptBinaryBuffer = Buffer.concat(sculptBinaryChunks)
  fs.writeFileSync(sculptBinOutputPath, mergedSculptBinaryBuffer)
  console.log(`Wrote sculpt binary (${mergedSculptBinaryBuffer.length} bytes) to ${sculptBinOutputPath}`)
}

main().catch(console.error)
