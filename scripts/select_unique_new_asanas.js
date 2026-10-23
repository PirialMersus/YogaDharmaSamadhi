import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/candidates_without_props.json', 'utf8'));

const ALREADY_HAVE = [
  'tadasana', 'vriksasana', 'utkatasana', 'trikonasana',
  'virabhadrasana', 'natarajasana', 'padangusthasana', 'uttanasana',
  'svanasana', 'vasisthasana', 'marjaryasana', 'bujangasana',
  'danurasana', 'dhanurasana', 'urdhva dhanurasana', 'wheel',
  'navasana', 'astavakrasana', 'baddha konasana', 'lotus',
  'paschimottanasana', 'sirsasana', 'sarvangasana', 'halasana',
  'savasana', 'cat pose', 'tree pose', 'triangle pose', 'warrior'
];

const UNIQUE_ASANAS_TO_FIND = [
  { key: 'garudasana', query: 'garuda', rus: 'Гарудасана' },
  { key: 'malasana', query: 'malasana', rus: 'Маласана' },
  { key: 'dandasana', query: 'dandasana', rus: 'Дандасана' },
  { key: 'janu_sirsasana', query: 'janu sirsasana', rus: 'Джану Ширшасана' },
  { key: 'marichyasana', query: 'marichyasana', rus: 'Маричиасана' },
  { key: 'upavistha_konasana', query: 'upavistha konasana', rus: 'Упавиштха Конасана' },
  { key: 'prasarita_padottanasana', query: 'prasarita padottanasana', rus: 'Прасарита Падоттанасана' },
  { key: 'parsvakonasana', query: 'parsva konasana', rus: 'Уттхита Паршваконасана' },
  { key: 'parighasana', query: 'parighasana', rus: 'Паригхасана' },
  { key: 'virasana', query: 'virasana', rus: 'Вирасана' },
  { key: 'supta_virasana', query: 'supta virasana', rus: 'Супта Вирасана' },
  { key: 'supta_baddha_konasana', query: 'supta baddha konasana', rus: 'Супта Баддха Конасана' },
  { key: 'supta_padangusthasana', query: 'supta padangusthasana', rus: 'Супта Падангуштхасана' },
  { key: 'matsyasana', query: 'matsyasana', rus: 'Матсиасана' },
  { key: 'bhekasana', query: 'bhekasana', rus: 'Бхекасана' },
  { key: 'kapotasana', query: 'kapotasana', rus: 'Капотасана' },
  { key: 'kurmasana', query: 'kurmasana', rus: 'Курмасана' },
  { key: 'tittibhasana', query: 'tittibhasana', rus: 'Титтибхасана' },
  { key: 'mayurasana', query: 'mayurasana', rus: 'Маюрасана' },
  { key: 'anantasana', query: 'anantasana', rus: 'Анантасана' },
  { key: 'setu_bandhasana', query: 'setu bandha', rus: 'Сету Бандхасана' },
  { key: 'karnapidasana', query: 'karnapidasana', rus: 'Карнапидасана' },
  { key: 'garbha_pindasana', query: 'garbha pindasana', rus: 'Гарбха Пиндасана' },
  { key: 'bitilasana', query: 'bitilasana', rus: 'Битиласана (Корова)' }
];

const selected = [];

for (const target of UNIQUE_ASANAS_TO_FIND) {
  const matches = raw.filter(m => {
    const nameLower = m.name.toLowerCase();
    return nameLower.includes(target.query);
  });

  if (matches.length > 0) {
    matches.sort((a, b) => b.likes - a.likes || a.name.length - b.name.length);
    const best = matches[0];
    selected.push({
      key: target.key,
      rus: target.rus,
      uid: best.uid,
      name: best.name,
      likes: best.likes
    });
  }
}

console.log(`Selected ${selected.length} unique new asanas:`);
for (const s of selected) {
  console.log(`[${s.uid}] ${s.rus} (${s.key}): "${s.name}"`);
}

fs.writeFileSync('scripts/new_asanas_to_download.json', JSON.stringify(selected, null, 2));
