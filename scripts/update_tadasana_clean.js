import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

global.self = global
global.window = global

class ProgressEventMock {
  constructor(type, eventInitDict = {}) {
    this.type = type
    this.lengthComputable = eventInitDict.lengthComputable || false
    this.loaded = eventInitDict.loaded || 0
    this.total = eventInitDict.total || 0
  }
}

globalThis.ProgressEvent = ProgressEventMock

const TOTAL_PARTICLES_COUNT = 18000
const BODY_PARTICLES_COUNT = Math.floor(TOTAL_PARTICLES_COUNT * 0.88)
const GROUND_PARTICLES_COUNT = TOTAL_PARTICLES_COUNT - BODY_PARTICLES_COUNT

async function run() {
  const tadasanaGlbPath = path.resolve('public/models/lily/tadasana.glb')
  const binaryBuffer = fs.readFileSync(tadasanaGlbPath)
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

  let bodyMesh = null
  let blockMesh = null

  parsedGltf.scene.traverse((sceneNode) => {
    if (sceneNode.isMesh && sceneNode.geometry) {
      const lowerCaseName = (sceneNode.name || '').toLowerCase()
      if (lowerCaseName.includes('lily')) {
        bodyMesh = sceneNode
      } else if (lowerCaseName.includes('foam')) {
        blockMesh = sceneNode
      }
    }
  })

  if (!bodyMesh || !blockMesh) {
    throw new Error('Could not find body or block mesh in tadasana.glb')
  }

  const rawBodyGeometry = bodyMesh.geometry.clone().applyMatrix4(bodyMesh.matrixWorld)
  const rawBlockGeometry = blockMesh.geometry.clone().applyMatrix4(blockMesh.matrixWorld)

  const unifiedScale = 1.75 / 5.62
  const bodyBoundingBox = new THREE.Box3().setFromBufferAttribute(rawBodyGeometry.attributes.position)
  const centerX = (bodyBoundingBox.min.x + bodyBoundingBox.max.x) / 2
  const centerZ = (bodyBoundingBox.min.z + bodyBoundingBox.max.z) / 2
  const minY = bodyBoundingBox.min.y

  const bodyPositionAttribute = rawBodyGeometry.attributes.position
  const bodyVertexCount = bodyPositionAttribute.count
  const scaledBodyPositions = new Float32Array(bodyVertexCount * 3)

  for (let index = 0; index < bodyVertexCount; index++) {
    scaledBodyPositions[index * 3] = (bodyPositionAttribute.getX(index) - centerX) * unifiedScale
    scaledBodyPositions[index * 3 + 1] = (bodyPositionAttribute.getY(index) - minY) * unifiedScale
    scaledBodyPositions[index * 3 + 2] = (bodyPositionAttribute.getZ(index) - centerZ) * unifiedScale
  }

  const normalizedBodyGeometry = new THREE.BufferGeometry()
  normalizedBodyGeometry.setAttribute('position', new THREE.BufferAttribute(scaledBodyPositions, 3))
  if (rawBodyGeometry.index) {
    normalizedBodyGeometry.setIndex(rawBodyGeometry.index.clone())
  }
  normalizedBodyGeometry.computeVertexNormals()

  const blockPositionAttribute = rawBlockGeometry.attributes.position
  const blockVertexCount = blockPositionAttribute.count
  const scaledBlockPositions = new Float32Array(blockVertexCount * 3)

  for (let index = 0; index < blockVertexCount; index++) {
    scaledBlockPositions[index * 3] = (blockPositionAttribute.getX(index) - centerX) * unifiedScale
    scaledBlockPositions[index * 3 + 1] = (blockPositionAttribute.getY(index) - minY) * unifiedScale
    scaledBlockPositions[index * 3 + 2] = (blockPositionAttribute.getZ(index) - centerZ) * unifiedScale
  }

  const normalizedBlockGeometry = new THREE.BufferGeometry()
  normalizedBlockGeometry.setAttribute('position', new THREE.BufferAttribute(scaledBlockPositions, 3))
  if (rawBlockGeometry.index) {
    normalizedBlockGeometry.setIndex(rawBlockGeometry.index.clone())
  }
  normalizedBlockGeometry.computeVertexNormals()

  const blockIndicesArray = Array.from(normalizedBlockGeometry.index.array)
  const blockPositionsArray = Array.from(scaledBlockPositions)
  const blockNormalsArray = Array.from(normalizedBlockGeometry.attributes.normal.array)

  const blockData = {
    positions: blockPositionsArray,
    normals: blockNormalsArray,
    indices: blockIndicesArray
  }

  const blockExportPath = path.resolve('public/models/tadasana_block.json')
  fs.writeFileSync(blockExportPath, JSON.stringify(blockData))
  console.log(`Saved block geometry to ${blockExportPath}`)

  const indexAttribute = normalizedBodyGeometry.index
  const triangleCount = indexAttribute.count / 3
  const cumulativeTriangleAreas = new Float64Array(triangleCount)
  let totalMeshArea = 0

  const vertexA = new THREE.Vector3()
  const vertexB = new THREE.Vector3()
  const vertexC = new THREE.Vector3()
  const edgeVectorAB = new THREE.Vector3()
  const edgeVectorAC = new THREE.Vector3()
  const normalCrossProduct = new THREE.Vector3()

  for (let i = 0; i < triangleCount; i++) {
    const indexA = indexAttribute.getX(i * 3)
    const indexB = indexAttribute.getX(i * 3 + 1)
    const indexC = indexAttribute.getX(i * 3 + 2)

    vertexA.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexA)
    vertexB.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexB)
    vertexC.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexC)

    edgeVectorAB.subVectors(vertexB, vertexA)
    edgeVectorAC.subVectors(vertexC, vertexA)
    normalCrossProduct.crossVectors(edgeVectorAB, edgeVectorAC)
    const area = normalCrossProduct.length() * 0.5

    totalMeshArea += area
    cumulativeTriangleAreas[i] = totalMeshArea
  }

  const particlePositions = new Float32Array(TOTAL_PARTICLES_COUNT * 3)
  const particleColors = new Float32Array(TOTAL_PARTICLES_COUNT * 3)
  let maximumHeight = 0

  for (let i = 0; i < BODY_PARTICLES_COUNT; i++) {
    const randomAreaThreshold = Math.random() * totalMeshArea
    let searchLow = 0
    let searchHigh = triangleCount - 1
    let selectedTriangleIndex = 0

    while (searchLow <= searchHigh) {
      const mid = Math.floor((searchLow + searchHigh) / 2)
      if (cumulativeTriangleAreas[mid] >= randomAreaThreshold) {
        selectedTriangleIndex = mid
        searchHigh = mid - 1
      } else {
        searchLow = mid + 1
      }
    }

    const indexA = indexAttribute.getX(selectedTriangleIndex * 3)
    const indexB = indexAttribute.getX(selectedTriangleIndex * 3 + 1)
    const indexC = indexAttribute.getX(selectedTriangleIndex * 3 + 2)

    vertexA.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexA)
    vertexB.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexB)
    vertexC.fromBufferAttribute(normalizedBodyGeometry.attributes.position, indexC)

    let randomParam1 = Math.random()
    let randomParam2 = Math.random()
    if (randomParam1 + randomParam2 > 1) {
      randomParam1 = 1 - randomParam1
      randomParam2 = 1 - randomParam2
    }

    const pointX = vertexA.x + randomParam1 * (vertexB.x - vertexA.x) + randomParam2 * (vertexC.x - vertexA.x)
    const pointY = vertexA.y + randomParam1 * (vertexB.y - vertexA.y) + randomParam2 * (vertexC.y - vertexA.y)
    const pointZ = vertexA.z + randomParam1 * (vertexB.z - vertexA.z) + randomParam2 * (vertexC.z - vertexA.z)

    if (pointY > maximumHeight) maximumHeight = pointY

    particlePositions[i * 3] = Number(pointX.toFixed(4))
    particlePositions[i * 3 + 1] = Number(pointY.toFixed(4))
    particlePositions[i * 3 + 2] = Number(pointZ.toFixed(4))

    const heightRatio = Math.max(0, Math.min(1, pointY / 1.75))
    particleColors[i * 3] = Number((0.68 + heightRatio * 0.28).toFixed(3))
    particleColors[i * 3 + 1] = Number((0.80 + heightRatio * 0.18).toFixed(3))
    particleColors[i * 3 + 2] = Number((0.96 + heightRatio * 0.04).toFixed(3))
  }

  for (let i = 0; i < GROUND_PARTICLES_COUNT; i++) {
    const globalParticleIndex = BODY_PARTICLES_COUNT + i
    const randomRadius = Math.sqrt(Math.random()) * 1.5
    const randomAngle = Math.random() * Math.PI * 2
    const groundX = Math.cos(randomAngle) * randomRadius
    const groundZ = Math.sin(randomAngle) * randomRadius
    const groundY = (Math.random() - 0.5) * 0.02

    particlePositions[globalParticleIndex * 3] = Number(groundX.toFixed(4))
    particlePositions[globalParticleIndex * 3 + 1] = Number(groundY.toFixed(4))
    particlePositions[globalParticleIndex * 3 + 2] = Number(groundZ.toFixed(4))

    const groundOpacity = Math.max(0, 1 - randomRadius / 1.5)
    particleColors[globalParticleIndex * 3] = Number((0.25 * groundOpacity).toFixed(3))
    particleColors[globalParticleIndex * 3 + 1] = Number((0.45 * groundOpacity).toFixed(3))
    particleColors[globalParticleIndex * 3 + 2] = Number((0.75 * groundOpacity).toFixed(3))
  }

  const bakedJsonPath = path.resolve('public/models/poses_baked.json')
  const bakedParticlesCollection = JSON.parse(fs.readFileSync(bakedJsonPath, 'utf8'))
  bakedParticlesCollection.tadasana = {
    positions: Array.from(particlePositions),
    colors: Array.from(particleColors),
    height: Number(maximumHeight.toFixed(4))
  }
  fs.writeFileSync(bakedJsonPath, JSON.stringify(bakedParticlesCollection))
  console.log(`Updated poses_baked.json for tadasana`)

  const finalIndices = new Uint32Array(normalizedBodyGeometry.index.array)
  const positionsFloatArray = new Float32Array(normalizedBodyGeometry.attributes.position.array)
  const normalsFloatArray = new Float32Array(normalizedBodyGeometry.attributes.normal.array)

  const newPosBuffer = Buffer.from(positionsFloatArray.buffer, positionsFloatArray.byteOffset, positionsFloatArray.byteLength)
  const newNormBuffer = Buffer.from(normalsFloatArray.buffer, normalsFloatArray.byteOffset, normalsFloatArray.byteLength)
  const newIdxBuffer = Buffer.from(finalIndices.buffer, finalIndices.byteOffset, finalIndices.byteLength)

  const newTadasanaChunk = Buffer.concat([newPosBuffer, newNormBuffer, newIdxBuffer])

  const sculptJsonPath = path.resolve('public/models/solid_sculpts.json')
  const sculptBinPath = path.resolve('public/models/solid_sculpts.bin')

  const sculptMetadata = JSON.parse(fs.readFileSync(sculptJsonPath, 'utf8'))
  const oldBinaryBuffer = fs.readFileSync(sculptBinPath)

  const oldTadasanaMeta = sculptMetadata.poses.tadasana
  const oldTadasanaTotalBytes = oldTadasanaMeta.idxOffset + oldTadasanaMeta.idxCount * 4
  const restBinary = oldBinaryBuffer.subarray(oldTadasanaTotalBytes)

  const newBinaryBuffer = Buffer.concat([newTadasanaChunk, restBinary])
  fs.writeFileSync(sculptBinPath, newBinaryBuffer)
  console.log(`Updated solid_sculpts.bin`)

  const byteShift = newTadasanaChunk.length - oldTadasanaTotalBytes

  sculptMetadata.poses.tadasana = {
    posOffset: 0,
    posCount: positionsFloatArray.length,
    normOffset: newPosBuffer.length,
    normCount: normalsFloatArray.length,
    idxOffset: newPosBuffer.length + newNormBuffer.length,
    idxCount: finalIndices.length,
    height: Number(maximumHeight.toFixed(4))
  }

  const poseKeys = Object.keys(sculptMetadata.poses)
  for (let i = 1; i < poseKeys.length; i++) {
    const key = poseKeys[i]
    const entry = sculptMetadata.poses[key]
    entry.posOffset += byteShift
    entry.normOffset += byteShift
    entry.idxOffset += byteShift
  }

  fs.writeFileSync(sculptJsonPath, JSON.stringify(sculptMetadata, null, 2))
  console.log(`Updated solid_sculpts.json with offset shift ${byteShift}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
