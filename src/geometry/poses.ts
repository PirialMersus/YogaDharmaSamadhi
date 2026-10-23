export type PoseName =
  | 'tadasana'
  | 'vriksasana'
  | 'garudasana'
  | 'utkatasana'
  | 'trikonasana'
  | 'parivrtta_trikonasana'
  | 'parsvakonasana'
  | 'virabhadrasana_i'
  | 'virabhadrasana_ii'
  | 'virabhadrasana_iii'
  | 'ardha_chandrasana'
  | 'natarajasana'
  | 'prasarita_padottanasana'
  | 'parsvottanasana'
  | 'padangusthasana'
  | 'uttanasana'
  | 'malasana'
  | 'pasasana'
  | 'adho_mukha_svanasana'
  | 'vasisthasana'
  | 'purvottanasana'
  | 'marjaryasana'
  | 'bitilasana'
  | 'bujangasana'
  | 'salabhasana'
  | 'bhekasana'
  | 'dhanurasana'
  | 'urdhva_dhanurasana'
  | 'kapotasana'
  | 'setu_bandhasana'
  | 'virasana'
  | 'supta_virasana'
  | 'parighasana'
  | 'navasana'
  | 'bakasana'
  | 'bhujapidasana'
  | 'kukkutasana'
  | 'lolasana'
  | 'mayurasana'
  | 'astavakrasana'
  | 'tittibhasana'
  | 'pincha_mayurasana'
  | 'adho_mukha_vrksasana'
  | 'dandasana'
  | 'gomukhasana'
  | 'sukhasana'
  | 'vajrasana'
  | 'bharadvajasana'
  | 'marichyasana'
  | 'janu_sirsasana'
  | 'krounchasana'
  | 'paschimottanasana'
  | 'upavistha_konasana'
  | 'baddha_konasana'
  | 'kurmasana'
  | 'lotus'
  | 'garbha_pindasana'
  | 'matsyasana'
  | 'supta_padangusthasana'
  | 'anantasana'
  | 'supta_baddha_konasana'
  | 'viparita_karani'
  | 'sirsasana'
  | 'sarvangasana'
  | 'halasana'
  | 'karnapidasana'
  | 'savasana'

export const POSE_CYCLE: PoseName[] = [
  'tadasana',
  'vriksasana',
  'garudasana',
  'utkatasana',
  'trikonasana',
  'parivrtta_trikonasana',
  'parsvakonasana',
  'virabhadrasana_i',
  'virabhadrasana_ii',
  'virabhadrasana_iii',
  'ardha_chandrasana',
  'natarajasana',
  'prasarita_padottanasana',
  'parsvottanasana',
  'padangusthasana',
  'uttanasana',
  'malasana',
  'pasasana',
  'adho_mukha_svanasana',
  'vasisthasana',
  'purvottanasana',
  'marjaryasana',
  'bitilasana',
  'bujangasana',
  'salabhasana',
  'bhekasana',
  'dhanurasana',
  'urdhva_dhanurasana',
  'kapotasana',
  'setu_bandhasana',
  'virasana',
  'supta_virasana',
  'parighasana',
  'navasana',
  'bakasana',
  'bhujapidasana',
  'kukkutasana',
  'lolasana',
  'mayurasana',
  'astavakrasana',
  'tittibhasana',
  'pincha_mayurasana',
  'adho_mukha_vrksasana',
  'dandasana',
  'gomukhasana',
  'sukhasana',
  'vajrasana',
  'bharadvajasana',
  'marichyasana',
  'janu_sirsasana',
  'krounchasana',
  'paschimottanasana',
  'upavistha_konasana',
  'baddha_konasana',
  'kurmasana',
  'lotus',
  'garbha_pindasana',
  'matsyasana',
  'supta_padangusthasana',
  'anantasana',
  'supta_baddha_konasana',
  'viparita_karani',
  'sirsasana',
  'sarvangasana',
  'halasana',
  'karnapidasana',
  'savasana',
]

