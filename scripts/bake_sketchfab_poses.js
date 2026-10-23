import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

globalThis.self = globalThis
class ProgressEventMock {
  constructor(type, data) {
    this.type = type
    Object.assign(this, data)
  }
}
globalThis.ProgressEvent = ProgressEventMock

const TOTAL_PARTICLES = 18000
const BODY_PARTICLES = Math.floor(TOTAL_PARTICLES * 0.88)
const GROUND_PARTICLES = TOTAL_PARTICLES - BODY_PARTICLES

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

function sampleGeometryToParticles(geometry, scaleFactor, offsetY) {
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  const sampler = new MeshSurfaceSampler(mesh).build()

  const positions = []
  const colors = []
  const sampledPos = new THREE.Vector3()
  const sampledNorm = new THREE.Vector3()

  let minY = Infinity
  let maxY = -Infinity

  for (let i = 0; i < BODY_PARTICLES; i++) {
    sampler.sample(sampledPos, sampledNorm)
    const px = Number((sampledPos.x * scaleFactor).toFixed(4))
    const py = Number(((sampledPos.y - offsetY) * scaleFactor).toFixed(4))
    const pz = Number((sampledPos.z * scaleFactor).toFixed(4))

    positions.push(px, py, pz)
    minY = Math.min(minY, py)
    maxY = Math.max(maxY, py)

    const heightRatio = Math.min(Math.max(py / 1.7, 0), 1)
    const intensity = 0.65 + Math.random() * 0.35
    const isCore = Math.abs(px) < 0.08 && py > 0.35

    if (isCore && Math.random() < 0.35) {
      colors.push(
        Number((0.98 * intensity).toFixed(3)),
        Number((0.98 * intensity).toFixed(3)),
        Number((1.0 * intensity).toFixed(3))
      )
    } else if (heightRatio < 0.25) {
      colors.push(
        Number((0.75 * intensity).toFixed(3)),
        Number((0.35 * intensity).toFixed(3)),
        Number((0.95 * intensity).toFixed(3))
      )
    } else {
      colors.push(
        Number((0.30 * intensity).toFixed(3)),
        Number((0.70 * intensity).toFixed(3)),
        Number((1.0 * intensity).toFixed(3))
      )
    }
  }

  const groundBaseY = minY + 0.04
  for (let i = 0; i < GROUND_PARTICLES; i++) {
    const radius = 0.2 + Math.sqrt(Math.random()) * 1.5
    const angle = Math.random() * Math.PI * 2
    const jitter = (Math.random() - 0.5) * 0.04
    positions.push(
      Number((radius * Math.cos(angle)).toFixed(4)),
      Number((groundBaseY + jitter).toFixed(4)),
      Number((radius * Math.sin(angle) * 0.85 + 0.05).toFixed(4))
    )
    const intensity = 0.5 + Math.random() * 0.35
    if (Math.random() < 0.6) {
      colors.push(
        Number((0.75 * intensity).toFixed(3)),
        Number((0.35 * intensity).toFixed(3)),
        Number((0.9 * intensity).toFixed(3))
      )
    } else {
      colors.push(
        Number((0.25 * intensity).toFixed(3)),
        Number((0.55 * intensity).toFixed(3)),
        Number((1.0 * intensity).toFixed(3))
      )
    }
  }

  return { positions, colors, minY, maxY }
}

async function extractAnimatedPose(gltf, clipName) {
  const mixer = new THREE.AnimationMixer(gltf.scene)
  const clip = gltf.animations.find((a) => a.name === clipName)
  if (!clip) {
    throw new Error(`Animation clip not found: ${clipName}`)
  }

  mixer.stopAllAction()
  const action = mixer.clipAction(clip)
  action.play()
  mixer.setTime(clip.duration * 0.5)
  gltf.scene.updateMatrixWorld(true)

  const skinnedMeshes = []
  gltf.scene.traverse((child) => {
    if (child.isSkinnedMesh) {
      child.skeleton.update()
      skinnedMeshes.push(child)
    }
  })

  const geometries = []
  for (const sm of skinnedMeshes) {
    const sourceGeo = sm.geometry
    const posAttr = sourceGeo.attributes.position
    const vertexCount = posAttr.count
    const deformedPositions = new Float32Array(vertexCount * 3)
    const tempVec = new THREE.Vector3()

    for (let i = 0; i < vertexCount; i++) {
      tempVec.fromBufferAttribute(posAttr, i)
      sm.applyBoneTransform(i, tempVec)
      tempVec.applyMatrix4(sm.matrixWorld)
      deformedPositions[i * 3] = tempVec.x
      deformedPositions[i * 3 + 1] = tempVec.y
      deformedPositions[i * 3 + 2] = tempVec.z
    }

    const bakedGeo = new THREE.BufferGeometry()
    bakedGeo.setAttribute('position', new THREE.BufferAttribute(deformedPositions, 3))
    if (sourceGeo.index) {
      bakedGeo.setIndex(sourceGeo.index.clone())
    }
    geometries.push(bakedGeo)
  }

  const merged = BufferGeometryUtils.mergeGeometries(geometries, false)
  return merged
}

