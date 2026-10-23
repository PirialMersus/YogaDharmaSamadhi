import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

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

const POSE_FILES = {
  supta_virasana: 'public/models/lily/supta_virasana.glb',
  sarvangasana: 'public/models/lily/sarvangasana.glb',
  halasana: 'public/models/lily/halasana.glb',
  viparita_karani: 'public/models/lily/viparita_karani.glb',
  baddha_konasana: 'public/models/lily/baddha_konasana.glb',
  supta_baddha_konasana: 'public/models/lily/supta_baddha_konasana.glb',
  supta_padangusthasana: 'public/models/lily/supta_padangusthasana.glb',
}

function parseGlb(filePath) {
  const binaryBuffer = fs.readFileSync(filePath)
  const gltfLoader = new GLTFLoader()
  return new Promise((resolve, reject) => {
    gltfLoader.parse(
      binaryBuffer.buffer.slice(binaryBuffer.byteOffset, binaryBuffer.byteOffset + binaryBuffer.byteLength),
      '',
      (gltf) => resolve(gltf),
      (err) => reject(err)
    )
  })
}

function isHumanMesh(name) {
  const lower = name.toLowerCase()
  return lower.includes('lily') || lower.includes('femaleskin')
}

async function run() {
  const metaPath = path.resolve('public/models/solid_sculpts.json')
  const binPath = path.resolve('public/models/solid_sculpts.bin')

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  const oldBin = fs.readFileSync(binPath)

  const poseKeys = Object.keys(meta.poses)
  const newChunks = []
  const newMetadataPoses = {}
  let currentOffset = 0

  for (const key of poseKeys) {
    if (POSE_FILES[key]) {
      const gltf = await parseGlb(POSE_FILES[key])
      gltf.scene.updateMatrixWorld(true)

      const humanMeshes = []
      gltf.scene.traverse((node) => {
        if (node.isMesh && node.geometry && isHumanMesh(node.name)) {
          humanMeshes.push(node)
        }
      })

      const cloned = humanMeshes.map(m => {
        const g = m.geometry.clone()
        g.applyMatrix4(m.matrixWorld)
        return g
      })

      const merged = cloned.length > 1
        ? BufferGeometryUtils.mergeGeometries(cloned, false)
        : cloned[0]

      const unifiedScale = 1.75 / 5.62
      const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
      const centerX = (box.min.x + box.max.x) / 2
      const centerZ = (box.min.z + box.max.z) / 2
      const minY = box.min.y

      const posAttr = merged.attributes.position
      const count = posAttr.count
      const scaled = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        scaled[i * 3] = (posAttr.getX(i) - centerX) * unifiedScale
        scaled[i * 3 + 1] = (posAttr.getY(i) - minY) * unifiedScale
        scaled[i * 3 + 2] = (posAttr.getZ(i) - centerZ) * unifiedScale
      }

      const cleanGeom = new THREE.BufferGeometry()
      cleanGeom.setAttribute('position', new THREE.BufferAttribute(scaled, 3))
      if (merged.index) {
        cleanGeom.setIndex(merged.index.clone())
      }
      cleanGeom.computeVertexNormals()

      const posArr = new Float32Array(cleanGeom.attributes.position.array)
      const normArr = new Float32Array(cleanGeom.attributes.normal.array)
      const idxArr = new Uint32Array(cleanGeom.index.array)

      const posBuf = Buffer.from(posArr.buffer, posArr.byteOffset, posArr.byteLength)
      const normBuf = Buffer.from(normArr.buffer, normArr.byteOffset, normArr.byteLength)
      const idxBuf = Buffer.from(idxArr.buffer, idxArr.byteOffset, idxArr.byteLength)

      const posOffset = currentOffset
      currentOffset += posBuf.length
      newChunks.push(posBuf)

      const normOffset = currentOffset
      currentOffset += normBuf.length
      newChunks.push(normBuf)

      const idxOffset = currentOffset
      currentOffset += idxBuf.length
      newChunks.push(idxBuf)

      newMetadataPoses[key] = {
        posOffset,
        posCount: posArr.length,
        normOffset,
        normCount: normArr.length,
        idxOffset,
        idxCount: idxArr.length,
        height: meta.poses[key].height
      }
      console.log(`Cleaned human mesh for ${key}: ${count} vertices (was ${meta.poses[key].posCount / 3})`)
    } else {
      const p = meta.poses[key]
      const posBuf = oldBin.subarray(p.posOffset, p.posOffset + p.posCount * 4)
      const normBuf = oldBin.subarray(p.normOffset, p.normOffset + p.normCount * 4)
      const idxBuf = oldBin.subarray(p.idxOffset, p.idxOffset + p.idxCount * 4)

      const posOffset = currentOffset
      currentOffset += posBuf.length
      newChunks.push(posBuf)

      const normOffset = currentOffset
      currentOffset += normBuf.length
      newChunks.push(normBuf)

      const idxOffset = currentOffset
      currentOffset += idxBuf.length
      newChunks.push(idxBuf)

      newMetadataPoses[key] = {
        posOffset,
        posCount: p.posCount,
        normOffset,
        normCount: p.normCount,
        idxOffset,
        idxCount: p.idxCount,
        height: p.height
      }
    }
  }

  const finalBin = Buffer.concat(newChunks)
  fs.writeFileSync(binPath, finalBin)
  fs.writeFileSync(metaPath, JSON.stringify({ poses: newMetadataPoses }, null, 2))
  console.log('Successfully updated solid_sculpts.bin and solid_sculpts.json')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
