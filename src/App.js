import { useState, useCallback, useEffect, useRef } from "react";

const MODEL_META_STORAGE_KEY = "modelAgencyMeta_v2";
const MODEL_DATA_STORAGE_KEY = "modelAgencyData_v2";

const DEFAULT_MODELS = {
  폴린: { nameKr: "폴린", nameEn: "Pauline", fullName: "GUILLET PAULINE MANON LEA", nationality: "프랑스", agencyAF: 0.3, modelAF: 0.3, account: "하나 545-910326-40107", regNo: "" },
  엘리자: { nameKr: "엘리자", nameEn: "Eliza", fullName: "MANUSHINA ELIZAVETA", nationality: "러시아", agencyAF: 0.4, modelAF: 0.3, account: "토스 1002-5374-4275", regNo: "" },
  루미: { nameKr: "루미", nameEn: "Lumi", fullName: "루미 (Lumi)", nationality: "미정", agencyAF: 0.4, modelAF: 0.3, account: "", regNo: "" },
  카야: { nameKr: "카야", nameEn: "Kaya", fullName: "카야 (Kaya)", nationality: "미정", agencyAF: 0.2, modelAF: 0.1, account: "", regNo: "" },
  엘리사: { nameKr: "엘리사", nameEn: "Elysa", fullName: "엘리사 (Elysa)", nationality: "미정", agencyAF: 0.2, modelAF: 0.1, account: "", regNo: "" },
  로만: { nameKr: "로만", nameEn: "Roman", fullName: "로만 (Roman)", nationality: "미정", agencyAF: 0.2, modelAF: 0.1, account: "", regNo: "" },
  송일웅: { nameKr: "송일웅", nameEn: "Song Il-woong", fullName: "송일웅 (Song Il-woong)", nationality: "한국", agencyAF: 0.2, modelAF: 0.1, account: "", regNo: "" },
};

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const TAX_RATE = 0.033;
const MAX_HISTORY = 50;

const initData = (modelMeta) => {
  const d = {};
  Object.keys(modelMeta).forEach(m => {
    d[m] = {};
    MONTHS.forEach(mo => { d[m][mo] = { agency: [], self: [] }; });
  });
  return d;
};

function calcEntry(income, af, otherDeduct = 0) {
  const inc = Number(income) || 0;
  const fee = Math.round(inc * af);
  const oth = Number(otherDeduct) || 0;
  const afterFee = inc - fee - oth;
  const tax = Math.round(afterFee * TAX_RATE);
  return { inc, fee, oth, tax, final: afterFee - tax };
}

function calcModelTotals(modelKey, data, meta) {
  let totalSales = 0, agencyRevenue = 0, modelRevenue = 0, totalTax = 0;
  MONTHS.forEach(m => {
    const md = data?.[modelKey]?.[m] || { agency: [], self: [] };
    md.agency.forEach(e => { const c = calcEntry(e.income, meta.agencyAF, e.otherDeduct); totalSales += c.inc; agencyRevenue += c.fee; modelRevenue += c.final; totalTax += c.tax; });
    md.self.forEach(e => { const c = calcEntry(e.income, meta.modelAF, e.otherDeduct); totalSales += c.inc; agencyRevenue += c.fee; modelRevenue += c.final; totalTax += c.tax; });
  });
  return { totalSales, agencyRevenue, modelRevenue, totalTax };
}

function calcMonthTotals(modelKey, month, data, meta) {
  let totalSales = 0, agencyRevenue = 0, modelRevenue = 0, totalTax = 0;
  const md = data?.[modelKey]?.[month] || { agency: [], self: [] };
  md.agency.forEach(e => { const c = calcEntry(e.income, meta.agencyAF, e.otherDeduct); totalSales += c.inc; agencyRevenue += c.fee; modelRevenue += c.final; totalTax += c.tax; });
  md.self.forEach(e => { const c = calcEntry(e.income, meta.modelAF, e.otherDeduct); totalSales += c.inc; agencyRevenue += c.fee; modelRevenue += c.final; totalTax += c.tax; });
  return { totalSales, agencyRevenue, modelRevenue, totalTax };
}

function fmt(n) { return n > 0 ? `₩${Math.round(n).toLocaleString()}` : "-"; }
function pct(n) { return `${Math.round(n * 100)}%`; }
function formatRegNo(val) {
  const digits = val.replace(/\D/g, "").slice(0, 13);
  return digits.length <= 6 ? digits : digits.slice(0, 6) + "-" + digits.slice(6);
}

