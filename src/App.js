import { useState, useCallback, useEffect } from "react";
import { loadFromSheets, saveToSheets } from "./sheetsApi";

const MODEL_META_INIT = {
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

const initData = () => {
  const d = {};
  Object.keys(MODEL_META_INIT).forEach(m => {
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

function fmt(n) { return n > 0 ? `₩${Math.round(n).toLocaleString()}` : "-"; }

function formatRegNo(val) {
  const digits = val.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return digits.slice(0, 6) + "-" + digits.slice(6);
}

function SaveStatus({ status }) {
  const map = {
    idle: null,
    saving: { text: "저장 중...", bg: "#fef3c7", color: "#92400e" },
    saved: { text: "✅ 저장됨", bg: "#d1fae5", color: "#065f46" },
    error: { text: "❌ 저장 실패", bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{ fontSize: 11, background: s.bg, color: s.color, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
      {s.text}
    </span>
  );
}

function EntryForm({ af, label, onAdd }) {
  const [f, setF] = useState({ brand: "", income: "", otherDeduct: "", note: "" });
  const c = calcEntry(f.income, af, f.otherDeduct);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: "#f8f9ff", border: "1px dashed #c7d2fe", borderRadius: 12, padding: 14, marginTop: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>{label} 추가</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input value={f.brand} onChange={e => set("brand", e.target.value)} placeholder="브랜드명"
          style={{ gridColumn: "1/-1", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }} />
        <input type="number" value={f.income} onChange={e => set("income", e.target.value)} placeholder="업체 입금액 (₩)"
          style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }} />
        <input type="number" value={f.otherDeduct} onChange={e => set("otherDeduct", e.target.value)} placeholder="기타 공제 (₩)"
          style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }} />
        <input value={f.note} onChange={e => set("note", e.target.value)} placeholder="비고"
          style={{ gridColumn: "1/-1", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }} />
      </div>
      {f.income > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "#eef2ff", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          {[["AF 공제", fmt(c.fee), "#475569"], ["3.3% 세금", fmt(c.tax), "#ef4444"], ["최종 입금", fmt(c.final), "#4f46e5"]].map(([lb, val, color]) => (
            <div key={lb} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{lb}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color }}>{val}</div>
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

function EntryTable({ entries, af, onRemove }) {
  if (!entries.length) return <p style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, padding: "16px 0" }}>데이터 없음</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase" }}>
            {["브랜드","업체입금","AF공제","기타공제","세금(3.3%)","최종입금","비고",""].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: h==="브랜드"||h===""?"left":"right", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const c = calcEntry(e.income, af, e.otherDeduct);
            return (
              <tr key={e.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                <td style={{ padding: "7px 8px", fontWeight: 600, color: "#334155" }}>{e.brand || "-"}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#475569" }}>{fmt(c.inc)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>{fmt(c.fee)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>{fmt(c.oth)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#ef4444", fontWeight: 700 }}>{fmt(c.tax)}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", color: "#4f46e5", fontWeight: 800 }}>{fmt(c.final)}</td>
                <td style={{ padding: "7px 8px", color: "#94a3b8" }}>{e.note || "-"}</td>
                <td style={{ padding: "7px 8px" }}>
                  <button onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 13 }}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelDetail({ model, meta, data, addEntry, removeEntry }) {
  const [month, setMonth] = useState("1월");
  const md = data?.[model]?.[month] || { agency: [], self: [] };

  const sum = (entries, af) => entries.reduce((acc, e) => {
    const c = calcEntry(e.income, af, e.otherDeduct);
    return { inc: acc.inc + c.inc, tax: acc.tax + c.tax, final: acc.final + c.final };
  }, { inc: 0, tax: 0, final: 0 });

  const aSum = sum(md.agency, meta.agencyAF);
  const sSum = sum(md.self, meta.modelAF);
  const totalInc = aSum.inc + sSum.inc;
  const totalTax = aSum.tax + sSum.tax;
  const totalFinal = aSum.final + sSum.final;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, color: "#fff", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, flexShrink: 0 }}>
          {meta.nameEn[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{meta.nameKr} <span style={{ fontWeight: 300, opacity: 0.75 }}>({meta.nameEn})</span></div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{meta.fullName} · {meta.nationality}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>{meta.account || "계좌 미등록"}{meta.regNo ? ` · 등록번호: ${meta.regNo}` : ""}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ opacity: 0.6, marginBottom: 2 }}>AF 비율</div>
          <div style={{ fontWeight: 700 }}>에이전시 {meta.agencyAF*100}% / 모델 {meta.modelAF*100}%</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {MONTHS.map(m => {
          const hasData = (data?.[model]?.[m]?.agency?.length + data?.[model]?.[m]?.self?.length) > 0;
          return (
            <button key={m} onClick={() => setMonth(m)} style={{
              padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: month === m ? "#4f46e5" : hasData ? "#eef2ff" : "#f1f5f9",
              color: month === m ? "#fff" : hasData ? "#4f46e5" : "#94a3b8"
            }}>{m}</button>
          );
        })}
      </div>

      {totalFinal > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
          {[["총 입금액", fmt(totalInc), "#334155", "#f8fafc", "#e2e8f0"],
            ["원천징수세 (3.3%)", fmt(totalTax), "#ef4444", "#fff1f2", "#fecdd3"],
            ["모델 최종 입금액", fmt(totalFinal), "#fff", "#4f46e5", "#4f46e5"]].map(([lb, val, tc, bg, border]) => (
            <div key={lb} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: lb.includes("3.3") ? "#ef4444" : lb.includes("최종") ? "rgba(255,255,255,0.7)" : "#94a3b8", marginBottom: 4 }}>{lb}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: tc }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 800, color: "#334155", fontSize: 14 }}>① 에이전시가 잡아온 촬영</span>
          <span style={{ background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>AF {meta.agencyAF*100}%</span>
        </div>
        <EntryTable entries={md.agency} af={meta.agencyAF} onRemove={id => removeEntry(model, month, "agency", id)} />
        <EntryForm af={meta.agencyAF} label="에이전시 촬영" onAdd={e => addEntry(model, month, "agency", e)} />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 800, color: "#334155", fontSize: 14 }}>② 모델이 잡아온 촬영</span>
          <span style={{ background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>AF {meta.modelAF*100}%</span>
        </div>
        <EntryTable entries={md.self} af={meta.modelAF} onRemove={id => removeEntry(model, month, "self", id)} />
        <EntryForm af={meta.modelAF} label="모델 직접 촬영" onAdd={e => addEntry(model, month, "self", e)} />
      </div>
    </div>
  );
}

function TaxSummaryRow({ model, meta, inc, tax, final, monthData, editingRegNo, regNoInput, onStartEdit, onCommitEdit, onRegNoInput }) {
  const [expanded, setExpanded] = useState(false);
  const allEntries = [
    ...monthData.agency.map(e => ({ ...e, type: "agency", af: meta.agencyAF, typeLabel: "① 에이전시" })),
    ...monthData.self.map(e => ({ ...e, type: "self", af: meta.modelAF, typeLabel: "② 모델직접" })),
  ];

  return (
    <>
      <tr style={{ borderBottom: expanded ? "none" : "1px solid #f8fafc", background: expanded ? "#f8f9ff" : "white", opacity: final === 0 ? 0.3 : 1 }}>
        <td style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => allEntries.length > 0 && setExpanded(v => !v)}
              style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #e2e8f0", background: allEntries.length > 0 ? "#f1f5f9" : "#f8fafc", cursor: allEntries.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", color: allEntries.length > 0 ? "#64748b" : "#cbd5e1", fontSize: 10 }}>▼</button>
            <div>
              <div style={{ fontWeight: 800, color: "#1e293b" }}>{meta.nameKr}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{meta.fullName}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 12 }}>{meta.nationality}</td>
        <td style={{ padding: "10px 14px" }}>
          {editingRegNo === model ? (
            <input autoFocus value={regNoInput} onChange={e => onRegNoInput(formatRegNo(e.target.value))} onBlur={() => onCommitEdit(model)} onKeyDown={e => e.key === "Enter" && onCommitEdit(model)} placeholder="000000-0000000" maxLength={14}
              style={{ border: "2px solid #f59e0b", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: 130, outline: "none", fontFamily: "monospace" }} />
          ) : (
            <button onClick={() => onStartEdit(model, meta.regNo)}
              style={{ background: meta.regNo ? "#fef3c7" : "#fde68a", border: "1px dashed #f59e0b", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: meta.regNo ? "#78350f" : "#b45309", fontFamily: "monospace", fontWeight: meta.regNo ? 700 : 400 }}>
              {meta.regNo || "클릭하여 입력 ✏️"}
            </button>
          )}
        </td>
        <td style={{ padding: "10px 14px", textAlign: "right", color: "#475569", fontWeight: 600 }}>{inc > 0 ? fmt(inc) : "-"}</td>
        <td style={{ padding: "10px 14px", textAlign: "right", color: "#ef4444", fontWeight: 800 }}>{tax > 0 ? fmt(tax) : "-"}</td>
        <td style={{ padding: "10px 14px", textAlign: "right", color: "#4f46e5", fontWeight: 900 }}>{final > 0 ? fmt(final) : "-"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: "#f8f9ff", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ padding: "12px 16px 16px 52px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>세부 촬영 내역 ({allEntries.length}건)</div>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>
                    {["구분","브랜드","업체입금","AF공제","기타공제","세금(3.3%)","최종입금","비고"].map((h,i) => (
                      <th key={h} style={{ padding: "5px 8px", textAlign: i < 2 ? "left" : "right", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map(e => {
                    const c = calcEntry(e.income, e.af, e.otherDeduct);
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #eef2ff" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: e.type === "agency" ? "#eef2ff" : "#f5f3ff", color: e.type === "agency" ? "#4f46e5" : "#7c3aed" }}>{e.typeLabel}</span>
                        </td>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "#334155" }}>{e.brand || "-"}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#475569" }}>{fmt(c.inc)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>{fmt(c.fee)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>{fmt(c.oth)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#ef4444", fontWeight: 700 }}>{fmt(c.tax)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#4f46e5", fontWeight: 800 }}>{fmt(c.final)}</td>
                        <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{e.note || "-"}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid #e2e8f0", background: "#eef2ff" }}>
                    <td colSpan={2} style={{ padding: "7px 8px", fontWeight: 800, color: "#4338ca", fontSize: 11 }}>소계</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, color: "#4338ca" }}>{fmt(inc)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>-</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>-</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, color: "#ef4444" }}>{fmt(tax)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 900, color: "#4f46e5" }}>{fmt(final)}</td>
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

function TaxSummary({ data, modelMeta, onUpdateRegNo }) {
  const [month, setMonth] = useState("1월");
  const [editingRegNo, setEditingRegNo] = useState(null);
  const [regNoInput, setRegNoInput] = useState("");

  const rows = Object.keys(modelMeta).map(model => {
    const meta = modelMeta[model];
    const md = data?.[model]?.[month] || { agency: [], self: [] };
    let inc = 0, tax = 0, final = 0;
    [...md.agency.map(e => calcEntry(e.income, meta.agencyAF, e.otherDeduct)),
     ...md.self.map(e => calcEntry(e.income, meta.modelAF, e.otherDeduct))].forEach(c => {
      inc += c.inc; tax += c.tax; final += c.final;
    });
    return { model, meta, inc, tax, final, monthData: md };
  });

  const totInc = rows.reduce((s, r) => s + r.inc, 0);
  const totTax = rows.reduce((s, r) => s + r.tax, 0);
  const totFinal = rows.reduce((s, r) => s + r.final, 0);
  const taxRows = rows.filter(r => r.final > 0);

  const startEdit = (model, current) => { setEditingRegNo(model); setRegNoInput(current || ""); };
  const commitEdit = (model) => { onUpdateRegNo(model, regNoInput); setEditingRegNo(null); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: 0 }}>월별 세무 요약</h2>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
          {MONTHS.map(m => (
            <button key={m} onClick={() => setMonth(m)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: month === m ? "#4f46e5" : "#f1f5f9", color: month === m ? "#fff" : "#64748b" }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["총 업체 입금액", fmt(totInc), "#1e293b", "#f8fafc", "#e2e8f0"],
          ["총 원천징수 (3.3%)", fmt(totTax), "#ef4444", "#fff1f2", "#fecdd3"],
          ["모델 총 입금액", fmt(totFinal), "#fff", "#4f46e5", "#4f46e5"]].map(([lb, val, tc, bg, border]) => (
          <div key={lb} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: bg === "#4f46e5" ? "rgba(255,255,255,0.7)" : lb.includes("3.3") ? "#ef4444" : "#94a3b8", marginBottom: 6 }}>{lb}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: tc }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[["모델","left"],["국적","left"],["외국인등록번호","left"],["입금액","right"],["세금 (3.3%)","right"],["최종 입금","right"]].map(([h, align], i) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: align, fontSize: 11, color: i===4?"#ef4444":i===5?"#4f46e5":"#94a3b8", fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, meta, inc, tax, final, monthData }) => (
              <TaxSummaryRow key={model} model={model} meta={meta} inc={inc} tax={tax} final={final} monthData={monthData}
                editingRegNo={editingRegNo} regNoInput={regNoInput}
                onStartEdit={startEdit} onCommitEdit={commitEdit} onRegNoInput={setRegNoInput} />
            ))}
            <tr style={{ background: "#eef2ff" }}>
              <td colSpan={3} style={{ padding: "10px 14px", fontWeight: 900, color: "#4338ca" }}>합계</td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#4338ca" }}>{fmt(totInc)}</td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#ef4444" }}>{fmt(totTax)}</td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#4338ca" }}>{fmt(totFinal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 900, color: "#92400e", fontSize: 14 }}>세무서 신고용 데이터 — {month}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#b45309" }}>이름 · 국적 · 외국인등록번호 · 입금비용</span>
        </div>
        <p style={{ fontSize: 11, color: "#b45309", marginBottom: 14 }}>✏️ 위 테이블에서 외국인등록번호를 클릭하면 입력할 수 있습니다.</p>
        {taxRows.length === 0 ? (
          <p style={{ textAlign: "center", color: "#d97706", fontSize: 13, padding: "20px 0" }}>이번 달 정산 데이터가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #fde68a" }}>
                  {["이름 (Name)","국적","외국인등록번호","모델 입금 비용","원천징수 세액 (3.3%)"].map((h,i) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: i > 2 ? "right" : "left", color: "#92400e", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxRows.map(({ model, meta, final, tax }) => (
                  <tr key={model} style={{ borderBottom: "1px solid #fef3c7" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>{meta.fullName}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{meta.nationality}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: meta.regNo ? "#78350f" : "#f59e0b", fontWeight: meta.regNo ? 700 : 400 }}>{meta.regNo || "미입력"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmt(final + tax)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: "#ef4444" }}>{fmt(tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 11, color: "#b45309", marginTop: 12 }}>※ 모델 입금 비용 = 3.3% 공제 전 금액 (최종입금 + 세금액)</p>
      </div>
    </div>
  );
}

function Overview({ data, modelMeta }) {
  const rows = Object.keys(modelMeta).map(model => {
    const meta = modelMeta[model];
    let inc = 0, tax = 0, final = 0;
    MONTHS.forEach(m => {
      const md = data?.[model]?.[m] || { agency: [], self: [] };
      [...md.agency.map(e => calcEntry(e.income, meta.agencyAF, e.otherDeduct)),
       ...md.self.map(e => calcEntry(e.income, meta.modelAF, e.otherDeduct))].forEach(c => {
        inc += c.inc; tax += c.tax; final += c.final;
      });
    });
    return { model, meta, inc, tax, final };
  });

  const totInc = rows.reduce((s, r) => s + r.inc, 0);
  const totTax = rows.reduce((s, r) => s + r.tax, 0);
  const totFinal = rows.reduce((s, r) => s + r.final, 0);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", marginBottom: 20 }}>2026 연간 요약</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[["총 업체 입금", fmt(totInc), "#1e293b", "#f8fafc", "#e2e8f0"],
          ["총 납부 세액", fmt(totTax), "#ef4444", "#fff1f2", "#fecdd3"],
          ["모델 총 지급액", fmt(totFinal), "#fff", "#4f46e5", "#4f46e5"]].map(([lb, val, tc, bg, border]) => (
          <div key={lb} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: bg === "#4f46e5" ? "rgba(255,255,255,0.7)" : "#94a3b8", marginBottom: 6 }}>{lb}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: tc }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ model, meta, inc, tax, final }) => (
          <div key={model} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#4f46e5", flexShrink: 0 }}>{meta.nameEn[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#1e293b" }}>{meta.nameKr} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 13 }}>({meta.nameEn})</span></div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{meta.nationality} · AF {meta.agencyAF*100}%/{meta.modelAF*100}%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#4f46e5" }}>{final > 0 ? fmt(final) : "-"}</div>
              {tax > 0 && <div style={{ fontSize: 11, color: "#ef4444" }}>세금 {fmt(tax)}</div>}
            </div>
            {inc === 0 && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#94a3b8", padding: "3px 8px", borderRadius: 20 }}>데이터 없음</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [modelMeta, setModelMeta] = useState(MODEL_META_INIT);
  const [tab, setTab] = useState("overview");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(true);

  // 앱 시작시 Google Sheets에서 데이터 불러오기
  useEffect(() => {
    loadFromSheets().then(saved => {
      if (saved?.data) setData(saved.data);
      if (saved?.modelMeta) setModelMeta(saved.modelMeta);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Google Sheets에 저장
  const syncToSheets = useCallback(async (newData, newMeta) => {
    setSaveStatus("saving");
    try {
      await saveToSheets({ data: newData, modelMeta: newMeta });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, []);

  const addEntry = useCallback((model, month, type, entry) => {
    setData(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      d[model][month][type].push(entry);
      syncToSheets(d, modelMeta);
      return d;
    });
  }, [modelMeta, syncToSheets]);

  const removeEntry = useCallback((model, month, type, id) => {
    setData(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      d[model][month][type] = d[model][month][type].filter(e => e.id !== id);
      syncToSheets(d, modelMeta);
      return d;
    });
  }, [modelMeta, syncToSheets]);

  const updateRegNo = useCallback((model, regNo) => {
    setModelMeta(prev => {
      const m = { ...prev, [model]: { ...prev[model], regNo } };
      syncToSheets(data, m);
      return m;
    });
  }, [data, syncToSheets]);

  const navItems = [
    { id: "overview", label: "연간 요약", icon: "📊" },
    { id: "tax", label: "세무 요약", icon: "📋" },
    ...Object.keys(modelMeta).map(m => ({ id: m, label: modelMeta[m].nameKr, icon: modelMeta[m].nameEn[0] })),
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700, color: "#4f46e5" }}>Google Sheets에서 데이터 불러오는 중...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 13 }}>MA</div>
        <div>
          <div style={{ fontWeight: 900, color: "#1e293b", fontSize: 14, lineHeight: 1.1 }}>Model Agency</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>2026 소속모델 정산관리</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <SaveStatus status={saveStatus} />
          <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>원천징수 3.3%</span>
          <span style={{ fontSize: 11, background: "#eef2ff", color: "#4f46e5", fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>모델 {Object.keys(modelMeta).length}명</span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", display: "flex", gap: 20 }}>
        <aside style={{ width: 160, flexShrink: 0 }}>
          <nav style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 8, position: "sticky", top: 68 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === item.id ? "#4f46e5" : "transparent", color: tab === item.id ? "#fff" : "#64748b",
                fontWeight: 700, fontSize: 13, marginBottom: 2, textAlign: "left"
              }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: tab === item.id ? "rgba(255,255,255,0.2)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          {tab === "overview" && <Overview data={data} modelMeta={modelMeta} />}
          {tab === "tax" && <TaxSummary data={data} modelMeta={modelMeta} onUpdateRegNo={updateRegNo} />}
          {Object.keys(modelMeta).includes(tab) && (
            <ModelDetail model={tab} meta={modelMeta[tab]} data={data} addEntry={addEntry} removeEntry={removeEntry} />
          )}
        </main>
      </div>
    </div>
  );
}