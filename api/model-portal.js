// 모델 전용 공개 API — 로그인 없이 "개인 링크 토큰"으로만 접근.
// 모델이 달력에서 직접 입력한 촬영(모델 직접 촬영)을 저장 즉시 모델 정산관리 데이터에 반영한다.
// 본인 데이터 중 '모델이 직접 입력한 건'만 주고받으며, 에이전시 등록건·고객사 청구액·주민번호·계좌는 내보내지 않는다.
const { google } = require("googleapis");
const { readJson, writeJson } = require("./_store");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.REACT_APP_CLIENT_EMAIL,
    private_key: process.env.REACT_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const MAX_PER_MONTH = 60;

function kstNow() { return new Date(Date.now() + 9 * 3600000); }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function str(v, max) { return String(v == null ? "" : v).slice(0, max); }
function portalEntries(md) {
  return ((md && md.self) || []).filter(function (e) { return e && e.portal; });
}
function publicEntry(e) {
  return {
    id: e.id, date: e.settleDate || "", brand: e.brand || "", income: Number(e.income) || 0, note: e.portalNote || "", paid: !!e.paid,
    payerName: e.payerName || "", expectedPayDate: e.expectedPayDate || "", clientContact: e.clientContact || "",
  };
}
function isoDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? String(v) : ""; }

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const body = req.body || {};
    const token = str(req.method === "GET" ? req.query.t : body.t, 100);
    if (token.length < 16) return res.status(404).json({ error: "invalid link" });

    const settlement = await readJson(sheets, SHEET_ID, "Data");
    if (!settlement || !settlement.modelMeta) return res.status(503).json({ error: "data unavailable" });
    const meta = settlement.modelMeta;
    const model = Object.keys(meta).find(function (k) { return meta[k] && meta[k].submitToken === token; });
    if (!model) return res.status(404).json({ error: "invalid link" });
    const m = meta[model];
    const year = kstNow().getUTCFullYear();

    let ym = str(req.method === "GET" ? req.query.month : body.month, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) ym = year + "-" + pad2(kstNow().getUTCMonth() + 1);
    const monthNum = Number(ym.slice(5, 7));
    if (Number(ym.slice(0, 4)) !== year || monthNum < 1 || monthNum > 12) return res.status(400).json({ error: "month out of range" });
    const monthLabel = monthNum + "월";

    if (req.method === "GET") {
      const md = settlement.data && settlement.data[model] && settlement.data[model][monthLabel];
      return res.status(200).json({
        model: { nameKr: m.nameKr, nameEn: m.nameEn }, year: year, month: ym,
        entries: portalEntries(md).map(publicEntry).sort(function (a, b) { return a.date.localeCompare(b.date); }),
      });
    }

    if (req.method === "POST") {
      const raw = Array.isArray(body.entries) ? body.entries.slice(0, MAX_PER_MONTH) : [];
      const clean = raw.map(function (it) {
        return {
          id: it.id,
          date: /^\d{4}-\d{2}-\d{2}$/.test(it.date || "") && String(it.date).slice(0, 7) === ym ? it.date : "",
          brand: str(it.brand, 100).trim(),
          income: Math.max(0, Math.min(1e9, Math.round(Number(it.income) || 0))),
          note: str(it.note, 300),
          payerName: str(it.payerName, 60).trim(),          // 입금자명
          expectedPayDate: isoDate(it.expectedPayDate),     // 예상 입금일
          clientContact: str(it.clientContact, 120).trim(), // 담당자 연락처 또는 이메일
        };
      });
      if (clean.some(function (e) { return !e.date || !e.brand || !e.income; })) return res.status(400).json({ error: "date, brand and amount are required" });

      // 저장 직전 최신 정산 데이터를 다시 읽고 이 모델·이 달의 '모델 입력' 건만 갱신 (다른 데이터는 손대지 않음)
      const latest = await readJson(sheets, SHEET_ID, "Data");
      if (!latest || !latest.modelMeta || !latest.modelMeta[model] || latest.modelMeta[model].submitToken !== token) return res.status(409).json({ error: "please reload" });
      if (!latest.data) latest.data = {};
      if (!latest.data[model]) latest.data[model] = {};
      const md = latest.data[model][monthLabel] || { agency: [], self: [] };
      if (!md.agency) md.agency = [];
      if (!md.self) md.self = [];

      const existing = {};
      portalEntries(md).forEach(function (e) { existing[String(e.id)] = e; });
      const keepIds = {};
      const now = new Date().toISOString();
      let seq = 0;
      const upserts = [];
      clean.forEach(function (c) {
        const old = c.id !== undefined && c.id !== null ? existing[String(c.id)] : null;
        if (old) {
          keepIds[String(old.id)] = true;
          if (old.paid) return; // 입금 완료된 건은 모델이 바꿀 수 없음
          old.brand = c.brand; old.income = c.income; old.settleDate = c.date; old.portalNote = c.note;
          old.payerName = c.payerName; old.expectedPayDate = c.expectedPayDate; old.clientContact = c.clientContact;
          old.note = "모델 입력" + (c.note ? " · " + c.note : "");
          old.updatedAt = now;
        } else {
          const id = Date.now() * 100 + (seq++);
          keepIds[String(id)] = true;
          upserts.push({ id: id, brand: c.brand, income: c.income, otherDeduct: 0, note: "모델 입력" + (c.note ? " · " + c.note : ""), portalNote: c.note, payerName: c.payerName, expectedPayDate: c.expectedPayDate, clientContact: c.clientContact, paid: false, settleDate: c.date, portal: true, submittedAt: now });
        }
      });
      // 모델이 지운 건 제거 (입금 완료 건은 유지)
      md.self = md.self.filter(function (e) { return !e.portal || e.paid || keepIds[String(e.id)]; }).concat(upserts);
      latest.data[model][monthLabel] = md;
      await writeJson(sheets, SHEET_ID, "Data", latest);
      return res.status(200).json({ ok: true, entries: portalEntries(md).map(publicEntry).sort(function (a, b) { return a.date.localeCompare(b.date); }) });
    }
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
