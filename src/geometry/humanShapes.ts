import * as THREE from 'three'
import type { JointKeyframes, Vec3 } from './poses'

export interface ParticleBufferGroup {
  readonly positions: Float32Array
  readonly colors: Float32Array
}

export interface GeneratedCelestialPoseData {
  readonly bodyDust: ParticleBufferGroup
  readonly constellationStars: ParticleBufferGroup
  readonly cosmicGround: ParticleBufferGroup
}

interface ParticleAccumulator {
  positions: number[]
  colors: number[]
}

export const BODY_DUST_COUNT = 22000
export const CONSTELLATION_STAR_COUNT = 1200
export const COSMIC_GROUND_COUNT = 4500

function createDeterministicRandomNumberGenerator(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }
}

function computeOrthonormalBasis(
  directionX: number,
  directionY: number,
  directionZ: number,
): readonly [number, number, number, number, number, number] {
  const length = Math.sqrt(
    directionX * directionX + directionY * directionY + directionZ * directionZ,
  )
  if (length < 0.0001) return [1, 0, 0, 0, 1, 0]

  const normalizedX = directionX / length
  const normalizedY = directionY / length
  const normalizedZ = directionZ / length

  let axisUx: number, axisUy: number, axisUz: number
  if (Math.abs(normalizedY) < 0.88) {
    const horizontalLength =
      Math.sqrt(normalizedZ * normalizedZ + normalizedX * normalizedX) || 1
    axisUx = normalizedZ / horizontalLength
    axisUy = 0
    axisUz = -normalizedX / horizontalLength
  } else {
    axisUx = 1
    axisUy = 0
    axisUz = 0
  }

  const axisVx = normalizedY * axisUz - normalizedZ * axisUy
  const axisVy = normalizedZ * axisUx - normalizedX * axisUz
  const axisVz = normalizedX * axisUy - normalizedY * axisUx

  return [axisUx, axisUy, axisUz, axisVx, axisVy, axisVz]
}

function assignCosmicColor(
  category: 'volume' | 'contour' | 'aura' | 'chakraCore' | 'chakraHalo' | 'ground' | 'ember',
  verticalRatio: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const randomValue = rng()

  if (category === 'chakraCore') {
    const intensity = 1.35 + rng() * 0.35
    if (randomValue < 0.5) {
      accumulator.colors.push(1.0 * intensity, 1.0 * intensity, 1.0 * intensity)
    } else {
      accumulator.colors.push(0.45 * intensity, 0.9 * intensity, 1.0 * intensity)
    }
    return
  }

  if (category === 'chakraHalo') {
    const intensity = 0.65 + rng() * 0.35
    if (verticalRatio > 0.4) {
      accumulator.colors.push(0.15 * intensity, 0.8 * intensity, 1.0 * intensity)
    } else {
      accumulator.colors.push(0.9 * intensity, 0.3 * intensity, 0.95 * intensity)
    }
    return
  }

  if (category === 'ground') {
    const intensity = 0.22 + rng() * 0.18
    if (randomValue < 0.55) {
      accumulator.colors.push(0.95 * intensity, 0.22 * intensity, 0.88 * intensity)
    } else if (randomValue < 0.82) {
      accumulator.colors.push(0.65 * intensity, 0.18 * intensity, 0.95 * intensity)
    } else {
      accumulator.colors.push(0.2 * intensity, 0.6 * intensity, 1.0 * intensity)
    }
    return
  }

  if (category === 'ember') {
    const intensity = 0.35 + rng() * 0.25
    if (randomValue < 0.6) {
      accumulator.colors.push(0.95 * intensity, 0.35 * intensity, 0.85 * intensity)
    } else {
      accumulator.colors.push(0.35 * intensity, 0.85 * intensity, 1.0 * intensity)
    }
    return
  }

  const baseIntensity =
    category === 'contour'
      ? 0.32 + rng() * 0.16
      : category === 'aura'
        ? 0.22 + rng() * 0.14
        : 0.16 + rng() * 0.12

  if (verticalRatio > 0.68) {
    if (randomValue < 0.25) {
      accumulator.colors.push(0.85 * baseIntensity, 0.95 * baseIntensity, 1.0 * baseIntensity)
    } else if (randomValue < 0.72) {
      accumulator.colors.push(0.1 * baseIntensity, 0.8 * baseIntensity, 1.0 * baseIntensity)
    } else {
      accumulator.colors.push(0.05 * baseIntensity, 0.5 * baseIntensity, 0.95 * baseIntensity)
    }
  } else if (verticalRatio > 0.32) {
    if (randomValue < 0.2) {
      accumulator.colors.push(0.85 * baseIntensity, 0.92 * baseIntensity, 1.0 * baseIntensity)
    } else if (randomValue < 0.62) {
      accumulator.colors.push(0.15 * baseIntensity, 0.68 * baseIntensity, 1.0 * baseIntensity)
    } else if (randomValue < 0.85) {
      accumulator.colors.push(0.55 * baseIntensity, 0.25 * baseIntensity, 0.95 * baseIntensity)
    } else {
      accumulator.colors.push(0.08 * baseIntensity, 0.38 * baseIntensity, 0.9 * baseIntensity)
    }
  } else {
    if (randomValue < 0.45) {
      accumulator.colors.push(0.95 * baseIntensity, 0.22 * baseIntensity, 0.85 * baseIntensity)
    } else if (randomValue < 0.8) {
      accumulator.colors.push(0.7 * baseIntensity, 0.18 * baseIntensity, 0.95 * baseIntensity)
    } else {
      accumulator.colors.push(0.22 * baseIntensity, 0.6 * baseIntensity, 1.0 * baseIntensity)
    }
  }
}