async function loadFromSheets() {
  try { const res = await fetch("/api/sheets"); const json = await res.json(); return json.data || null; } catch { return null; }
}
async function saveToSheets(payload) {
  try { const res = await fetch("/api/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: payload }) }); return res.ok; } catch { return false; }
}

// ── 테마 ──────────────────────────────────────────────────────────────────────
function T(dark) {
  return {
    bg: dark ? "#0f172a" : "#f1f5f9",
    card: dark ? "#1e293b" : "#ffffff",
    card2: dark ? "#162032" : "#f8fafc",
    border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#1e293b",
    sub: dark ? "#94a3b8" : "#64748b",
    input: dark ? "#0f172a" : "#ffffff",
    inputBorder: dark ? "#475569" : "#d1d5db",
    tableHead: dark ? "#0f172a" : "#f8fafc",
    rowHover: dark ? "#1e2d42" : "#f8fafc",
  };
}

// ── 모델 추가/수정 모달 ────────────────────────────────────────────────────────
function ModelFormModal({ existing, onSave, onClose, dark }) {
  const t = T(dark);
  const isEdit = !!existing;
  const [form, setForm] = useState(existing || {
    nameKr: "", nameEn: "", fullName: "", nationality: "",
    agencyAF: 0.2, modelAF: 0.1, account: "", regNo: ""
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fields = [
    ["한국 이름", "nameKr", "text"],
    ["영문 이름 (닉네임)", "nameEn", "text"],
    ["Full Name (여권명)", "fullName", "text"],
    ["국적", "nationality", "text"],
    ["계좌번호", "account", "text"],
    ["외국인등록번호", "regNo", "text"],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: 28, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h3 style={{ color: t.text, fontWeight: 900, fontSize: 17, margin: 0 }}>{isEdit ? "모델 정보 수정" : "새 모델 추가"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {fields.slice(0, 2).map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: t.sub, display: "block", marginBottom: 5 }}>{label} <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={form[key]} onChange={e => set(key, e.target.value)}
                  style={{ width: "100%", border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: t.input, color: t.text, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          {fields.slice(2).map(([label, key]) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: t.sub, display: "block", marginBottom: 5 }}>{label}</label>
              <input value={form[key]} onChange={e => set(key, key === "regNo" ? formatRegNo(e.target.value) : e.target.value)} maxLength={key === "regNo" ? 14 : undefined}
                style={{ width: "100%", border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: t.input, color: t.text, outline: "none", boxSizing: "border-box", fontFamily: key === "regNo" ? "monospace" : "inherit" }} />
            </div>
          ))}

          {/* AF 슬라이더 */}
          {[["① 에이전시 촬영 AF", "agencyAF", "#4f46e5"], ["② 모델 직접 촬영 AF", "modelAF", "#7c3aed"]].map(([label, key, color]) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: t.sub, display: "block", marginBottom: 6 }}>{label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="range" min={0} max={60} step={5} value={Math.round(form[key] * 100)} onChange={e => set(key, Number(e.target.value) / 100)} style={{ flex: 1, accentColor: color }} />
                <div style={{ minWidth: 52, background: dark ? "#0f172a" : "#f1f5f9", borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
                  <span style={{ fontWeight: 900, color, fontSize: 15 }}>{Math.round(form[key] * 100)}%</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>
                모델 수취 {100 - Math.round(form[key] * 100)}% / 에이전시 {Math.round(form[key] * 100)}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>취소</button>
          <button onClick={() => { if (!form.nameKr || !form.nameEn) return alert("한국 이름과 영문 이름은 필수입니다."); onSave(form); }}
            style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            {isEdit ? "수정 저장" : "모델 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 수익 배분 바 ──────────────────────────────────────────────────────────────
function RevenueBar({ agencyAF, dark }) {
  const t = T(dark);
  const agencyPct = Math.round(agencyAF * 100);
  const taxPct = Math.round((1 - agencyAF) * TAX_RATE * 1000) / 10;
  const modelPct = Math.round((100 - agencyPct - taxPct) * 10) / 10;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 24, marginBottom: 6 }}>
        <div style={{ flex: agencyPct, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>
          {agencyPct >= 8 ? `에이전시 ${agencyPct}%` : ""}
        </div>
        <div style={{ flex: taxPct, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>
          {taxPct >= 4 ? `세금 ${taxPct}%` : ""}
        </div>
        <div style={{ flex: modelPct, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden" }}>
          {modelPct >= 8 ? `모델 ${modelPct}%` : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: t.sub }}>
        <span>🟣 에이전시 {agencyPct}%</span>
        <span>🔴 세금 {taxPct}%</span>
        <span>🟢 모델 순수익 {modelPct}%</span>
      </div>
    </div>
  );
}

// ── 입력 폼 ───────────────────────────────────────────────────────────────────
function EntryForm({ af, label, onAdd, dark }) {
  const t = T(dark);
  const [f, setF] = useState({ brand: "", income: "", otherDeduct: "", note: "" });
  const c = calcEntry(f.income, af, f.otherDeduct);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: dark ? "#0f172a" : "#f8f9ff", border: `1px dashed ${dark ? "#4f46e5" : "#c7d2fe"}`, borderRadius: 12, padding: 14, marginTop: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: t.sub, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>{label} 추가</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input value={f.brand} onChange={e => set("brand", e.target.value)} placeholder="브랜드명"
          style={{ gridColumn: "1/-1", border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", background: t.input, color: t.text }} />
        <input type="number" value={f.income} onChange={e => set("income", e.target.value)} placeholder="업체 입금액 (₩)"
          style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", background: t.input, color: t.text }} />
        <input type="number" value={f.otherDeduct} onChange={e => set("otherDeduct", e.target.value)} placeholder="기타 공제 (₩)"
          style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", background: t.input, color: t.text }} />
        <input value={f.note} onChange={e => set("note", e.target.value)} placeholder="비고"
          style={{ gridColumn: "1/-1", border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", background: t.input, color: t.text }} />
      </div>
      {f.income > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, background: dark ? "#1e293b" : "#eef2ff", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          {[["총 매출", fmt(c.inc), t.sub], ["AF 공제", fmt(c.fee), "#7c3aed"], ["세금 3.3%", fmt(c.tax), "#ef4444"], ["모델 순수익", fmt(c.final), "#10b981"]].map(([lb, val, color]) => (
            <div key={lb} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: t.sub }}>{lb}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => { if (!f.income) return; onAdd({ ...f, id: Date.now() }); setF({ brand: "", income: "", otherDeduct: "", note: "" }); }}
        style={{ width: "100%", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        + 추가
      </button>
    </div>
  );
}

// ── 입력 테이블 ───────────────────────────────────────────────────────────────
function EntryTable({ entries, af, onRemove, dark }) {
  const t = T(dark);
  if (!entries.length) return <p style={{ textAlign: "center", color: t.sub, fontSize: 12, padding: "14px 0" }}>데이터 없음</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: t.sub, fontSize: 11, textTransform: "uppercase" }}>
            {["브랜드","총매출","AF공제","기타공제","세금(3.3%)","모델순수익","비고",""].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: h==="브랜드"||h===""?"left":"right", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const c = calcEntry(e.income, af, e.otherDeduct);
            return (
              <tr key={e.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: "7px 8px", fontWeight: 600, color: t.text }}>{e.brand || "-"}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: t.sub }}>{fmt(c.inc)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>{fmt(c.fee)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: t.sub }}>{fmt(c.oth)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#ef4444", fontWeight: 700 }}>{fmt(c.tax)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#10b981", fontWeight: 800 }}>{fmt(c.final)}</td>
                <td style={{ padding: "7px 8px", color: t.sub }}>{e.note || "-"}</td>
                <td style={{ padding: "7px 8px" }}>
                  <button onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", color: dark ? "#475569" : "#cbd5e1", cursor: "pointer", fontSize: 14 }}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 모델 상세 ─────────────────────────────────────────────────────────────────
function ModelDetail({ model, meta, data, addEntry, removeEntry, onUpdateAF, dark }) {
  const t = T(dark);
  const [month, setMonth] = useState("1월");
  const [showAFEdit, setShowAFEdit] = useState(false);
  const md = data?.[model]?.[month] || { agency: [], self: [] };
  const { totalSales, agencyRevenue, modelRevenue, totalTax } = calcMonthTotals(model, month, data, meta);

  return (
    <div>
      {/* 모델 헤더 */}
      <div style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", borderRadius: 16, padding: "18px 22px", marginBottom: 16, color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, flexShrink: 0 }}>{meta.nameEn[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{meta.nameKr} <span style={{ fontWeight: 300, opacity: 0.75, fontSize: 15 }}>({meta.nameEn})</span></div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{meta.fullName} · {meta.nationality}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>{meta.account || "계좌 미등록"}{meta.regNo ? ` · 등록번호: ${meta.regNo}` : ""}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>수익 배분</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>에이전시 {pct(meta.agencyAF)} / 모델 {pct(meta.modelAF)}</div>
          <button onClick={() => setShowAFEdit(true)} style={{ marginTop: 6, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer" }}>✏️ AF 수정</button>
        </div>
      </div>

      {/* AF 수정 인라인 */}
      {showAFEdit && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: t.sub, marginBottom: 12 }}>AF 비율 수정</p>
          {[["① 에이전시 촬영 AF", "agencyAF", "#4f46e5"], ["② 모델 직접 촬영 AF", "modelAF", "#7c3aed"]].map(([label, key, color]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: t.sub }}>{label}</span>
                <span style={{ fontWeight: 900, color, fontSize: 15 }}>{pct(meta[key])}</span>
              </div>
              <input type="range" min={0} max={60} step={5} value={Math.round(meta[key] * 100)}
                onChange={e => onUpdateAF(model, key, Number(e.target.value) / 100)}
                style={{ width: "100%", accentColor: color }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAFEdit(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>닫기</button>
          </div>
        </div>
      )}

      {/* 수익 배분 바 */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: t.sub, marginBottom: 8 }}>수익 배분 구조 (에이전시 촬영 기준)</p>
        <RevenueBar agencyAF={meta.agencyAF} dark={dark} />
      </div>

      {/* 월 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {MONTHS.map(m => {
          const hasData = (data?.[model]?.[m]?.agency?.length || 0) + (data?.[model]?.[m]?.self?.length || 0) > 0;
          return (
            <button key={m} onClick={() => setMonth(m)} style={{ padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: month === m ? "#4f46e5" : hasData ? (dark ? "#1e3a5f" : "#eef2ff") : (dark ? "#1e293b" : "#f1f5f9"), color: month === m ? "#fff" : hasData ? "#4f46e5" : t.sub }}>{m}</button>
          );
        })}
      </div>

      {/* 이번달 합계 */}
      {totalSales > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[["총 매출액", fmt(totalSales), dark?"#e2e8f0":"#334155", dark?"#1e293b":"#f8fafc", dark?"#334155":"#e2e8f0"],
            ["에이전시 수익", fmt(agencyRevenue), "#7c3aed", dark?"#1e1030":"#f5f3ff", dark?"#4c1d95":"#ede9fe"],
            ["원천징수 (3.3%)", fmt(totalTax), "#ef4444", dark?"#1a0a0a":"#fff1f2", dark?"#7f1d1d":"#fecdd3"],
            ["모델 순수익", fmt(modelRevenue), "#10b981", dark?"#0a1f1a":"#f0fdf4", dark?"#064e3b":"#bbf7d0"]].map(([lb, val, tc, bg, brd]) => (
            <div key={lb} style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontSize: 10, color: tc, opacity: 0.7, marginBottom: 3 }}>{lb}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: tc }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ① 에이전시 촬영 */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, color: t.text, fontSize: 13 }}>① 에이전시가 잡아온 촬영</span>
          <span style={{ background: dark?"#1e1b4b":"#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>AF {pct(meta.agencyAF)}</span>
        </div>
        <EntryTable entries={md.agency} af={meta.agencyAF} onRemove={id => removeEntry(model, month, "agency", id)} dark={dark} />
        <EntryForm af={meta.agencyAF} label="에이전시 촬영" onAdd={e => addEntry(model, month, "agency", e)} dark={dark} />
      </div>

      {/* ② 모델 직접 촬영 */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, color: t.text, fontSize: 13 }}>② 모델이 잡아온 촬영</span>
          <span style={{ background: dark?"#2d1a4b":"#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>AF {pct(meta.modelAF)}</span>
        </div>
        <EntryTable entries={md.self} af={meta.modelAF} onRemove={id => removeEntry(model, month, "self", id)} dark={dark} />
        <EntryForm af={meta.modelAF} label="모델 직접 촬영" onAdd={e => addEntry(model, month, "self", e)} dark={dark} />
      </div>
    </div>
  );
}

// ── 세무 요약 행 ──────────────────────────────────────────────────────────────
function TaxSummaryRow({ model, meta, inc, tax, final, agencyRev, monthData, editingRegNo, regNoInput, onStartEdit, onCommitEdit, onRegNoInput, dark }) {
  const t = T(dark);
  const [expanded, setExpanded] = useState(false);
  const allEntries = [
    ...monthData.agency.map(e => ({ ...e, type: "agency", af: meta.agencyAF, typeLabel: "① 에이전시" })),
    ...monthData.self.map(e => ({ ...e, type: "self", af: meta.modelAF, typeLabel: "② 모델직접" })),
  ];
  return (
    <>
      <tr style={{ borderBottom: expanded ? "none" : `1px solid ${t.border}`, background: expanded ? (dark?"#1a2744":"#f8f9ff") : t.card, opacity: final === 0 ? 0.35 : 1 }}>
        <td style={{ padding: "9px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => allEntries.length > 0 && setExpanded(v => !v)}
              style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${t.border}`, background: allEntries.length > 0 ? t.card2 : "transparent", cursor: allEntries.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", color: t.sub, fontSize: 10 }}>▼</button>
            <div>
              <div style={{ fontWeight: 800, color: t.text, fontSize: 13 }}>{meta.nameKr}</div>
              <div style={{ fontSize: 10, color: t.sub }}>{meta.fullName}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: "9px 12px", color: t.sub, fontSize: 12 }}>{meta.nationality}</td>
        <td style={{ padding: "9px 12px" }}>
          {editingRegNo === model ? (
            <input autoFocus value={regNoInput} onChange={e => onRegNoInput(formatRegNo(e.target.value))} onBlur={() => onCommitEdit(model)} onKeyDown={e => e.key === "Enter" && onCommitEdit(model)} placeholder="000000-0000000" maxLength={14}
              style={{ border: `2px solid #f59e0b`, borderRadius: 6, padding: "4px 8px", fontSize: 12, width: 128, outline: "none", fontFamily: "monospace", background: t.input, color: t.text }} />
          ) : (
            <button onClick={() => onStartEdit(model, meta.regNo)}
              style={{ background: meta.regNo ? (dark?"#451a03":"#fef3c7") : (dark?"#292524":"#fde68a"), border: "1px dashed #f59e0b", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer", color: meta.regNo ? "#f59e0b" : "#b45309", fontFamily: "monospace", fontWeight: meta.regNo ? 700 : 400 }}>
              {meta.regNo || "클릭하여 입력 ✏️"}
            </button>
          )}
        </td>
        <td style={{ padding: "9px 12px", textAlign: "right", color: t.sub, fontWeight: 600 }}>{inc > 0 ? fmt(inc) : "-"}</td>
        <td style={{ padding: "9px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 800 }}>{agencyRev > 0 ? fmt(agencyRev) : "-"}</td>
        <td style={{ padding: "9px 12px", textAlign: "right", color: "#ef4444", fontWeight: 800 }}>{tax > 0 ? fmt(tax) : "-"}</td>
        <td style={{ padding: "9px 12px", textAlign: "right", color: "#10b981", fontWeight: 900 }}>{final > 0 ? fmt(final) : "-"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0, background: dark?"#0f172a":"#f8f9ff", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ padding: "10px 14px 14px 50px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>세부 내역 ({allEntries.length}건)</div>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: t.sub, borderBottom: `1px solid ${t.border}` }}>
                    {["구분","브랜드","총매출","에이전시수익","기타공제","세금(3.3%)","모델순수익","비고"].map((h,i) => (
                      <th key={h} style={{ padding: "4px 8px", textAlign: i < 2 ? "left" : "right", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map(e => {
                    const c = calcEntry(e.income, e.af, e.otherDeduct);
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${dark?"#0f172a":"#eef2ff"}` }}>
                        <td style={{ padding: "5px 8px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: e.type==="agency"?(dark?"#1e1b4b":"#eef2ff"):(dark?"#2d1a4b":"#f5f3ff"), color: e.type==="agency"?"#4f46e5":"#7c3aed" }}>{e.typeLabel}</span></td>
                        <td style={{ padding: "5px 8px", fontWeight: 600, color: t.text }}>{e.brand || "-"}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: t.sub }}>{fmt(c.inc)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#7c3aed", fontWeight: 700 }}>{fmt(c.fee)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: t.sub }}>{fmt(c.oth)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#ef4444", fontWeight: 700 }}>{fmt(c.tax)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#10b981", fontWeight: 800 }}>{fmt(c.final)}</td>
                        <td style={{ padding: "5px 8px", color: t.sub }}>{e.note || "-"}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: `2px solid ${t.border}`, background: dark?"#1e293b":"#eef2ff" }}>
                    <td colSpan={2} style={{ padding: "6px 8px", fontWeight: 800, color: "#4338ca", fontSize: 11 }}>소계</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: t.sub }}>{fmt(inc)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: "#7c3aed" }}>{fmt(agencyRev)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: t.sub }}>-</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: "#ef4444" }}>{fmt(tax)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 900, color: "#10b981" }}>{fmt(final)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── 세무 요약 ─────────────────────────────────────────────────────────────────
function TaxSummary({ data, modelMeta, onUpdateRegNo, dark }) {
  const t = T(dark);
  const [month, setMonth] = useState("1월");
  const [editingRegNo, setEditingRegNo] = useState(null);
  const [regNoInput, setRegNoInput] = useState("");

  const rows = Object.keys(modelMeta).map(model => {
    const meta = modelMeta[model];
    const md = data?.[model]?.[month] || { agency: [], self: [] };
    let inc = 0, tax = 0, final = 0, agencyRev = 0;
    [...md.agency.map(e => calcEntry(e.income, meta.agencyAF, e.otherDeduct)),
     ...md.self.map(e => calcEntry(e.income, meta.modelAF, e.otherDeduct))].forEach(c => { inc += c.inc; tax += c.tax; final += c.final; agencyRev += c.fee; });
    return { model, meta, inc, tax, final, agencyRev, monthData: md };
  });

  const totInc = rows.reduce((s, r) => s + r.inc, 0);
  const totTax = rows.reduce((s, r) => s + r.tax, 0);
  const totFinal = rows.reduce((s, r) => s + r.final, 0);
  const totAgency = rows.reduce((s, r) => s + r.agencyRev, 0);
  const taxRows = rows.filter(r => r.final > 0);
  const startEdit = (model, current) => { setEditingRegNo(model); setRegNoInput(current || ""); };
  const commitEdit = (model) => { onUpdateRegNo(model, regNoInput); setEditingRegNo(null); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: t.text, margin: 0 }}>월별 세무 요약</h2>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
          {MONTHS.map(m => (
            <button key={m} onClick={() => setMonth(m)} style={{ padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: month === m ? "#4f46e5" : (dark?"#1e293b":"#f1f5f9"), color: month === m ? "#fff" : t.sub }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[["총 매출액", fmt(totInc), dark?"#e2e8f0":"#334155", dark?"#1e293b":"#f8fafc", dark?"#334155":"#e2e8f0"],
          ["에이전시 수익", fmt(totAgency), "#7c3aed", dark?"#1a0d2e":"#f5f3ff", dark?"#4c1d95":"#ede9fe"],
          ["원천징수 (3.3%)", fmt(totTax), "#ef4444", dark?"#1a0808":"#fff1f2", dark?"#7f1d1d":"#fecdd3"],
          ["모델 총 순수익", fmt(totFinal), "#10b981", dark?"#071a14":"#f0fdf4", dark?"#064e3b":"#bbf7d0"]].map(([lb, val, tc, bg, brd]) => (
          <div key={lb} style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: tc, opacity: 0.7, marginBottom: 4 }}>{lb}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: tc }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: t.tableHead }}>
                {[["모델","left"],["국적","left"],["외국인등록번호","left"],["총매출","right"],["에이전시수익","right"],["세금(3.3%)","right"],["모델순수익","right"]].map(([h, align], i) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: align, fontSize: 11, color: i===4?"#7c3aed":i===5?"#ef4444":i===6?"#10b981":t.sub, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ model, meta, inc, tax, final, agencyRev, monthData }) => (
                <TaxSummaryRow key={model} model={model} meta={meta} inc={inc} tax={tax} final={final} agencyRev={agencyRev} monthData={monthData}
                  editingRegNo={editingRegNo} regNoInput={regNoInput} onStartEdit={startEdit} onCommitEdit={commitEdit} onRegNoInput={setRegNoInput} dark={dark} />
              ))}
              <tr style={{ background: dark?"#1e293b":"#eef2ff" }}>
                <td colSpan={3} style={{ padding: "9px 12px", fontWeight: 900, color: "#4338ca" }}>합계</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 900, color: t.sub }}>{fmt(totInc)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 900, color: "#7c3aed" }}>{fmt(totAgency)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 900, color: "#ef4444" }}>{fmt(totTax)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 900, color: "#10b981" }}>{fmt(totFinal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {taxRows.length > 0 && (
        <div style={{ background: dark?"#1a1200":"#fffbeb", border: `1px solid ${dark?"#854d0e":"#fde68a"}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ fontWeight: 900, color: dark?"#fbbf24":"#92400e", fontSize: 13 }}>세무서 신고용 — {month}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: dark?"#d97706":"#b45309" }}>이름 · 국적 · 외국인등록번호 · 입금비용</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${dark?"#854d0e":"#fde68a"}` }}>
                  {["이름 (Name)","국적","외국인등록번호","모델 입금 비용","원천징수 세액 (3.3%)"].map((h,i) => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: i > 2 ? "right" : "left", color: dark?"#fbbf24":"#92400e", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxRows.map(({ model, meta, final, tax }) => (
                  <tr key={model} style={{ borderBottom: `1px solid ${dark?"#451a03":"#fef3c7"}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: t.text }}>{meta.fullName}</td>
                    <td style={{ padding: "8px 10px", color: t.sub }}>{meta.nationality}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: meta.regNo ? "#f59e0b" : "#b45309", fontWeight: meta.regNo ? 700 : 400 }}>{meta.regNo || "미입력"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: t.text }}>{fmt(final + tax)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: "#ef4444" }}>{fmt(tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: dark?"#d97706":"#b45309", marginTop: 10 }}>※ 모델 입금 비용 = 3.3% 공제 전 금액 (최종입금 + 세금액)</p>
        </div>
      )}
    </div>
  );
}

// ── 연간 요약 ─────────────────────────────────────────────────────────────────
function Overview({ data, modelMeta, dark }) {
  const t = T(dark);
  const rows = Object.keys(modelMeta).map(model => {
    const meta = modelMeta[model];
    const { totalSales, agencyRevenue, modelRevenue, totalTax } = calcModelTotals(model, data, meta);
    return { model, meta, totalSales, agencyRevenue, modelRevenue, totalTax };
  });
  const totSales = rows.reduce((s, r) => s + r.totalSales, 0);
  const totAgency = rows.reduce((s, r) => s + r.agencyRevenue, 0);
  const totModel = rows.reduce((s, r) => s + r.modelRevenue, 0);
  const totTax = rows.reduce((s, r) => s + r.totalTax, 0);

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 900, color: t.text, marginBottom: 16 }}>2026 연간 요약</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[["총 매출액", fmt(totSales), dark?"#e2e8f0":"#334155", dark?"#1e293b":"#f8fafc", dark?"#334155":"#e2e8f0"],
          ["에이전시 수익", fmt(totAgency), "#7c3aed", dark?"#1a0d2e":"#f5f3ff", dark?"#4c1d95":"#ede9fe"],
          ["총 납부 세액", fmt(totTax), "#ef4444", dark?"#1a0808":"#fff1f2", dark?"#7f1d1d":"#fecdd3"],
          ["모델 총 순수익", fmt(totModel), "#10b981", dark?"#071a14":"#f0fdf4", dark?"#064e3b":"#bbf7d0"]].map(([lb, val, tc, bg, brd]) => (
          <div key={lb} style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: tc, opacity: 0.7, marginBottom: 4 }}>{lb}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: tc }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ model, meta, totalSales, agencyRevenue, modelRevenue, totalTax }) => (
          <div key={model} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: totalSales > 0 ? 10 : 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: dark?"#1e1b4b":"#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#4f46e5", flexShrink: 0 }}>{meta.nameEn[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: t.text }}>{meta.nameKr} <span style={{ fontWeight: 400, color: t.sub, fontSize: 12 }}>({meta.nameEn})</span></div>
                <div style={{ fontSize: 11, color: t.sub }}>{meta.nationality} · 에이전시AF {pct(meta.agencyAF)} / 모델AF {pct(meta.modelAF)}</div>
              </div>
              {totalSales === 0 && <span style={{ fontSize: 11, background: dark?"#1e293b":"#f1f5f9", color: t.sub, padding: "3px 8px", borderRadius: 20 }}>데이터 없음</span>}
            </div>
            {totalSales > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingLeft: 50 }}>
                {[["총 매출", fmt(totalSales), t.sub], ["에이전시 수익", fmt(agencyRevenue), "#7c3aed"], ["세금", fmt(totalTax), "#ef4444"], ["모델 순수익", fmt(modelRevenue), "#10b981"]].map(([lb, val, color]) => (
                  <div key={lb}>
                    <div style={{ fontSize: 10, color: t.sub }}>{lb}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
export default function App() {
  const [modelMeta, setModelMeta] = useState(() => {
    try { const s = localStorage.getItem(MODEL_META_STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_MODELS; } catch { return DEFAULT_MODELS; }
  });
  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem(MODEL_DATA_STORAGE_KEY); return s ? JSON.parse(s) : initData(DEFAULT_MODELS); } catch { return initData(DEFAULT_MODELS); }
  });
  const [tab, setTab] = useState("overview");
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("darkMode") === "true"; } catch { return false; } });
  const [saveStatus, setSaveStatus] = useState("idle");
  const [unsaved, setUnsaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const historyRef = useRef([{ data: initData(DEFAULT_MODELS), modelMeta: DEFAULT_MODELS }]);
  const historyIdx = useRef(0);

  const t = T(dark);

  useEffect(() => {
    loadFromSheets().then(saved => {
      if (saved?.data) { setData(saved.data); historyRef.current = [{ data: saved.data, modelMeta: saved.modelMeta || DEFAULT_MODELS }]; }
      if (saved?.modelMeta) setModelMeta(saved.modelMeta);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem("darkMode", dark); }, [dark]);

  const saveMeta = (m) => { setModelMeta(m); localStorage.setItem(MODEL_META_STORAGE_KEY, JSON.stringify(m)); };
  const saveData = (d) => { setData(d); localStorage.setItem(MODEL_DATA_STORAGE_KEY, JSON.stringify(d)); };

  const pushHistory = useCallback((newData, newMeta) => {
    const h = historyRef.current.slice(0, historyIdx.current + 1);
    h.push({ data: newData, modelMeta: newMeta });
    if (h.length > MAX_HISTORY) h.shift();
    historyRef.current = h;
    historyIdx.current = h.length - 1;
    setUnsaved(true);
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    const { data: d, modelMeta: m } = historyRef.current[historyIdx.current];
    saveData(d); saveMeta(m); setUnsaved(true);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyRef.current.length - 1) return;
    historyIdx.current += 1;
    const { data: d, modelMeta: m } = historyRef.current[historyIdx.current];
    saveData(d); saveMeta(m); setUnsaved(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    const ok = await saveToSheets({ data, modelMeta });
    setSaveStatus(ok ? "saved" : "error");
    if (ok) setUnsaved(false);
    setTimeout(() => setSaveStatus("idle"), 2500);
  }, [data, modelMeta]);

  const addEntry = useCallback((model, month, type, entry) => {
    setData(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      if (!d[model]) { d[model] = {}; MONTHS.forEach(m => { d[model][m] = { agency: [], self: [] }; }); }
      d[model][month][type].push(entry);
      saveData(d); pushHistory(d, modelMeta); return d;
    });
  }, [modelMeta, pushHistory]);

  const removeEntry = useCallback((model, month, type, id) => {
    setData(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      d[model][month][type] = d[model][month][type].filter(e => e.id !== id);
      saveData(d); pushHistory(d, modelMeta); return d;
    });
  }, [modelMeta, pushHistory]);

  const updateRegNo = useCallback((model, regNo) => {
    setModelMeta(prev => {
      const m = { ...prev, [model]: { ...prev[model], regNo } };
      saveMeta(m); pushHistory(data, m); return m;
    });
  }, [data, pushHistory]);

  const updateAF = useCallback((model, key, value) => {
    setModelMeta(prev => {
      const m = { ...prev, [model]: { ...prev[model], [key]: value } };
      saveMeta(m); setUnsaved(true); return m;
    });
  }, []);

  // 모델 추가
  const handleAddModel = useCallback((form) => {
    const key = form.nameKr;
    if (modelMeta[key]) return alert("같은 이름의 모델이 이미 존재합니다.");
    const newMeta = { ...modelMeta, [key]: { ...form } };
    const newData = JSON.parse(JSON.stringify(data));
    newData[key] = {};
    MONTHS.forEach(m => { newData[key][m] = { agency: [], self: [] }; });
    saveMeta(newMeta); saveData(newData);
    pushHistory(newData, newMeta);
    setShowModelForm(false);
    setTab(key);
  }, [modelMeta, data, pushHistory]);

  // 모델 수정
  const handleEditModel = useCallback((form) => {
    const key = editingModel;
    const newMeta = { ...modelMeta, [key]: { ...modelMeta[key], ...form, nameKr: modelMeta[key].nameKr } };
    saveMeta(newMeta); pushHistory(data, newMeta);
    setEditingModel(null);
  }, [modelMeta, data, editingModel, pushHistory]);

  // 모델 삭제
  const handleDeleteModel = useCallback((modelKey) => {
    const newMeta = { ...modelMeta };
    delete newMeta[modelKey];
    const newData = JSON.parse(JSON.stringify(data));
    delete newData[modelKey];
    saveMeta(newMeta); saveData(newData);
    pushHistory(newData, newMeta);
    setDeleteConfirm(null);
    if (tab === modelKey) setTab("overview");
  }, [modelMeta, data, pushHistory, tab]);

  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < historyRef.current.length - 1;

  const navItems = [
    { id: "overview", label: "연간 요약", icon: "📊" },
    { id: "tax", label: "세무 요약", icon: "📋" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700, color: "#4f46e5" }}>데이터 불러오는 중...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* 모달들 */}
      {showModelForm && <ModelFormModal onSave={handleAddModel} onClose={() => setShowModelForm(false)} dark={dark} />}
      {editingModel && <ModelFormModal existing={modelMeta[editingModel]} onSave={handleEditModel} onClose={() => setEditingModel(null)} dark={dark} />}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28, width: 340, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: t.text, fontWeight: 900, textAlign: "center", marginBottom: 8 }}>{deleteConfirm} 삭제</h3>
            <p style={{ color: t.sub, fontSize: 13, textAlign: "center", marginBottom: 20 }}>해당 모델의 모든 정산 데이터가 삭제됩니다. 되돌릴 수 없습니다.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={() => handleDeleteModel(deleteConfirm)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, cursor: "pointer" }}>삭제 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "8px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 12 }}>MA</div>
        <div>
          <div style={{ fontWeight: 900, color: t.text, fontSize: 13, lineHeight: 1.1 }}>Model Agency</div>
          <div style={{ fontSize: 10, color: t.sub }}>2026 소속모델 정산관리</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <button onClick={undo} disabled={!canUndo} title="실행취소"
            style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: canUndo ? t.card : "transparent", color: canUndo ? t.text : t.sub, cursor: canUndo ? "pointer" : "not-allowed", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
          <button onClick={redo} disabled={!canRedo} title="되돌리기"
            style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: canRedo ? t.card : "transparent", color: canRedo ? t.text : t.sub, cursor: canRedo ? "pointer" : "not-allowed", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↪</button>
          <button onClick={handleSave} disabled={saveStatus === "saving"}
            style={{ height: 30, padding: "0 12px", borderRadius: 7, border: "none", cursor: saveStatus === "saving" ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 11,
              background: saveStatus === "saved" ? "#d1fae5" : saveStatus === "error" ? "#fee2e2" : unsaved ? "#4f46e5" : (dark?"#1e293b":"#e2e8f0"),
              color: saveStatus === "saved" ? "#065f46" : saveStatus === "error" ? "#991b1b" : unsaved ? "#fff" : t.sub }}>
            {saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "✅ 저장됨" : saveStatus === "error" ? "❌ 실패" : unsaved ? "💾 저장" : "저장됨"}
          </button>
          <button onClick={() => setDark(v => !v)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {dark ? "☀️" : "🌙"}
          </button>
          <span style={{ fontSize: 10, background: dark?"#451a03":"#fef3c7", color: dark?"#fbbf24":"#92400e", fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>원천징수 3.3%</span>
        </div>
      </header>

      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "16px", display: "flex", gap: 16 }}>
        {/* 사이드바 */}
        <aside style={{ width: 170, flexShrink: 0 }}>
          <nav style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8, position: "sticky", top: 56 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, border: "none", cursor: "pointer", background: tab === item.id ? "#4f46e5" : "transparent", color: tab === item.id ? "#fff" : t.sub, fontWeight: 700, fontSize: 12, marginBottom: 2, textAlign: "left" }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div style={{ margin: "8px 0", borderTop: `1px solid ${t.border}`, paddingTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 10, paddingRight: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>모델 {Object.keys(modelMeta).length}명</span>
                <button onClick={() => setShowModelForm(true)} title="모델 추가"
                  style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontWeight: 900 }}>+</button>
              </div>
              {Object.keys(modelMeta).map(m => (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <button onClick={() => setTab(m)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === m ? "#4f46e5" : "transparent", color: tab === m ? "#fff" : t.sub, fontWeight: 700, fontSize: 12, textAlign: "left" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: tab === m ? "rgba(255,255,255,0.2)" : (dark?"#0f172a":"#f1f5f9"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, fontWeight: 900 }}>{modelMeta[m].nameEn[0]}</span>
                    {modelMeta[m].nameKr}
                  </button>
                  {tab === m && (
                    <div style={{ display: "flex", gap: 2 }}>
                      <button onClick={() => setEditingModel(m)} style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                      <button onClick={() => setDeleteConfirm(m)} style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "#ef444466", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* 콘텐츠 */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {tab === "overview" && <Overview data={data} modelMeta={modelMeta} dark={dark} />}
          {tab === "tax" && <TaxSummary data={data} modelMeta={modelMeta} onUpdateRegNo={updateRegNo} dark={dark} />}
          {Object.keys(modelMeta).includes(tab) && (
            <ModelDetail model={tab} meta={modelMeta[tab]} data={data} addEntry={addEntry} removeEntry={removeEntry} onUpdateAF={updateAF} dark={dark} />
          )}
        </main>
      </div>
    </div>
  );
}