export const POSE_LABELS: Record<PoseName, string> = {
  tadasana: 'Тадасана',
  vriksasana: 'Врикшасана',
  garudasana: 'Гарудасана',
  utkatasana: 'Уткатасана',
  trikonasana: 'Уттхита Триконасана',
  parivrtta_trikonasana: 'Паривритта Триконасана',
  parsvakonasana: 'Уттхита Паршваконасана',
  virabhadrasana_i: 'Вирабхадрасана I',
  virabhadrasana_ii: 'Вирабхадрасана II',
  virabhadrasana_iii: 'Вирабхадрасана III',
  ardha_chandrasana: 'Ардха Чандрасана',
  natarajasana: 'Натараджасана',
  prasarita_padottanasana: 'Прасарита Падоттанасана',
  parsvottanasana: 'Паршвоттанасана',
  padangusthasana: 'Падангуштхасана',
  uttanasana: 'Уттанасана',
  malasana: 'Маласана',
  pasasana: 'Пашасана',
  adho_mukha_svanasana: 'Адхо Мукха Шванасана',
  vasisthasana: 'Васиштхасана',
  purvottanasana: 'Пурвоттанасана',
  marjaryasana: 'Марджариасана',
  bitilasana: 'Битиласана',
  bujangasana: 'Бхуджангасана',
  salabhasana: 'Шалабхасана',
  bhekasana: 'Бхекасана',
  dhanurasana: 'Дханурасана',
  urdhva_dhanurasana: 'Урдхва Дханурасана',
  kapotasana: 'Капотасана',
  setu_bandhasana: 'Сету Бандхасана',
  virasana: 'Вирасана',
  supta_virasana: 'Супта Вирасана',
  parighasana: 'Паригхасана',
  navasana: 'Парипурна Навасана',
  bakasana: 'Бакасана',
  bhujapidasana: 'Бхуджапидасана',
  kukkutasana: 'Куккутасана',
  lolasana: 'Лоласана',
  mayurasana: 'Маюрасана',
  astavakrasana: 'Аштавакрасана',
  tittibhasana: 'Титтибхасана',
  pincha_mayurasana: 'Пинча Маюрасана',
  adho_mukha_vrksasana: 'Адхо Мукха Врикшасана',
  dandasana: 'Дандасана',
  gomukhasana: 'Гомукхасана',
  sukhasana: 'Сукхасана',
  vajrasana: 'Ваджрасана',
  bharadvajasana: 'Бхарадваджасана',
  marichyasana: 'Маричиасана',
  janu_sirsasana: 'Джану Ширшасана',
  krounchasana: 'Краунчасана',
  paschimottanasana: 'Пашчимоттанасана',
  upavistha_konasana: 'Упавиштха Конасана',
  baddha_konasana: 'Баддха Конасана',
  kurmasana: 'Курмасана',
  lotus: 'Падмасана (Лотос)',
  garbha_pindasana: 'Гарбха Пиндасана',
  matsyasana: 'Матсьясана',
  supta_padangusthasana: 'Супта Падангуштхасана',
  anantasana: 'Анантасана',
  supta_baddha_konasana: 'Супта Баддха Конасана',
  viparita_karani: 'Випарита Карани',
  sirsasana: 'Ширшасана',
  sarvangasana: 'Саламба Сарвангасана',
  halasana: 'Халасана',
  karnapidasana: 'Карнапидасана',
  savasana: 'Шавасана',
}

export type Vec3 = readonly [number, number, number]

export interface JointKeyframes {
  headCenter: Vec3
  chinPoint: Vec3
  neckTop: Vec3
  neckBase: Vec3
  clavicleCenter: Vec3
  leftShoulder: Vec3
  rightShoulder: Vec3
  leftElbow: Vec3
  rightElbow: Vec3
  leftWrist: Vec3
  rightWrist: Vec3
  leftHand: Vec3
  rightHand: Vec3
  chestCenter: Vec3
  ribsCenter: Vec3
  waistCenter: Vec3
  navelCenter: Vec3
  pelvisCenter: Vec3
  leftHip: Vec3
  rightHip: Vec3
  leftKnee: Vec3
  rightKnee: Vec3
  leftAnkle: Vec3
  rightAnkle: Vec3
  leftFoot: Vec3
  rightFoot: Vec3
}