function sampleAnatomicalHead(
  center: Vec3,
  chinPoint: Vec3,
  count: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const [centerX, centerY, centerZ] = center
  const [chinX, chinY, chinZ] = chinPoint

  for (let index = 0; index < count; index++) {
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(2 * rng() - 1)
    const isLowerFace = phi > Math.PI * 0.52 && Math.cos(theta) > -0.15

    let radiusX = 0.108
    let radiusY = 0.138
    let radiusZ = 0.118

    if (isLowerFace) {
      radiusX *= 0.82
      radiusZ *= 0.88
    }

    const sampleMode = rng()
    let radiusMultiplier: number
    let category: 'volume' | 'contour' | 'aura'

    if (sampleMode < 0.4) {
      radiusMultiplier = Math.cbrt(rng()) * 0.85
      category = 'volume'
    } else if (sampleMode < 0.88) {
      radiusMultiplier = 0.92 + rng() * 0.12
      category = 'contour'
    } else {
      radiusMultiplier = 1.06 + rng() * 0.18
      category = 'aura'
    }

    const localX = radiusX * Math.sin(phi) * Math.sin(theta) * radiusMultiplier
    const localY = radiusY * Math.cos(phi) * radiusMultiplier
    const localZ = radiusZ * Math.sin(phi) * Math.cos(theta) * radiusMultiplier

    const chinBlend = isLowerFace ? 0.3 : 0
    const pointX = centerX * (1 - chinBlend) + chinX * chinBlend + localX
    const pointY = centerY * (1 - chinBlend) + chinY * chinBlend + localY
    const pointZ = centerZ * (1 - chinBlend) + chinZ * chinBlend + localZ

    accumulator.positions.push(pointX, pointY, pointZ)
    assignCosmicColor(category, 0.95, rng, accumulator)
  }
}

