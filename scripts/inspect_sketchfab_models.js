import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

globalThis.self = globalThis
class ProgressEventMock {
  constructor(type, data) {
    this.type = type
    Object.assign(this, data)
  }
}
globalThis.ProgressEvent = ProgressEventMock

const baseDir = path.resolve('public/models/sketchfab')
const modelKeys = ['lotus', 'tree', 'triangle', 'dog', 'woman_pose', 'yoga_anim']

async function inspectModel(key) {
  const modelDir = path.join(baseDir, key)
  const gltfPath = path.join(modelDir, 'scene.gltf')
  if (!fs.existsSync(gltfPath)) {
    console.log(`[${key}] scene.gltf not found`)
    return
  }

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

  return new Promise((resolve) => {
    loader.parse(
      JSON.stringify(gltfJson),
      '',
      (gltf) => {
        let totalVertices = 0
        let meshesCount = 0
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = new THREE.Vector3()
        box.getSize(size)

        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            meshesCount++
            if (child.geometry && child.geometry.attributes.position) {
              totalVertices += child.geometry.attributes.position.count
            }
          }
        })

        console.log(`[${key}] Meshes: ${meshesCount}, Vertices: ${totalVertices}, Size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, Animations: ${gltf.animations.length}`)
        if (gltf.animations.length > 0) {
          for (const anim of gltf.animations) {
            console.log(`   Animation: "${anim.name}", duration: ${anim.duration.toFixed(2)}s`)
          }
        }
        resolve()
      },
      (err) => {
        console.error(`[${key}] Error:`, err)
        resolve()
      }
    )
  })
}

async function main() {
  for (const key of modelKeys) {
    await inspectModel(key)
  }
}

main().catch(console.error)
