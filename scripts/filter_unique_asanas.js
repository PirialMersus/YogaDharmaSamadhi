const token = "1755b824de28491db700595b19d0840c";

const CURRENT_KEYS = new Set([
  'tadasana', 'vriksasana', 'utkatasana', 'trikonasana',
  'virabhadrasana_i', 'virabhadrasana_ii', 'virabhadrasana_iii',
  'natarajasana', 'padangusthasana', 'uttanasana',
  'adho_mukha_svanasana', 'vasisthasana', 'marjaryasana',
  'bujangasana', 'dhanurasana', 'urdhva_dhanurasana',
  'navasana', 'astavakrasana', 'baddha_konasana',
  'lotus', 'paschimottanasana', 'sirsasana',
  'sarvangasana', 'halasana', 'savasana'
]);

const PROPS_KEYWORDS = [
  'chair', 'brick', 'blanket', 'strap', 'block', 'wall', 'stool', 'bolster', 'belt', 'rope'
];

async function filterModels() {
  let url = `https://api.sketchfab.com/v3/models?user=Lily-Yoga3D&count=50`;
  const allModels = [];

  while (url) {
    const resp = await fetch(url, { headers: { Authorization: `Token ${token}` } });
    if (!resp.ok) break;
    const data = await resp.json();
    for (const m of (data.results || [])) {
      allModels.push(m);
    }
    url = data.next;
  }

  console.log(`Fetched ${allModels.length} models total`);

  const candidates = [];
  for (const m of allModels) {
    const nameLower = m.name.toLowerCase();
    const hasProps = PROPS_KEYWORDS.some(k => nameLower.includes(k));
    if (hasProps) continue;

    candidates.push({
      uid: m.uid,
      name: m.name,
      vertexCount: m.vertexCount,
      likes: m.likeCount
    });
  }

  console.log(`Models without props: ${candidates.length}`);
  fs.writeFileSync('scripts/candidates_without_props.json', JSON.stringify(candidates, null, 2));
}

import fs from 'fs';
filterModels();