function sampleLimbSegment(
  startJoint: Vec3,
  endJoint: Vec3,
  startRadiusA: number,
  startRadiusB: number,
  midRadiusA: number,
  midRadiusB: number,
  endRadiusA: number,
  endRadiusB: number,
  count: number,
  verticalHint: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const [startX, startY, startZ] = startJoint
  const [endX, endY, endZ] = endJoint
  const deltaX = endX - startX
  const deltaY = endY - startY
  const deltaZ = endZ - startZ
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ)
  if (length < 0.001) return

  const normX = deltaX / length
  const normY = deltaY / length
  const normZ = deltaZ / length
  const [axisUx, axisUy, axisUz, axisVx, axisVy, axisVz] = computeOrthonormalBasis(
    deltaX,
    deltaY,
    deltaZ,
  )

  for (let index = 0; index < count; index++) {
    const parameter = rng()
    const angle = rng() * Math.PI * 2

    let radiusA: number, radiusB: number
    if (parameter < 0.5) {
      const segmentRatio = parameter * 2
      radiusA = startRadiusA + (midRadiusA - startRadiusA) * segmentRatio
      radiusB = startRadiusB + (midRadiusB - startRadiusB) * segmentRatio
    } else {
      const segmentRatio = (parameter - 0.5) * 2
      radiusA = midRadiusA + (endRadiusA - midRadiusA) * segmentRatio
      radiusB = midRadiusB + (endRadiusB - midRadiusB) * segmentRatio
    }

    const sampleMode = rng()
    let radiusMultiplier: number
    let category: 'volume' | 'contour' | 'aura'

    if (sampleMode < 0.38) {
      radiusMultiplier = Math.sqrt(rng()) * 0.85
      category = 'volume'
    } else if (sampleMode < 0.86) {
      radiusMultiplier = 0.92 + rng() * 0.12
      category = 'contour'
    } else {
      radiusMultiplier = 1.06 + rng() * 0.2
      category = 'aura'
    }

    const finalRadiusA = radiusA * radiusMultiplier
    const finalRadiusB = radiusB * radiusMultiplier

    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)

    const axialPositionX = startX + normX * parameter * length
    const axialPositionY = startY + normY * parameter * length
    const axialPositionZ = startZ + normZ * parameter * length

    const offsetX = axisUx * finalRadiusA * cosAngle + axisVx * finalRadiusB * sinAngle
    const offsetY = axisUy * finalRadiusA * cosAngle + axisVy * finalRadiusB * sinAngle
    const offsetZ = axisUz * finalRadiusA * cosAngle + axisVz * finalRadiusB * sinAngle

    accumulator.positions.push(
      axialPositionX + offsetX,
      axialPositionY + offsetY,
      axialPositionZ + offsetZ,
    )
    assignCosmicColor(category, verticalHint, rng, accumulator)
  }
}

function sampleHandWithMudra(
  wristPoint: Vec3,
  handTip: Vec3,
  count: number,
  verticalHint: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const [wristX, wristY, wristZ] = wristPoint
  const [tipX, tipY, tipZ] = handTip
  const deltaX = tipX - wristX
  const deltaY = tipY - wristY
  const deltaZ = tipZ - wristZ
  const handLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) || 0.15
  const normX = deltaX / handLength
  const normY = deltaY / handLength
  const normZ = deltaZ / handLength
  const [axisUx, axisUy, axisUz, axisVx, axisVy, axisVz] = computeOrthonormalBasis(
    deltaX,
    deltaY,
    deltaZ,
  )

  for (let index = 0; index < count; index++) {
    const parameter = rng()
    const fingerChoice = rng()

    if (fingerChoice < 0.42) {
      const circleAngle = rng() * Math.PI * 2
      const circleRadius = 0.026
      const circleProgress = 0.65
      const spreadX = Math.cos(circleAngle) * circleRadius
      const spreadY = Math.sin(circleAngle) * circleRadius * 0.7
      const spreadZ = Math.sin(circleAngle) * circleRadius * 0.7
      const axial = parameter * 0.3 + circleProgress * 0.7

      accumulator.positions.push(
        wristX + normX * axial * handLength + axisUx * spreadX + axisVx * spreadY,
        wristY + normY * axial * handLength + axisUy * spreadX + axisVy * spreadY,
        wristZ + normZ * axial * handLength + axisUz * spreadX + axisVz * spreadZ,
      )
      assignCosmicColor('contour', verticalHint, rng, accumulator)
      continue
    }

    const extendedIndex = Math.floor(rng() * 3)
    const angleSpread = (extendedIndex - 1.0) * 0.26 + (rng() - 0.5) * 0.1
    const palmWidth = (1.0 - parameter * 0.35) * 0.04
    const palmThickness = 0.02 * (1.0 - parameter * 0.25)

    const cosAngle = Math.cos(angleSpread)
    const sinAngle = Math.sin(angleSpread)

    const posX =
      wristX +
      normX * parameter * handLength +
      (axisUx * cosAngle + axisVx * sinAngle) * palmWidth * (0.8 + rng() * 0.4)
    const posY =
      wristY +
      normY * parameter * handLength +
      (axisUy * cosAngle + axisVy * sinAngle) * palmWidth * (0.8 + rng() * 0.4)
    const posZ =
      wristZ +
      normZ * parameter * handLength +
      (axisUz * cosAngle + axisVz * sinAngle) * palmThickness * (0.8 + rng() * 0.4)

    accumulator.positions.push(posX, posY, posZ)
    assignCosmicColor('contour', verticalHint, rng, accumulator)
  }
}

