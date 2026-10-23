import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const bakedDataPath = path.resolve('public/models/poses_baked.json')
const posesData = JSON.parse(fs.readFileSync(bakedDataPath, 'utf8'))
const BODY_PARTICLES_COUNT = 15840

const INVERSIONS_HEAD_DOWN = [
  'sirsasana', 'sarvangasana', 'halasana', 'karnapidasana', 'pincha_mayurasana', 'adho_mukha_vrksasana'
]

const STANDING_FORWARD_BENDS = [
  'uttanasana', 'padangusthasana', 'prasarita_padottanasana', 'parsvottanasana'
]

const DOG_LIKE_POSES = [
  'adho_mukha_svanasana'
]

const SEATED_FORWARD_BENDS = [
  'paschimottanasana', 'janu_sirsasana', 'krounchasana', 'kurmasana', 'upavistha_konasana'
]

const SUPINE_POSES = [
  'savasana', 'supta_baddha_konasana', 'supta_padangusthasana', 'anantasana', 'supta_virasana', 'matsyasana'
]

const PRONE_BACKBENDS = [
  'bujangasana', 'salabhasana', 'bhekasana', 'dhanurasana', 'marjaryasana', 'bitilasana'
]

const BRIDGE_AND_WHEEL = [
  'urdhva_dhanurasana', 'setu_bandhasana', 'kapotasana'
]

const SEATED_UPRIGHT = [
  'lotus', 'dandasana', 'sukhasana', 'vajrasana', 'virasana', 'gomukhasana',
  'bharadvajasana', 'marichyasana', 'baddha_konasana', 'garbha_pindasana'
]

const HORIZONTAL_BALANCES = [
  'virabhadrasana_iii', 'ardha_chandrasana', 'mayurasana', 'bakasana',
  'bhujapidasana', 'kukkutasana', 'lolasana', 'astavakrasana', 'tittibhasana',
  'navasana', 'purvottanasana', 'vasisthasana', 'malasana', 'pasasana', 'parighasana'
]

