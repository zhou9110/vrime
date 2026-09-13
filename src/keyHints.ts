// Extra "key-position" hints overlaid on the on-screen QWERTY keyboard, e.g. the
// 注音 symbol, 仓颉/五笔 字根, or 双拼 韵母 that the active schema assigns to each key.
// See GitHub issue #18.
//
// Keys match `simple-keyboard` button values exactly (lowercase letters, digits and
// the `; ' , . / -` punctuation). The 双拼 finals below are derived from the
// `speller/algebra` rules in public/ime/double-pinyin/*.schema.yaml; bare single-vowel
// finals (a/e/i/u) are omitted because the latin letter already conveys them.

export type KeyHintMode = 'both' | 'letter' | 'hint'

type HintMap = Record<string, string>

// 注音 — 大千 (Dachen) standard layout.
const zhuyinHints: HintMap = {
  1: 'ㄅ', 2: 'ㄉ', 3: 'ˇ', 4: 'ˋ', 5: 'ㄓ', 6: 'ˊ', 7: '˙', 8: 'ㄚ', 9: 'ㄞ', 0: 'ㄢ', '-': 'ㄦ',
  q: 'ㄆ', w: 'ㄊ', e: 'ㄍ', r: 'ㄐ', t: 'ㄔ', y: 'ㄗ', u: 'ㄧ', i: 'ㄛ', o: 'ㄟ', p: 'ㄣ',
  a: 'ㄇ', s: 'ㄋ', d: 'ㄎ', f: 'ㄑ', g: 'ㄕ', h: 'ㄘ', j: 'ㄨ', k: 'ㄜ', l: 'ㄠ', ';': 'ㄤ',
  z: 'ㄈ', x: 'ㄌ', c: 'ㄏ', v: 'ㄒ', b: 'ㄖ', n: 'ㄙ', m: 'ㄩ', ',': 'ㄝ', '.': 'ㄡ', '/': 'ㄥ'
}

// 仓颉/速成 — standard 字根 (radical) per key.
const cangjieHints: HintMap = {
  q: '手', w: '田', e: '水', r: '口', t: '廿', y: '卜', u: '山', i: '戈', o: '人', p: '心',
  a: '日', s: '尸', d: '木', f: '火', g: '土', h: '竹', j: '十', k: '大', l: '中',
  z: '重', x: '難', c: '金', v: '女', b: '月', n: '弓', m: '一'
}

// 五笔 86 — compact representative 字根 per key (z is the 识别/学习 key, no root).
const wubiHints: HintMap = {
  g: '王一', f: '土士', d: '大三', s: '木丁', a: '工弋',
  h: '目止', j: '日虫', k: '口川', l: '田力', m: '山贝',
  t: '禾竹', r: '白手', e: '月用', w: '人八', q: '金鱼',
  y: '言文', u: '立辛', i: '水小', o: '火米', p: '之宀',
  n: '已心', b: '子耳', v: '女刀', c: '又巴', x: '弓纟'
}

// 双拼 — 韵母 (and the special 声母 zh/ch/sh) carried by each key.
const shuangpinNatural: HintMap = {
  q: 'iu', w: 'ia/ua', r: 'uan', t: 'ue', y: 'ing/uai', u: 'sh', i: 'ch', o: 'uo', p: 'un',
  s: 'ong', d: 'iang', f: 'en', g: 'eng', h: 'ang', j: 'an', k: 'ao', l: 'ai',
  z: 'ei', x: 'ie', c: 'iao', v: 'zh/ui', b: 'ou', n: 'in', m: 'ian'
}

const shuangpinAbc: HintMap = {
  q: 'ei', w: 'ian', e: 'ch', r: 'er/iu', t: 'iang', y: 'ing', o: 'uo', p: 'uan',
  a: 'zh', s: 'ong', d: 'ia/ua', f: 'en', g: 'eng', h: 'ang', j: 'an', k: 'ao', l: 'ai',
  z: 'iao', x: 'ie', c: 'in/uai', v: 'sh', b: 'ou', n: 'un', m: 'ue/ui'
}

const shuangpinFlypy: HintMap = {
  q: 'iu', w: 'ei', r: 'uan', t: 'ue', y: 'un', u: 'sh', i: 'ch', o: 'uo', p: 'ie',
  s: 'ong', d: 'ai', f: 'en', g: 'eng', h: 'ang', j: 'an', k: 'ing/uai', l: 'iang',
  z: 'ou', x: 'ia/ua', c: 'ao', v: 'zh/ui', b: 'in', n: 'iao', m: 'ian'
}

const shuangpinMspy: HintMap = {
  q: 'iu', w: 'ia/ua', r: 'er/uan', t: 'ue', y: 'ü/uai', u: 'sh', i: 'ch', o: 'uo', p: 'un',
  s: 'ong', d: 'iang', f: 'en', g: 'eng', h: 'ang', j: 'an', k: 'ao', l: 'ai',
  z: 'ei', x: 'ie', c: 'iao', v: 'zh/ui', b: 'ou', n: 'in', m: 'ian', ';': 'ing'
}

const shuangpinPyjj: HintMap = {
  q: 'er/ing', w: 'ei', r: 'en', t: 'eng', y: 'ong', u: 'ch', i: 'sh', o: 'uo', p: 'ou',
  s: 'ai', d: 'ao', f: 'an', g: 'ang', h: 'iang', j: 'ian', k: 'iao', l: 'in',
  z: 'un', x: 'ue/uai', c: 'uan', v: 'zh/ui', b: 'ia/ua', n: 'iu', m: 'ie'
}

const hintMapBySchema: Record<string, HintMap> = {
  // 注音
  bopomofo: zhuyinHints,
  bopomofo_express: zhuyinHints,
  // 仓颉 / 速成 / 快速仓颉
  cangjie5: cangjieHints,
  cangjie5_express: cangjieHints,
  scj6: cangjieHints,
  quick5: cangjieHints,
  // 五笔
  wubi86: wubiHints,
  wubi_pinyin: wubiHints,
  wubi_trad: wubiHints,
  // 双拼
  double_pinyin: shuangpinNatural,
  double_pinyin_abc: shuangpinAbc,
  double_pinyin_flypy: shuangpinFlypy,
  double_pinyin_mspy: shuangpinMspy,
  double_pinyin_pyjj: shuangpinPyjj
}

function getKeyHintMap (schemaId: string): HintMap | null {
  return hintMapBySchema[schemaId] || null
}

// Builds the `display` overrides for `simple-keyboard`. Returns null when there are
// no hints to show (no overlay for the schema, or the user disabled them).
function getKeyHintEntries (schemaId: string, mode: KeyHintMode): HintMap | null {
  if (mode === 'letter') {
    return null
  }
  const map = getKeyHintMap(schemaId)
  if (!map) {
    return null
  }
  const entries: HintMap = {}
  for (const [key, hint] of Object.entries(map)) {
    entries[key] = mode === 'hint'
      ? `<span class="hg-key-only">${hint}</span>`
      : `${key}<sup class="hg-key-hint">${hint}</sup>`
  }
  return entries
}

export { getKeyHintMap, getKeyHintEntries }
