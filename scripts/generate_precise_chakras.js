import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const meta = JSON.parse(fs.readFileSync('public/models/solid_sculpts.json', 'utf8'))
const bin = fs.readFileSync('public/models/solid_sculpts.bin')

const poseKeys = Object.keys(meta.poses)

function getPosePoints(poseName) {
  const p = meta.poses[poseName]
  const positions = new Float32Array(bin.buffer, bin.byteOffset + p.posOffset, p.posCount)
  const count = positions.length / 3
  const pts = []
  for (let i = 0; i < count; i++) {
    pts.push(new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2]))
  }
  return pts
}

const POSE_ORIENTATIONS = {
  uttanasana: { pelvisY: 0.94, pelvisZ: 0.0, crownY: 0.18, crownZ: -0.15 },
  padangusthasana: { pelvisY: 0.94, pelvisZ: 0.0, crownY: 0.20, crownZ: -0.15 },
  prasarita_padottanasana: { pelvisY: 0.90, pelvisZ: 0.0, crownY: 0.15, crownZ: -0.12 },
  parsvottanasana: { pelvisY: 0.90, pelvisZ: 0.15, crownY: 0.28, crownZ: -0.30 },
  adho_mukha_svanasana: { pelvisY: 0.78, pelvisZ: 0.35, crownY: 0.28, crownZ: -0.42 },
  sirsasana: { pelvisY: 1.10, pelvisZ: 0.0, crownY: 0.06, crownZ: -0.05 },
  sarvangasana: { pelvisY: 0.95, pelvisZ: 0.0, crownY: 0.08, crownZ: -0.12 },
  halasana: { pelvisY: 0.85, pelvisZ: 0.12, crownY: 0.08, crownZ: -0.15 },
  karnapidasana: { pelvisY: 0.75, pelvisZ: 0.10, crownY: 0.08, crownZ: -0.12 },
  savasana: { pelvisY: 0.09, pelvisZ: 0.35, crownY: 0.10, crownZ: -0.65 },
  supta_baddha_konasana: { pelvisY: 0.09, pelvisZ: 0.30, crownY: 0.10, crownZ: -0.60 },
  supta_padangusthasana: { pelvisY: 0.09, pelvisZ: 0.32, crownY: 0.10, crownZ: -0.62 },
  supta_virasana: { pelvisY: 0.09, pelvisZ: 0.28, crownY: 0.10, crownZ: -0.58 },
  anantasana: { pelvisY: 0.09, pelvisZ: 0.30, crownY: 0.12, crownZ: -0.60 },
  viparita_karani: { pelvisY: 0.12, pelvisZ: 0.10, crownY: 0.10, crownZ: -0.65 },
  matsyasana: { pelvisY: 0.09, pelvisZ: 0.25, crownY: 0.15, crownZ: -0.50 },
  paschimottanasana: { pelvisY: 0.10, pelvisZ: 0.30, crownY: 0.22, crownZ: -0.35 },
  janu_sirsasana: { pelvisY: 0.10, pelvisZ: 0.28, crownY: 0.24, crownZ: -0.32 },
  krounchasana: { pelvisY: 0.10, pelvisZ: 0.20, crownY: 0.40, crownZ: -0.15 },
  kurmasana: { pelvisY: 0.10, pelvisZ: 0.22, crownY: 0.18, crownZ: -0.30 },
  upavistha_konasana: { pelvisY: 0.10, pelvisZ: 0.25, crownY: 0.20, crownZ: -0.28 },
  bujangasana: { pelvisY: 0.09, pelvisZ: 0.28, crownY: 0.65, crownZ: -0.18 },
  salabhasana: { pelvisY: 0.10, pelvisZ: 0.20, crownY: 0.35, crownZ: -0.30 },
  bhekasana: { pelvisY: 0.10, pelvisZ: 0.20, crownY: 0.42, crownZ: -0.25 },
  dhanurasana: { pelvisY: 0.12, pelvisZ: 0.05, crownY: 0.52, crownZ: -0.22 },
  urdhva_dhanurasana: { pelvisY: 0.72, pelvisZ: 0.10, crownY: 0.32, crownZ: -0.38 },
  setu_bandhasana: { pelvisY: 0.42, pelvisZ: 0.15, crownY: 0.10, crownZ: -0.45 },
  kapotasana: { pelvisY: 0.35, pelvisZ: 0.10, crownY: 0.48, crownZ: -0.22 },
  marjaryasana: { pelvisY: 0.45, pelvisZ: 0.28, crownY: 0.42, crownZ: -0.28 },
  bitilasana: { pelvisY: 0.45, pelvisZ: 0.28, crownY: 0.48, crownZ: -0.28 },
  virabhadrasana_iii: { pelvisY: 0.88, pelvisZ: 0.22, crownY: 0.86, crownZ: -0.52 },
  ardha_chandrasana: { pelvisY: 0.85, pelvisZ: 0.15, crownY: 0.80, crownZ: -0.48 },
  mayurasana: { pelvisY: 0.35, pelvisZ: 0.25, crownY: 0.32, crownZ: -0.45 },
  bakasana: { pelvisY: 0.52, pelvisZ: 0.12, crownY: 0.38, crownZ: -0.22 },
  bhujapidasana: { pelvisY: 0.48, pelvisZ: 0.08, crownY: 0.35, crownZ: -0.20 },
  kukkutasana: { pelvisY: 0.35, pelvisZ: 0.05, crownY: 0.72, crownZ: -0.05 },
  lolasana: { pelvisY: 0.38, pelvisZ: 0.05, crownY: 0.65, crownZ: -0.08 },
  astavakrasana: { pelvisY: 0.32, pelvisZ: 0.10, crownY: 0.35, crownZ: -0.32 },
  tittibhasana: { pelvisY: 0.35, pelvisZ: 0.08, crownY: 0.38, crownZ: -0.25 },
  navasana: { pelvisY: 0.12, pelvisZ: -0.05, crownY: 0.65, crownZ: -0.28 },
  purvottanasana: { pelvisY: 0.42, pelvisZ: 0.12, crownY: 0.58, crownZ: -0.45 },
  vasisthasana: { pelvisY: 0.55, pelvisZ: 0.10, crownY: 0.85, crownZ: -0.35 },
  malasana: { pelvisY: 0.22, pelvisZ: 0.05, crownY: 0.72, crownZ: -0.05 },
  pasasana: { pelvisY: 0.22, pelvisZ: 0.05, crownY: 0.68, crownZ: -0.08 },
  pincha_mayurasana: { pelvisY: 1.15, pelvisZ: 0.05, crownY: 0.35, crownZ: -0.15 },
  adho_mukha_vrksasana: { pelvisY: 1.25, pelvisZ: 0.0, crownY: 0.45, crownZ: -0.10 }
}