function getPoseKeyPoints(poseName, points) {
  let minY = 999, maxY = -999, minZ = 999, maxZ = -999, minX = 999, maxX = -999
  let highestPoint = points[0]
  let lowestPoint = points[0]

  for (const pt of points) {
    if (pt.y < minY) { minY = pt.y; lowestPoint = pt }
    if (pt.y > maxY) { maxY = pt.y; highestPoint = pt }
    if (pt.z < minZ) minZ = pt.z
    if (pt.z > maxZ) maxZ = pt.z
    if (pt.x < minX) minX = pt.x
    if (pt.x > maxX) maxX = pt.x
  }

  let pelvisCenter = new THREE.Vector3()
  let crownCenter = new THREE.Vector3()

  if (INVERSIONS_HEAD_DOWN.includes(poseName)) {
    crownCenter.copy(lowestPoint)
    crownCenter.y += 0.04
    const pelvisSlice = points.filter(p => Math.abs(p.y - (maxY - 0.75)) < 0.08)
    if (pelvisSlice.length > 0) {
      for (const p of pelvisSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(pelvisSlice.length)
    } else {
      pelvisCenter.set(0, maxY - 0.75, 0)
    }
  } else if (STANDING_FORWARD_BENDS.includes(poseName)) {
    crownCenter.copy(lowestPoint)
    crownCenter.y += 0.08
    const topPelvisSlice = points.filter(p => p.y > maxY - 0.15)
    if (topPelvisSlice.length > 0) {
      for (const p of topPelvisSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(topPelvisSlice.length)
    } else {
      pelvisCenter.set(0, maxY - 0.05, 0)
    }
  } else if (DOG_LIKE_POSES.includes(poseName)) {
    const pelvisSlice = points.filter(p => p.y > maxY - 0.12)
    if (pelvisSlice.length > 0) {
      for (const p of pelvisSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(pelvisSlice.length)
    } else {
      pelvisCenter.set(0, maxY - 0.05, 0.15)
    }
    const headSlice = points.filter(p => p.y < minY + 0.38 && Math.abs(p.x) < 0.2)
    if (headSlice.length > 0) {
      for (const p of headSlice) crownCenter.add(p)
      crownCenter.divideScalar(headSlice.length)
    } else {
      crownCenter.set(0, 0.35, -0.45)
    }
  } else if (SUPINE_POSES.includes(poseName)) {
    let mostHeadZ = minZ
    let mostPelvisZ = maxZ
    pelvisCenter.set(0, minY + 0.10, mostPelvisZ - 0.45)
    crownCenter.set(0, minY + 0.12, mostHeadZ + 0.15)
  } else if (SEATED_FORWARD_BENDS.includes(poseName)) {
    pelvisCenter.set(0, minY + 0.12, maxZ - 0.20)
    crownCenter.set(0, minY + 0.25, minZ + 0.20)
  } else if (PRONE_BACKBENDS.includes(poseName)) {
    pelvisCenter.set(0, minY + 0.10, maxZ - 0.35)
    crownCenter.copy(highestPoint)
    crownCenter.y -= 0.03
  } else if (BRIDGE_AND_WHEEL.includes(poseName)) {
    const topArcSlice = points.filter(p => p.y > maxY - 0.12)
    if (topArcSlice.length > 0) {
      for (const p of topArcSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(topArcSlice.length)
    } else {
      pelvisCenter.set(0, maxY - 0.08, 0)
    }
    crownCenter.set(0, minY + 0.35, -0.35)
  } else if (SEATED_UPRIGHT.includes(poseName)) {
    pelvisCenter.set(0, minY + 0.09, 0)
    crownCenter.copy(highestPoint)
    crownCenter.y -= 0.03
  } else if (HORIZONTAL_BALANCES.includes(poseName)) {
    const centerSlice = points.filter(p => Math.abs(p.y - (minY + maxY) / 2) < 0.15)
    if (centerSlice.length > 0) {
      for (const p of centerSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(centerSlice.length)
    } else {
      pelvisCenter.set(0, (minY + maxY) / 2, 0)
    }
    crownCenter.copy(highestPoint)
    crownCenter.y -= 0.04
  } else {
    const pelvisHeight = minY + (maxY - minY) * 0.48
    const pelvisSlice = points.filter(p => Math.abs(p.y - pelvisHeight) < 0.06 && Math.sqrt(p.x * p.x + p.z * p.z) < 0.25)
    if (pelvisSlice.length > 0) {
      for (const p of pelvisSlice) pelvisCenter.add(p)
      pelvisCenter.divideScalar(pelvisSlice.length)
    } else {
      pelvisCenter.set(0, pelvisHeight, 0)
    }
    crownCenter.copy(highestPoint)
    crownCenter.y -= 0.03
  }

  return { pelvisCenter, crownCenter, points }
}

function compute7ChakrasAlongSpine(poseName, positionsArray) {
  const points = []
  for (let i = 0; i < BODY_PARTICLES_COUNT; i++) {
    points.push(new THREE.Vector3(
      positionsArray[i * 3],
      positionsArray[i * 3 + 1],
      positionsArray[i * 3 + 2]
    ))
  }

  const { pelvisCenter, crownCenter } = getPoseKeyPoints(poseName, points)

  const chakraPoints = []
  const chakraCount = 7

  for (let i = 0; i < chakraCount; i++) {
    const fraction = i / (chakraCount - 1)
    const directInterpolation = new THREE.Vector3().lerpVectors(pelvisCenter, crownCenter, fraction)

    const nearbyPoints = points.filter(p => p.distanceTo(directInterpolation) < 0.18)
    if (nearbyPoints.length > 5) {
      const refinedCenter = new THREE.Vector3()
      for (const p of nearbyPoints) refinedCenter.add(p)
      refinedCenter.divideScalar(nearbyPoints.length)
      directInterpolation.lerp(refinedCenter, 0.4)
    }

    chakraPoints.push([
      Number(directInterpolation.x.toFixed(4)),
      Number(directInterpolation.y.toFixed(4)),
      Number(directInterpolation.z.toFixed(4))
    ])
  }

  return chakraPoints
}

const allChakrasMap = {}
for (const poseKey of Object.keys(posesData)) {
  const posePositions = posesData[poseKey].positions
  allChakrasMap[poseKey] = compute7ChakrasAlongSpine(poseKey, posePositions)
}

const outputPath = path.resolve('public/models/chakras.json')
fs.writeFileSync(outputPath, JSON.stringify(allChakrasMap, null, 2))
console.log(`Saved anatomical chakras for all ${Object.keys(allChakrasMap).length} poses`)
