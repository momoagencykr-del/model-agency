// 관리자(admin) 전용: 모델 제출 목록 조회 / 승인·반려 상태 기록
const { google } = require("googleapis");
const { readJson, writeJson } = require("./_store");
const { requireAuth } = require("./_auth");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.REACT_APP_CLIENT_EMAIL,
    private_key: process.env.REACT_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SHEET_ID = process.env.REACT_APP_SHEET_ID;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireAuth(req, res, ["admin"])) return;
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const store = (await readJson(sheets, SHEET_ID, "Submissions")) || { submissions: [] };
    const list = Array.isArray(store.submissions) ? store.submissions : [];
    if (req.method === "GET") return res.status(200).json({ submissions: list });
    if (req.method === "POST") {
      const b = req.body || {};
      if (b.action === "delete") {
        const next = list.filter(function (x) { return x.id !== b.id; });
        await writeJson(sheets, SHEET_ID, "Submissions", { submissions: next });
        return res.status(200).json({ ok: true, deleted: list.length - next.length });
      }
      const s = list.find(function (x) { return x.id === b.id; });
      if (!s) return res.status(404).json({ error: "not found" });
      if (["approved", "rejected", "pending"].indexOf(b.status) === -1) return res.status(400).json({ error: "bad status" });
      s.status = b.status;
      s.reviewNote = String(b.reviewNote || "").slice(0, 500);
      s.reviewedAt = new Date().toISOString();
      if (Array.isArray(b.decisions)) s.decisions = b.decisions.slice(0, 40);
      await writeJson(sheets, SHEET_ID, "Submissions", { submissions: list });
      return res.status(200).json({ ok: true, submission: s });
    }
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