function sampleTorsoAnatomy(
  joints: JointKeyframes,
  count: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const spinePoints: { position: Vec3; widthX: number; depthZ: number; verticalRatio: number }[] = [
    { position: joints.neckBase, widthX: 0.14, depthZ: 0.1, verticalRatio: 0.8 },
    { position: joints.clavicleCenter, widthX: 0.26, depthZ: 0.14, verticalRatio: 0.76 },
    { position: joints.chestCenter, widthX: 0.25, depthZ: 0.15, verticalRatio: 0.68 },
    { position: joints.ribsCenter, widthX: 0.22, depthZ: 0.13, verticalRatio: 0.58 },
    { position: joints.waistCenter, widthX: 0.18, depthZ: 0.11, verticalRatio: 0.48 },
    { position: joints.navelCenter, widthX: 0.2, depthZ: 0.125, verticalRatio: 0.38 },
    { position: joints.pelvisCenter, widthX: 0.24, depthZ: 0.145, verticalRatio: 0.25 },
  ]

  const segmentCount = spinePoints.length - 1
  const particlesPerSegment = Math.floor(count / segmentCount)

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
    const currentPoint = spinePoints[segmentIndex]
    const nextPoint = spinePoints[segmentIndex + 1]
    const deltaX = nextPoint.position[0] - currentPoint.position[0]
    const deltaY = nextPoint.position[1] - currentPoint.position[1]
    const deltaZ = nextPoint.position[2] - currentPoint.position[2]
    const segmentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) || 0.05
    const normX = deltaX / segmentLength
    const normY = deltaY / segmentLength
    const normZ = deltaZ / segmentLength
    const [axisUx, axisUy, axisUz, axisVx, axisVy, axisVz] = computeOrthonormalBasis(
      deltaX,
      deltaY,
      deltaZ,
    )

    const actualCount =
      segmentIndex === segmentCount - 1
        ? count - particlesPerSegment * (segmentCount - 1)
        : particlesPerSegment

    for (let index = 0; index < actualCount; index++) {
      const parameter = rng()
      const angle = rng() * Math.PI * 2

      const currentWidthX =
        currentPoint.widthX + (nextPoint.widthX - currentPoint.widthX) * parameter
      const currentDepthZ =
        currentPoint.depthZ + (nextPoint.depthZ - currentPoint.depthZ) * parameter
      const verticalRatio =
        currentPoint.verticalRatio +
        (nextPoint.verticalRatio - currentPoint.verticalRatio) * parameter

      const sampleMode = rng()
      let radiusMultiplier: number
      let category: 'volume' | 'contour' | 'aura'

      if (sampleMode < 0.42) {
        radiusMultiplier = Math.sqrt(rng()) * 0.85
        category = 'volume'
      } else if (sampleMode < 0.88) {
        radiusMultiplier = 0.92 + rng() * 0.12
        category = 'contour'
      } else {
        radiusMultiplier = 1.06 + rng() * 0.2
        category = 'aura'
      }

      const finalRadiusX = currentWidthX * radiusMultiplier
      const finalRadiusZ = currentDepthZ * radiusMultiplier

      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)

      const baseX = currentPoint.position[0] + normX * parameter * segmentLength
      const baseY = currentPoint.position[1] + normY * parameter * segmentLength
      const baseZ = currentPoint.position[2] + normZ * parameter * segmentLength

      const offsetX = axisUx * finalRadiusX * cosAngle + axisVx * finalRadiusZ * sinAngle
      const offsetY = axisUy * finalRadiusX * cosAngle + axisVy * finalRadiusZ * sinAngle
      const offsetZ = axisUz * finalRadiusX * cosAngle + axisVz * finalRadiusZ * sinAngle

      accumulator.positions.push(baseX + offsetX, baseY + offsetY, baseZ + offsetZ)
      assignCosmicColor(category, verticalRatio, rng, accumulator)
    }
  }
}