export const BASE_ANATOMY: JointKeyframes = {
  headCenter: [0, 1.48, 0],
  chinPoint: [0, 1.33, 0.05],
  neckTop: [0, 1.34, 0],
  neckBase: [0, 1.20, 0],
  clavicleCenter: [0, 1.16, 0.03],
  leftShoulder: [-0.32, 1.14, 0],
  rightShoulder: [0.32, 1.14, 0],
  leftElbow: [-0.64, 0.74, 0.05],
  rightElbow: [0.64, 0.74, 0.05],
  leftWrist: [-0.62, 0.26, 0.26],
  rightWrist: [0.62, 0.26, 0.26],
  leftHand: [-0.72, 0.30, 0.36],
  rightHand: [0.72, 0.30, 0.36],
  chestCenter: [0, 1.00, 0.04],
  ribsCenter: [0, 0.80, 0.02],
  waistCenter: [0, 0.60, 0],
  navelCenter: [0, 0.46, 0.02],
  pelvisCenter: [0, 0.24, -0.02],
  leftHip: [-0.22, 0.22, 0],
  rightHip: [0.22, 0.22, 0],
  leftKnee: [-0.74, 0.14, 0.24],
  rightKnee: [0.74, 0.14, 0.24],
  leftAnkle: [0.24, 0.10, 0.38],
  rightAnkle: [-0.24, 0.10, 0.38],
  leftFoot: [0.36, 0.14, 0.32],
  rightFoot: [-0.36, 0.14, 0.32],
}

export const POSES: Record<PoseName, JointKeyframes> = {
  tadasana: BASE_ANATOMY,
  vriksasana: BASE_ANATOMY,
  garudasana: BASE_ANATOMY,
  utkatasana: BASE_ANATOMY,
  trikonasana: BASE_ANATOMY,
  parivrtta_trikonasana: BASE_ANATOMY,
  parsvakonasana: BASE_ANATOMY,
  virabhadrasana_i: BASE_ANATOMY,
  virabhadrasana_ii: BASE_ANATOMY,
  virabhadrasana_iii: BASE_ANATOMY,
  ardha_chandrasana: BASE_ANATOMY,
  natarajasana: BASE_ANATOMY,
  prasarita_padottanasana: BASE_ANATOMY,
  parsvottanasana: BASE_ANATOMY,
  padangusthasana: BASE_ANATOMY,
  uttanasana: BASE_ANATOMY,
  malasana: BASE_ANATOMY,
  pasasana: BASE_ANATOMY,
  adho_mukha_svanasana: BASE_ANATOMY,
  vasisthasana: BASE_ANATOMY,
  purvottanasana: BASE_ANATOMY,
  marjaryasana: BASE_ANATOMY,
  bitilasana: BASE_ANATOMY,
  bujangasana: BASE_ANATOMY,
  salabhasana: BASE_ANATOMY,
  bhekasana: BASE_ANATOMY,
  dhanurasana: BASE_ANATOMY,
  urdhva_dhanurasana: BASE_ANATOMY,
  kapotasana: BASE_ANATOMY,
  setu_bandhasana: BASE_ANATOMY,
  virasana: BASE_ANATOMY,
  supta_virasana: BASE_ANATOMY,
  parighasana: BASE_ANATOMY,
  navasana: BASE_ANATOMY,
  bakasana: BASE_ANATOMY,
  bhujapidasana: BASE_ANATOMY,
  kukkutasana: BASE_ANATOMY,
  lolasana: BASE_ANATOMY,
  mayurasana: BASE_ANATOMY,
  astavakrasana: BASE_ANATOMY,
  tittibhasana: BASE_ANATOMY,
  pincha_mayurasana: BASE_ANATOMY,
  adho_mukha_vrksasana: BASE_ANATOMY,
  dandasana: BASE_ANATOMY,
  gomukhasana: BASE_ANATOMY,
  sukhasana: BASE_ANATOMY,
  vajrasana: BASE_ANATOMY,
  bharadvajasana: BASE_ANATOMY,
  marichyasana: BASE_ANATOMY,
  janu_sirsasana: BASE_ANATOMY,
  krounchasana: BASE_ANATOMY,
  paschimottanasana: BASE_ANATOMY,
  upavistha_konasana: BASE_ANATOMY,
  baddha_konasana: BASE_ANATOMY,
  kurmasana: BASE_ANATOMY,
  lotus: BASE_ANATOMY,
  garbha_pindasana: BASE_ANATOMY,
  matsyasana: BASE_ANATOMY,
  supta_padangusthasana: BASE_ANATOMY,
  anantasana: BASE_ANATOMY,
  supta_baddha_konasana: BASE_ANATOMY,
  viparita_karani: BASE_ANATOMY,
  sirsasana: BASE_ANATOMY,
  sarvangasana: BASE_ANATOMY,
  halasana: BASE_ANATOMY,
  karnapidasana: BASE_ANATOMY,
  savasana: BASE_ANATOMY,
}
