import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const meta = JSON.parse(fs.readFileSync('public/models/solid_sculpts.json', 'utf8'))
const bin = fs.readFileSync('public/models/solid_sculpts.bin')

const poseKeys = Object.keys(meta.poses)
console.log('Total poses in sculpts:', poseKeys.length)

function analyzePose(name) {
  const p = meta.poses[name]
  const positions = new Float32Array(bin.buffer, bin.byteOffset + p.posOffset, p.posCount)
  const count = positions.length / 3

  let minY = 999, maxY = -999, minZ = 999, maxZ = -999, minX = 999, maxX = -999
  let topPt = [0, 0, 0], bottomPt = [0, 0, 0], frontPt = [0, 0, 0], backPt = [0, 0, 0]

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]

    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) { minY = y; bottomPt = [x, y, z] }
    if (y > maxY) { maxY = y; topPt = [x, y, z] }
    if (z < minZ) { minZ = z; frontPt = [x, y, z] }
    if (z > maxZ) { maxZ = z; backPt = [x, y, z] }
  }

  return { name, count, minY, maxY, minZ, maxZ, minX, maxX, topPt, bottomPt, frontPt, backPt }
}

const report = poseKeys.map(analyzePose)
console.log('Sample report topPt and maxY:');
report.slice(0, 10).forEach(r => console.log(r.name.padEnd(24), 'height:', (r.maxY - r.minY).toFixed(2), 'maxY:', r.maxY.toFixed(2), 'Z range:', (r.maxZ - r.minZ).toFixed(2)))
