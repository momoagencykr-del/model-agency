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
      const loaded = await readJson(sheets, SHEET_ID, "Data");
      const data = loaded !== null ? loaded : null;
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const { data } = req.body;
      await writeJson(sheets, SHEET_ID, "Data", data);
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};