const SEATED_GENERIC = [
  'lotus', 'dandasana', 'sukhasana', 'vajrasana', 'virasana', 'gomukhasana',
  'bharadvajasana', 'marichyasana', 'baddha_konasana', 'garbha_pindasana'
]

function getPoseEndpoints(poseName, points) {
  let minY = 999, maxY = -999, minZ = 999, maxZ = -999
  let highestPoint = points[0]
  for (const pt of points) {
    if (pt.y < minY) minY = pt.y
    if (pt.y > maxY) { maxY = pt.y; highestPoint = pt }
    if (pt.z < minZ) minZ = pt.z
    if (pt.z > maxZ) maxZ = pt.z
  }

  const custom = POSE_ORIENTATIONS[poseName]
  if (custom) {
    return {
      pelvis: new THREE.Vector3(0, custom.pelvisY, custom.pelvisZ),
      crown: new THREE.Vector3(0, custom.crownY, custom.crownZ)
    }
  }

  if (SEATED_GENERIC.includes(poseName)) {
    return {
      pelvis: new THREE.Vector3(0, minY + 0.08, 0.02),
      crown: new THREE.Vector3(highestPoint.x * 0.5, maxY - 0.03, highestPoint.z * 0.5)
    }
  }

  const pelvisY = minY + (maxY - minY) * 0.48
  return {
    pelvis: new THREE.Vector3(0, pelvisY, 0),
    crown: new THREE.Vector3(highestPoint.x * 0.6, maxY - 0.03, highestPoint.z * 0.6)
  }
}

function calculate7ChakrasForPose(poseName, points) {
  const { pelvis, crown } = getPoseEndpoints(poseName, points)

  const chakras = []
  const count = 7

  for (let index = 0; index < count; index++) {
    const fraction = index / (count - 1)
    const directPoint = new THREE.Vector3().lerpVectors(pelvis, crown, fraction)

    const nearbyPoints = points.filter(p => p.distanceTo(directPoint) < 0.16)
    if (nearbyPoints.length > 8) {
      const centroid = new THREE.Vector3()
      for (const p of nearbyPoints) centroid.add(p)
      centroid.divideScalar(nearbyPoints.length)
      directPoint.lerp(centroid, 0.35)
    }

    chakras.push([
      Number(directPoint.x.toFixed(4)),
      Number(directPoint.y.toFixed(4)),
      Number(directPoint.z.toFixed(4))
    ])
  }

  return chakras
}

const finalChakrasMap = {}
for (const key of poseKeys) {
  const pts = getPosePoints(key)
  finalChakrasMap[key] = calculate7ChakrasForPose(key, pts)
}

const outputPath = path.resolve('public/models/chakras.json')
fs.writeFileSync(outputPath, JSON.stringify(finalChakrasMap, null, 2))
console.log(`Successfully generated verified precise chakras for all ${poseKeys.length} poses`)
