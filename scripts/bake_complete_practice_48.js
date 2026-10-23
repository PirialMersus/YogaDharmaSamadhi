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

function loadGltfWithoutTextures(modelDir) {
  const gltfPath = path.join(modelDir, 'scene.gltf')
  const gltfJson = JSON.parse(fs.readFileSync(gltfPath, 'utf8'))
  delete gltfJson.textures
  delete gltfJson.images
  delete gltfJson.materials

  for (const mesh of gltfJson.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      delete primitive.material
    }
  }

  for (const buffer of gltfJson.buffers || []) {
    const binPath = path.join(modelDir, buffer.uri)
    if (fs.existsSync(binPath)) {
      const data = fs.readFileSync(binPath)
      buffer.uri = `data:application/octet-stream;base64,${data.toString('base64')}`
    }
  }

  const loader = new GLTFLoader()
  return new Promise((resolve, reject) => {
    loader.parse(JSON.stringify(gltfJson), '', resolve, reject)
  })
}

async function loadLegacyMesh(modelDir, targetHeight) {
  const gltf = await loadGltfWithoutTextures(modelDir)
  gltf.scene.updateMatrixWorld(true)
  const candidateGeometries = []
  gltf.scene.traverse((sceneNode) => {
    if (sceneNode.isMesh && sceneNode.geometry) {
      const clonedGeometry = sceneNode.geometry.clone()
      clonedGeometry.applyMatrix4(sceneNode.matrixWorld)
      candidateGeometries.push(clonedGeometry)
    }
  })

  const merged = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
  const rawHeight = box.max.y - box.min.y
  const scale = targetHeight / rawHeight
  const centerX = (box.min.x + box.max.x) * 0.5
  const centerZ = (box.min.z + box.max.z) * 0.5
  const minY = box.min.y

  const posAttr = merged.attributes.position
  const count = posAttr.count
  const scaled = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    scaled[i * 3] = (posAttr.getX(i) - centerX) * scale
    scaled[i * 3 + 1] = (posAttr.getY(i) - minY) * scale
    scaled[i * 3 + 2] = (posAttr.getZ(i) - centerZ) * scale
  }

  const normalized = new THREE.BufferGeometry()
  normalized.setAttribute('position', new THREE.BufferAttribute(scaled, 3))
  if (merged.index) {
    normalized.setIndex(merged.index.clone())
  }
  normalized.computeVertexNormals()
  return normalized
}

