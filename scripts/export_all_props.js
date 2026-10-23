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
  tadasana: 'public/models/lily/tadasana.glb',
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

function isMatMesh(name) {
  const cleanName = name.toLowerCase().replace(/material/g, '')
  return cleanName.includes('mat') || cleanName.includes('wall') || cleanName.includes('floor')
}

async function processAll() {
  const propsCollection = {}

  for (const [poseKey, filePath] of Object.entries(POSE_FILES)) {
    const gltf = await parseGlb(filePath)
    gltf.scene.updateMatrixWorld(true)

    const humanMeshes = []
    const propMeshes = []

    gltf.scene.traverse((node) => {
      if (node.isMesh && node.geometry) {
        const name = node.name || ''
        const lower = name.toLowerCase()
        if (isHumanMesh(name)) {
          humanMeshes.push(node)
        } else if (!isMatMesh(name) && !lower.startsWith('mesh')) {
          propMeshes.push(node)
        }
      }
    })

    if (humanMeshes.length === 0 || propMeshes.length === 0) continue

    const clonedHumanGeometries = humanMeshes.map((m) => {
      const g = m.geometry.clone()
      g.applyMatrix4(m.matrixWorld)
      return g
    })

    const mergedHuman = clonedHumanGeometries.length > 1
      ? BufferGeometryUtils.mergeGeometries(clonedHumanGeometries, false)
      : clonedHumanGeometries[0]

    const unifiedScale = 1.75 / 5.62
    const box = new THREE.Box3().setFromBufferAttribute(mergedHuman.attributes.position)
    const centerX = (box.min.x + box.max.x) / 2
    const centerZ = (box.min.z + box.max.z) / 2
    const minY = box.min.y

    const poseProps = []

    for (const propMesh of propMeshes) {
      const name = propMesh.name.toLowerCase()
      let propType = 'wood'
      if (name.includes('blanket')) propType = 'blanket'
      else if (name.includes('bolster')) propType = 'bolster'
      else if (name.includes('belt') || name.includes('strap')) propType = 'belt'
      else if (name.includes('metal') || name.includes('buckle')) propType = 'metal'
      else if (name.includes('foam') || name.includes('brick') || name.includes('block')) propType = 'wood'

      const cloned = propMesh.geometry.clone()
      cloned.applyMatrix4(propMesh.matrixWorld)

      const posAttr = cloned.attributes.position
      const count = posAttr.count
      const scaledPositions = new Float32Array(count * 3)

      for (let i = 0; i < count; i++) {
        scaledPositions[i * 3] = (posAttr.getX(i) - centerX) * unifiedScale
        scaledPositions[i * 3 + 1] = (posAttr.getY(i) - minY) * unifiedScale
        scaledPositions[i * 3 + 2] = (posAttr.getZ(i) - centerZ) * unifiedScale
      }

      const normPropGeom = new THREE.BufferGeometry()
      normPropGeom.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3))
      if (cloned.attributes.normal) {
        normPropGeom.setAttribute('normal', cloned.attributes.normal.clone())
      } else {
        normPropGeom.computeVertexNormals()
      }
      if (cloned.attributes.uv) {
        normPropGeom.setAttribute('uv', cloned.attributes.uv.clone())
      }
      if (cloned.index) {
        normPropGeom.setIndex(cloned.index.clone())
      }

      poseProps.push({
        name: propMesh.name,
        type: propType,
        positions: Array.from(normPropGeom.attributes.position.array),
        normals: Array.from(normPropGeom.attributes.normal.array),
        uvs: normPropGeom.attributes.uv ? Array.from(normPropGeom.attributes.uv.array) : [],
        indices: normPropGeom.index ? Array.from(normPropGeom.index.array) : []
      })
    }

    if (poseProps.length > 0) {
      propsCollection[poseKey] = poseProps
      console.log(`Processed props for ${poseKey}: ${poseProps.length} props (${poseProps.map(p => p.type).join(', ')})`)
    }
  }

  const exportPath = path.resolve('public/models/props_collection.json')
  fs.writeFileSync(exportPath, JSON.stringify(propsCollection))
  console.log(`Finished export to ${exportPath}`)
}

processAll().catch(err => {
  console.error(err)
  process.exit(1)
})
