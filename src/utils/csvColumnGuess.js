/**
 * 根据表头关键字猜测列映射
 */

const ZH_HINTS = ['name', '地名', '名称', '中文', '地点', 'poi', 'title'];
const EN_HINTS = ['name_en', 'english', '英文', 'en_name', 'ename'];
const CITY_HINTS = ['city', '城市', '地级市', '所属城市'];
const LNG_HINTS = ['lng', 'lon', 'longitude', '经度', 'gcj_lng', 'x'];
const LAT_HINTS = ['lat', 'latitude', '纬度', 'gcj_lat', 'y'];
const VAL_HINTS = ['rank', '排名', 'value', 'score', '热度', 'weight', '数值', 'heat'];

function scoreHeader(h, hints) {
  const s = String(h).toLowerCase();
  let sc = 0;
  for (const hint of hints) {
    if (s.includes(hint.toLowerCase())) sc += 2;
  }
  return sc;
}

function bestMatch(headers, hints, excludeIndex = -1) {
  let best = -1;
  let bestScore = 0;
  headers.forEach((h, i) => {
    if (i === excludeIndex) return;
    const sc = scoreHeader(h, hints);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return bestScore > 0 ? best : -1;
}

function bestMatchExcludeSet(headers, hints, excludeIndices) {
  const ex = new Set(excludeIndices.filter((i) => i >= 0));
  let best = -1;
  let bestScore = 0;
  headers.forEach((h, i) => {
    if (ex.has(i)) return;
    const sc = scoreHeader(h, hints);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return bestScore > 0 ? best : -1;
}

/**
 * @param {string[]} headers
 * @returns {{ zh: number, en: number, city: number, lng: number, lat: number, value: number }}
 */
export function guessColumnMapping(headers) {
  const lng = bestMatch(headers, LNG_HINTS);
  const lat = bestMatch(headers, LAT_HINTS, lng);
  const zh = bestMatch(headers, ZH_HINTS);
  const en = bestMatch(headers, EN_HINTS, zh >= 0 ? zh : -1);
  const value = bestMatch(headers, VAL_HINTS);
  const city = bestMatchExcludeSet(headers, CITY_HINTS, [zh, en, lng, lat, value]);

  return {
    zh: zh >= 0 ? zh : -1,
    en: en >= 0 ? en : -1,
    city: city >= 0 ? city : -1,
    lng: lng >= 0 ? lng : -1,
    lat: lat >= 0 ? lat : -1,
    value: value >= 0 ? value : -1,
  };
}