async function loadLilyMesh(glbFilePath) {
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
                               lowerCaseName.includes('chair') ||
                               lowerCaseName.includes('wall') ||
                               lowerCaseName.includes('strap') ||
                               lowerCaseName.includes('bolster')
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

  const merged = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  const UNIFIED_SCALE = 1.75 / 5.62
  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
  const centerX = (box.min.x + box.max.x) * 0.5
  const centerZ = (box.min.z + box.max.z) * 0.5
  const minY = box.min.y

  const posAttr = merged.attributes.position
  const count = posAttr.count
  const scaled = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    scaled[i * 3] = (posAttr.getX(i) - centerX) * UNIFIED_SCALE
    scaled[i * 3 + 1] = (posAttr.getY(i) - minY) * UNIFIED_SCALE
    scaled[i * 3 + 2] = (posAttr.getZ(i) - centerZ) * UNIFIED_SCALE
  }

  const normalized = new THREE.BufferGeometry()
  normalized.setAttribute('position', new THREE.BufferAttribute(scaled, 3))
  if (merged.index) {
    normalized.setIndex(merged.index.clone())
  }
  normalized.computeVertexNormals()
  return normalized
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

    const heightRatio = Math.min(Math.max(py / 1.75, 0), 1)
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
  const completeSequence = [
    { key: 'tadasana', name: 'Тадасана', type: 'lily', file: 'public/models/lily/tadasana.glb' },
    { key: 'vriksasana', name: 'Врикшасана', type: 'legacy', dir: 'public/models/sketchfab/tree', height: 1.90 },
    { key: 'garudasana', name: 'Гарудасана', type: 'lily', file: 'public/models/lily/garudasana.glb' },
    { key: 'utkatasana', name: 'Уткатасана', type: 'lily', file: 'public/models/lily/utkatasana.glb' },
    { key: 'trikonasana', name: 'Уттхита Триконасана', type: 'legacy', dir: 'public/models/sketchfab/triangle', height: 1.55 },
    { key: 'parsvakonasana', name: 'Уттхита Паршваконасана', type: 'lily', file: 'public/models/lily/parsvakonasana.glb' },
    { key: 'virabhadrasana_i', name: 'Вирабхадрасана I', type: 'lily', file: 'public/models/lily/virabhadrasana_i.glb' },
    { key: 'virabhadrasana_ii', name: 'Вирабхадрасана II', type: 'lily', file: 'public/models/lily/virabhadrasana_ii.glb' },
    { key: 'virabhadrasana_iii', name: 'Вирабхадрасана III', type: 'lily', file: 'public/models/lily/virabhadrasana_iii.glb' },
    { key: 'natarajasana', name: 'Натараджасана', type: 'legacy', dir: 'public/models/sketchfab/woman_pose', height: 1.67 },
    { key: 'prasarita_padottanasana', name: 'Прасарита Падоттанасана', type: 'lily', file: 'public/models/lily/prasarita_padottanasana.glb' },
    { key: 'padangusthasana', name: 'Падангуштхасана', type: 'lily', file: 'public/models/lily/padangusthasana.glb' },
    { key: 'uttanasana', name: 'Уттанасана', type: 'lily', file: 'public/models/lily/uttanasana.glb' },
    { key: 'malasana', name: 'Маласана', type: 'lily', file: 'public/models/lily/malasana.glb' },
    { key: 'adho_mukha_svanasana', name: 'Адхо Мукха Шванасана', type: 'lily', file: 'public/models/lily/adho_mukha_svanasana.glb' },
    { key: 'vasisthasana', name: 'Васиштхасана', type: 'lily', file: 'public/models/lily/vasisthasana.glb' },
    { key: 'marjaryasana', name: 'Марджариасана', type: 'lily', file: 'public/models/lily/marjaryasana.glb' },
    { key: 'bitilasana', name: 'Битиласана', type: 'lily', file: 'public/models/lily/bitilasana.glb' },
    { key: 'parighasana', name: 'Паригхасана', type: 'lily', file: 'public/models/lily/parighasana.glb' },
    { key: 'bujangasana', name: 'Бхуджангасана', type: 'lily', file: 'public/models/lily/bujangasana.glb' },
    { key: 'bhekasana', name: 'Бхекасана', type: 'lily', file: 'public/models/lily/bhekasana.glb' },
    { key: 'dhanurasana', name: 'Дханурасана', type: 'lily', file: 'public/models/lily/dhanurasana.glb' },
    { key: 'urdhva_dhanurasana', name: 'Урдхва Дханурасана', type: 'lily', file: 'public/models/lily/urdhva_dhanurasana.glb' },
    { key: 'setu_bandhasana', name: 'Сету Бандхасана', type: 'lily', file: 'public/models/lily/setu_bandhasana.glb' },
    { key: 'kapotasana', name: 'Капотасана', type: 'lily', file: 'public/models/lily/kapotasana.glb' },
    { key: 'navasana', name: 'Парипурна Навасана', type: 'lily', file: 'public/models/lily/navasana.glb' },
    { key: 'astavakrasana', name: 'Аштавакрасана', type: 'lily', file: 'public/models/lily/astavakrasana.glb' },
    { key: 'tittibhasana', name: 'Титтибхасана', type: 'lily', file: 'public/models/lily/tittibhasana.glb' },
    { key: 'mayurasana', name: 'Маюрасана', type: 'lily', file: 'public/models/lily/mayurasana.glb' },
    { key: 'dandasana', name: 'Дандасана', type: 'lily', file: 'public/models/lily/dandasana.glb' },
    { key: 'virasana', name: 'Вирасана', type: 'lily', file: 'public/models/lily/virasana.glb' },
    { key: 'baddha_konasana', name: 'Баддха Конасана', type: 'lily', file: 'public/models/lily/baddha_konasana.glb' },
    { key: 'janu_sirsasana', name: 'Джану Ширшасана', type: 'lily', file: 'public/models/lily/janu_sirsasana.glb' },
    { key: 'paschimottanasana', name: 'Пашчимоттанасана', type: 'lily', file: 'public/models/lily/paschimottanasana.glb' },
    { key: 'upavistha_konasana', name: 'Упавиштха Конасана', type: 'lily', file: 'public/models/lily/upavistha_konasana.glb' },
    { key: 'marichyasana', name: 'Маричиасана', type: 'lily', file: 'public/models/lily/marichyasana.glb' },
    { key: 'kurmasana', name: 'Курмасана', type: 'lily', file: 'public/models/lily/kurmasana.glb' },
    { key: 'lotus', name: 'Падмасана (Лотос)', type: 'legacy', dir: 'public/models/sketchfab/lotus', height: 0.98 },
    { key: 'garbha_pindasana', name: 'Гарбха Пиндасана', type: 'lily', file: 'public/models/lily/garbha_pindasana.glb' },
    { key: 'supta_padangusthasana', name: 'Супта Падангуштхасана', type: 'lily', file: 'public/models/lily/supta_padangusthasana.glb' },
    { key: 'anantasana', name: 'Анантасана', type: 'lily', file: 'public/models/lily/anantasana.glb' },
    { key: 'supta_baddha_konasana', name: 'Супта Баддха Конасана', type: 'lily', file: 'public/models/lily/supta_baddha_konasana.glb' },
    { key: 'supta_virasana', name: 'Супта Вирасана', type: 'lily', file: 'public/models/lily/supta_virasana.glb' },
    { key: 'sirsasana', name: 'Ширшасана', type: 'lily', file: 'public/models/lily/sirsasana.glb' },
    { key: 'sarvangasana', name: 'Саламба Сарвангасана', type: 'lily', file: 'public/models/lily/sarvangasana.glb' },
    { key: 'halasana', name: 'Халасана', type: 'lily', file: 'public/models/lily/halasana.glb' },
    { key: 'karnapidasana', name: 'Карнапидасана', type: 'lily', file: 'public/models/lily/karnapidasana.glb' },
    { key: 'savasana', name: 'Шавасана', type: 'lily', file: 'public/models/lily/savasana.glb' }
  ]

  const bakedParticlesCollection = {}
  const sculptBinaryChunks = []
  const sculptPosesMetadata = {}
  let runningBinaryOffset = 0

  for (const config of completeSequence) {
    console.log(`Processing ${config.name} (${config.key})...`)
    let normalizedGeometry
    if (config.type === 'legacy') {
      normalizedGeometry = await loadLegacyMesh(config.dir, config.height)
    } else {
      normalizedGeometry = await loadLilyMesh(config.file)
    }

    const particleData = sampleGeometryToParticles(normalizedGeometry)
    bakedParticlesCollection[config.key] = {
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

    sculptPosesMetadata[config.key] = {
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

    console.log(`  Done ${config.key}: ${posCount / 3} vertices, ${idxCount / 3} faces, height: ${particleData.height}m`)
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