async function main() {
  const results = {}
  const animModelDir = path.resolve('public/models/sketchfab/yoga_anim')
  const lotusModelDir = path.resolve('public/models/sketchfab/lotus')

  console.log('Loading animated yoga model from Sketchfab...')
  const animGltf = await loadGltfWithoutTextures(animModelDir)

  console.log('Loading lotus model from Sketchfab...')
  const lotusGltf = await loadGltfWithoutTextures(lotusModelDir)

  const treeGeo = await extractAnimatedPose(animGltf, 'GYA Genesis 8 Male Tree Pose_Animation')
  const treeBox = new THREE.Box3().setFromBufferAttribute(treeGeo.attributes.position)
  const animScaleFactor = 1.82 / (treeBox.max.y - treeBox.min.y)
  const animOffsetY = treeBox.min.y

  console.log(`Calculated scale factor for Genesis 8 models: ${animScaleFactor.toFixed(4)}`)

  console.log('Processing Tree pose...')
  const treeData = sampleGeometryToParticles(treeGeo, animScaleFactor, animOffsetY)
  results['tree'] = { positions: treeData.positions, colors: treeData.colors }
  console.log(`Pose tree: height from ${treeData.minY} to ${treeData.maxY}`)

  console.log('Processing Warrior II pose...')
  const warriorGeo = await extractAnimatedPose(animGltf, 'GYA Genesis 8 Male Warrior Pose_Animation')
  const warriorData = sampleGeometryToParticles(warriorGeo, animScaleFactor, animOffsetY)
  results['warrior2'] = { positions: warriorData.positions, colors: warriorData.colors }
  console.log(`Pose warrior2: height from ${warriorData.minY} to ${warriorData.maxY}`)

  console.log('Processing Downward Dog pose...')
  const dogGeo = await extractAnimatedPose(animGltf, 'GYA Genesis 8 Male Downward Dog_Animation')
  const dogData = sampleGeometryToParticles(dogGeo, animScaleFactor, animOffsetY)
  results['downwardDog'] = { positions: dogData.positions, colors: dogData.colors }
  console.log(`Pose downwardDog: height from ${dogData.minY} to ${dogData.maxY}`)

  console.log('Processing Warrior I / Cobra pose...')
  const cobraGeo = await extractAnimatedPose(animGltf, 'GYA Genesis 8 Male Cobra Pose_Animation')
  const cobraData = sampleGeometryToParticles(cobraGeo, animScaleFactor, animOffsetY)
  results['warrior1'] = { positions: cobraData.positions, colors: cobraData.colors }
  console.log(`Pose warrior1 (cobra): height from ${cobraData.minY} to ${cobraData.maxY}`)

  console.log('Processing Lotus pose...')
  const lotusGeometries = []
  lotusGltf.scene.updateMatrixWorld(true)
  lotusGltf.scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const g = child.geometry.clone()
      g.applyMatrix4(child.matrixWorld)
      lotusGeometries.push(g)
    }
  })
  const lotusMerged = BufferGeometryUtils.mergeGeometries(lotusGeometries, false)
  const lotusBox = new THREE.Box3().setFromBufferAttribute(lotusMerged.attributes.position)
  const lotusScaleFactor = 1.05 / (lotusBox.max.y - lotusBox.min.y)
  const lotusOffsetY = lotusBox.min.y
  const lotusData = sampleGeometryToParticles(lotusMerged, lotusScaleFactor, lotusOffsetY)
  results['lotus'] = { positions: lotusData.positions, colors: lotusData.colors }
  console.log(`Pose lotus: height from ${lotusData.minY} to ${lotusData.maxY}`)

  const outputPath = path.resolve('public/models/poses_baked.json')
  fs.writeFileSync(outputPath, JSON.stringify(results))
  console.log(`All Sketchfab yoga poses successfully baked and written to ${outputPath}!`)
}

main().catch(console.error)
