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

  const rawBodyGeometry = bodyMesh.geometry.clone().applyMatrix4(bodyMesh.matrixWorld)
  const rawBlockGeometry = blockMesh.geometry.clone()

  const unifiedScale = 1.75 / 5.62
  const bodyBoundingBox = new THREE.Box3().setFromBufferAttribute(rawBodyGeometry.attributes.position)
  const centerX = (bodyBoundingBox.min.x + bodyBoundingBox.max.x) / 2
  const centerZ = (bodyBoundingBox.min.z + bodyBoundingBox.max.z) / 2
  const minY = bodyBoundingBox.min.y

  rawBlockGeometry.applyMatrix4(blockMesh.matrixWorld)

  const blockPositionAttribute = rawBlockGeometry.attributes.position
  const blockNormalAttribute = rawBlockGeometry.attributes.normal
  const blockUvAttribute = rawBlockGeometry.attributes.uv
  const blockVertexCount = blockPositionAttribute.count

  const scaledBlockPositions = new Float32Array(blockVertexCount * 3)
  for (let index = 0; index < blockVertexCount; index++) {
    scaledBlockPositions[index * 3] = (blockPositionAttribute.getX(index) - centerX) * unifiedScale
    scaledBlockPositions[index * 3 + 1] = (blockPositionAttribute.getY(index) - minY) * unifiedScale
    scaledBlockPositions[index * 3 + 2] = (blockPositionAttribute.getZ(index) - centerZ) * unifiedScale
  }

  const blockNormalsArray = Array.from(blockNormalAttribute.array)
  const blockUvsArray = blockUvAttribute ? Array.from(blockUvAttribute.array) : []
  const blockIndicesArray = Array.from(rawBlockGeometry.index.array)

  const blockData = {
    positions: Array.from(scaledBlockPositions),
    normals: blockNormalsArray,
    uvs: blockUvsArray,
    indices: blockIndicesArray
  }

  const blockExportPath = path.resolve('public/models/tadasana_block.json')
  fs.writeFileSync(blockExportPath, JSON.stringify(blockData))
  console.log(`Saved perfect block geometry with UV and normals (${blockVertexCount} verts) to ${blockExportPath}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
