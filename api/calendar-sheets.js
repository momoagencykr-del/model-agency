const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.REACT_APP_CLIENT_EMAIL,
    private_key: process.env.REACT_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const TAB = "CalendarData";

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function ensureTab(sheets) {
  try {
    await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A1` });
  } catch (e) {
    // Tab likely doesn't exist yet — create it.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const sheets = await getSheets();
    await ensureTab(sheets);

    if (req.method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB}!A1`,
      });
      const raw = result.data.values?.[0]?.[0];
      const data = raw ? JSON.parse(raw) : { events: [] };
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const { data } = req.body;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TAB}!A1`,
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
