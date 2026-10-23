import fs from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

const BONE_TRANSFORMS_BY_POSE = {
  lotus: {
    mixamorigHips: { position: [0, 32, 0], rotation: [0, 0, 0] },
    mixamorigSpine: { rotation: [0.08, 0, 0] },
    mixamorigSpine1: { rotation: [0.04, 0, 0] },
    mixamorigLeftShoulder: { rotation: [0, 0, 0.1] },
    mixamorigLeftArm: { rotation: [0.4, 0.2, 1.25] },
    mixamorigLeftForeArm: { rotation: [0.1, 0.8, -0.6] },
    mixamorigLeftHand: { rotation: [0.2, 0, 0.3] },
    mixamorigRightShoulder: { rotation: [0, 0, -0.1] },
    mixamorigRightArm: { rotation: [0.4, -0.2, -1.25] },
    mixamorigRightForeArm: { rotation: [0.1, -0.8, 0.6] },
    mixamorigRightHand: { rotation: [0.2, 0, -0.3] },
    mixamorigLeftUpLeg: { rotation: [1.32, 0.65, -1.25] },
    mixamorigLeftLeg: { rotation: [0, 0, 2.38] },
    mixamorigLeftFoot: { rotation: [0.2, 0.4, -0.6] },
    mixamorigRightUpLeg: { rotation: [1.32, -0.65, 1.25] },
    mixamorigRightLeg: { rotation: [0, 0, -2.38] },
    mixamorigRightFoot: { rotation: [0.2, -0.4, 0.6] },
  },
  warrior2: {
    mixamorigHips: { position: [0, 85, 0], rotation: [0, 0.35, 0] },
    mixamorigSpine: { rotation: [0, -0.2, 0] },
    mixamorigHead: { rotation: [0, 1.15, 0] },
    mixamorigLeftArm: { rotation: [0, 0, 0.05] },
    mixamorigLeftForeArm: { rotation: [0, 0, 0] },
    mixamorigRightArm: { rotation: [0, 0, -0.05] },
    mixamorigRightForeArm: { rotation: [0, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [0.85, 0.45, -0.9] },
    mixamorigLeftLeg: { rotation: [0, 0, 1.6] },
    mixamorigLeftFoot: { rotation: [0.1, 0.5, 0] },
    mixamorigRightUpLeg: { rotation: [0.2, -0.3, 0.95] },
    mixamorigRightLeg: { rotation: [0, 0, 0.1] },
    mixamorigRightFoot: { rotation: [0, -0.7, 0] },
  },
  tree: {
    mixamorigHips: { position: [0, 104, 0], rotation: [0, 0, 0] },
    mixamorigSpine: { rotation: [0.02, 0, 0] },
    mixamorigLeftArm: { rotation: [0, 0, -2.85] },
    mixamorigLeftForeArm: { rotation: [0, 0, 0.45] },
    mixamorigRightArm: { rotation: [0, 0, 2.85] },
    mixamorigRightForeArm: { rotation: [0, 0, -0.45] },
    mixamorigRightUpLeg: { rotation: [0, 0, 0] },
    mixamorigRightLeg: { rotation: [0, 0, 0] },
    mixamorigLeftUpLeg: { rotation: [0.35, 0.95, -1.35] },
    mixamorigLeftLeg: { rotation: [0, 0, 2.45] },
    mixamorigLeftFoot: { rotation: [0.2, 0.3, -0.4] },
  },
  warrior1: {
    mixamorigHips: { position: [0, 88, 0], rotation: [0, 0.65, 0] },
    mixamorigSpine: { rotation: [-0.15, 0, 0] },
    mixamorigHead: { rotation: [-0.25, 0, 0] },
    mixamorigLeftArm: { rotation: [0, 0, -2.9] },
    mixamorigRightArm: { rotation: [0, 0, 2.9] },
    mixamorigLeftUpLeg: { rotation: [0.95, 0.1, -0.2] },
    mixamorigLeftLeg: { rotation: [0, 0, 1.55] },
    mixamorigRightUpLeg: { rotation: [-0.65, -0.3, 0.35] },
    mixamorigRightLeg: { rotation: [0, 0, 0.1] },
  },
  downwardDog: {
    mixamorigHips: { position: [0, 118, -12], rotation: [1.85, 0, 0] },
    mixamorigSpine: { rotation: [0.3, 0, 0] },
    mixamorigHead: { rotation: [0.4, 0, 0] },
    mixamorigLeftArm: { rotation: [0, 0, -2.95] },
    mixamorigRightArm: { rotation: [0, 0, 2.95] },
    mixamorigLeftUpLeg: { rotation: [-1.45, 0, 0.1] },
    mixamorigRightUpLeg: { rotation: [-1.45, 0, -0.1] },
  },
}

const PARTICLE_COUNT = 18000
const MODEL_PATH = './public/models/human.glb'
const OUTPUT_PATH = './public/models/poses_baked.json'

const buffer = fs.readFileSync(MODEL_PATH)
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

const loader = new GLTFLoader()
loader.parse(arrayBuffer, '', (gltf) => {
  let skinnedMesh = null
  gltf.scene.traverse((child) => {
    if (child.isSkinnedMesh && child.name === 'Beta_Surface') {
      skinnedMesh = child
    }
  })

  const poseNames = ['lotus', 'warrior2', 'tree', 'warrior1', 'downwardDog']
  const resultData = {}

  for (const poseName of poseNames) {
    const transforms = BONE_TRANSFORMS_BY_POSE[poseName]
    for (const bone of skinnedMesh.skeleton.bones) {
      const transform = transforms[bone.name]
      if (transform) {
        if (transform.rotation) {
          bone.quaternion.setFromEuler(new THREE.Euler(
            transform.rotation[0],
            transform.rotation[1],
            transform.rotation[2]
          ))
        }
        if (transform.position) {
          bone.position.set(transform.position[0], transform.position[1], transform.position[2])
        }
      } else {
        bone.quaternion.set(0, 0, 0, 1)
      }
    }

    gltf.scene.updateMatrixWorld(true)
    skinnedMesh.skeleton.update()

    const sourceGeometry = skinnedMesh.geometry
    const posAttr = sourceGeometry.attributes.position
    const vertexCount = posAttr.count
    const deformedPositions = new Float32Array(vertexCount * 3)
    const tempPos = new THREE.Vector3()

    let minY = Infinity
    let maxY = -Infinity
    let minX = Infinity
    let maxX = -Infinity

    for (let i = 0; i < vertexCount; i++) {
      tempPos.fromBufferAttribute(posAttr, i)
      skinnedMesh.applyBoneTransform(i, tempPos)
      tempPos.applyMatrix4(skinnedMesh.matrixWorld)
      deformedPositions[i * 3] = tempPos.x
      deformedPositions[i * 3 + 1] = tempPos.y
      deformedPositions[i * 3 + 2] = tempPos.z
      minY = Math.min(minY, tempPos.y)
      maxY = Math.max(maxY, tempPos.y)
      minX = Math.min(minX, tempPos.x)
      maxX = Math.max(maxX, tempPos.x)
    }

    const bakedGeom = new THREE.BufferGeometry()
    bakedGeom.setAttribute('position', new THREE.BufferAttribute(deformedPositions, 3))
    if (sourceGeometry.index) {
      bakedGeom.setIndex(sourceGeometry.index.clone())
    }
    bakedGeom.computeVertexNormals()

    const mesh = new THREE.Mesh(bakedGeom, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    const sampler = new MeshSurfaceSampler(mesh).build()

    const positions = []
    const colors = []
    const sampledPos = new THREE.Vector3()
    const sampledNorm = new THREE.Vector3()

    const bodyCount = Math.floor(PARTICLE_COUNT * 0.88)
    const groundCount = PARTICLE_COUNT - bodyCount

    for (let i = 0; i < bodyCount; i++) {
      sampler.sample(sampledPos, sampledNorm)
      positions.push(
        Number(sampledPos.x.toFixed(4)),
        Number(sampledPos.y.toFixed(4)),
        Number(sampledPos.z.toFixed(4))
      )
      const heightFactor = Math.min(Math.max(sampledPos.y / 1.7, 0), 1)
      const intensity = 0.65 + Math.random() * 0.35
      const isCore = Math.abs(sampledPos.x) < 0.08 && sampledPos.y > 0.4

      if (isCore && Math.random() < 0.35) {
        colors.push(
          Number((0.98 * intensity).toFixed(3)),
          Number((0.98 * intensity).toFixed(3)),
          Number((1.0 * intensity).toFixed(3))
        )
      } else if (heightFactor < 0.25) {
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
    for (let i = 0; i < groundCount; i++) {
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

    resultData[poseName] = { positions, colors }
    console.log(`Pose ${poseName}: width X = ${(maxX - minX).toFixed(2)}, height Y = ${(maxY - minY).toFixed(2)} (from ${minY.toFixed(2)} to ${maxY.toFixed(2)})`)
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(resultData))
  console.log('Successfully saved to', OUTPUT_PATH)
}, (err) => {
  console.error('Error:', err)
})
