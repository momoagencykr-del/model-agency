const API_URL = "/api/sheets";

export async function loadFromSheets() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    return json.data || null;
  } catch (e) {
    console.error("Sheets 불러오기 실패:", e);
    return null;
  }
}

export async function saveToSheets(data) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  } catch (e) {
    console.error("Sheets 저장 실패:", e);
  }
}