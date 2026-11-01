// 공용 저장소 헬퍼 — 구글 시트 한 칸(셀)에는 최대 50,000자까지만 들어간다.
// 데이터(JSON)가 커지면 저장이 실패하면서 내용이 되돌아가는 문제가 생기므로,
// 여러 칸(A1, A2, A3 ...)에 나눠 저장하고 읽을 때 다시 합친다.
//   A1 = "CHUNKS:<개수>", A2.. = "~" + 조각   (예전 형식: A1 = JSON 통째로 → 그대로 읽힘)
const CHUNK = 40000;
const MAX_ROWS = 1000;

async function readJson(sheets, spreadsheetId, tab) {
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:A${MAX_ROWS}` });
  const vals = (result.data.values || []).map(function (r) { return (r && r[0]) || ""; });
  if (!vals.length || !vals[0]) return null;
  if (vals[0].indexOf("CHUNKS:") === 0) {
    const n = parseInt(vals[0].slice(7), 10);
    const parts = vals.slice(1, 1 + n);
    if (parts.length !== n) throw new Error("저장 데이터 조각이 손상되었습니다 (" + parts.length + "/" + n + ")");
    return JSON.parse(parts.map(function (p) { return p.charAt(0) === "~" ? p.slice(1) : p; }).join(""));
  }
  return JSON.parse(vals[0]);
}

async function writeJson(sheets, spreadsheetId, tab, data) {
  if (data === undefined || data === null) throw new Error("빈 데이터는 저장하지 않습니다");
  const json = JSON.stringify(data);
  const rows = [];
  for (let i = 0; i < json.length; i += CHUNK) rows.push(["~" + json.slice(i, i + CHUNK)]);
  if (rows.length + 1 > MAX_ROWS) throw new Error("데이터가 너무 큽니다");
  const values = [["CHUNKS:" + rows.length]].concat(rows);
  // 헤더(조각 개수)와 조각을 한 번의 요청으로 기록 → 이전 조각이 뒤에 남아 있어도 개수만큼만 읽으므로 안전
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${tab}!A1:A${values.length}`, valueInputOption: "RAW", requestBody: { values },
  });
}

module.exports = { readJson, writeJson };
