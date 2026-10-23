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

  for (const geom of candidateGeometries) {
    for (const attrName in geom.attributes) {
      if (attrName !== 'position' && attrName !== 'normal') {
        geom.deleteAttribute(attrName)
      }
    }
  }

  const merged = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
  const rawHeight = box.max.y - box.min.y
  const scale = targetHeight / rawHeight
  const centerX = (box.min.x + box.max.x) / 2
  const centerZ = (box.min.z + box.max.z) / 2
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

async function loadStandaloneGlbMesh(glbFilePath, targetHeight) {
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
      const clonedGeometry = sceneNode.geometry.clone()
      clonedGeometry.applyMatrix4(sceneNode.matrixWorld)
      candidateGeometries.push(clonedGeometry)
    }
  })

  for (const geom of candidateGeometries) {
    for (const attrName in geom.attributes) {
      if (attrName !== 'position' && attrName !== 'normal') {
        geom.deleteAttribute(attrName)
      }
    }
  }

  const merged = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
  const rawHeight = box.max.y - box.min.y
  const scale = targetHeight / rawHeight
  const centerX = (box.min.x + box.max.x) / 2
  const centerZ = (box.min.z + box.max.z) / 2
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

async function loadLilyMesh(glbFilePath, includeProps = false) {
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
      const nameWithoutMaterial = lowerCaseName.replace(/material/g, '')

      let isIgnored =
        nameWithoutMaterial.includes('mat') ||
        lowerCaseName.includes('wall') ||
        lowerCaseName.includes('floor') ||
        lowerCaseName.includes('wood') ||
        lowerCaseName.includes('bench') ||
        lowerCaseName.includes('chair')

      if (!includeProps) {
        if (
          lowerCaseName.includes('blanket') ||
          lowerCaseName.includes('brick') ||
          lowerCaseName.includes('strap') ||
          lowerCaseName.includes('belt') ||
          lowerCaseName.includes('bolster')
        ) {
          isIgnored = true
        }
      }

      const vertexCount = sceneNode.geometry.attributes.position.count
      if (!isIgnored && vertexCount > 80) {
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
        const lowerCaseName = (sceneNode.name || '').toLowerCase()
        const nameWithoutMaterial = lowerCaseName.replace(/material/g, '')
        const isMatOrAccessory =
          nameWithoutMaterial.includes('mat') ||
          lowerCaseName.includes('chair') ||
          lowerCaseName.includes('wall') ||
          lowerCaseName.includes('bench') ||
          lowerCaseName.includes('wood') ||
          lowerCaseName.includes('floor')
        const vertexCount = sceneNode.geometry.attributes.position.count
        if (!isMatOrAccessory && vertexCount > maximumVertexCount) {
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

  for (const geom of candidateGeometries) {
    for (const attrName in geom.attributes) {
      if (attrName !== 'position' && attrName !== 'normal') {
        geom.deleteAttribute(attrName)
      }
    }
  }

  const merged = candidateGeometries.length > 1
    ? BufferGeometryUtils.mergeGeometries(candidateGeometries, false)
    : candidateGeometries[0]

  const unifiedScale = 1.75 / 5.62
  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position)
  const centerX = (box.min.x + box.max.x) / 2
  const centerZ = (box.min.z + box.max.z) / 2
  const minY = box.min.y

  const positionAttribute = merged.attributes.position
  const count = positionAttribute.count
  const scaledPositions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    scaledPositions[i * 3] = (positionAttribute.getX(i) - centerX) * unifiedScale
    scaledPositions[i * 3 + 1] = (positionAttribute.getY(i) - minY) * unifiedScale
    scaledPositions[i * 3 + 2] = (positionAttribute.getZ(i) - centerZ) * unifiedScale
  }

  const normalizedGeometry = new THREE.BufferGeometry()
  normalizedGeometry.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3))
  if (merged.index) {
    normalizedGeometry.setIndex(merged.index.clone())
  }
  normalizedGeometry.computeVertexNormals()
  return normalizedGeometry
}

