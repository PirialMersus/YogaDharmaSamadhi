import fs from 'fs'
import path from 'path'
import * as THREE from 'three'

const bakedDataPath = path.resolve('public/models/poses_baked.json')
const posesData = JSON.parse(fs.readFileSync(bakedDataPath, 'utf8'))
const BODY_PARTICLES_COUNT = 15840

const POSE_ANATOMY_TYPES = {
  standingStraight: [
    'tadasana', 'vriksasana', 'garudasana', 'utkatasana', 'parsvakonasana',
    'virabhadrasana_i', 'virabhadrasana_ii', 'natarajasana'
  ],
  standingBends: [
    'trikonasana', 'parivrtta_trikonasana', 'uttanasana', 'padangusthasana',
    'prasarita_padottanasana', 'parsvottanasana'
  ],
  standingHorizontal: [
    'virabhadrasana_iii', 'ardha_chandrasana'
  ],
  floorBendsAndInversions: [
    'adho_mukha_svanasana', 'vasisthasana', 'purvottanasana', 'marjaryasana', 'bitilasana'
  ],
  proneBackbends: [
    'bujangasana', 'salabhasana', 'bhekasana', 'dhanurasana', 'urdhva_dhanurasana', 'kapotasana', 'setu_bandhasana'
  ],
  kneelingAndSquats: [
    'malasana', 'pasasana', 'virasana', 'supta_virasana', 'parighasana'
  ],
  armBalances: [
    'navasana', 'bakasana', 'bhujapidasana', 'kukkutasana', 'lolasana',
    'mayurasana', 'astavakrasana', 'tittibhasana', 'pincha_mayurasana', 'adho_mukha_vrksasana'
  ],
  seatedUpright: [
    'dandasana', 'gomukhasana', 'sukhasana', 'vajrasana', 'bharadvajasana',
    'marichyasana', 'lotus', 'garbha_pindasana', 'matsyasana', 'baddha_konasana'
  ],
  seatedForwardBends: [
    'janu_sirsasana', 'krounchasana', 'paschimottanasana', 'upavistha_konasana', 'kurmasana'
  ],
  supineOnBack: [
    'supta_padangusthasana', 'anantasana', 'supta_baddha_konasana', 'viparita_karani', 'savasana'
  ],
  inversionsHeadDown: [
    'sirsasana', 'sarvangasana', 'halasana', 'karnapidasana'
  ]
}

function getPoseCategory(poseName) {
  for (const [category, list] of Object.entries(POSE_ANATOMY_TYPES)) {
    if (list.includes(poseName)) return category
  }
  return 'standingStraight'
}

console.log('Classified categories defined successfully')
