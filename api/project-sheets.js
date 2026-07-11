const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.REACT_APP_CLIENT_EMAIL,
    private_key: process.env.REACT_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
// 기존 정산 시스템은 "Data" 탭을 사용합니다. 이 프로젝트 관리 시스템은 완전히
// 분리된 별도 탭("ProjectData")을 사용하므로 서로의 데이터에 영향을 주지 않습니다.
// 스프레드시트에 "ProjectData"라는 이름의 새 탭(시트)을 한 번만 추가해주세요.
const RANGE = "ProjectData!A1";

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const sheets = await getSheets();

    if (req.method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
      });
      const raw = result.data.values?.[0]?.[0];
      const data = raw ? JSON.parse(raw) : null;
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const { data } = req.body;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: RANGE,
        valueInputOption: "RAW",
        requestBody: { values: [[JSON.stringify(data)]] },
      });
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
