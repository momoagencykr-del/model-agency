// ── 고객사 섭외 요청서(한글) 자동 분류 ───────────────────────────────────────
// 모델이 카톡 등으로 받은 요청서를 통째로 붙여넣으면 항목별로 나눠서 입력칸에 맞춰 준다.
// 예)  1. 업체명: 삼성엔터테인먼트 show
//      2. 촬영날짜/시간: 2026년 11월 22일 3시간
//      3. 사용매체 SNS
//      4. 섭외료 (VAT 별도): 133,000원
//      5. 예상 지급일: 2026년 11월 22일 행사 종료 직후
//      6. 담당자 이름/연락처: 이윤리아 / 010-5755-1558
// 결과: { brand, income, date, expectedPayDate, payerName, clientContact, note, found: [...채운 칸] }

function pad2(n) { return n < 10 ? "0" + n : "" + n; }

// "2026년 11월 22일", "2026.11.22", "2026-11-22", "11월 22일", "11/22" → { iso, rest }
export function parseKoDate(s, defYear) {
  var m = s.match(/(\d{4})\s*(?:년|[.\-/])\s*(\d{1,2})\s*(?:월|[.\-/])\s*(\d{1,2})\s*일?/);
  var y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = s.match(/(\d{1,2})\s*(?:월|[./])\s*(\d{1,2})\s*일?/);
    if (!m) return null;
    y = defYear; mo = +m[1]; d = +m[2];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  var noYear = y === defYear && !/d{4}/.test(m[0]);
  var rest = s.replace(m[0], " ").replace(/\(\s*[월화수목금토일]\s*\)|[월화수목금토일]요일/g, " ").replace(/\s+/g, " ").trim();
  return { iso: y + "-" + pad2(mo) + "-" + pad2(d), rest: rest, noYear: noYear, y: y, mo: mo, d: d };
}

// "133,000원", "13.3만원", "133만 원", "1,330,000" → 133000
export function parseKoWon(s) {
  var m = s.replace(/\s/g, "").match(/(\d[\d,]*(?:\.\d+)?)(억|만|천)?원?/);
  if (!m) return 0;
  var n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2] === "억") n *= 100000000; else if (m[2] === "만") n *= 10000; else if (m[2] === "천") n *= 1000;
  return Math.round(n);
}

function classify(key) {
  var k = key.replace(/\s/g, "");
  if (/입금자|입금명의|예금주/.test(k)) return "payer";
  if (/담당|연락처|이메일|e-?mail|전화/i.test(k)) return "contact";
  if (/지급|입금/.test(k)) return "payDate";
  if (/섭외료|출연료|모델료|금액|페이|단가|비용|fee/i.test(k)) return "fee";
  if (/촬영|일시|날짜|일자/.test(k)) return "date";
  if (/매체|용도|사용처/.test(k)) return "media";
  if (/업체|브랜드|클라이언트|고객사|회사|광고주/.test(k)) return "brand";
  return null;
}

var KEYWORDS = ["입금자명", "입금자", "예금주", "담당자", "연락처", "이메일", "예상 지급일", "예상지급일", "지급일", "입금일", "섭외료", "출연료", "모델료", "금액", "페이", "단가",
  "촬영날짜", "촬영 날짜", "촬영일", "일시", "날짜", "사용매체", "사용 매체", "매체", "업체명", "업체", "브랜드", "클라이언트", "고객사", "회사명", "광고주"];

// "5일" 처럼 날짜만 적힌 지급일 → 촬영일(또는 기준 달) 기준으로 연·월을 채움. 촬영일보다 앞선 날이면 다음 달로 본다.
function dayOnlyDate(s, base) {
  var m = s.match(/(?:^|[^\d])(\d{1,2})\s*일/);
  if (!m || !base) return null;
  var d = +m[1];
  if (d < 1 || d > 31) return null;
  var y = +base.slice(0, 4), mo = +base.slice(5, 7);
  if (d < +base.slice(8, 10)) { mo++; if (mo > 12) { mo = 1; y++; } }
  return { iso: y + "-" + pad2(mo) + "-" + pad2(d), rest: s.replace(m[0], " ").replace(/\s+/g, " ").trim() };
}

