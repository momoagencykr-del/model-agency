// 모델 전용 공개 API — 로그인 없이 "개인 링크 토큰"으로만 접근.
// 본인(토큰 주인) 데이터만 반환하며, 주민번호·계좌 등 민감정보는 절대 내보내지 않는다.
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
const TAX = 0.033;

function kstNow() { return new Date(Date.now() + 9 * 3600000); }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function calcFinal(income, af, od) {
  const inc = Number(income) || 0;
  const after = inc - Math.round(inc * af) - (Number(od) || 0);
  return after - Math.round(after * TAX);
}
function flatProjects(saved) {
  if (!saved || !saved.projects) return [];
  if (Array.isArray(saved.projects)) return saved.projects;
  const out = [];
  Object.keys(saved.projects).forEach(function (k) { (saved.projects[k] || []).forEach(function (p) { out.push(p); }); });
  return out;
}
function str(v, max) { return String(v == null ? "" : v).slice(0, max); }


// 해당 월 미리 채움 목록 (정산 등록건 + 촬영관리 + 캘린더). income(업체입금)은 서버 내부에서만 사용
async function buildPrefill(sheets, settlement, model, m, ym, monthLabel) {
  const items = [];
  const md = (settlement.data && settlement.data[model] && settlement.data[model][monthLabel]) || {};
  const registeredIds = {};
  const registeredDates = {};
  ["agency", "self"].forEach(function (type) {
    (md[type] || []).forEach(function (e) {
      registeredIds[String(e.id)] = true;
      if (e.settleDate) registeredDates[e.settleDate] = true;
      const af = type === "agency" ? m.agencyAF : m.modelAF;
      items.push({ key: "s:" + type + ":" + e.id, source: "registered", date: e.settleDate || "", brand: e.brand || "", type: type,
        income: Number(e.income) || 0, final: (e.actualPaid !== undefined && e.actualPaid !== null && e.actualPaid !== "") ? Number(e.actualPaid) || 0 : calcFinal(e.income, af, e.otherDeduct) });
    });
  });
  const projects = flatProjects(await readJson(sheets, SHEET_ID, "ProjectData"));
  projects.forEach(function (p) {
    if (!p.date || p.date.slice(0, 7) !== ym) return;
    (p.models || []).forEach(function (pm) {
      const mine = (pm.useAffiliated && pm.linkedModel === model) || pm.name === m.nameKr;
      if (!mine) return;
      if (pm.linkedEntryId !== undefined && registeredIds[String(pm.linkedEntryId)]) return; // 이미 정산 등록됨
      const inc = (pm.reportedPrice !== "" && pm.reportedPrice != null) ? Number(pm.reportedPrice) || 0 : Number(pm.agencyPrice) || 0;
      items.push({ key: "p:" + p.id + ":" + pm.id, source: "project", date: p.date, brand: p.brand || "", type: "agency", income: inc, final: calcFinal(inc, m.agencyAF, 0) });
    });
  });
  const cal = (await readJson(sheets, SHEET_ID, "CalendarData")) || {};
  (cal.events || []).forEach(function (ev) {
    if (!ev.date || ev.date.slice(0, 7) !== ym) return;
    const t = (ev.title || "");
    const mine = (m.nameKr && t.indexOf(m.nameKr) !== -1) || (m.nameEn && t.toLowerCase().indexOf(String(m.nameEn).toLowerCase()) !== -1);
    if (!mine || registeredDates[ev.date]) return;
    items.push({ key: "c:" + ev.id, source: "schedule", date: ev.date, brand: t, type: "self", income: 0, final: 0 });
  });
  items.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
  return items;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const token = str(req.method === "GET" ? req.query.t : (req.body || {}).t, 100);
    if (token.length < 16) return res.status(404).json({ error: "invalid link" });

    const settlement = (await readJson(sheets, SHEET_ID, "Data")) || {};
    const meta = settlement.modelMeta || {};
    const model = Object.keys(meta).find(function (k) { return meta[k] && meta[k].submitToken === token; });
    if (!model) return res.status(404).json({ error: "invalid link" });
    const m = meta[model];
    const year = kstNow().getUTCFullYear();

    let ym = str(req.method === "GET" ? req.query.month : (req.body || {}).month, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) ym = year + "-" + pad2(kstNow().getUTCMonth() + 1);
    const monthNum = Number(ym.slice(5, 7));
    if (Number(ym.slice(0, 4)) !== year || monthNum < 1 || monthNum > 12) return res.status(400).json({ error: "month out of range" });
    const monthLabel = monthNum + "월";

    const subStore = (await readJson(sheets, SHEET_ID, "Submissions")) || { submissions: [] };
    const subs = Array.isArray(subStore.submissions) ? subStore.submissions : [];

    if (req.method === "GET") {
      const items = await buildPrefill(sheets, settlement, model, m, ym, monthLabel);
      const mySubs = subs.filter(function (s) { return s.model === model; }).slice(-15).reverse().map(function (s) {
        return { id: s.id, month: s.month, status: s.status, submittedAt: s.submittedAt, reviewNote: s.reviewNote || "", count: (s.items || []).length };
      });
      const pub = items.map(function (it) { return { key: it.key, source: it.source, date: it.date, brand: it.brand, type: it.type, final: it.final }; });
      return res.status(200).json({ model: { nameKr: m.nameKr, nameEn: m.nameEn, fullName: m.fullName }, af: { agency: m.agencyAF, self: m.modelAF }, taxRate: TAX, year: year, month: ym, items: pub, submissions: mySubs });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const raw = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
      // 모델 화면에는 업체입금(고객사 금액)을 보여주지 않으므로, '맞음'이거나 금액을 비워둔 '수정'은 서버 기록 금액을 그대로 사용
      const prefill = await buildPrefill(sheets, settlement, model, m, ym, monthLabel);
      const known = {};
      prefill.forEach(function (p) { known[p.key] = p; });
      const items = raw.map(function (it) {
        const action = ["confirm", "edit", "absent", "new"].indexOf(it.action) !== -1 ? it.action : "new";
        const date = /^\d{4}-\d{2}-\d{2}$/.test(it.date || "") ? it.date : "";
        const entered = Math.max(0, Math.min(1e9, Math.round(Number(it.income) || 0)));
        const base = known[str(it.key, 80)];
        let income = entered, amountByModel = entered > 0;
        if (base && (action === "confirm" || (action === "edit" && !entered))) { income = base.income; amountByModel = false; }
        const out = { key: str(it.key, 80), source: base ? base.source : (it.source === "new" ? "new" : "new"), action: action, date: date || (base ? base.date : ""), brand: str(it.brand, 100) || (base ? base.brand : ""), type: it.type === "agency" ? "agency" : "self", income: income, amountByModel: amountByModel, note: str(it.note, 300) };
        if (action === "confirm" && base) { out.date = base.date; out.brand = base.brand; out.type = base.type; }
        return out;
      }).filter(function (it) { return it.action === "absent" || it.brand || it.income; });
      if (!items.length) return res.status(400).json({ error: "no items" });
      const pendingMine = subs.filter(function (s) { return s.model === model && s.status === "pending"; }).length;
      if (pendingMine >= 30) return res.status(429).json({ error: "too many pending submissions" });
      const sub = { id: "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), model: model, month: ym, items: items, comment: str(body.comment, 500), status: "pending", submittedAt: new Date().toISOString() };
      // 저장 직전 최신본 다시 읽어서 추가 (관리자 승인과 동시에 일어나도 유실 없게)
      const latest = (await readJson(sheets, SHEET_ID, "Submissions")) || { submissions: [] };
      const list = Array.isArray(latest.submissions) ? latest.submissions : [];
      list.push(sub);
      await writeJson(sheets, SHEET_ID, "Submissions", { submissions: list });
      return res.status(200).json({ ok: true, id: sub.id });
    }
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