function sampleConstellationStars(
  joints: JointKeyframes,
  targetCount: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const primaryNodes: { position: Vec3; verticalRatio: number; haloCount: number }[] = [
    { position: [joints.headCenter[0], joints.headCenter[1] + 0.12, joints.headCenter[2]], verticalRatio: 0.98, haloCount: 16 },
    { position: [joints.headCenter[0], joints.headCenter[1] + 0.02, joints.headCenter[2] + 0.10], verticalRatio: 0.92, haloCount: 14 },
    { position: [joints.neckBase[0], joints.neckBase[1] + 0.02, joints.neckBase[2] + 0.04], verticalRatio: 0.82, haloCount: 12 },
    { position: [joints.chestCenter[0], joints.chestCenter[1], joints.chestCenter[2] + 0.06], verticalRatio: 0.7, haloCount: 18 },
    { position: [joints.ribsCenter[0], joints.ribsCenter[1], joints.ribsCenter[2] + 0.04], verticalRatio: 0.58, haloCount: 12 },
    { position: [joints.navelCenter[0], joints.navelCenter[1], joints.navelCenter[2] + 0.03], verticalRatio: 0.45, haloCount: 12 },
    { position: [joints.pelvisCenter[0], joints.pelvisCenter[1] - 0.02, joints.pelvisCenter[2]], verticalRatio: 0.28, haloCount: 14 },
    { position: joints.leftHand, verticalRatio: 0.35, haloCount: 14 },
    { position: joints.rightHand, verticalRatio: 0.35, haloCount: 14 },
    { position: joints.leftWrist, verticalRatio: 0.32, haloCount: 8 },
    { position: joints.rightWrist, verticalRatio: 0.32, haloCount: 8 },
    { position: joints.leftShoulder, verticalRatio: 0.78, haloCount: 10 },
    { position: joints.rightShoulder, verticalRatio: 0.78, haloCount: 10 },
    { position: joints.leftElbow, verticalRatio: 0.55, haloCount: 8 },
    { position: joints.rightElbow, verticalRatio: 0.55, haloCount: 8 },
    { position: joints.leftKnee, verticalRatio: 0.22, haloCount: 12 },
    { position: joints.rightKnee, verticalRatio: 0.22, haloCount: 12 },
    { position: joints.leftFoot, verticalRatio: 0.12, haloCount: 8 },
    { position: joints.rightFoot, verticalRatio: 0.12, haloCount: 8 },
  ]

  let accumulatedCount = 0
  for (const node of primaryNodes) {
    accumulator.positions.push(node.position[0], node.position[1], node.position[2])
    assignCosmicColor('chakraCore', node.verticalRatio, rng, accumulator)
    accumulatedCount++

    for (let index = 0; index < node.haloCount; index++) {
      const radius = 0.008 + Math.pow(rng(), 1.5) * 0.04
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1)
      accumulator.positions.push(
        node.position[0] + radius * Math.sin(phi) * Math.cos(theta),
        node.position[1] + radius * Math.cos(phi),
        node.position[2] + radius * Math.sin(phi) * Math.sin(theta),
      )
      assignCosmicColor('chakraHalo', node.verticalRatio, rng, accumulator)
      accumulatedCount++
    }
  }

  const allJoints: Vec3[] = [
    joints.headCenter,
    joints.neckBase,
    joints.clavicleCenter,
    joints.chestCenter,
    joints.ribsCenter,
    joints.waistCenter,
    joints.navelCenter,
    joints.pelvisCenter,
    joints.leftShoulder,
    joints.leftElbow,
    joints.leftWrist,
    joints.rightShoulder,
    joints.rightElbow,
    joints.rightWrist,
    joints.leftHip,
    joints.leftKnee,
    joints.leftAnkle,
    joints.rightHip,
    joints.rightKnee,
    joints.rightAnkle,
  ]

  const remainingCount = targetCount - accumulatedCount
  for (let index = 0; index < remainingCount; index++) {
    const firstJoint = allJoints[Math.floor(rng() * allJoints.length)]
    const secondJoint = allJoints[Math.floor(rng() * allJoints.length)]
    const interpolateProgress = rng()
    const jitter = 0.015 + Math.pow(rng(), 2) * 0.05
    const angle = rng() * Math.PI * 2

    const posX =
      firstJoint[0] +
      (secondJoint[0] - firstJoint[0]) * interpolateProgress +
      Math.cos(angle) * jitter
    const posY =
      firstJoint[1] + (secondJoint[1] - firstJoint[1]) * interpolateProgress
    const posZ =
      firstJoint[2] +
      (secondJoint[2] - firstJoint[2]) * interpolateProgress +
      Math.sin(angle) * jitter

    accumulator.positions.push(posX, posY, posZ)
    assignCosmicColor('chakraHalo', posY / 1.7, rng, accumulator)
  }
}

