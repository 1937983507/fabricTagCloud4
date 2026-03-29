/**
 * 轻量 CSV 解析（支持引号包裹、逗号分隔）
 */

function parseCsvLine(line, delimiter = ',') {
  const row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  row.push(cur);
  return row;
}

export function detectDelimiter(sampleLine) {
  const comma = (sampleLine.match(/,/g) || []).length;
  const semi = (sampleLine.match(/;/g) || []).length;
  const tab = (sampleLine.match(/\t/g) || []).length;
  if (tab >= comma && tab >= semi && tab > 0) return '\t';
  if (semi >= comma && semi > 0) return ';';
  return ',';
}

/**
 * @param {string} text
 * @param {string} [delimiter]
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseCsvText(text, delimiter) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const delim = delimiter || detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delim).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i], delim);
    if (cells.every((c) => c.trim() === '')) continue;
    rows.push(cells);
  }
  return { headers, rows };
}
