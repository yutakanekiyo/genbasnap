export const CONSTRUCTION_TYPE_ALIASES: Record<string, string> = {
  // 鉄筋工事
  '配筋': '鉄筋工事',
  '配筋工': '鉄筋工事',
  '鉄筋組立': '鉄筋工事',
  '鉄筋': '鉄筋工事',

  // 型枠工事
  '型枠': '型枠工事',
  '型枠組立': '型枠工事',
  '枠工事': '型枠工事',

  // コンクリート工事
  'コンクリート': 'コンクリート工事',
  'コン打ち': 'コンクリート工事',
  'コン打設': 'コンクリート工事',
  'Con打設': 'コンクリート工事',
  'con': 'コンクリート工事',

  // 防水工事
  '防水': '防水工事',
  'FRP防水': '防水工事',
  'ウレタン防水': '防水工事',
  'シート防水': '防水工事',

  // 左官工事
  '左官': '左官工事',
  'モルタル': '左官工事',

  // 塗装工事
  '塗装': '塗装工事',
  'ペンキ': '塗装工事',

  // 仮設工事
  '足場': '仮設工事',
  '仮設': '仮設工事',

  // 墨出し工事
  '墨出し': '墨出し工事',
  '墨出': '墨出し工事',

  // 地業工事
  '杭': '地業工事',
  '杭打ち': '地業工事',

  // シーリング工事
  'シール': 'シーリング工事',
  'シーリング': 'シーリング工事',
  'コーキング': 'シーリング工事',

  // 外壁タイル工事
  'タイル補修': '外壁タイル工事',
  'タイル張替': '外壁タイル工事',

  // 下地補修工事
  '下地補修': '下地補修工事',
  'ひび割れ': '下地補修工事',
  'クラック': '下地補修工事',

  // 外壁塗装工事
  '高圧洗浄': '外壁塗装工事',
  '洗浄': '外壁塗装工事',

  // 鉄部塗装工事
  'ケレン': '鉄部塗装工事',
}

export interface SimilarTypeResult {
  match_method: 'exact' | 'partial' | 'alias' | 'new'
  matched_type: { id: string; name: string } | null
  candidates: { id: string; name: string }[]
}

export function findSimilarType(
  detectedName: string,
  masterTypes: { id: string; name: string }[]
): SimilarTypeResult {
  if (!detectedName || masterTypes.length === 0) {
    return { match_method: 'new', matched_type: null, candidates: [] }
  }

  // 1. 完全一致
  const exact = masterTypes.find(t => t.name === detectedName)
  if (exact) {
    return { match_method: 'exact', matched_type: exact, candidates: [exact] }
  }

  // 2. エイリアス一致
  const aliasTarget = CONSTRUCTION_TYPE_ALIASES[detectedName]
  if (aliasTarget) {
    const aliasType = masterTypes.find(t => t.name === aliasTarget)
    if (aliasType) {
      return { match_method: 'alias', matched_type: aliasType, candidates: [aliasType] }
    }
  }

  // 3. 部分一致（「配筋」で「鉄筋工事」にヒット）
  const partial = masterTypes.filter(t =>
    t.name.includes(detectedName) ||
    detectedName.includes(t.name) ||
    t.name.replace(/工事$/, '') === detectedName.replace(/工$/, '')
  )
  if (partial.length > 0) {
    return { match_method: 'partial', matched_type: partial[0], candidates: partial }
  }

  // 4. 一致なし
  return { match_method: 'new', matched_type: null, candidates: [] }
}
