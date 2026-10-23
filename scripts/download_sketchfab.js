import https from 'https'

const API_TOKEN = '1755b824de28491db700595b19d0840c'

function getDownloadUrl(uid) {
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
            resolve({ statusCode: res.statusCode, data: JSON.parse(rawData) })
          } catch (error) {
            reject(error)
          }
        })
      }
    )
    req.on('error', reject)
  })
}

async function main() {
  const models = [
    { name: 'lotus', uid: '0ad5635649f94f87b42e902ddb883bbb' },
    { name: 'tree', uid: 'fffeb53552154cf48bb042c04d66311a' },
    { name: 'dog', uid: '5536e11948544a5fa0a3f89ccf067b39' },
    { name: 'triangle', uid: '820df3866f1e4322bf1ad31e3a0b361a' },
    { name: 'yoga_animations', uid: '3707c17278564f3495434eff68f663ec' },
  ]

  for (const item of models) {
    const res = await getDownloadUrl(item.uid)
    console.log(`Model ${item.name} (${item.uid}): HTTP ${res.statusCode}`)
    if (res.data.gltf) {
      console.log(`  gltf available: size ${res.data.gltf.size}`)
    } else {
      console.log(`  response:`, res.data)
    }
  }
}

main().catch(console.error)