function sampleCosmicGroundAndEmbers(
  joints: JointKeyframes,
  groundCount: number,
  rng: () => number,
  accumulator: ParticleAccumulator,
): void {
  const groundBaseY = Math.min(
    joints.leftAnkle[1],
    joints.rightAnkle[1],
    joints.pelvisCenter[1] - 0.12,
  )

  const groundSurfaceCount = Math.floor(groundCount * 0.88)
  const risingEmberCount = groundCount - groundSurfaceCount

  for (let index = 0; index < groundSurfaceCount; index++) {
    const radialExponent = Math.pow(rng(), 1.4)
    const radius = 0.08 + radialExponent * 1.95
    const baseAngle = rng() * Math.PI * 2
    const swirlAngle = baseAngle + Math.pow(radius, 0.72) * 2.5

    const distanceJitter = (rng() - 0.5) * 0.035
    const posX = radius * Math.cos(swirlAngle)
    const posY = groundBaseY + distanceJitter
    const posZ = radius * Math.sin(swirlAngle) * 0.86 + 0.05

    accumulator.positions.push(posX, posY, posZ)
    assignCosmicColor('ground', 0.05, rng, accumulator)
  }

  for (let index = 0; index < risingEmberCount; index++) {
    const radius = 0.15 + Math.sqrt(rng()) * 1.05
    const angle = rng() * Math.PI * 2
    const elevation = groundBaseY + rng() * 1.6

    const posX = radius * Math.cos(angle)
    const posY = elevation
    const posZ = radius * Math.sin(angle) * 0.85 + 0.05

    accumulator.positions.push(posX, posY, posZ)
    assignCosmicColor('ember', elevation / 1.7, rng, accumulator)
  }
}

function createBufferGroupFromAccumulator(
  accumulator: ParticleAccumulator,
  targetCount: number,
): ParticleBufferGroup {
  const availableCount = Math.floor(accumulator.positions.length / 3)
  const finalPositions = new Float32Array(targetCount * 3)
  const finalColors = new Float32Array(targetCount * 3)
  const copyCount = Math.min(availableCount, targetCount)

  for (let index = 0; index < copyCount; index++) {
    const baseIndex = index * 3
    finalPositions[baseIndex] = accumulator.positions[baseIndex]
    finalPositions[baseIndex + 1] = accumulator.positions[baseIndex + 1]
    finalPositions[baseIndex + 2] = accumulator.positions[baseIndex + 2]
    finalColors[baseIndex] = accumulator.colors[baseIndex]
    finalColors[baseIndex + 1] = accumulator.colors[baseIndex + 1]
    finalColors[baseIndex + 2] = accumulator.colors[baseIndex + 2]
  }

  for (let index = copyCount; index < targetCount; index++) {
    const baseIndex = index * 3
    const sourceIndex = (index % copyCount) * 3
    finalPositions[baseIndex] = accumulator.positions[sourceIndex]
    finalPositions[baseIndex + 1] = accumulator.positions[sourceIndex + 1]
    finalPositions[baseIndex + 2] = accumulator.positions[sourceIndex + 2]
    finalColors[baseIndex] = accumulator.colors[sourceIndex]
    finalColors[baseIndex + 1] = accumulator.colors[sourceIndex + 1]
    finalColors[baseIndex + 2] = accumulator.colors[sourceIndex + 2]
  }

  return { positions: finalPositions, colors: finalColors }
}

