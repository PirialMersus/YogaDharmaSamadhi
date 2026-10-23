import fs from 'fs'
import path from 'path'
import https from 'https'
import { execSync } from 'child_process'

const API_TOKEN = '1755b824de28491db700595b19d0840c'

function getDownloadInfo(uid) {
  return new Promise((resolve, reject) => {
    const url = `https://api.sketchfab.com/v3/models/${uid}/download`
    const req = https.get(
      url,
      {
        headers: {
          Authorization: `Token ${API_TOKEN}`,
        },
      },
      (res) => {
        let rawData = ''
        res.on('data', (chunk) => {
          rawData += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(rawData))
          } catch (error) {
            reject(error)
          }
        })
      }
    )
    req.on('error', reject)
  })
}

function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath)
    https
      .get(fileUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
          return
        }
        res.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve()
        })
      })
      .on('error', (err) => {
        fs.unlinkSync(destPath)
        reject(err)
      })
  })
}

async function main() {
  const targetDir = path.resolve('public/models/sketchfab')
  const items = [
    { key: 'woman_pose', uid: '83e7db2fc6fa4ddd88c79141851bb901' },
    { key: 'yoga_anim', uid: '3707c17278564f3495434eff68f663ec' },
  ]

  for (const item of items) {
    console.log(`Getting download URL for ${item.key}...`)
    const info = await getDownloadInfo(item.uid)
    if (!info.gltf || !info.gltf.url) {
      console.error(`No gltf URL for ${item.key}`)
      continue
    }

    const zipPath = path.join(targetDir, `${item.key}.zip`)
    const extractPath = path.join(targetDir, item.key)

    console.log(`Downloading ${item.key}...`)
    await downloadFile(info.gltf.url, zipPath)

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true })
    }

    console.log(`Extracting ${item.key}...`)
    execSync(`unzip -o -q "${zipPath}" -d "${extractPath}"`)
    fs.unlinkSync(zipPath)
    console.log(`Done ${item.key}!`)
  }

  console.log('All additional models downloaded!')
}

main().catch(console.error)