export function parseRequest(text, defYear, baseMonth) {
  var out = { brand: "", income: 0, date: "", expectedPayDate: "", payerName: "", clientContact: "", note: "", found: [] };
  var notes = [];
  var mark = function (f) { if (out.found.indexOf(f) < 0) out.found.push(f); };

  // 1) 줄마다 "항목: 값"으로 나눔. 값이 비어 있으면 다음 줄을 그 항목의 값으로 이어 붙인다.
  //    예) "7. 담당자 이름/연락처 :" ↵ "010-2253-7764 세르게이 매니저"
  var items = [];
  (text || "").split(/\r?\n/).forEach(function (raw) {
    // 앞의 번호·기호·이모지 제거: "1.", "2)", "-", "•", "⭐️"
    var line = raw.replace(/^[\s\d.)\]\-–•·*#]+/, "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    var full = raw.trim();
    if (!line && !full) return;
    var key = null, val = "";
    var ci = line.search(/[:：]/);
    if (ci > 0 && classify(line.slice(0, ci))) { key = line.slice(0, ci); val = line.slice(ci + 1).trim(); }
    else {
      var kw = KEYWORDS.find(function (w) { return line.indexOf(w) === 0; });
      if (kw) { key = kw; val = line.slice(kw.length).replace(/^\s*(\([^)]*\))?\s*[:：]?\s*/, "").trim(); }
    }
    if (key) { items.push({ key: key, val: val }); return; }
    // 항목명이 없는 줄: 바로 앞 항목 값이 비어 있으면 그 값으로 사용 (전화번호처럼 숫자로 시작해도 원문 그대로)
    var last = items[items.length - 1];
    if (last && !last.val) last.val = full;
  });

  // 2) 항목 종류별로 칸에 넣음
  var payRaw = "";
  items.forEach(function (it) {
    var key = it.key, val = it.val;
    var type = classify(key);
    if (!type || !val) return;
    if (type === "brand" && !out.brand) { out.brand = val.slice(0, 100); mark("brand"); }
    else if (type === "fee" && !out.income) {
      var won = parseKoWon(val);
      if (won > 0) { out.income = won; mark("income"); }
      var vat = (key + " " + val).match(/(VAT|부가세)\s*(별도|포함|제외)/i);
      if (vat) notes.push("VAT " + vat[2]);
    }
    else if (type === "date" && !out.date) {
      var d = parseKoDate(val, defYear);
      if (d && d.noYear && baseMonth && d.mo < +baseMonth.slice(5, 7) - 6) d.iso = (d.y + 1) + d.iso.slice(4);
      if (d) { out.date = d.iso; mark("date"); if (d.rest) notes.push(d.rest); }
      else notes.push(val);
    }
    else if (type === "payDate" && !payRaw) payRaw = val;
    else if (type === "payer" && !out.payerName) { out.payerName = val.slice(0, 60); mark("payerName"); }
    else if (type === "contact" && !out.clientContact) {
      // "이윤리아 / 010-5755-1558" → "이윤리아 010-5755-1558"
      out.clientContact = val.replace(/\s*[/|,]\s*/g, " ").replace(/\s+/g, " ").slice(0, 120); mark("clientContact");
    }
    else if (type === "media") notes.push(val);
  });

  // 3) 지급일: 촬영일을 읽은 뒤에 계산 ("5일"처럼 날짜만 있으면 촬영일 기준)
  if (payRaw) {
    var p = parseKoDate(payRaw, defYear);
    if (p && p.noYear && out.date) p.iso = out.date.slice(0, 4) + p.iso.slice(4);
    p = p || dayOnlyDate(payRaw, out.date || baseMonth);
    if (p) { out.expectedPayDate = p.iso; mark("expectedPayDate"); if (p.rest) notes.push("지급: " + p.rest); }
    else notes.push("지급: " + payRaw);
  }

  out.note = notes.filter(Boolean).join(" · ").slice(0, 300);
  if (out.note) mark("note");
  return out;
}