export function generateAllPoseData(
  joints: JointKeyframes,
): GeneratedCelestialPoseData {
  const rng = createDeterministicRandomNumberGenerator(42)

  const dustAccumulator: ParticleAccumulator = { positions: [], colors: [] }
  const starAccumulator: ParticleAccumulator = { positions: [], colors: [] }
  const groundAccumulator: ParticleAccumulator = { positions: [], colors: [] }

  sampleAnatomicalHead(joints.headCenter, joints.chinPoint, 2200, rng, dustAccumulator)

  sampleLimbSegment(
    joints.neckTop,
    joints.neckBase,
    0.058,
    0.054,
    0.064,
    0.058,
    0.076,
    0.068,
    600,
    0.85,
    rng,
    dustAccumulator,
  )

  sampleTorsoAnatomy(joints, 7200, rng, dustAccumulator)

  sampleLimbSegment(
    joints.leftShoulder,
    joints.leftElbow,
    0.088,
    0.082,
    0.076,
    0.07,
    0.058,
    0.052,
    1300,
    0.65,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.leftElbow,
    joints.leftWrist,
    0.058,
    0.052,
    0.062,
    0.054,
    0.046,
    0.04,
    1100,
    0.48,
    rng,
    dustAccumulator,
  )
  sampleHandWithMudra(joints.leftWrist, joints.leftHand, 600, 0.35, rng, dustAccumulator)

  sampleLimbSegment(
    joints.rightShoulder,
    joints.rightElbow,
    0.088,
    0.082,
    0.076,
    0.07,
    0.058,
    0.052,
    1300,
    0.65,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.rightElbow,
    joints.rightWrist,
    0.058,
    0.052,
    0.062,
    0.054,
    0.046,
    0.04,
    1100,
    0.48,
    rng,
    dustAccumulator,
  )
  sampleHandWithMudra(joints.rightWrist, joints.rightHand, 600, 0.35, rng, dustAccumulator)

  sampleLimbSegment(
    joints.leftHip,
    joints.leftKnee,
    0.125,
    0.114,
    0.11,
    0.1,
    0.084,
    0.078,
    2200,
    0.3,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.leftKnee,
    joints.leftAnkle,
    0.084,
    0.078,
    0.092,
    0.082,
    0.056,
    0.05,
    1800,
    0.2,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.leftAnkle,
    joints.leftFoot,
    0.054,
    0.048,
    0.056,
    0.042,
    0.06,
    0.028,
    600,
    0.12,
    rng,
    dustAccumulator,
  )

  sampleLimbSegment(
    joints.rightHip,
    joints.rightKnee,
    0.125,
    0.114,
    0.11,
    0.1,
    0.084,
    0.078,
    2200,
    0.3,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.rightKnee,
    joints.rightAnkle,
    0.084,
    0.078,
    0.092,
    0.082,
    0.056,
    0.05,
    1800,
    0.2,
    rng,
    dustAccumulator,
  )
  sampleLimbSegment(
    joints.rightAnkle,
    joints.rightFoot,
    0.054,
    0.048,
    0.056,
    0.042,
    0.06,
    0.028,
    600,
    0.12,
    rng,
    dustAccumulator,
  )

  sampleConstellationStars(joints, CONSTELLATION_STAR_COUNT, rng, starAccumulator)

  sampleCosmicGroundAndEmbers(joints, COSMIC_GROUND_COUNT, rng, groundAccumulator)

  return {
    bodyDust: createBufferGroupFromAccumulator(dustAccumulator, BODY_DUST_COUNT),
    constellationStars: createBufferGroupFromAccumulator(
      starAccumulator,
      CONSTELLATION_STAR_COUNT,
    ),
    cosmicGround: createBufferGroupFromAccumulator(
      groundAccumulator,
      COSMIC_GROUND_COUNT,
    ),
  }
}

