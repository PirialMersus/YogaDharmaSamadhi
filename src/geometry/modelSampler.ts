import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { POSE_CYCLE, type PoseName } from './poses'

export interface SampledModelPoseData {
  positions: Float32Array
  colors: Float32Array
}

type BoneRotationMap = Record<
  string,
  {
    rotation?: readonly [number, number, number]
    position?: readonly [number, number, number]
  }
>

const BONE_TRANSFORMS_BY_POSE: Partial<Record<PoseName, BoneRotationMap>> = {
  lotus: {
    mixamorigHips: {
      position: [0, 26, 0],
      rotation: [0, 0, 0],
    },
    mixamorigSpine: { rotation: [0.06, 0, 0] },
    mixamorigSpine1: { rotation: [0.04, 0, 0] },
    mixamorigSpine2: { rotation: [-0.02, 0, 0] },
    mixamorigNeck: { rotation: [-0.05, 0, 0] },
    mixamorigHead: { rotation: [0.02, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [1.32, 0.65, -1.25] },
    mixamorigLeftLeg: { rotation: [0, 0, 2.38] },
    mixamorigLeftFoot: { rotation: [0.2, 0.4, -0.6] },
    mixamorigRightUpLeg: { rotation: [1.32, -0.65, 1.25] },
    mixamorigRightLeg: { rotation: [0, 0, -2.38] },
    mixamorigRightFoot: { rotation: [0.2, -0.4, 0.6] },
    mixamorigLeftShoulder: { rotation: [0.05, 0.1, -0.1] },
    mixamorigLeftArm: { rotation: [0.45, 0.15, -0.65] },
    mixamorigLeftForeArm: { rotation: [0.2, 0.8, -0.5] },
    mixamorigLeftHand: { rotation: [0.2, 0, 0.3] },
    mixamorigRightShoulder: { rotation: [0.05, -0.1, 0.1] },
    mixamorigRightArm: { rotation: [0.45, -0.15, 0.65] },
    mixamorigRightForeArm: { rotation: [0.2, -0.8, 0.5] },
    mixamorigRightHand: { rotation: [0.2, 0, -0.3] },
  },
  virabhadrasana_ii: {
    mixamorigHips: {
      position: [0, 84, 0],
      rotation: [0, 0.35, 0],
    },
    mixamorigSpine: { rotation: [0, -0.2, 0] },
    mixamorigSpine1: { rotation: [0, -0.1, 0] },
    mixamorigHead: { rotation: [0, 1.15, 0] },
    mixamorigLeftUpLeg: { rotation: [0.85, 0.45, -0.9] },
    mixamorigLeftLeg: { rotation: [0, 0, 1.6] },
    mixamorigLeftFoot: { rotation: [0.1, 0.5, 0] },
    mixamorigRightUpLeg: { rotation: [0.2, -0.3, 0.95] },
    mixamorigRightLeg: { rotation: [0, 0, 0.1] },
    mixamorigRightFoot: { rotation: [0, -0.7, 0] },
    mixamorigLeftShoulder: { rotation: [0, 0, -0.1] },
    mixamorigLeftArm: { rotation: [0, 0, -1.45] },
    mixamorigLeftForeArm: { rotation: [0, 0, 0] },
    mixamorigRightShoulder: { rotation: [0, 0, 0.1] },
    mixamorigRightArm: { rotation: [0, 0, 1.45] },
    mixamorigRightForeArm: { rotation: [0, 0, 0] },
  },
  vriksasana: {
    mixamorigHips: {
      position: [0, 104, 0],
      rotation: [0, 0, 0],
    },
    mixamorigSpine: { rotation: [0.02, 0, 0] },
    mixamorigHead: { rotation: [-0.05, 0, 0] },
    mixamorigRightUpLeg: { rotation: [0, 0, 0] },
    mixamorigRightLeg: { rotation: [0, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [0.35, 0.95, -1.35] },
    mixamorigLeftLeg: { rotation: [0, 0, 2.45] },
    mixamorigLeftFoot: { rotation: [0.2, 0.3, -0.4] },
    mixamorigLeftShoulder: { rotation: [0, 0, -0.35] },
    mixamorigLeftArm: { rotation: [0, 0, -2.85] },
    mixamorigLeftForeArm: { rotation: [0, 0, 0.45] },
    mixamorigRightShoulder: { rotation: [0, 0, 0.35] },
    mixamorigRightArm: { rotation: [0, 0, 2.85] },
    mixamorigRightForeArm: { rotation: [0, 0, -0.45] },
  },
  virabhadrasana_i: {
    mixamorigHips: {
      position: [0, 88, 0],
      rotation: [0, 0.65, 0],
    },
    mixamorigSpine: { rotation: [-0.15, 0, 0] },
    mixamorigHead: { rotation: [-0.25, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [0.95, 0.1, -0.2] },
    mixamorigLeftLeg: { rotation: [0, 0, 1.55] },
    mixamorigRightUpLeg: { rotation: [-0.65, -0.3, 0.35] },
    mixamorigRightLeg: { rotation: [0, 0, 0.1] },
    mixamorigLeftArm: { rotation: [0, 0, -2.95] },
    mixamorigRightArm: { rotation: [0, 0, 2.95] },
  },
  marjaryasana: {
    mixamorigHips: {
      position: [0, 118, -12],
      rotation: [1.85, 0, 0],
    },
    mixamorigSpine: { rotation: [0.3, 0, 0] },
    mixamorigSpine1: { rotation: [0.2, 0, 0] },
    mixamorigHead: { rotation: [0.4, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [-1.45, 0, 0.1] },
    mixamorigLeftLeg: { rotation: [0, 0, 0] },
    mixamorigRightUpLeg: { rotation: [-1.45, 0, -0.1] },
    mixamorigRightLeg: { rotation: [0, 0, 0] },
    mixamorigLeftArm: { rotation: [0, 0, -2.95] },
    mixamorigLeftForeArm: { rotation: [0, 0, 0] },
    mixamorigRightArm: { rotation: [0, 0, 2.95] },
    mixamorigRightForeArm: { rotation: [0, 0, 0] },
  },
}

function applyPoseToSkeleton(
  skeleton: THREE.Skeleton,
  poseTransforms: BoneRotationMap,
): void {
  for (const bone of skeleton.bones) {
    const transform = poseTransforms[bone.name]
    if (transform) {
      if (transform.rotation) {
        bone.rotation.set(
          transform.rotation[0],
          transform.rotation[1],
          transform.rotation[2],
        )
      }
      if (transform.position) {
        bone.position.set(
          transform.position[0],
          transform.position[1],
          transform.position[2],
        )
      }
    } else {
      bone.rotation.set(0, 0, 0)
    }
  }
  skeleton.update()
}

function generateDeformedMeshGeometry(
  skinnedMesh: THREE.SkinnedMesh,
): THREE.BufferGeometry {
  const sourceGeometry = skinnedMesh.geometry
  const positionAttribute = sourceGeometry.attributes
    .position as THREE.BufferAttribute
  const vertexCount = positionAttribute.count

  const deformedPositions = new Float32Array(vertexCount * 3)
  const tempPosition = new THREE.Vector3()

  skinnedMesh.updateMatrixWorld(true)

  const scaleFactor = 0.01

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
    tempPosition.fromBufferAttribute(positionAttribute, vertexIndex)
    skinnedMesh.applyBoneTransform(vertexIndex, tempPosition)
    tempPosition.applyMatrix4(skinnedMesh.matrixWorld)

    deformedPositions[vertexIndex * 3] = tempPosition.x * scaleFactor
    deformedPositions[vertexIndex * 3 + 1] = tempPosition.y * scaleFactor
    deformedPositions[vertexIndex * 3 + 2] = tempPosition.z * scaleFactor
  }

  const bakedGeometry = new THREE.BufferGeometry()
  bakedGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(deformedPositions, 3),
  )
  if (sourceGeometry.index) {
    bakedGeometry.setIndex(sourceGeometry.index.clone())
  }
  bakedGeometry.computeVertexNormals()

  return bakedGeometry
}

function sampleGeometrySurface(
  geometry: THREE.BufferGeometry,
  targetParticleCount: number,
  poseName: PoseName,
): SampledModelPoseData {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  )
  const sampler = new MeshSurfaceSampler(mesh).build()

  const positions = new Float32Array(targetParticleCount * 3)
  const colors = new Float32Array(targetParticleCount * 3)

  const sampledPosition = new THREE.Vector3()
  const sampledNormal = new THREE.Vector3()

  const bodyParticleCount = Math.floor(targetParticleCount * 0.88)
  const groundParticleCount = targetParticleCount - bodyParticleCount

  for (let index = 0; index < bodyParticleCount; index++) {
    sampler.sample(sampledPosition, sampledNormal)

    const indexCoord = index * 3
    positions[indexCoord] = sampledPosition.x
    positions[indexCoord + 1] = sampledPosition.y
    positions[indexCoord + 2] = sampledPosition.z

    const heightFactor = Math.min(Math.max(sampledPosition.y / 1.7, 0), 1)
    const randomIntensity = 0.6 + Math.random() * 0.4
    const isNearCore =
      Math.abs(sampledPosition.x) < 0.07 && sampledPosition.y > 0.4

    if (isNearCore && Math.random() < 0.3) {
      colors[indexCoord] = 0.98 * randomIntensity
      colors[indexCoord + 1] = 0.98 * randomIntensity
      colors[indexCoord + 2] = 1.0 * randomIntensity
    } else if (heightFactor < 0.25) {
      colors[indexCoord] = 0.7 * randomIntensity
      colors[indexCoord + 1] = 0.35 * randomIntensity
      colors[indexCoord + 2] = 0.95 * randomIntensity
    } else {
      colors[indexCoord] = 0.25 * randomIntensity
      colors[indexCoord + 1] = 0.65 * randomIntensity
      colors[indexCoord + 2] = 1.0 * randomIntensity
    }
  }

  const groundBaseY = poseName === 'lotus' ? 0.08 : 0.04
  for (let index = 0; index < groundParticleCount; index++) {
    const particleIndex = bodyParticleCount + index
    const indexCoord = particleIndex * 3

    const groundRadius = 0.15 + Math.sqrt(Math.random()) * 1.4
    const groundAngle = Math.random() * Math.PI * 2
    const elevationJitter = (Math.random() - 0.5) * 0.05

    positions[indexCoord] = groundRadius * Math.cos(groundAngle)
    positions[indexCoord + 1] = groundBaseY + elevationJitter
    positions[indexCoord + 2] =
      groundRadius * Math.sin(groundAngle) * 0.85 + 0.05

    const groundIntensity = 0.5 + Math.random() * 0.35
    if (Math.random() < 0.6) {
      colors[indexCoord] = 0.75 * groundIntensity
      colors[indexCoord + 1] = 0.35 * groundIntensity
      colors[indexCoord + 2] = 0.9 * groundIntensity
    } else {
      colors[indexCoord] = 0.25 * groundIntensity
      colors[indexCoord + 1] = 0.55 * groundIntensity
      colors[indexCoord + 2] = 1.0 * groundIntensity
    }
  }

  return { positions, colors }
}

export async function loadAndSampleAllPosesFromModel(
  modelUrl: string,
  targetParticleCount: number,
): Promise<Record<PoseName, SampledModelPoseData>> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()

    loader.load(
      modelUrl,
      (gltf) => {
        let skinnedMesh: THREE.SkinnedMesh | null = null

        gltf.scene.traverse((child) => {
          if (
            (child as THREE.SkinnedMesh).isSkinnedMesh &&
            child.name === 'Beta_Surface'
          ) {
            skinnedMesh = child as THREE.SkinnedMesh
          }
        })

        if (!skinnedMesh) {
          gltf.scene.traverse((child) => {
            if (
              (child as THREE.SkinnedMesh).isSkinnedMesh &&
              !skinnedMesh
            ) {
              skinnedMesh = child as THREE.SkinnedMesh
            }
          })
        }

        if (!skinnedMesh) {
          reject(new Error('SkinnedMesh not found in model'))
          return
        }

        const validSkinnedMesh: THREE.SkinnedMesh = skinnedMesh
        const poseDataMap = {} as Record<PoseName, SampledModelPoseData>

        for (const poseName of POSE_CYCLE) {
          const transforms = BONE_TRANSFORMS_BY_POSE[poseName]
          applyPoseToSkeleton(validSkinnedMesh.skeleton, transforms ?? {})
          const bakedGeometry = generateDeformedMeshGeometry(validSkinnedMesh)
          poseDataMap[poseName] = sampleGeometrySurface(
            bakedGeometry,
            targetParticleCount,
            poseName,
          )
        }

        resolve(poseDataMap)
      },
      undefined,
      (error) => {
        reject(error)
      },
    )
  })
}