function sampleGeometryToParticles(geometry) {
  const positionAttribute = geometry.attributes.position
  const indexAttribute = geometry.index
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

    vertexA.fromBufferAttribute(positionAttribute, indexA)
    vertexB.fromBufferAttribute(positionAttribute, indexB)
    vertexC.fromBufferAttribute(positionAttribute, indexC)

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

    vertexA.fromBufferAttribute(positionAttribute, indexA)
    vertexB.fromBufferAttribute(positionAttribute, indexB)
    vertexC.fromBufferAttribute(positionAttribute, indexC)

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

  return {
    positions: Array.from(particlePositions),
    colors: Array.from(particleColors),
    height: Number(maximumHeight.toFixed(4))
  }
}

async function main() {
  const completeSequence = [
    { key: 'tadasana', name: 'Тадасана', type: 'lily', file: 'public/models/lily/tadasana.glb' },
    { key: 'vriksasana', name: 'Врикшасана', type: 'legacy', dir: 'public/models/sketchfab/tree', height: 1.58 },
    { key: 'garudasana', name: 'Гарудасана', type: 'lily', file: 'public/models/lily/garudasana.glb' },
    { key: 'utkatasana', name: 'Уткатасана', type: 'lily', file: 'public/models/lily/utkatasana.glb' },
    { key: 'trikonasana', name: 'Уттхита Триконасана', type: 'legacy', dir: 'public/models/sketchfab/triangle', height: 1.55 },
    { key: 'parivrtta_trikonasana', name: 'Паривритта Триконасана', type: 'lily', file: 'public/models/lily/parivrtta_trikonasana.glb' },
    { key: 'parsvakonasana', name: 'Уттхита Паршваконасана', type: 'lily', file: 'public/models/lily/parsvakonasana.glb' },
    { key: 'virabhadrasana_i', name: 'Вирабхадрасана I', type: 'lily', file: 'public/models/lily/virabhadrasana_i.glb' },
    { key: 'virabhadrasana_ii', name: 'Вирабхадрасана II', type: 'lily', file: 'public/models/lily/virabhadrasana_ii.glb' },
    { key: 'virabhadrasana_iii', name: 'Вирабхадрасана III', type: 'lily', file: 'public/models/lily/virabhadrasana_iii.glb' },
    { key: 'ardha_chandrasana', name: 'Ардха Чандрасана', type: 'lily', file: 'public/models/lily/ardha_chandrasana.glb' },
    { key: 'natarajasana', name: 'Натараджасана', type: 'legacy', dir: 'public/models/sketchfab/woman_pose', height: 1.67 },
    { key: 'prasarita_padottanasana', name: 'Прасарита Падоттанасана', type: 'lily', file: 'public/models/lily/prasarita_padottanasana.glb' },
    { key: 'parsvottanasana', name: 'Паршвоттанасана', type: 'lily', file: 'public/models/lily/parsvottanasana.glb' },
    { key: 'padangusthasana', name: 'Падангуштхасана', type: 'lily', file: 'public/models/lily/padangusthasana.glb' },
    { key: 'uttanasana', name: 'Уттанасана', type: 'lily', file: 'public/models/lily/uttanasana.glb' },
    { key: 'malasana', name: 'Маласана', type: 'lily', file: 'public/models/lily/malasana.glb' },
    { key: 'pasasana', name: 'Пашасана', type: 'lily', file: 'public/models/lily/pasasana.glb' },
    { key: 'adho_mukha_svanasana', name: 'Адхо Мукха Шванасана', type: 'lily', file: 'public/models/lily/adho_mukha_svanasana.glb' },
    { key: 'vasisthasana', name: 'Васиштхасана', type: 'lily', file: 'public/models/lily/vasisthasana.glb' },
    { key: 'purvottanasana', name: 'Пурвоттанасана', type: 'lily', file: 'public/models/lily/purvottanasana.glb' },
    { key: 'marjaryasana', name: 'Марджариасана', type: 'lily', file: 'public/models/lily/marjaryasana.glb' },
    { key: 'bitilasana', name: 'Битиласана', type: 'lily', file: 'public/models/lily/bitilasana.glb' },
    { key: 'bujangasana', name: 'Бхуджангасана', type: 'lily', file: 'public/models/lily/bujangasana.glb' },
    { key: 'salabhasana', name: 'Шалабхасана', type: 'lily', file: 'public/models/lily/salabhasana.glb' },
    { key: 'bhekasana', name: 'Бхекасана', type: 'lily', file: 'public/models/lily/bhekasana.glb' },
    { key: 'dhanurasana', name: 'Дханурасана', type: 'lily', file: 'public/models/lily/dhanurasana.glb' },
    { key: 'urdhva_dhanurasana', name: 'Урдхва Дханурасана', type: 'lily', file: 'public/models/lily/urdhva_dhanurasana.glb' },
    { key: 'kapotasana', name: 'Капотасана', type: 'lily', file: 'public/models/lily/kapotasana.glb' },
    { key: 'setu_bandhasana', name: 'Сету Бандхасана', type: 'lily', file: 'public/models/lily/setu_bandhasana.glb' },
    { key: 'virasana', name: 'Вирасана', type: 'lily', file: 'public/models/lily/virasana.glb', includeProps: true },
    { key: 'supta_virasana', name: 'Супта Вирасана', type: 'lily', file: 'public/models/lily/supta_virasana.glb', includeProps: true },
    { key: 'parighasana', name: 'Паригхасана', type: 'lily', file: 'public/models/lily/parighasana.glb' },
    { key: 'navasana', name: 'Парипурна Навасана', type: 'lily', file: 'public/models/lily/navasana.glb' },
    { key: 'bakasana', name: 'Бакасана', type: 'standalone_glb', file: 'public/models/sketchfab/bakasana.glb', height: 0.85 },
    { key: 'bhujapidasana', name: 'Бхуджапидасана', type: 'lily', file: 'public/models/lily/bhujapidasana.glb' },
    { key: 'kukkutasana', name: 'Куккутасана', type: 'lily', file: 'public/models/lily/kukkutasana.glb' },
    { key: 'lolasana', name: 'Лоласана', type: 'lily', file: 'public/models/lily/lolasana.glb' },
    { key: 'mayurasana', name: 'Маюрасана', type: 'lily', file: 'public/models/lily/mayurasana.glb' },
    { key: 'astavakrasana', name: 'Аштавакрасана', type: 'lily', file: 'public/models/lily/astavakrasana.glb' },
    { key: 'tittibhasana', name: 'Титтибхасана', type: 'lily', file: 'public/models/lily/tittibhasana.glb' },
    { key: 'pincha_mayurasana', name: 'Пинча Маюрасана', type: 'lily', file: 'public/models/lily/pincha_mayurasana.glb' },
    { key: 'adho_mukha_vrksasana', name: 'Адхо Мукха Врикшасана', type: 'lily', file: 'public/models/lily/adho_mukha_vrksasana.glb' },
    { key: 'dandasana', name: 'Дандасана', type: 'lily', file: 'public/models/lily/dandasana.glb' },
    { key: 'gomukhasana', name: 'Гомукхасана', type: 'lily', file: 'public/models/lily/gomukhasana.glb' },
    { key: 'sukhasana', name: 'Сукхасана', type: 'lily', file: 'public/models/lily/sukhasana.glb' },
    { key: 'vajrasana', name: 'Ваджрасана', type: 'lily', file: 'public/models/lily/vajrasana.glb' },
    { key: 'bharadvajasana', name: 'Бхарадваджасана', type: 'lily', file: 'public/models/lily/bharadvajasana.glb' },
    { key: 'marichyasana', name: 'Маричиасана', type: 'lily', file: 'public/models/lily/marichyasana.glb' },
    { key: 'janu_sirsasana', name: 'Джану Ширшасана', type: 'lily', file: 'public/models/lily/janu_sirsasana.glb' },
    { key: 'krounchasana', name: 'Краунчасана', type: 'lily', file: 'public/models/lily/krounchasana.glb' },
    { key: 'paschimottanasana', name: 'Пашчимоттанасана', type: 'lily', file: 'public/models/lily/paschimottanasana.glb' },
    { key: 'upavistha_konasana', name: 'Упавиштха Конасана', type: 'lily', file: 'public/models/lily/upavistha_konasana.glb' },
    { key: 'baddha_konasana', name: 'Баддха Конасана', type: 'lily', file: 'public/models/lily/baddha_konasana.glb' },
    { key: 'kurmasana', name: 'Курмасана', type: 'lily', file: 'public/models/lily/kurmasana.glb' },
    { key: 'lotus', name: 'Падмасана (Лотос)', type: 'legacy', dir: 'public/models/sketchfab/lotus', height: 0.98 },
    { key: 'garbha_pindasana', name: 'Гарбха Пиндасана', type: 'lily', file: 'public/models/lily/garbha_pindasana.glb' },
    { key: 'matsyasana', name: 'Матсьясана', type: 'lily', file: 'public/models/lily/matsyasana.glb' },
    { key: 'supta_padangusthasana', name: 'Супта Падангуштхасана', type: 'lily', file: 'public/models/lily/supta_padangusthasana.glb', includeProps: true },
    { key: 'anantasana', name: 'Анантасана', type: 'lily', file: 'public/models/lily/anantasana.glb' },
    { key: 'supta_baddha_konasana', name: 'Супта Баддха Конасана', type: 'lily', file: 'public/models/lily/supta_baddha_konasana.glb', includeProps: true },
    { key: 'viparita_karani', name: 'Випарита Карани', type: 'lily', file: 'public/models/lily/viparita_karani.glb', includeProps: true },
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
    } else if (config.type === 'standalone_glb') {
      normalizedGeometry = await loadStandaloneGlbMesh(config.file, config.height)
    } else {
      normalizedGeometry = await loadLilyMesh(config.file, config.includeProps || false)
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

    const posBuffer = Buffer.from(positionsFloatArray.buffer, positionsFloatArray.byteOffset, positionsFloatArray.byteLength)
    const normBuffer = Buffer.from(normalsFloatArray.buffer, normalsFloatArray.byteOffset, normalsFloatArray.byteLength)
    const idxBuffer = Buffer.from(finalIndices.buffer, finalIndices.byteOffset, finalIndices.byteLength)

    const posOffset = runningBinaryOffset
    runningBinaryOffset += posBuffer.length
    sculptBinaryChunks.push(posBuffer)

    const normOffset = runningBinaryOffset
    runningBinaryOffset += normBuffer.length
    sculptBinaryChunks.push(normBuffer)

    const idxOffset = runningBinaryOffset
    runningBinaryOffset += idxBuffer.length
    sculptBinaryChunks.push(idxBuffer)

    const faceCount = indexAttribute ? indexAttribute.count / 3 : positionAttribute.count / 3
    console.log(`  Done ${config.key}: ${positionAttribute.count} vertices, ${faceCount} faces, height: ${particleData.height}m`)

    sculptPosesMetadata[config.key] = {
      posOffset,
      posCount: positionsFloatArray.length,
      normOffset,
      normCount: normalsFloatArray.length,
      idxOffset,
      idxCount: finalIndices.length,
      height: particleData.height
    }
  }

  const bakedJsonPath = path.resolve('public/models/poses_baked.json')
  fs.writeFileSync(bakedJsonPath, JSON.stringify(bakedParticlesCollection))
  console.log(`Wrote particles to ${bakedJsonPath}`)

  const sculptJsonPath = path.resolve('public/models/solid_sculpts.json')
  fs.writeFileSync(sculptJsonPath, JSON.stringify({ poses: sculptPosesMetadata }, null, 2))
  console.log(`Wrote sculpt metadata to ${sculptJsonPath}`)

  const totalBinaryBuffer = Buffer.concat(sculptBinaryChunks)
  const sculptBinPath = path.resolve('public/models/solid_sculpts.bin')
  fs.writeFileSync(sculptBinPath, totalBinaryBuffer)
  console.log(`Wrote sculpt binary (${totalBinaryBuffer.length} bytes) to ${sculptBinPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