export function easeInOutCubic(parameter: number): number {
  return parameter < 0.5
    ? 4 * parameter * parameter * parameter
    : 1 - Math.pow(-2 * parameter + 2, 3) / 2
}

export function createNebulaDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!

  const radialGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.12, 'rgba(220, 245, 255, 0.95)')
  radialGradient.addColorStop(0.32, 'rgba(110, 210, 255, 0.62)')
  radialGradient.addColorStop(0.58, 'rgba(40, 110, 245, 0.22)')
  radialGradient.addColorStop(0.82, 'rgba(20, 50, 180, 0.05)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

export function createStarFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!

  const radialGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.1, 'rgba(235, 250, 255, 0.95)')
  radialGradient.addColorStop(0.24, 'rgba(120, 215, 255, 0.68)')
  radialGradient.addColorStop(0.48, 'rgba(40, 130, 255, 0.24)')
  radialGradient.addColorStop(0.78, 'rgba(90, 45, 230, 0.06)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 128, 128)

  const horizontalGradient = context.createLinearGradient(0, 64, 128, 64)
  horizontalGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)')
  horizontalGradient.addColorStop(0.36, 'rgba(180, 235, 255, 0.35)')
  horizontalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)')
  horizontalGradient.addColorStop(0.64, 'rgba(180, 235, 255, 0.35)')
  horizontalGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  context.fillStyle = horizontalGradient
  context.fillRect(0, 62, 128, 4)

  const verticalGradient = context.createLinearGradient(64, 0, 64, 128)
  verticalGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)')
  verticalGradient.addColorStop(0.36, 'rgba(180, 235, 255, 0.35)')
  verticalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)')
  verticalGradient.addColorStop(0.64, 'rgba(180, 235, 255, 0.35)')
  verticalGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  context.fillStyle = verticalGradient
  context.fillRect(62, 0, 4, 128)

  const diagonalGradientA = context.createLinearGradient(18, 18, 110, 110)
  diagonalGradientA.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)')
  diagonalGradientA.addColorStop(0.5, 'rgba(210, 245, 255, 0.65)')
  diagonalGradientA.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  context.strokeStyle = diagonalGradientA
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(26, 26)
  context.lineTo(102, 102)
  context.stroke()

  const diagonalGradientB = context.createLinearGradient(110, 18, 18, 110)
  diagonalGradientB.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)')
  diagonalGradientB.addColorStop(0.5, 'rgba(210, 245, 255, 0.65)')
  diagonalGradientB.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  context.strokeStyle = diagonalGradientB
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(102, 26)
  context.lineTo(26, 102)
  context.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

export function createGroundMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!

  const radialGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.16, 'rgba(245, 185, 255, 0.92)')
  radialGradient.addColorStop(0.38, 'rgba(215, 85, 255, 0.55)')
  radialGradient.addColorStop(0.66, 'rgba(130, 35, 230, 0.2)')
  radialGradient.addColorStop(0.9, 'rgba(45, 12, 150, 0.05)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

export function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!

  const radialGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.12, 'rgba(230, 248, 255, 0.95)')
  radialGradient.addColorStop(0.3, 'rgba(100, 210, 255, 0.65)')
  radialGradient.addColorStop(0.55, 'rgba(30, 110, 245, 0.22)')
  radialGradient.addColorStop(0.8, 'rgba(15, 45, 175, 0.05)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 128, 128)

  context.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  context.lineWidth = 1.2
  context.beginPath()
  context.moveTo(64, 20)
  context.lineTo(64, 108)
  context.moveTo(20, 64)
  context.lineTo(108, 64)
  context.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

