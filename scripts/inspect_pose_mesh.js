import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const meta = JSON.parse(fs.readFileSync('public/models/solid_sculpts.json', 'utf8'))
const bin = fs.readFileSync('public/models/solid_sculpts.bin')

function getPoseGeometry(poseName) {
  const p = meta.poses[poseName]
  if (!p) return null
  const positions = new Float32Array(bin.buffer, bin.byteOffset + p.posOffset, p.posCount)
  const indices = new Uint32Array(bin.buffer, bin.byteOffset + p.idxOffset, p.idxCount)
  return { positions, indices }
}

const testPoses = ['tadasana', 'vriksasana', 'trikonasana', 'uttanasana', 'adho_mukha_svanasana', 'sirsasana', 'lotus', 'savasana']

for (const poseName of testPoses) {
  const geom = getPoseGeometry(poseName)
  if (!geom) continue
  const count = geom.positions.length / 3
  let minY = 999, maxY = -999, minZ = 999, maxZ = -999, minX = 999, maxX = -999
  for (let i = 0; i < count; i++) {
    const x = geom.positions[i*3]
    const y = geom.positions[i*3+1]
    const z = geom.positions[i*3+2]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  console.log(poseName.padEnd(22), 'verts:', count, 'Y:', minY.toFixed(2), '..', maxY.toFixed(2), 'Z:', minZ.toFixed(2), '..', maxZ.toFixed(2), 'X:', minX.toFixed(2), '..', maxX.toFixed(2))
}
