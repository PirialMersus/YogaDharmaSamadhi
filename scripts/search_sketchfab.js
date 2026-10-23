import https from 'https'

const API_TOKEN = '1755b824de28491db700595b19d0840c'

function searchModels(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&downloadable=true&sort_by=-likeCount`
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

async function main() {
  const queries = [
    'warrior 2',
    'warrior ii',
    'virabhadrasana ii',
    'yoga warrior',
    'yoga pose',
    'yoga woman',
    'yoga character',
  ]
  for (const query of queries) {
    const response = await searchModels(query)
    const results = response.results || []
    console.log(`\n=== QUERY: "${query}" (${results.length} found) ===`)
    for (const item of results.slice(0, 8)) {
      console.log(`[${item.uid}] "${item.name}" by ${item.user.username} | likes: ${item.likeCount}`)
    }
  }
}

main().catch(console.error)
