import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const bakedDataPath = path.resolve('public/models/poses_baked.json')
const posesData = JSON.parse(fs.readFileSync(bakedDataPath, 'utf8'))
const BODY_PARTICLES_COUNT = 15840

function computeChakrasForPose(poseName, positionsArray) {
  const points = []
  for (let i = 0; i < BODY_PARTICLES_COUNT; i++) {
    points.push(new THREE.Vector3(
      positionsArray[i * 3],
      positionsArray[i * 3 + 1],
      positionsArray[i * 3 + 2]
    ))
  }

  let minY = 999, maxY = -999
  let topPoint = points[0]
  for (const pt of points) {
    if (pt.y < minY) minY = pt.y
    if (pt.y > maxY) {
      maxY = pt.y
      topPoint = pt
    }
  }

  const isInverted = poseName.includes('sirsasana') ||
    poseName.includes('sarvangasana') ||
    poseName.includes('halasana') ||
    poseName.includes('karnapidasana') ||
    poseName.includes('viparita') ||
    poseName.includes('adho_mukha_vrksasana') ||
    poseName.includes('pincha')

  const isSeated = poseName === 'lotus' ||
    poseName.includes('dandasana') ||
    poseName.includes('sukhasana') ||
    poseName.includes('vajrasana') ||
    poseName.includes('baddha') ||
    poseName.includes('kurmasana') ||
    poseName.includes('garbha') ||
    poseName.includes('paschimottanasana') ||
    poseName.includes('janu') ||
    poseName.includes('upavistha')

  let pelvisY = 0.82
  let crownY = maxY - 0.03

  if (isSeated) {
    pelvisY = minY + 0.08
    crownY = maxY - 0.03
  } else if (isInverted) {
    crownY = minY + 0.06
    pelvisY = maxY - 0.70
  } else {
    pelvisY = minY + (maxY - minY) * 0.48
    crownY = maxY - 0.03
  }

  const chakraPoints = []
  const chakraStepCount = 7

  for (let i = 0; i < chakraStepCount; i++) {
    const progress = i / (chakraStepCount - 1)
    const targetY = pelvisY + (crownY - pelvisY) * progress
    const sliceBand = 0.045

    const slicePoints = points.filter(pt => {
      const radiusFromCenter = Math.sqrt(pt.x * pt.x + pt.z * pt.z)
      return Math.abs(pt.y - targetY) < sliceBand && radiusFromCenter < 0.32
    })

    if (slicePoints.length > 0) {
      const centroid = new THREE.Vector3()
      for (const pt of slicePoints) centroid.add(pt)
      centroid.divideScalar(slicePoints.length)
      chakraPoints.push([
        Number(centroid.x.toFixed(4)),
        Number(centroid.y.toFixed(4)),
        Number(centroid.z.toFixed(4))
      ])
    } else {
      chakraPoints.push([
        0,
        Number(targetY.toFixed(4)),
        0
      ])
    }
  }

  return chakraPoints
}

const allChakrasMap = {}
for (const poseKey of Object.keys(posesData)) {
  const posePositions = posesData[poseKey].positions
  allChakrasMap[poseKey] = computeChakrasForPose(poseKey, posePositions)
}

const outputPath = path.resolve('public/models/chakras.json')
fs.writeFileSync(outputPath, JSON.stringify(allChakrasMap, null, 2))
console.log(`Updated chakras for ${Object.keys(allChakrasMap).length} poses`)
