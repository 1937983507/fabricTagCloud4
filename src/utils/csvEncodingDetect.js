/**
 * 根据二进制内容猜测 CSV 文本编码，减轻中文乱码。
 * 对 UTF-8 / GB18030 / GBK 分别解码后按「汉字占比 − 替换符惩罚」打分，取最高者。
 */

function countCjkLetters(str) {
  let n = 0;
  for (let i = 0; i < str.length; i += 1) {
    const c = str.codePointAt(i);
    if (c >= 0x4e00 && c <= 0x9fff) n += 1;
    else if (c >= 0x3400 && c <= 0x4dbf) n += 1;
    if (c > 0xffff) i += 1;
  }
  return n;
}

function countReplacementChar(str) {
  let n = 0;
  for (let i = 0; i < str.length; i += 1) {
    if (str.charCodeAt(i) === 0xfffd) n += 1;
  }
  return n;
}

const CANDIDATES = ['utf-8', 'gb18030', 'gbk'];

/**
 * @param {ArrayBuffer} buffer
 * @returns {string} 编码标签，与 TextDecoder 一致：utf-8 | gb18030 | gbk
 */
export function detectBestCsvEncoding(buffer) {
  if (!buffer || buffer.byteLength === 0) return 'utf-8';

  let bestEnc = 'utf-8';
  let bestScore = -Infinity;

  for (const enc of CANDIDATES) {
    try {
      const text = new TextDecoder(enc, { fatal: false }).decode(buffer);
      const cjk = countCjkLetters(text);
      const bad = countReplacementChar(text);
      const len = Math.max(1, text.length);
      // 汉字多、替换符少 → 分数高；纯英文时三者接近，偏向 utf-8
      const score = (cjk * 4) / len - bad * 80 - (bad > 0 ? bad * 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestEnc = enc;
      }
    } catch {
      /* 忽略不支持的编码 */
    }
  }

  return bestEnc;
}
