import { useState, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import TaskChecklistTab from "./TaskChecklist";
import AppShell, { Loading, NavItem, NavSection, Avatar } from "./Shell";
import { T, RADIUS, FONT, COLOR, PrimaryButton, SecondaryButton, DangerButton } from "./theme";

// 외국인 모델은 영문 풀네임, 한국인 모델은 한글 이름으로 — 문서/정산서에 표기할 이름
// 퇴사 모델은 삭제하지 않고 목록 맨 아래로 (기존 순서 유지)
function sortedModelKeys(meta) {
  var keys = Object.keys(meta || {});
  return keys.filter(function (k) { return !meta[k].retired; }).concat(keys.filter(function (k) { return meta[k].retired; }));
}
function RetiredBadge() {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#6E6E73", color: "#fff", marginRight: 4, flexShrink: 0 }}>퇴사</span>;
}

function displayName(meta) {
  if (!meta) return "";
  return meta.nationality === "한국" ? meta.nameKr : (meta.fullName || meta.nameKr);
}

const MODEL_META_KEY = "modelAgencyMeta_v3";
const MODEL_DATA_KEY = "modelAgencyData_v3";
const TAX_RATE = 0.033;
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const NOW_MONTH = MONTHS[new Date().getMonth()];
const NOW_MONTH_IDX = new Date().getMonth();
const MAX_HISTORY = 50;

const DEFAULT_MODELS = {
  "폴린": { nameKr:"폴린", nameEn:"Pauline", fullName:"GUILLET PAULINE MANON LEA", nationality:"프랑스", agencyAF:0.3, modelAF:0.3, account:"하나 545-910326-40107", regNo:"" },
  "엘리자": { nameKr:"엘리자", nameEn:"Eliza", fullName:"MANUSHINA ELIZAVETA", nationality:"러시아", agencyAF:0.4, modelAF:0.3, account:"토스 1002-5374-4275", regNo:"" },
  "루미": { nameKr:"루미", nameEn:"Lumi", fullName:"TSANOVA RUMYANA IVANOVA", nationality:"미정", agencyAF:0.4, modelAF:0.3, account:"", regNo:"" },
  "카야": { nameKr:"카야", nameEn:"Kaya", fullName:"KOPTIAEVSKAIA KS-ENIIA", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  "엘리사": { nameKr:"엘리사", nameEn:"Elysa", fullName:"Elysa", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  "로만": { nameKr:"로만", nameEn:"Roman", fullName:"Roman", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  "송일웅": { nameKr:"송일웅", nameEn:"Song Il-woong", fullName:"Song Il-woong", nationality:"한국", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
};

const initData = (meta) => {
  const d = {};
  Object.keys(meta).forEach(m => {
    d[m] = {};
    MONTHS.forEach(mo => { d[m][mo] = { agency: [], self: [] }; });
  });
  return d;
};

function calc(income, af, otherDeduct) {
  const inc = Number(income) || 0;
  const od = Number(otherDeduct) || 0;
  const fee = Math.round(inc * af);
  const after = inc - fee - od;
  const tax = Math.round(after * TAX_RATE);
  return { inc, fee, oth: od, tax, final: after - tax };
}

// 실입금액(actualPaid)이 입력되어 있으면 그 값을, 없으면 자동계산값(final)을 모델순수익으로 사용
function finalAmt(e, af) {
  if (e && e.actualPaid !== undefined && e.actualPaid !== null && e.actualPaid !== "") {
    return Number(e.actualPaid) || 0;
  }
  return calc(e.income, af, e.otherDeduct).final;
}

function monthTotals(modelKey, month, data, meta) {
  var sales = 0, agency = 0, model = 0, tax = 0;
  var md = (data && data[modelKey] && data[modelKey][month]) || { agency: [], self: [] };
  md.agency.forEach(function(e) {
    var c = calc(e.income, meta.agencyAF, e.otherDeduct);
    sales += c.inc; agency += c.fee; model += finalAmt(e, meta.agencyAF); tax += c.tax;
  });
  md.self.forEach(function(e) {
    var c = calc(e.income, meta.modelAF, e.otherDeduct);
    sales += c.inc; agency += c.fee; model += finalAmt(e, meta.modelAF); tax += c.tax;
  });
  return { sales: sales, agency: agency, model: model, tax: tax };
}

function yearTotals(modelKey, data, meta) {
  var sales = 0, agency = 0, model = 0, tax = 0;
  MONTHS.forEach(function(m) {
    var t = monthTotals(modelKey, m, data, meta);
    sales += t.sales; agency += t.agency; model += t.model; tax += t.tax;
  });
  return { sales: sales, agency: agency, model: model, tax: tax };
}

function fmt(n) { return n > 0 ? "\u20a9" + Math.round(n).toLocaleString() : "-"; }
function pct(n) { return Math.round(n * 100) + "%"; }

// 저장된 모델 정보에 영문 풀네임이 닉네임으로만 들어있는 경우 실제 풀네임으로 보정
var FULLNAME_FIX = { "루미": "TSANOVA RUMYANA IVANOVA", "카야": "KOPTIAEVSKAIA KS-ENIIA" };
function fixFullNames(meta) {
  if (!meta) return meta;
  var out = Object.assign({}, meta);
  Object.keys(FULLNAME_FIX).forEach(function (k) {
    if (out[k] && (!out[k].fullName || out[k].fullName === out[k].nameEn)) out[k] = Object.assign({}, out[k], { fullName: FULLNAME_FIX[k] });
  });
  return out;
}

// 2026년 1~6월 = 시스템 도입 전 내역 (지급 완료로 처리)
function isPreSystemMonth(monthLabel) {
  var n = parseInt(monthLabel, 10);
  return !!n && n <= 6;
}

function fmtRegNo(val) {
  var d = val.replace(/\D/g, "").slice(0, 13);
  return d.length <= 6 ? d : d.slice(0, 6) + "-" + d.slice(6);
}

// 실패 시 예외를 던진다 (실패를 "빈 데이터"로 착각해 덮어쓰는 사고 방지)
async function loadSheets() {
  var r = await fetch("/api/sheets");
  if (!r.ok) throw new Error("sheets load " + r.status);
  var j = await r.json();
  return j.data || null;
}


// ── 동시 편집 보호: 저장 시 서버 최신본과 3-way 병합 ─────────────────────────
// base = 마지막으로 서버와 맞춘 상태, local = 이 화면의 상태, remote = 지금 서버 상태.
// 이 화면에서 안 건드린 항목은 서버(촬영관리 연동 등) 값을 따르고, 이 화면에서 바꾼 항목만 덮어쓴다.
function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function mergeEntryArr(b, l, r) {
  var byId = function (arr) { var m = {}; (arr || []).forEach(function (e) { if (e) m[String(e.id)] = e; }); return m; };
  var bm = byId(b), lm = byId(l), rm = byId(r);
  var ids = [];
  (l || []).forEach(function (e) { if (e && ids.indexOf(String(e.id)) === -1) ids.push(String(e.id)); });
  (r || []).forEach(function (e) { if (e && ids.indexOf(String(e.id)) === -1) ids.push(String(e.id)); });
  var out = [];
  ids.forEach(function (id) {
    var inL = id in lm, inR = id in rm, inB = id in bm;
    if (inL && inR) out.push(sameJson(lm[id], bm[id]) ? rm[id] : lm[id]);
    else if (inL) { if (!inB || !sameJson(lm[id], bm[id])) out.push(lm[id]); }
    else if (inR) { if (!inB) out.push(rm[id]); }
  });
  return out;
}
function mergeSettlementData(base, local, remote) {
  base = base || {}; local = local || {}; remote = remote || {};
  var out = {};
  var models = Object.keys(Object.assign({}, local, remote));
  models.forEach(function (model) {
    var bM = base[model] || {}, lM = local[model] || {}, rM = remote[model] || {};
    if (!(model in local) && (model in base)) return; // 이 화면에서 삭제한 모델
    out[model] = {};
    Object.keys(Object.assign({}, lM, rM)).forEach(function (mo) {
      var bb = bM[mo] || {}, ll = lM[mo] || {}, rr = rM[mo] || {};
      out[model][mo] = Object.assign({}, rr, ll, { agency: mergeEntryArr(bb.agency, ll.agency, rr.agency), self: mergeEntryArr(bb.self, ll.self, rr.self) });
    });
  });
  return out;
}

async function saveSheets(p) {
  try {
    var r = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: p })
    });
    return r.ok;
  } catch(e) { return false; }
}

// (T() 테마 함수는 src/theme.js 로 이동 — 정산관리/프로젝트관리 공용)

// ── 월별 에이전시 매출 차트 ───────────────────────────────────────────────────
function AgencyMonthChart({ data, modelMeta, dark }) {
  var t = T(dark);
  var bars = MONTHS.map(function(m, i) {
    var sales = 0, agency = 0, modelPay = 0;
    Object.keys(modelMeta).forEach(function(mk) {
      var tot = monthTotals(mk, m, data, modelMeta[mk]);
      sales += tot.sales; agency += tot.agency; modelPay += tot.model;
    });
    return { month: m, sales: sales, agency: agency, modelPay: modelPay, isNow: i === NOW_MONTH_IDX };
  });
  var maxSales = Math.max.apply(null, bars.map(function(b) { return b.sales; }).concat([1]));
  var yearSales = bars.reduce(function(s,b){ return s+b.sales; }, 0);
  var yearAgency = bars.reduce(function(s,b){ return s+b.agency; }, 0);
  var yearModel = bars.reduce(function(s,b){ return s+b.modelPay; }, 0);

  return (
    <div style={{ background:t.card, borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <h3 style={{ color:t.text, fontWeight:700, fontSize:15, margin:0 }}>에이전시 월별 매출 실적</h3>
          <p style={{ color:t.sub, fontSize: FONT.xs, margin:"3px 0 0" }}>전체 모델 합산 · 3.3% 원천징수 통일 적용</p>
        </div>
        <div style={{ display:"flex", gap:12, fontSize: FONT.xs, color:t.sub }}>
          <span><span style={{ color:"#B5462A" }}>■</span> 총매출</span>
          <span><span style={{ color:"#248A3D" }}>■</span> 에이전시수익</span>
          <span><span style={{ color:"#E8890C" }}>■</span> 모델지급</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:160, paddingBottom:4 }}>
        {bars.map(function(b) {
          var h = b.sales > 0 ? Math.max(Math.round((b.sales/maxSales)*140), 6) : 2;
          var ah = b.sales > 0 ? Math.round((b.agency/b.sales)*h) : 0;
          var mh = b.sales > 0 ? Math.round((b.modelPay/b.sales)*h) : 0;
          return (
            <div key={b.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              {b.sales > 0 && <div style={{ fontSize:9, color:b.isNow?"#B5462A":t.sub, fontWeight:b.isNow?700:500, whiteSpace:"nowrap" }}>{Math.round(b.sales/10000)}만</div>}
              <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:140 }}>
                {b.sales > 0 ? (
                  <div style={{ width:"100%", height:h, borderRadius:"4px 4px 0 0", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-end", border:b.isNow?"2px solid #B5462A":"none" }}>
                    <div style={{ width:"100%", flex:1, background:dark?"#1C1C1E":"#E5E5EA" }} />
                    <div style={{ width:"100%", height:mh, background:"#E8890C" }} />
                    <div style={{ width:"100%", height:ah, background:"#248A3D" }} />
                  </div>
                ) : (
                  <div style={{ width:"100%", height:2, background:t.border, borderRadius:2 }} />
                )}
              </div>
              <div style={{ fontSize:10, color:b.isNow?"#B5462A":t.sub, fontWeight:b.isNow?700:500, whiteSpace:"nowrap" }}>{b.month}</div>
              {b.isNow && <div style={{ width:5, height:5, borderRadius:"50%", background:"#B5462A" }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:14, borderTop:"1px solid "+t.border, paddingTop:12 }}>
        {[["연간 총매출", fmt(yearSales), "#B5462A"], ["에이전시 수익", fmt(yearAgency), "#248A3D"], ["모델 총지급", fmt(yearModel), "#E8890C"]].map(function(item) {
          return (
            <div key={item[0]}>
              <div style={{ fontSize:10, color:t.sub }}>{item[0]}</div>
              <div style={{ fontSize:15, fontWeight:700, color:item[2] }}>{item[1]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 모델 미니 바 ──────────────────────────────────────────────────────────────
function ModelMiniBar({ modelKey, data, meta, dark, onClick }) {
  var t = T(dark);
  var totals = yearTotals(modelKey, data, meta);
  var monthBars = MONTHS.map(function(m) { return monthTotals(modelKey, m, data, meta); });
  var maxM = Math.max.apply(null, monthBars.map(function(b) { return b.sales; }).concat([1]));

  return (
    <div onClick={onClick} style={{ background:t.card, borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"#B5462A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#fff", flexShrink:0 }}>{meta.nameEn[0]}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, color:t.text, fontSize:13 }}>{meta.nameKr}</div>
          <div style={{ fontSize:10, color:t.sub }}>{meta.nationality} · AF {pct(meta.agencyAF)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize: FONT.base, fontWeight:700, color:"#248A3D" }}>{fmt(totals.model)}</div>
          <div style={{ fontSize:10, color:t.sub }}>모델 순수익</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:32, marginBottom:8 }}>
        {monthBars.map(function(b, i) {
          var h = b.sales > 0 ? Math.max(Math.round((b.sales/maxM)*28), 3) : 2;
          var isNow = i === NOW_MONTH_IDX;
          return (
            <div key={i} style={{ flex:1, height:h, borderRadius:"2px 2px 0 0", background:isNow?"#B5462A":b.sales>0?(dark?"#38383A":"#E5E5EA"):"transparent", alignSelf:"flex-end" }} />
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
        {[["총매출", fmt(totals.sales), t.sub], ["에이전시", fmt(totals.agency), "#8944AB"], ["세금", fmt(totals.tax), "#D92D20"]].map(function(item) {
          return (
            <div key={item[0]}>
              <div style={{ fontSize:9, color:t.sub }}>{item[0]}</div>
              <div style={{ fontSize: FONT.xs, fontWeight:700, color:item[2] }}>{item[1]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 연간 요약 ─────────────────────────────────────────────────────────────────
function Overview({ data, modelMeta, dark, setTab }) {
  var t = T(dark);
  return (
    <div>
      <h2 style={{ fontSize: FONT.lg, fontWeight:700, color:t.text, marginBottom:14 }}>2026 연간 요약</h2>
      <AgencyMonthChart data={data} modelMeta={modelMeta} dark={dark} />
      <h3 style={{ fontSize: FONT.base, fontWeight:700, color:t.sub, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>모델별 수익 현황</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
        {sortedModelKeys(modelMeta).map(function(m) {
          return <ModelMiniBar key={m} modelKey={m} data={data} meta={modelMeta[m]} dark={dark} onClick={function(){ setTab(m); }} />;
        })}
      </div>
    </div>
  );
}

// ── 입력 폼 ───────────────────────────────────────────────────────────────────
function EntryForm({ af, label, onAdd, dark }) {
  var t = T(dark);
  var [f, setF] = useState({ brand:"", income:"", otherDeduct:"", note:"" });
  var [open, setOpen] = useState(false);
  var c = calc(f.income, af, f.otherDeduct);
  var set = function(k, v) { setF(function(p) { return Object.assign({}, p, { [k]: v }); }); };

  if (!open) {
    return (
      <button onClick={function(){ setOpen(true); }} style={{ width:"100%", marginTop:10, padding:"9px 0", borderRadius:8, border:"1px dashed "+(dark?"#B5462A":"#F0CFC4"), background:"transparent", color: COLOR.primary, fontWeight:600, fontSize: FONT.base, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
        <span style={{ fontSize:16 }}>+</span>{label} 추가
      </button>
    );
  }

  return (
    <div style={{ background:dark?"#2C2C2E":"#FAFAFC", border:"1px solid "+(dark?"#B5462A":"#F0CFC4"), borderRadius:12, padding:14, marginTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize: FONT.sm, fontWeight:700, color:"#B5462A" }}>{label} 입력</span>
        <button onClick={function(){ setOpen(false); }} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:18 }}>x</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
        <input value={f.brand} onChange={function(e){ set("brand", e.target.value); }} placeholder="브랜드명"
          style={{ border:"1px solid "+t.ib, borderRadius:8, padding:"9px 12px", fontSize: FONT.base, outline:"none", background:t.input, color:t.text }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:600, color:t.sub, display:"block", marginBottom:3 }}>업체 입금액</label>
            <input type="number" value={f.income} onChange={function(e){ set("income", e.target.value); }} placeholder="0"
              style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:8, padding:"9px 12px", fontSize: FONT.md, outline:"none", background:t.input, color:t.text, fontWeight:600, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:600, color:t.sub, display:"block", marginBottom:3 }}>기타 공제</label>
            <input type="number" value={f.otherDeduct} onChange={function(e){ set("otherDeduct", e.target.value); }} placeholder="0"
              style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:8, padding:"9px 12px", fontSize: FONT.md, outline:"none", background:t.input, color:t.text, fontWeight:600, boxSizing:"border-box" }} />
          </div>
        </div>
        <input value={f.note} onChange={function(e){ set("note", e.target.value); }} placeholder="비고 (선택)"
          style={{ border:"1px solid "+t.ib, borderRadius:8, padding:"9px 12px", fontSize: FONT.base, outline:"none", background:t.input, color:t.text }} />
      </div>
      {Number(f.income) > 0 && (
        <div style={{ background:dark?"#1C1C1E":"#FBEDE8", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:600, color: COLOR.primary, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>정산 미리보기</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
            {[["총 매출", fmt(c.inc), t.sub], ["AF "+pct(af), "-"+fmt(c.fee), "#8944AB"], ["세금 3.3%", "-"+fmt(c.tax), "#D92D20"], ["모델 순수익", fmt(c.final), "#248A3D"]].map(function(item) {
              return (
                <div key={item[0]} style={{ background:dark?"#2C2C2E":"#fff", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:t.sub, marginBottom:2 }}>{item[0]}</div>
                  <div style={{ fontSize: FONT.sm, fontWeight:700, color:item[2] }}>{item[1]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", gap:1 }}>
            <div style={{ flex:c.fee, background:"#8944AB" }} />
            <div style={{ flex:c.tax, background:"#D92D20" }} />
            <div style={{ flex:c.final, background:"#248A3D" }} />
          </div>
        </div>
      )}
      <button onClick={function(){
        if (!f.income) return;
        onAdd({ brand:f.brand, income:f.income, otherDeduct:f.otherDeduct, note:f.note, paid:false, id:Date.now() });
        setF({ brand:"", income:"", otherDeduct:"", note:"" });
        setOpen(false);
      }} style={{ width:"100%", background: COLOR.primary, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", fontWeight:600, fontSize: FONT.base, cursor:"pointer" }}>
        저장
      </button>
    </div>
  );
}

// ── 입력 테이블 ───────────────────────────────────────────────────────────────
function EntryTable({ entries, af, onRemove, onUpdate, dark, monthLabel }) {
  // 1~6월은 시스템 도입 전 과거 내역 → 모두 입금완료로 간주
  var pastClosed = isPreSystemMonth(monthLabel);
  var t = T(dark);
  var [editId, setEditId] = useState(null);
  var [ef, setEf] = useState(null);

  if (!entries.length) {
    return (
      <div style={{ textAlign:"center", padding:"20px 0", color:t.sub }}>
        <div style={{ fontSize:24, marginBottom:6 }}>📭</div>
        <div style={{ fontSize:12 }}>촬영 내역 없음</div>
      </div>
    );
  }

  var startEdit = function(e) {
    setEditId(e.id);
    setEf({ brand:e.brand||"", income:e.income||"", otherDeduct:e.otherDeduct||"", note:e.note||"", actualPaid: e.actualPaid!==undefined && e.actualPaid!==null ? e.actualPaid : "" });
  };
  var setV = function(k, v) { setEf(function(p){ return Object.assign({}, p, { [k]: v }); }); };
  var commit = function(id) {
    if (onUpdate) onUpdate(id, { brand: ef.brand, income: ef.income, otherDeduct: ef.otherDeduct, note: ef.note, actualPaid: ef.actualPaid });
    setEditId(null); setEf(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {entries.map(function(e) {
        var c = calc(e.income, af, e.otherDeduct);
        var editing = editId === e.id;

        if (editing) {
          var pc = calc(ef.income, af, ef.otherDeduct);
          return (
            <div key={e.id} style={{ background:dark?"#2C2C2E":"#FAFAFC", border:"2px solid #B5462A", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:8 }}>
                <input value={ef.brand} onChange={function(ev){ setV("brand", ev.target.value); }} placeholder="브랜드명"
                  style={{ border:"1px solid "+t.ib, borderRadius:7, padding:"7px 10px", fontSize: FONT.sm, outline:"none", background:t.input, color:t.text }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div>
                    <label style={{ fontSize:9, fontWeight:600, color:t.sub }}>업체 입금액</label>
                    <input type="number" value={ef.income} onChange={function(ev){ setV("income", ev.target.value); }}
                      style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:7, padding:"7px 10px", fontSize: FONT.sm, outline:"none", background:t.input, color:t.text, boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize:9, fontWeight:600, color:t.sub }}>기타 공제</label>
                    <input type="number" value={ef.otherDeduct} onChange={function(ev){ setV("otherDeduct", ev.target.value); }}
                      style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:7, padding:"7px 10px", fontSize: FONT.sm, outline:"none", background:t.input, color:t.text, boxSizing:"border-box" }} />
                  </div>
                </div>
                <input value={ef.note} onChange={function(ev){ setV("note", ev.target.value); }} placeholder="비고 (선택)"
                  style={{ border:"1px solid "+t.ib, borderRadius:7, padding:"7px 10px", fontSize: FONT.sm, outline:"none", background:t.input, color:t.text }} />
                <div>
                  <label style={{ fontSize:9, fontWeight:600, color:"#248A3D" }}>모델 실입금액 (직접 입력, 비우면 자동계산값 사용)</label>
                  <input type="number" value={ef.actualPaid} onChange={function(ev){ setV("actualPaid", ev.target.value); }} placeholder={String(pc.final)}
                    style={{ width:"100%", border:"1px solid #248A3D", borderRadius:7, padding:"7px 10px", fontSize: FONT.sm, outline:"none", background:t.input, color:t.text, fontWeight:700, boxSizing:"border-box" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <PrimaryButton onClick={function(){ commit(e.id); }} style={{ flex:1 }} small>저장</PrimaryButton>
                <SecondaryButton onClick={function(){ setEditId(null); setEf(null); }} style={{ flex:1 }} dark={dark} small>취소</SecondaryButton>
              </div>
            </div>
          );
        }

        var displayFinal = finalAmt(e, af);
        var hasOverride = e.actualPaid !== undefined && e.actualPaid !== null && e.actualPaid !== "";
        var isPaid = !!e.paid || pastClosed;
        return (
          <div key={e.id} style={{ background: isPaid ? (dark?"#14281B":"#F0F8F2") : (dark?"#2C2C2E":"#F7F7FA"), border: "1.5px solid " + (isPaid ? "#248A3D" : t.border), borderRadius:10, padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background: isPaid ? "#248A3D" : COLOR.primary, flexShrink:0 }} />
                <span style={{ fontWeight:700, color:t.text, fontSize:13 }}>{e.brand || "브랜드 미입력"}</span>
                {e.portal && <span title="모델이 입력 링크로 직접 입력한 건" style={{ fontSize: FONT.xs, color:"#9A5B00", background:dark?"#33270F":"#FFF4DC", padding:"1px 7px", borderRadius:10, fontWeight:700 }}>📱 모델입력</span>}
                {e.settleDate && <span style={{ fontSize: FONT.xs, color: COLOR.primary, background:dark?"#3A1F17":"#FBEDE8", padding:"1px 7px", borderRadius:10, fontWeight:600 }}>📅 {e.settleDate}</span>}
                {e.note && <span style={{ fontSize: FONT.xs, color:t.sub, background:dark?"#1C1C1E":"#E5E5EA", padding:"1px 7px", borderRadius:10 }}>📝 {e.note}</span>}
                {e.payerName && <span title="입금자명" style={{ fontSize: FONT.xs, color:t.text, background:dark?"#1C1C1E":"#E5E5EA", padding:"1px 7px", borderRadius:10 }}>💳 입금자 {e.payerName}</span>}
                {e.expectedPayDate && <span title="예상 입금일" style={{ fontSize: FONT.xs, color:"#9A5B00", background:dark?"#33270F":"#FFF4DC", padding:"1px 7px", borderRadius:10, fontWeight:600 }}>⏰ 입금예정 {e.expectedPayDate}</span>}
                {e.clientContact && <span title="담당자 연락처 / 이메일" style={{ fontSize: FONT.xs, color:t.sub, background:dark?"#1C1C1E":"#E5E5EA", padding:"1px 7px", borderRadius:10 }}>☎ {e.clientContact}</span>}
              </div>
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                <button onClick={function(){ onUpdate(e.id, { paid: !isPaid }); }} style={{ background: isPaid ? "#248A3D" : "transparent", border:"1px solid " + (isPaid ? "#248A3D" : t.border), color: isPaid ? "#fff" : t.sub, cursor:"pointer", fontSize: FONT.xs, padding:"4px 10px", fontWeight:700, borderRadius:7 }}>{isPaid ? "✓ 입금완료" : "입금대기"}</button>
                <button onClick={function(){ startEdit(e); }} style={{ background:"none", border:"none", color:dark?"#E08A6E": COLOR.primary, cursor:"pointer", fontSize: FONT.sm, padding:"2px 6px", fontWeight:600 }}>수정</button>
                <button onClick={function(){ onRemove(e.id); }} style={{ background:"none", border:"none", color:dark?"#48484A":"#D1D1D6", cursor:"pointer", fontSize: FONT.md, padding:"2px 6px" }}>x</button>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
              {[
                { label:"업체입금", value:fmt(c.inc), color:dark?"#98989D":"#48484A", bg:dark?"#1C1C1E":"#fff" },
                { label:"AF("+pct(af)+")", value:"-"+fmt(c.fee), color: COLOR.purple, bg:dark?"#2A1E33":"#F4EEFA" },
                { label:"세금(3.3%)", value:"-"+fmt(c.tax), color: COLOR.danger, bg:dark?"#2D1513":"#FEF3F2" },
                { label:"모델입금액"+(hasOverride?"":""), value:fmt(displayFinal), color: COLOR.success, bg:dark?"#14281B":"#F0F8F2" },
              ].map(function(item, i) {
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    {i > 0 && <span style={{ color:t.sub, fontSize:12 }}>→</span>}
                    <div style={{ background:item.bg, border:"1px solid "+t.border, borderRadius:8, padding:"4px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:9, color:t.sub, marginBottom:1 }}>{item.label}{hasOverride && i===3 ? " ✎" : ""}</div>
                      <div style={{ fontSize: FONT.sm, fontWeight:700, color:item.color }}>{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 정산서 ────────────────────────────────────────────────────────────────────
function SettlementReport({ model, meta, data, month, dark }) {
  var t = T(dark);
  var reportRef = useRef(null);
  var md = (data && data[model] && data[model][month]) || { agency: [], self: [] };
  var totals = monthTotals(model, month, data, meta);
  var allEntries = md.agency.map(function(e){ return Object.assign({}, e, { type:"에이전시", af:meta.agencyAF }); })
    .concat(md.self.map(function(e){ return Object.assign({}, e, { type:"모델직접", af:meta.modelAF }); }));

  var [downloading, setDownloading] = useState(false);
  var handleDownload = function() {
    var el = reportRef.current;
    if (!el) return;
    setDownloading(true);
    html2canvas(el, {
      scale: 2,
      backgroundColor: dark ? "#1C1C1E" : "#ffffff",
      useCORS: true,
    }).then(function (canvas) {
      var dataUrl = canvas.toDataURL("image/png");
      var a = document.createElement("a");
      a.download = meta.nameKr + "_" + month + "_정산서.png";
      a.href = dataUrl;
      a.click();
      setDownloading(false);
    }).catch(function (err) {
      setDownloading(false);
      alert("이미지 생성에 실패했습니다. 다시 시도해주세요.");
    });
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <h3 style={{ color:t.text, fontWeight:700, fontSize:15, margin:0 }}>{meta.nameKr} · {month} 정산서</h3>
        <button onClick={handleDownload} disabled={downloading} style={{ background: COLOR.primary, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:600, fontSize: FONT.sm, cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.7 : 1 }}>
          {downloading ? "이미지 생성 중..." : "📥 다운로드 (PNG)"}
        </button>
      </div>
      <div ref={reportRef} style={{ background:dark?"#1C1C1E":"#fff", borderRadius:14, padding:20, border:"1px solid "+t.border }}>
        <div style={{ background:"#B5462A", borderRadius:12, padding:"16px 20px", marginBottom:16, color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700 }}>{meta.nameKr} ({meta.nameEn})</div>
              <div style={{ fontSize: FONT.sm, opacity:0.8, marginTop:2 }}>{meta.fullName} · {meta.nationality}</div>
              <div style={{ fontSize: FONT.xs, opacity:0.65, marginTop:1 }}>{meta.account || "계좌 미등록"}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:700 }}>{month} 정산서</div>
              <div style={{ fontSize: FONT.xs, opacity:0.7, marginTop:2 }}>원천징수 3.3% 적용</div>
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:16 }}>
          {[["총 매출액", fmt(totals.sales), dark?"#E5E5EA":"#38383A"], ["에이전시 수익", fmt(totals.agency), "#8944AB"], ["원천징수 (3.3%)", fmt(totals.tax), "#D92D20"], ["모델 최종 입금액", fmt(totals.model), "#248A3D"]].map(function(item) {
            return (
              <div key={item[0]} style={{ background:dark?"#2C2C2E":"#F7F7FA", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:item[2], opacity:0.75, marginBottom:3 }}>{item[0]}</div>
                <div style={{ fontSize: FONT.lg, fontWeight:700, color:item[2] }}>{item[1]}</div>
              </div>
            );
          })}
        </div>
        {allEntries.length > 0 && (
          <div>
            <div style={{ fontSize: FONT.xs, fontWeight:600, color:t.sub, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>촬영 내역 ({allEntries.length}건)</div>
            <div style={{ border:"1px solid "+t.border, borderRadius:10, overflow:"hidden" }}>
              <table style={{ width:"100%", fontSize: FONT.sm, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:t.thead }}>
                    {["구분","브랜드","업체입금","AF공제","세금(3.3%)","모델순수익"].map(function(h, i) {
                      return <th key={h} style={{ padding:"8px 10px", textAlign:i>1?"right":"left", fontSize:10, color:t.sub, fontWeight:600, borderBottom:"1px solid "+t.border, whiteSpace:"nowrap" }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map(function(e) {
                    var c = calc(e.income, e.af, e.otherDeduct);
                    return (
                      <tr key={e.id} style={{ borderBottom:"1px solid "+t.border }}>
                        <td style={{ padding:"8px 10px" }}>
                          <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:8, background:e.type==="에이전시"?(dark?"#3A1F17":"#FBEDE8"):(dark?"#2A1E33":"#F4EEFA"), color:e.type==="에이전시"?"#B5462A":"#8944AB" }}>{e.type}</span>
                        </td>
                        <td style={{ padding:"8px 10px", fontWeight:600, color:t.text }}>{e.brand || "-"}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:t.sub }}>{fmt(c.inc)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color: COLOR.purple, fontWeight:600 }}>{fmt(c.fee)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color: COLOR.danger, fontWeight:600 }}>{fmt(c.tax)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color: COLOR.success, fontWeight:700 }}>{fmt(finalAmt(e, e.af))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background:dark?"#1C1C1E":"#FBEDE8", fontWeight:700 }}>
                    <td colSpan={2} style={{ padding:"8px 10px", color:"#8E3520", fontSize:12 }}>합계</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:t.sub }}>{fmt(totals.sales)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#8944AB" }}>{fmt(totals.agency)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#D92D20" }}>{fmt(totals.tax)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#248A3D" }}>{fmt(totals.model)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid "+t.border, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize: FONT.xs, color:t.sub }}>외국인등록번호: <span style={{ fontFamily:"monospace", fontWeight:600, color:meta.regNo?"#E8890C":t.sub }}>{meta.regNo || "미입력"}</span></div>
          <div style={{ fontSize:10, color:t.sub }}>MoMo Agency · {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}

// ── 모델 상세 ─────────────────────────────────────────────────────────────────
// ── 촬영 캘린더 (촬영 정산내역 시스템의 예약 데이터를 읽기 전용으로 표시) ──
var WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];
var CAL_NOW = new Date();
var CAL_YEARS = [CAL_NOW.getFullYear() - 1, CAL_NOW.getFullYear(), CAL_NOW.getFullYear() + 1, CAL_NOW.getFullYear() + 2];

function CalMonthStrip({ year, month, setYear, setMonth, t, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select value={year} onChange={function (e) { setYear(Number(e.target.value)); }} style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: FONT.base, fontWeight: 600, flexShrink: 0 }}>
        {CAL_YEARS.map(function (y) { return <option key={y} value={y}>{y}년</option>; })}
      </select>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {MONTHS.map(function (label, i) {
          var m = i + 1;
          var active = m === month;
          return (
            <button key={m} onClick={function () { setMonth(m); }} style={{ padding: "6px 11px", borderRadius: 8, border: active ? "none" : "1px solid " + t.border, background: active ? "#B5462A" : (dark ? t.card2 : t.card), color: active ? "#fff" : t.text, fontWeight: 600, fontSize: FONT.sm, cursor: "pointer" }}>{label}</button>
          );
        })}
      </div>
    </div>
  );
}

function pad2(n) { return n < 10 ? ("0" + n) : ("" + n); }

function buildCalendarGrid(year, month) {
  var firstDay = new Date(year, month - 1, 1);
  var startWeekday = firstDay.getDay();
  var daysInMonth = new Date(year, month, 0).getDate();
  var cells = [];
  for (var i = 0; i < startWeekday; i++) cells.push(null);
  for (var d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

async function fetchBookedProjects() {
  try {
    var r = await fetch("/api/project-sheets");
    var j = await r.json();
    var saved = j && j.data;
    if (!saved) return [];
    if (Array.isArray(saved.projects)) return saved.projects;
    if (saved.projects && typeof saved.projects === "object") {
      var flat = [];
      Object.keys(saved.projects).forEach(function (k) { (saved.projects[k] || []).forEach(function (p) { flat.push(p); }); });
      return flat;
    }
    return [];
  } catch (e) { return []; }
}

// 촬영 프로젝트 관리 시스템의 촬영건 + 지급정보(주민번호/공제방식)를 함께 읽어옴
async function fetchProjectBundle() {
  try {
    var r = await fetch("/api/project-sheets");
    var j = await r.json();
    var saved = j && j.data;
    if (!saved) return { projects: [], paymentInfo: {} };
    var projects = [];
    if (Array.isArray(saved.projects)) projects = saved.projects;
    else if (saved.projects && typeof saved.projects === "object") {
      Object.keys(saved.projects).forEach(function (k) { (saved.projects[k] || []).forEach(function (p) { projects.push(p); }); });
    }
    var pi = {};
    var raw = saved.paymentInfo || {};
    var nested = Object.keys(raw).some(function (k) { return /^\d{4}-\d{2}$/.test(k); });
    if (nested) Object.keys(raw).forEach(function (mk) { Object.keys(raw[mk] || {}).forEach(function (pid) { pi[pid] = raw[mk][pid]; }); });
    else pi = raw;
    return { projects: projects, paymentInfo: pi };
  } catch (e) { return { projects: [], paymentInfo: {} }; }
}

// 손Pay 기준 공제 계산 (촬영관리 시스템 calcPayment와 동일 규칙)
function payCalc(handPay, taxType) {
  var hp = Number(handPay) || 0;
  if (taxType === "vat10") return { gross: hp, tax: 0, net: hp + Math.round(hp * 0.1) };
  if (taxType === "none") return { gross: hp, tax: 0, net: hp };
  var d = Math.round(hp * 0.033);
  return { gross: hp, tax: d, net: hp - d };
}

async function fetchCalendarEvents() {
  var r = await fetch("/api/calendar-sheets");
  if (!r.ok) throw new Error("calendar load " + r.status);
  var j = await r.json();
  var events = j && j.data && j.data.events;
  return Array.isArray(events) ? events : [];
}

// 일정 저장은 항상 "서버 최신본을 읽고 → 이번 변경만 적용 → 저장" (다른 화면에서 추가한 일정이 지워지지 않도록)
async function mutateCalendarEvents(fn) {
  var latest = await fetchCalendarEvents();
  var next = fn(latest);
  var w = await fetch("/api/calendar-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { events: next } }),
  });
  if (!w.ok) throw new Error("calendar save " + w.status);
  return next;
}

function SettlementSidePanel({ dark, modelMeta, data, addEntry, updateEntry, removeEntry, defaultModel, defaultDate, defaultBrand }) {
  var t = T(dark);
  var modelKeys = Object.keys(modelMeta || {});
  var selModelState = useState(defaultModel || modelKeys[0] || "");
  var selModel = selModelState[0], setSelModel = selModelState[1];
  var entryTypeState = useState("self");
  var entryType = entryTypeState[0], setEntryType = entryTypeState[1];
  var todayStr = CAL_NOW.getFullYear() + "-" + pad2(CAL_NOW.getMonth() + 1) + "-" + pad2(CAL_NOW.getDate());
  var settleDateState = useState(defaultDate || todayStr);
  var settleDate = settleDateState[0], setSettleDate = settleDateState[1];

  var inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: FONT.base, boxSizing: "border-box" };
  var labelStyle = { fontSize: FONT.xs, fontWeight: 600, color: t.sub, marginBottom: 4, display: "block" };

  var monthKey = settleDate ? MONTHS[Number(settleDate.slice(5, 7)) - 1] : NOW_MONTH;
  var meta = selModel ? modelMeta[selModel] : null;
  var md = selModel && data && data[selModel] && data[selModel][monthKey] ? data[selModel][monthKey] : { agency: [], self: [] };

  return (
    <div>
      <div style={{ fontSize: FONT.base, fontWeight: 700, color: t.text, marginBottom: 10 }}>정산내역 입력 · {monthKey}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>모델</label>
          <select value={selModel} onChange={function (e) { setSelModel(e.target.value); }} style={inputStyle}>
            {sortedModelKeys(modelMeta).map(function (k) { return <option key={k} value={k}>{(modelMeta[k].retired ? "[퇴사] " : "") + modelMeta[k].nameKr}</option>; })}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>구분</label>
          <select value={entryType} onChange={function (e) { setEntryType(e.target.value); }} style={inputStyle}>
            <option value="agency">에이전시 촬영</option>
            <option value="self">모델 직접 촬영</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>정산받는 날짜 (이 날짜가 속한 월의 정산내역으로 등록됩니다)</label>
        <input type="date" value={settleDate} onChange={function (e) { setSettleDate(e.target.value); }} style={inputStyle} />
      </div>
      {meta && (
        <>
          <EntryForm af={entryType === "agency" ? meta.agencyAF : meta.modelAF} label={entryType === "agency" ? "에이전시 촬영" : "모델 직접 촬영"}
            onAdd={function (e) { addEntry(selModel, monthKey, entryType, Object.assign({}, e, { brand: e.brand || defaultBrand, paid: false, settleDate: settleDate })); }} dark={dark} />
          <div style={{ marginTop: 10 }}>
            <EntryTable monthLabel={monthKey} entries={md[entryType]} af={entryType === "agency" ? meta.agencyAF : meta.modelAF}
              onRemove={function (id) { removeEntry(selModel, monthKey, entryType, id); }}
              onUpdate={function (id, patch) { updateEntry(selModel, monthKey, entryType, id, patch); }} dark={dark} />
          </div>
        </>
      )}
      {!meta && <div style={{ fontSize: FONT.sm, color: t.sub, padding: "16px 0" }}>등록된 모델이 없습니다. 먼저 모델을 등록해주세요.</div>}
    </div>
  );
}

function ScheduleEventModal({ dark, initial, onSave, onDelete, onClose, modelMeta, data, addEntry, updateEntry, removeEntry }) {
  var t = T(dark);
  var dateState = useState(initial.date || "");
  var date = dateState[0], setDate = dateState[1];
  var timeState = useState(initial.time || "");
  var time = timeState[0], setTime = timeState[1];
  var titleState = useState(initial.title || "");
  var title = titleState[0], setTitle = titleState[1];
  var memoState = useState(initial.memo || "");
  var memo = memoState[0], setMemo = memoState[1];

  var modelKeys = Object.keys(modelMeta || {});
  var guessModel = modelKeys.filter(function (k) { return title.indexOf(modelMeta[k].nameKr) === 0; })[0] || modelKeys[0] || "";

  var inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: FONT.base, boxSizing: "border-box" };
  var labelStyle = { fontSize: FONT.xs, fontWeight: 600, color: t.sub, marginBottom: 4, display: "block" };

  var hasSettlement = !!(modelMeta && addEntry && updateEntry && removeEntry);

  return (
    <div className="ui-scrim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: t.card, borderRadius: RADIUS.lg, padding: 22, width: "100%", maxWidth: hasSettlement ? 920 : 420, maxHeight: "88vh", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 14 }}>{initial.id ? "일정 수정" : "일정 추가"}</div>
        <div style={{ display: hasSettlement ? "grid" : "block", gridTemplateColumns: hasSettlement ? "340px 1fr" : "none", gap: 20 }}>
          <div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>날짜</label>
              <input type="date" value={date} onChange={function (e) { setDate(e.target.value); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>시간 (선택)</label>
              <input type="text" placeholder="예: 14:00~17:00" value={time} onChange={function (e) { setTime(e.target.value); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>제목</label>
              <input type="text" placeholder="예: 하이퍼로그 촬영" value={title} onChange={function (e) { setTitle(e.target.value); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>메모 (선택)</label>
              <textarea value={memo} onChange={function (e) { setMemo(e.target.value); }} rows={6} style={Object.assign({}, inputStyle, { resize: "vertical" })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {initial.id && <DangerButton onClick={function () { onDelete(initial.id); }} outline>삭제</DangerButton>}
              <SecondaryButton onClick={onClose} style={{ flex: 1 }} dark={dark}>취소</SecondaryButton>
              <PrimaryButton
                onClick={function () {
                  if (!date || !title) return;
                  onSave({ id: initial.id || ("ev_" + Date.now()), date: date, time: time, title: title, memo: memo });
                }}
                style={{ flex: 1 }}
              >저장</PrimaryButton>
            </div>
          </div>

          {hasSettlement && (
            <div style={{ borderLeft: "1px solid " + t.border, paddingLeft: 20 }}>
              <SettlementSidePanel dark={dark} modelMeta={modelMeta} data={data} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} defaultModel={guessModel} defaultDate={date} defaultBrand={title} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseScheduleText(text) {
  var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  var fields = {};
  var order = [];
  lines.forEach(function (line) {
    var m = line.match(/^([^:：]{1,20})[:：]\s*(.*)$/);
    if (m) {
      var key = m[1].trim();
      var val = m[2].trim();
      fields[key] = val;
      order.push(key);
    }
  });

  var titleKey = ["업체명", "브랜드", "회사명", "클라이언트"].filter(function (k) { return fields[k]; })[0];
  var title = titleKey ? fields[titleKey] : "";

  var dateKey = ["촬영날짜/시간", "촬영일시", "촬영날짜", "일정"].filter(function (k) { return fields[k]; })[0];
  var dateText = dateKey ? fields[dateKey] : "";

  var guessedDate = "";
  var dm = (dateText || text).match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (dm) {
    var mo = Number(dm[1]), da = Number(dm[2]);
    var yr = CAL_NOW.getFullYear();
    guessedDate = yr + "-" + pad2(mo) + "-" + pad2(da);
  }

  var memoLines = order.map(function (k) { return k + ": " + fields[k]; });

  return { title: title, date: guessedDate, time: dateText, memo: memoLines.join("\n"), fieldsFound: order.length };
}

function PasteImportModal({ dark, onImport, onClose }) {
  var t = T(dark);
  var rawState = useState("");
  var raw = rawState[0], setRaw = rawState[1];
  var parsedState = useState(null);
  var parsed = parsedState[0], setParsed = parsedState[1];

  var inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: FONT.base, boxSizing: "border-box" };
  var labelStyle = { fontSize: FONT.xs, fontWeight: 600, color: t.sub, marginBottom: 4, display: "block" };

  var handleAnalyze = function () {
    if (!raw.trim()) return;
    setParsed(parseScheduleText(raw));
  };

  return (
    <div className="ui-scrim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: t.card, borderRadius: RADIUS.lg, padding: 22, width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 4 }}>붙여넣기로 일정 등록</div>
        <div style={{ fontSize: FONT.xs, color: t.sub, marginBottom: 12 }}>섭외 요청 텍스트를 그대로 붙여넣으면 자동으로 항목을 인식합니다.</div>

        {!parsed && (
          <>
            <textarea value={raw} onChange={function (e) { setRaw(e.target.value); }} rows={10} placeholder={"업체명: ...\n촬영날짜/시간: ...\n사용매체/기간: ...\n섭외료(vat 별도): ...\n예상 지급일: ...\n입금자명: ...\n담당자 이름/연락처: ..."} style={Object.assign({}, inputStyle, { resize: "vertical", fontFamily: "inherit", marginBottom: 14 })} />
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={onClose} style={{ flex: 1 }} dark={dark}>취소</SecondaryButton>
              <PrimaryButton onClick={handleAnalyze} style={{ flex: 1 }}>분석하기</PrimaryButton>
            </div>
          </>
        )}

        {parsed && (
          <>
            <div style={{ fontSize: FONT.xs, color: parsed.fieldsFound > 0 ? "#248A3D" : COLOR.danger, fontWeight: 600, marginBottom: 10 }}>
              {parsed.fieldsFound > 0 ? parsed.fieldsFound + "개 항목을 인식했습니다. 날짜는 직접 확인해주세요." : "항목을 인식하지 못했습니다. 아래 내용을 직접 입력해주세요."}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>날짜 (자동 인식 — 꼭 확인하세요)</label>
              <input type="date" value={parsed.date} onChange={function (e) { setParsed(Object.assign({}, parsed, { date: e.target.value })); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>제목</label>
              <input type="text" value={parsed.title} onChange={function (e) { setParsed(Object.assign({}, parsed, { title: e.target.value })); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>시간/일정 메모</label>
              <input type="text" value={parsed.time} onChange={function (e) { setParsed(Object.assign({}, parsed, { time: e.target.value })); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>상세 메모 (전체 항목)</label>
              <textarea value={parsed.memo} onChange={function (e) { setParsed(Object.assign({}, parsed, { memo: e.target.value })); }} rows={7} style={Object.assign({}, inputStyle, { resize: "vertical" })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={function () { setParsed(null); }} dark={dark}>다시 붙여넣기</SecondaryButton>
              <SecondaryButton onClick={onClose} style={{ flex: 1 }} dark={dark}>취소</SecondaryButton>
              <PrimaryButton
                onClick={function () {
                  if (!parsed.date || !parsed.title) return;
                  onImport({ id: "ev_" + Date.now(), date: parsed.date, time: parsed.time, title: parsed.title, memo: parsed.memo });
                }}
                style={{ flex: 1 }}
              >캘린더에 등록</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function calcModelLite(m) {
  var agencyPrice = Number(m.agencyPrice) || 0;
  var handPay = Number(m.handPay) || 0;
  var opCost = Number(m.opCost) || 0;
  var rate = (Number(m.partnerRate) || 0) / 100;
  var grossMargin = agencyPrice - handPay;
  var partnerFee = Math.round(grossMargin * rate);
  var net = grossMargin - partnerFee - opCost;
  return { agencyPrice: agencyPrice, handPay: handPay, opCost: opCost, partnerFee: partnerFee, net: net };
}

function BookingDetailModal({ project, dark, onClose, modelMeta, data, addEntry, updateEntry, removeEntry }) {
  var t = T(dark);
  var modelKeys = Object.keys(modelMeta || {});
  var projModelNames = (project.models || []).map(function (m) { return m.name; });
  var guessModel = modelKeys.filter(function (k) { return projModelNames.indexOf(modelMeta[k].nameKr) !== -1; })[0] || modelKeys[0] || "";
  var hasSettlement = !!(modelMeta && addEntry && updateEntry && removeEntry);

  return (
    <div className="ui-scrim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: t.card, borderRadius: RADIUS.lg, padding: 22, width: "100%", maxWidth: hasSettlement ? 920 : 480, maxHeight: "88vh", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ display: hasSettlement ? "grid" : "block", gridTemplateColumns: hasSettlement ? "340px 1fr" : "none", gap: 20 }}>
          <div>
            <div style={{ fontSize: FONT.xs, color: t.sub, fontWeight: 600 }}>{project.date}{project.time ? " · ⏱ " + project.time : ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: FONT.xl, fontWeight: 700, color: t.text }}>{project.brand}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 6, background: project.depositStatus === "입금" ? "#E3F4E8" : "#FDECEA", color: project.depositStatus === "입금" ? "#1B6B32" : "#9B1C14" }}>{project.depositStatus === "입금" ? "✓ 입금완료" : "미입금"}</span>
            </div>
            {project.note && <div style={{ fontSize: FONT.sm, color: t.sub, background: t.card2, border: "1px solid " + t.border, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>📝 {project.note}</div>}
            <div style={{ background: t.card2, border: "1px solid " + t.border, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: t.sub }}>총 섭외비용</div>
              <div style={{ fontSize: FONT.lg, fontWeight: 700, color: t.text }}>{fmt(project.totalCost)}</div>
            </div>
            <div style={{ fontSize: FONT.sm, fontWeight: 700, color: t.text, marginBottom: 6 }}>모델별 내역 (읽기 전용 · 원본은 촬영 프로젝트 관리 시스템)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(project.models || []).map(function (m, i2) {
                var c = calcModelLite(m);
                var timeLabel = m.time || project.time;
                return (
                  <div key={i2} style={{ background: t.card2, border: "1px solid " + t.border, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: FONT.md, fontWeight: 700, color: t.text }}>{m.name}</span>
                      {timeLabel ? <span style={{ fontSize: FONT.sm, fontWeight: 700, color: "#B5462A" }}>⏱ {timeLabel}</span> : null}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: FONT.sm, color: t.sub }}>
                      <div>섭외료 <b style={{ color: t.text }}>{fmt(m.agencyPrice)}</b></div>
                      <div>손Pay <b style={{ color: t.text }}>{fmt(m.handPay)}</b></div>
                    </div>
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid " + t.border, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: FONT.xs, color: t.sub }}>모델 라인 순수익</span>
                      <span style={{ fontSize: FONT.base, fontWeight: 700, color: "#248A3D" }}>{fmt(c.net)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 9, border: "1px solid " + t.border, background: "transparent", color: t.text, fontWeight: 600, cursor: "pointer" }}>닫기</button>
          </div>

          {hasSettlement && (
            <div style={{ borderLeft: "1px solid " + t.border, paddingLeft: 20 }}>
              <SettlementSidePanel dark={dark} modelMeta={modelMeta} data={data} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} defaultModel={guessModel} defaultDate={project.date} defaultBrand={project.brand} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCalendarTab({ modelMeta, data, addEntry, updateEntry, removeEntry, dark }) {
  var t = T(dark);
  var yearState = useState(CAL_NOW.getFullYear());
  var year = yearState[0], setYear = yearState[1];
  var monthState = useState(CAL_NOW.getMonth() + 1);
  var month = monthState[0], setMonth = monthState[1];
  var projState = useState([]);
  var projects = projState[0], setProjects = projState[1];
  var selState = useState(null);
  var selected = selState[0], setSelected = selState[1];
  var evState = useState([]);
  var calEvents = evState[0], setCalEvents = evState[1];
  var editState = useState(null); // { date, ...existing } or null
  var editingEvent = editState[0], setEditingEvent = editState[1];
  var pasteState = useState(false);
  var showPasteImport = pasteState[0], setShowPasteImport = pasteState[1];
  var searchState = useState("");
  var search = searchState[0], setSearch = searchState[1];

  useEffect(function () {
    fetchBookedProjects().then(setProjects);
    fetchCalendarEvents().then(setCalEvents).catch(function () { alert("⚠️ 캘린더 일정을 불러오지 못했습니다. 새로고침(F5) 해주세요."); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  var commitCal = function (fn) {
    setCalEvents(function (prev) { return fn(prev); });
    mutateCalendarEvents(fn).then(setCalEvents).catch(function () { alert("⚠️ 일정 저장에 실패했습니다. 새로고침 후 다시 시도해주세요."); });
  };
  var handleSaveEvent = function (ev) {
    commitCal(function (list) { return list.filter(function (e) { return e.id !== ev.id; }).concat([ev]); });
    setEditingEvent(null);
  };
  var handleDeleteEvent = function (id) {
    commitCal(function (list) { return list.filter(function (e) { return e.id !== id; }); });
    setEditingEvent(null);
  };
  var handleImportEvent = function (ev) {
    commitCal(function (list) { return list.filter(function (e) { return e.id !== ev.id; }).concat([ev]); });
    setShowPasteImport(false);
    setYear(Number(ev.date.slice(0, 4)));
    setMonth(Number(ev.date.slice(5, 7)));
  };

  var affiliatedNames = {};
  Object.keys(modelMeta || {}).forEach(function (k) { affiliatedNames[modelMeta[k].nameKr] = true; });

  var mKeyStr = year + "-" + pad2(month);
  var cells = buildCalendarGrid(year, month);
  var todayStr = CAL_NOW.getFullYear() + "-" + pad2(CAL_NOW.getMonth() + 1) + "-" + pad2(CAL_NOW.getDate());

  // 소속모델이 한 명이라도 포함된 촬영 건만 대상으로 함
  var byDate = {};
  var monthTotalCost = 0;
  var monthProjectCount = 0;
  var monthModelSet = {};
  projects.forEach(function (p) {
    if (!p.date || p.date.slice(0, 7) !== mKeyStr) return;
    var affModels = (p.models || []).filter(function (m) { return affiliatedNames[m.name]; });
    if (affModels.length === 0) return;
    var affAmount = affModels.reduce(function (s, m) { return s + (Number(m.agencyPrice) || 0); }, 0);
    var entry = Object.assign({}, p, { models: affModels, totalCost: affAmount });
    if (!byDate[p.date]) byDate[p.date] = [];
    byDate[p.date].push(entry);
    monthTotalCost += affAmount;
    monthProjectCount += 1;
    affModels.forEach(function (m) { monthModelSet[m.name] = true; });
  });
  var monthModelCount = Object.keys(monthModelSet).length;

  var byDateEvents = {};
  calEvents.forEach(function (ev) {
    if (!ev.date || ev.date.slice(0, 7) !== mKeyStr) return;
    if (!byDateEvents[ev.date]) byDateEvents[ev.date] = [];
    byDateEvents[ev.date].push(ev);
  });

  var goPrev = function () { if (month === 1) { setYear(year - 1); setMonth(12); } else { setMonth(month - 1); } };
  var goNext = function () { if (month === 12) { setYear(year + 1); setMonth(1); } else { setMonth(month + 1); } };

  var q = search.trim().toLowerCase();
  var yearMatches = [];
  if (q) {
    projects.forEach(function (p) {
      if (!p.date || p.date.slice(0, 4) !== String(year)) return;
      var affModels = (p.models || []).filter(function (m) { return affiliatedNames[m.name]; });
      if (affModels.length === 0) return;
      var hay = (p.brand || "") + " " + affModels.map(function (m) { return m.name; }).join(" ") + " " + (p.note || "");
      if (hay.toLowerCase().indexOf(q) === -1) return;
      var affAmount = affModels.reduce(function (s, m) { return s + (Number(m.agencyPrice) || 0); }, 0);
      yearMatches.push(Object.assign({}, p, { models: affModels, totalCost: affAmount, _kind: "project" }));
    });
    calEvents.forEach(function (ev) {
      if (!ev.date || ev.date.slice(0, 4) !== String(year)) return;
      var hay = (ev.title || "") + " " + (ev.memo || "");
      if (hay.toLowerCase().indexOf(q) === -1) return;
      yearMatches.push(Object.assign({}, ev, { _kind: "event" }));
    });
    yearMatches.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
  }

  return (
    <div>
      {selected && <BookingDetailModal project={selected} dark={dark} onClose={function () { setSelected(null); }} modelMeta={modelMeta} data={data} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} />}
      {editingEvent && <ScheduleEventModal dark={dark} initial={editingEvent} onSave={handleSaveEvent} onDelete={handleDeleteEvent} onClose={function () { setEditingEvent(null); }} modelMeta={modelMeta} data={data} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} />}
      {showPasteImport && <PasteImportModal dark={dark} onImport={handleImportEvent} onClose={function () { setShowPasteImport(false); }} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: -0.5 }}>{year}년 {month}월</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={function () { setShowPasteImport(true); }} style={{ padding: "0 12px", height: 32, borderRadius: 8, border: "none", background: COLOR.primary, color: "#fff", cursor: "pointer", fontSize: FONT.sm, fontWeight: 600 }}>📋 붙여넣기 등록</button>
          <button onClick={goPrev} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + t.border, background: t.card, color: t.text, cursor: "pointer", fontSize: 14 }}>‹</button>
          <button onClick={goNext} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + t.border, background: t.card, color: t.text, cursor: "pointer", fontSize: 14 }}>›</button>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <CalMonthStrip year={year} month={month} setYear={setYear} setMonth={setMonth} t={t} dark={dark} />
      </div>
      <div style={{ fontSize: FONT.sm, color: t.sub, marginBottom: 12 }}>파란 카드는 소속모델이 포함된 촬영 건(읽기 전용), 초록 카드는 직접 등록한 일정입니다. 날짜 칸의 + 버튼으로 일정을 추가하세요.</div>

      <div style={{ marginBottom: 14, position: "relative", maxWidth: 320 }}>
        <input
          value={search}
          onChange={function (e) { setSearch(e.target.value); }}
          placeholder="🔍 업체명·모델명으로 검색"
          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid " + t.border, background: t.card, color: t.text, fontSize: FONT.base, boxSizing: "border-box" }}
        />
        {search && <button onClick={function () { setSearch(""); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: t.sub, cursor: "pointer", fontSize: 13 }}>✕</button>}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ background: t.card, borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: FONT.xs, color: t.sub, fontWeight: 600, marginBottom: 6 }}>총 섭외비용</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#B5462A" }}>{fmt(monthTotalCost)}</div>
        </div>
        <div style={{ background: t.card, borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: FONT.xs, color: t.sub, fontWeight: 600, marginBottom: 6 }}>촬영 건수</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{monthProjectCount}건</div>
        </div>
        <div style={{ background: t.card, borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: FONT.xs, color: t.sub, fontWeight: 600, marginBottom: 6 }}>섭외 모델 수</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{monthModelCount}명</div>
        </div>
      </div>

      {q ? (
        <div style={{ background: t.card, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: FONT.base, fontWeight: 700, color: t.text, marginBottom: 12 }}>{year}년 전체 검색 결과 · {yearMatches.length}건</div>
          {yearMatches.length === 0 && <div style={{ fontSize: FONT.sm, color: t.sub, textAlign: "center", padding: "20px 0" }}>일치하는 내역이 없습니다.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {yearMatches.map(function (item, idx) {
              if (item._kind === "event") {
                return (
                  <button key={"ev" + idx} onClick={function () { setEditingEvent(item); }} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, background: dark ? "#14281B" : "#EAF6EE", border: "1px solid " + (dark ? "#1B6B32" : "#BFE5CB"), borderRadius: 9, padding: "10px 12px", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                    <span style={{ fontSize: FONT.xs, fontWeight: 600, color: t.sub, flexShrink: 0, width: 74 }}>{item.date}</span>
                    <span style={{ fontSize: FONT.base, fontWeight: 700, color: t.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}{item.memo ? " 📝" : ""}</span>
                    {item.time && <span style={{ fontSize: FONT.xs, color: COLOR.success, fontWeight: 700, flexShrink: 0 }}>⏱ {item.time}</span>}
                  </button>
                );
              }
              var p = item;
              var names = (p.models || []).map(function (m) { return m.name; }).filter(Boolean).join(", ");
              var isPaid = p.depositStatus === "입금";
              return (
                <button key={"p" + idx} onClick={function () { setSelected(p); }} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, background: dark ? "#3A1F17" : "#FBEDE8", border: "1px solid " + (dark ? "#8E3520" : "#F0CFC4"), borderRadius: 9, padding: "10px 12px", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                  <span title={isPaid ? "입금완료" : "미입금"} style={{ width: 7, height: 7, borderRadius: "50%", background: isPaid ? "#248A3D" : COLOR.danger, flexShrink: 0 }} />
                  <span style={{ fontSize: FONT.xs, fontWeight: 600, color: t.sub, flexShrink: 0, width: 74 }}>{p.date}</span>
                  <span style={{ fontSize: FONT.base, fontWeight: 700, color: t.text, flexShrink: 0 }}>{p.brand}{p.note ? " 📝" : ""}</span>
                  <span style={{ fontSize: FONT.sm, color: COLOR.primary, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names}</span>
                  <span style={{ fontSize: FONT.base, fontWeight: 700, color: COLOR.primary, flexShrink: 0 }}>{fmt(p.totalCost)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
      <div style={{ background: t.card, borderRadius: 14, padding: 14, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, minWidth: 700, width: "100%" }}>
          {WEEKDAYS_KR.map(function (w, i) {
            return <div key={w} style={{ textAlign: "center", fontSize: 15, fontWeight: 700, color: i === 0 ? "#D92D20" : (i === 6 ? "#B5462A" : t.sub), padding: "5px 0", boxSizing: "border-box" }}>{w}</div>;
          })}
          {cells.map(function (d, idx) {
            if (d === null) return <div key={idx} style={{ aspectRatio: "1.35", boxSizing: "border-box" }} />;
            var dateStr = year + "-" + pad2(month) + "-" + pad2(d);
            var dayProjects = byDate[dateStr] || [];
            var dayEvents = (byDateEvents[dateStr] || []).filter(function (ev) {
              if (!q) return true;
              var hay = (ev.title || "") + " " + (ev.memo || "");
              return hay.toLowerCase().indexOf(q) !== -1;
            });
            var isToday = dateStr === todayStr;
            var weekday = idx % 7;
            return (
              <div key={idx} style={{ aspectRatio: "1.35", boxSizing: "border-box", borderRadius: 8, border: isToday ? "2px solid #B5462A" : "1px solid " + t.border, background: t.card2, padding: "6px 6px", display: "flex", flexDirection: "column", gap: 3, position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: weekday === 0 ? "#D92D20" : (weekday === 6 ? "#B5462A" : t.text) }}>{d}</div>
                  <button
                    onClick={function () { setEditingEvent({ date: dateStr }); }}
                    title="일정 추가"
                    style={{ width: 18, height: 18, borderRadius: 5, border: "1px solid " + t.border, background: "transparent", color: t.sub, cursor: "pointer", fontSize: FONT.sm, fontWeight: 700, lineHeight: "16px", padding: 0, flexShrink: 0, boxSizing: "border-box" }}
                  >+</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", flex: 1, minHeight: 0 }}>

                  {dayProjects.map(function (p) {
                    var isPaid = p.depositStatus === "입금";
                    return (
                      <button key={p.id} onClick={function () { setSelected(p); }} style={{ textAlign: "left", position: "relative", background: dark ? "#3A1F17" : "#FBEDE8", border: "1px solid " + (dark ? "#8E3520" : "#F0CFC4"), borderRadius: 6, padding: "5px 7px", cursor: "pointer", width: "100%", flexShrink: 0, boxSizing: "border-box" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span title={isPaid ? "입금완료" : "미입금"} style={{ width: 6, height: 6, borderRadius: "50%", background: isPaid ? "#248A3D" : COLOR.danger, flexShrink: 0 }} />
                          <div style={{ fontSize: FONT.sm, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.brand}{p.note ? " 📝" : ""}</div>
                        </div>
                        <div style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLOR.primary, fontWeight: 700 }}>
                          {(p.models || []).map(function (m, i2) { return (i2 > 0 ? ", " : "") + m.name; }).join("")}
                          {p.time ? " · " + p.time : ""}
                        </div>
                        <div style={{ fontSize: FONT.xs, fontWeight: 700, color: "#B5462A" }}>{fmt(p.totalCost)}</div>
                      </button>
                    );
                  })}
                  {dayEvents.map(function (ev) {
                    return (
                      <button key={ev.id} onClick={function () { setEditingEvent(ev); }} style={{ textAlign: "left", background: dark ? "#14281B" : "#EAF6EE", border: "1px solid " + (dark ? "#1B6B32" : "#BFE5CB"), borderRadius: 6, padding: "5px 7px", cursor: "pointer", width: "100%", flexShrink: 0, boxSizing: "border-box" }}>
                        <div style={{ fontSize: FONT.sm, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}{ev.memo ? " 📝" : ""}</div>
                        {ev.time && <div style={{ fontSize: 10, color: COLOR.success, fontWeight: 700 }}>⏱ {ev.time}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}


function ModelDetail({ model, meta, data, addEntry, removeEntry, updateEntry, onUpdateAF, dark }) {
  var t = T(dark);
  var [month, setMonth] = useState(NOW_MONTH);
  var [view, setView] = useState("input");
  var [showAFEdit, setShowAFEdit] = useState(false);
  var md = (data && data[model] && data[model][month]) || { agency: [], self: [] };
  var totals = monthTotals(model, month, data, meta);
  var totalEntries = md.agency.length + md.self.length;

  return (
    <div>
      <div style={{ background:t.card, borderRadius:16, padding:"18px 20px", marginBottom:12, color:t.text }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div style={{ width:52, height:52, borderRadius:26, background: COLOR.primary, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize: FONT.xxl, fontWeight:700, flexShrink:0 }}>{meta.nameEn[0]}</div>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontSize: FONT.xxl, fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.2 }}>{meta.nameKr} <span style={{ fontWeight:500, color:t.sub, fontSize: FONT.md, letterSpacing:0 }}>{meta.nameEn}</span></div>
            <div style={{ fontSize: FONT.sm, color:t.sub, marginTop:3 }}>{meta.fullName} · {meta.nationality}</div>
            <div style={{ fontSize: FONT.sm, color: meta.account ? t.sub : COLOR.warning, marginTop:1 }}>{meta.account || "계좌 미등록"}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize: FONT.xs, color:t.sub }}>수익 배분</div>
            <div style={{ fontSize: FONT.md, fontWeight:600, marginTop:2 }}>에이전시 {pct(meta.agencyAF)} · 모델 {pct(meta.modelAF)}</div>
            <button onClick={function(){ setShowAFEdit(function(v){ return !v; }); }} style={{ marginTop:6, background:t.fill, border:"none", borderRadius:14, color: COLOR.primary, fontSize: FONT.sm, fontWeight:600, padding:"5px 12px", cursor:"pointer" }}>AF 수정</button>
          </div>
        </div>
      </div>

      {showAFEdit && (
        <div style={{ background:t.card, borderRadius:12, padding:14, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize: FONT.sm, fontWeight:700, color:t.text }}>AF 비율 수정</span>
            <button onClick={function(){ setShowAFEdit(false); }} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:18 }}>x</button>
          </div>
          {[["에이전시 촬영 AF","agencyAF","#B5462A"],["모델 직접 촬영 AF","modelAF","#8944AB"]].map(function(item) {
            return (
              <div key={item[1]} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize: FONT.sm, color:t.sub }}>{item[0]}</span>
                  <span style={{ fontWeight:700, color:item[2], fontSize:14 }}>{pct(meta[item[1]])}</span>
                </div>
                <input type="range" min={0} max={60} step={5} value={Math.round(meta[item[1]]*100)}
                  onChange={function(e){ onUpdateAF(model, item[1], Number(e.target.value)/100); }}
                  style={{ width:"100%", accentColor:item[2] }} />
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background:t.card, borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize: FONT.md, fontWeight:700, color:"#B5462A" }}>{month}</span>
            {month === NOW_MONTH && <span style={{ background: COLOR.primary, color:"#fff", fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:10 }}>이번 달</span>}
            {totalEntries > 0 && <span style={{ background:dark?"#1C1C1E":"#F2F2F7", color:t.sub, fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:10 }}>{totalEntries}건</span>}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={function(){ setView("input"); }} style={{ padding:"4px 10px", borderRadius:7, border:"none", cursor:"pointer", fontSize: FONT.xs, fontWeight:600, background:view==="input"?"#B5462A":"transparent", color:view==="input"?"#fff":t.sub }}>입력</button>
            <button onClick={function(){ setView("report"); }} style={{ padding:"4px 10px", borderRadius:7, border:"none", cursor:"pointer", fontSize: FONT.xs, fontWeight:600, background:view==="report"?"#B5462A":"transparent", color:view==="report"?"#fff":t.sub }}>정산서</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {MONTHS.map(function(m) {
            var hasData = ((data && data[model] && data[model][m] && data[model][m].agency && data[model][m].agency.length) || 0) + ((data && data[model] && data[model][m] && data[model][m].self && data[model][m].self.length) || 0) > 0;
            var isNow = m === NOW_MONTH;
            var isSel = month === m;
            return (
              <button key={m} onClick={function(){ setMonth(m); }} style={{ minWidth:44, height:30, padding:"0 10px", borderRadius:15, border:"none", boxShadow: isNow && !isSel ? "inset 0 0 0 1.5px "+COLOR.primary : "none", cursor:"pointer", fontSize: FONT.sm, fontWeight: isSel || isNow ? 700 : hasData ? 600 : 500, background:isSel? COLOR.primary : hasData ? t.fill : "transparent", color:isSel?"#fff": isNow ? COLOR.primary : hasData ? t.text : t.sub }}>{m}{isNow ? " ★" : ""}</button>
            );
          })}
        </div>
      </div>

      {view === "report" ? (
        <SettlementReport model={model} meta={meta} data={data} month={month} dark={dark} />
      ) : (
        <div>
          {totals.sales > 0 && (
            <div style={{ background:t.card, borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:600, color:t.sub, marginBottom:8, textTransform:"uppercase" }}>{month} 합계</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {[["총 매출",fmt(totals.sales),dark?"#E5E5EA":"#38383A"],["에이전시",fmt(totals.agency),"#8944AB"],["세금 3.3%",fmt(totals.tax),"#D92D20"],["모델 순수익",fmt(totals.model),"#248A3D"]].map(function(item) {
                  return (
                    <div key={item[0]} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:9, color:t.sub, marginBottom:2 }}>{item[0]}</div>
                      <div style={{ fontSize: FONT.base, fontWeight:700, color:item[2] }}>{item[1]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ background:t.card, borderRadius:12, padding:14, marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontWeight:700, color:t.text, fontSize:13 }}>에이전시 촬영</span>
              <span style={{ background:dark?"#3A1F17":"#FBEDE8", color: COLOR.primary, fontSize: FONT.xs, fontWeight:600, padding:"3px 9px", borderRadius:20 }}>AF {pct(meta.agencyAF)}</span>
            </div>
            <EntryTable monthLabel={month} entries={md.agency} af={meta.agencyAF} onRemove={function(id){ removeEntry(model, month, "agency", id); }} onUpdate={function(id, patch){ updateEntry(model, month, "agency", id, patch); }} dark={dark} />
            <EntryForm af={meta.agencyAF} label="에이전시 촬영" onAdd={function(e){ addEntry(model, month, "agency", e); }} dark={dark} />
          </div>
          <div style={{ background:t.card, borderRadius:12, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontWeight:700, color:t.text, fontSize:13 }}>모델 직접 촬영</span>
              <span style={{ background:dark?"#2A1E33":"#F4EEFA", color: COLOR.purple, fontSize: FONT.xs, fontWeight:600, padding:"3px 9px", borderRadius:20 }}>AF {pct(meta.modelAF)}</span>
            </div>
            <EntryTable monthLabel={month} entries={md.self} af={meta.modelAF} onRemove={function(id){ removeEntry(model, month, "self", id); }} onUpdate={function(id, patch){ updateEntry(model, month, "self", id, patch); }} dark={dark} />
            <EntryForm af={meta.modelAF} label="모델 직접 촬영" onAdd={function(e){ addEntry(model, month, "self", e); }} dark={dark} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 세무 요약 행 ──────────────────────────────────────────────────────────────
function TaxSummary({ data, modelMeta, onUpdateRegNo, dark }) {
  var t = T(dark);
  var nowIdx = MONTHS.indexOf(NOW_MONTH);
  var [startIdx, setStartIdx] = useState(Math.max(0, nowIdx - 2));
  var [endIdx, setEndIdx] = useState(nowIdx);
  var [editingRegNo, setEditingRegNo] = useState(null);
  var [regNoInput, setRegNoInput] = useState("");
  var [ext, setExt] = useState({ projects: [], paymentInfo: {} });
  var [extLoaded, setExtLoaded] = useState(false);

  useEffect(function () {
    fetchProjectBundle().then(function (b) { setExt(b); setExtLoaded(true); });
  }, []);

  var lo = Math.min(startIdx, endIdx), hi = Math.max(startIdx, endIdx);
  var monthIdxs = [];
  for (var mi = lo; mi <= hi; mi++) monthIdxs.push(mi);
  var rangeLabel = MONTHS[lo] === MONTHS[hi] ? MONTHS[lo] : (lo + 1) + "~" + (hi + 1) + "월";
  var year = CAL_NOW.getFullYear();

  // 사람별(소속모델 / 외부모델 / 통역·매니저) × 월별 {gross, tax, final}
  var people = [];
  var byKey = {};
  var getPerson = function (key, init) {
    if (!byKey[key]) { byKey[key] = Object.assign({ key: key, months: {} }, init); people.push(byKey[key]); }
    return byKey[key];
  };
  var addAmt = function (person, idx, gross, tax, final) {
    var m = person.months[idx] || { gross: 0, tax: 0, final: 0 };
    m.gross += gross; m.tax += tax; m.final += final; person.months[idx] = m;
  };

  // ① 소속모델 (모델 정산관리 데이터)
  sortedModelKeys(modelMeta).forEach(function (model) {
    var meta = modelMeta[model];
    monthIdxs.forEach(function (idx) {
      var md = (data && data[model] && data[model][MONTHS[idx]]) || { agency: [], self: [] };
      var tax = 0, final = 0;
      md.agency.forEach(function (e) { var c = calc(e.income, meta.agencyAF, e.otherDeduct); tax += c.tax; final += finalAmt(e, meta.agencyAF); });
      md.self.forEach(function (e) { var c = calc(e.income, meta.modelAF, e.otherDeduct); tax += c.tax; final += finalAmt(e, meta.modelAF); });
      if (final + tax > 0) {
        var pr = getPerson("m|" + model, { src: "소속", name: displayName(meta), regNo: meta.regNo || "", model: model, nat: meta.nationality || "", retired: !!meta.retired });
        addAmt(pr, idx, final + tax, tax, final);
      }
    });
  });

  // ② 촬영관리 시스템의 외부(비소속) 모델 · 통역비(or 현장매니저) — 소속모델로 연동된 건은 ①에 있으므로 제외
  ext.projects.forEach(function (p) {
    if (!p.date || p.date.slice(0, 4) !== String(year)) return;
    var idx = Number(p.date.slice(5, 7)) - 1;
    if (idx < lo || idx > hi) return;
    var push = function (name, info, hp, src) {
      info = info || {};
      var c = payCalc(hp, info.taxType || "3.3%");
      var pr = getPerson("x|" + src + "|" + name, { src: src, name: name, regNo: info.regNo || "", model: null, nat: "" });
      if (!pr.regNo && info.regNo) pr.regNo = info.regNo;
      addAmt(pr, idx, c.gross, c.tax, c.net);
    };
    (p.models || []).forEach(function (m) {
      if (m.useAffiliated && m.linkedModel) return;
      if (!m.name || !(Number(m.handPay) > 0)) return;
      push(m.name, ext.paymentInfo[p.id + "_" + m.id], m.handPay, "외부모델");
    });
    if (p.interpreter && p.interpreter.use && Number(p.interpreter.fee) > 0) {
      push(p.interpreter.name || "통역/매니저", ext.paymentInfo[p.id + "_interpreter"], p.interpreter.fee, "통역/매니저");
    }
  });

  // 월별 칸은 모델 수익(세전), 오른쪽에 기간 합산(세전 · 원천징수 · 입금액)을 한 행에 모두 표시
  var cell = function (person, idx) { var m = person.months[idx]; return m ? m.gross : 0; };
  var pSum = function (person, key) { return monthIdxs.reduce(function (s, idx) { return s + ((person.months[idx] || {})[key] || 0); }, 0); };
  var monthTotal = function (idx) { return people.reduce(function (s, pr) { return s + cell(pr, idx); }, 0); };
  var allSum = function (key) { return people.reduce(function (s, pr) { return s + pSum(pr, key); }, 0); };

  var order = { "소속": 0, "외부모델": 1, "통역/매니저": 2 };
  people.sort(function (a, b) { return (order[a.src] - order[b.src]); });

  var won = function (n) { return n > 0 ? "₩" + Math.round(n).toLocaleString() : ""; };

  var startEdit = function (model, cur) { setEditingRegNo(model); setRegNoInput(cur || ""); };
  var commitEdit = function (model) { onUpdateRegNo(model, regNoInput); setEditingRegNo(null); };

  var buildAoa = function () {
    var head = ["이름", "번호"].concat(monthIdxs.map(function (i) { return MONTHS[i]; })).concat(["모델 수익(세전)", "원천징수(3.3%)", "입금액"]);
    var aoa = [head];
    people.forEach(function (pr) {
      var vals = monthIdxs.map(function (i) { var m = pr.months[i]; return m ? m.gross : ""; });
      aoa.push([pr.name, pr.regNo || ""].concat(vals).concat([pSum(pr, "gross"), pSum(pr, "tax"), pSum(pr, "final")]));
    });
    aoa.push([]);
    var blanks = []; for (var k = 0; k < monthIdxs.length - 1; k++) blanks.push("");
    aoa.push(["", ""].concat(blanks).concat([rangeLabel + " 인건비총액", allSum("gross"), allSum("tax"), allSum("final")]));
    return aoa;
  };

  var exportExcel = function () {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(buildAoa());
    ws["!cols"] = [{ wch: 28 }, { wch: 18 }].concat(monthIdxs.map(function () { return { wch: 14 }; })).concat([{ wch: 20 }, { wch: 16 }, { wch: 14 }]);
    XLSX.utils.book_append_sheet(wb, ws, "인건비");
    XLSX.writeFile(wb, year + "_" + rangeLabel + "_인건비.xlsx");
  };

  var exportPDF = function () {
    var aoa = buildAoa();
    var win = window.open("", "_blank");
    if (!win) { alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요."); return; }
    var n = function (v) { return typeof v === "number" ? (v ? "₩" + Math.round(v).toLocaleString() : "") : (v || ""); };
    var html = aoa.map(function (row, ri) {
      var tag = ri === 0 ? "th" : "td";
      return "<tr>" + row.map(function (c, ci) { return "<" + tag + (ci > 1 ? " class='r'" : "") + ">" + n(c) + "</" + tag + ">"; }).join("") + "</tr>";
    }).join("");
    win.document.write("<html><head><meta charset='utf-8'><title>" + rangeLabel + "_인건비</title><style>body{font-family:sans-serif;padding:24px;}h1{font-size:18px;}table{border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #ccc;padding:7px 10px;font-size:12px;}.r{text-align:right;}th{background:#F2F2F7;}@page{size:landscape;}</style></head><body><h1>MoMo Agency — " + year + "년 " + rangeLabel + " 인건비</h1><table>" + html + "</table></body></html>");
    win.document.close(); win.focus(); setTimeout(function () { win.print(); }, 300);
  };

  var sel = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, fontWeight: 600 };
  var th = function (align) { return { padding: "9px 10px", textAlign: align, fontSize: 11, color: t.sub, fontWeight: 600, borderBottom: "1px solid " + t.border, whiteSpace: "nowrap", background: t.thead }; };
  var srcColor = { "소속": [dark ? "#3A1F17" : "#FBEDE8", COLOR.primary], "외부모델": [dark ? "#33270F" : "#FFF4DC", "#9A5B00"], "통역/매니저": [dark ? "#10262C" : "#E6F4F8", "#0A6A8A"] };

  return (
    <div>
      <div style={{ background: t.card, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: FONT.lg, fontWeight: 700, color: t.text, margin: 0 }}>세무 요약 · 인건비</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={exportExcel} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.border, background: dark ? "#14281B" : "#F0F8F2", color: COLOR.success, fontWeight: 600, fontSize: FONT.sm, cursor: "pointer" }}>⬇ 엑셀</button>
            <button onClick={exportPDF} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.border, background: dark ? "#2D1513" : "#FEF3F2", color: COLOR.danger, fontWeight: 600, fontSize: FONT.sm, cursor: "pointer" }}>⬇ PDF</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: FONT.sm, color: t.sub, fontWeight: 600 }}>조회 기간</span>
          <select value={startIdx} onChange={function (e) { setStartIdx(Number(e.target.value)); }} style={sel}>{MONTHS.map(function (m, i) { return <option key={m} value={i}>{year}년 {m}</option>; })}</select>
          <span style={{ color: t.sub }}>~</span>
          <select value={endIdx} onChange={function (e) { setEndIdx(Number(e.target.value)); }} style={sel}>{MONTHS.map(function (m, i) { return <option key={m} value={i}>{year}년 {m}</option>; })}</select>
        </div>
      </div>

      <div style={{ background: t.card, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", fontSize: FONT.sm, borderCollapse: "collapse", minWidth: 560 + monthIdxs.length * 110 }}>
            <thead>
              <tr>
                <th style={th("left")}>이름</th>
                <th style={th("left")}>번호</th>
                {monthIdxs.map(function (i) { return <th key={i} style={th("right")}>{MONTHS[i]}</th>; })}
                <th style={Object.assign({}, th("right"), { background: dark ? "#33270F" : "#FAD3B4", color: dark ? "#F2B48A" : "#8C3A0E" })}>모델 수익(세전)</th>
                <th style={Object.assign({}, th("right"), { color: COLOR.danger })}>원천징수(3.3%)</th>
                <th style={Object.assign({}, th("right"), { color: COLOR.success })}>입금액</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 && <tr><td colSpan={monthIdxs.length + 5} style={{ padding: 24, textAlign: "center", color: t.sub }}>해당 기간에 지급 내역이 없습니다.</td></tr>}
              {people.map(function (pr) {
                var sc = srcColor[pr.src];
                return (
                  <tr key={pr.key} style={{ borderBottom: "1px solid " + t.border }}>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: sc[0], color: sc[1], whiteSpace: "nowrap" }}>{pr.src}</span>{pr.retired && <RetiredBadge />}
                        <span style={{ fontWeight: 700, color: t.text, fontSize: 12 }}>{pr.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                      {pr.model && editingRegNo === pr.model ? (
                        <input autoFocus value={regNoInput} onChange={function (e) { setRegNoInput(fmtRegNo(e.target.value)); }} onBlur={function () { commitEdit(pr.model); }} onKeyDown={function (e) { if (e.key === "Enter") commitEdit(pr.model); }} placeholder="000000-0000000" maxLength={14}
                          style={{ border: "2px solid #E8890C", borderRadius: 6, padding: "3px 7px", fontSize: FONT.xs, width: 120, outline: "none", fontFamily: "monospace", background: t.input, color: t.text }} />
                      ) : (
                        <span style={{ fontFamily: "monospace", fontSize: FONT.sm, color: pr.regNo ? t.text : "#9A5B00" }}>
                          {pr.regNo || (pr.model ? "미입력" : "미입력(촬영관리)")}
                          {pr.model && <button title="번호 수정" onClick={function () { startEdit(pr.model, pr.regNo); }} style={{ marginLeft: 6, background: "transparent", border: "none", cursor: "pointer", color: t.sub, fontSize: 11, padding: 0 }}>✎</button>}
                        </span>
                      )}
                    </td>
                    {monthIdxs.map(function (i) { return <td key={i} style={{ padding: "9px 10px", textAlign: "right", color: t.text, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{won(cell(pr, i))}</td>; })}
                    <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", background: dark ? "#33270F" : "#FFE9D6", color: dark ? "#F2B48A" : "#8C3A0E" }}>{won(pSum(pr, "gross"))}</td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", color: COLOR.danger }}>{won(pSum(pr, "tax")) || "-"}</td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", color: COLOR.success }}>{won(pSum(pr, "final"))}</td>
                  </tr>
                );
              })}
              {people.length > 0 && (
                <tr style={{ background: dark ? "#1C1C1E" : "#F2F2F7" }}>
                  <td colSpan={2} style={{ padding: "9px 10px", fontWeight: 700, color: t.text, fontSize: 12 }}>월별 합계</td>
                  {monthIdxs.map(function (i) { return <td key={i} style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: t.text, fontSize: 12, whiteSpace: "nowrap" }}>{won(monthTotal(i))}</td>; })}
                  <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: t.text }}>{won(allSum("gross"))}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLOR.danger }}>{won(allSum("tax")) || "-"}</td>
                  <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLOR.success }}>{won(allSum("final"))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ background: dark ? "#33270F" : "#FFF4DC", color: t.text, borderRadius: 14, padding: "12px 18px", display: "flex", gap: 14, alignItems: "baseline" }}>
          <span style={{ fontSize: FONT.sm, fontWeight: 700 }}>{rangeLabel} 인건비총액 (세전)</span>
          <span style={{ fontSize: FONT.lg, fontWeight: 700 }}>{"₩" + Math.round(allSum("gross")).toLocaleString()}</span>
        </div>
        <div style={{ background: dark ? "#14281B" : "#F0F8F2", color: COLOR.success, borderRadius: 10, padding: "10px 16px", display: "flex", gap: 14, alignItems: "baseline" }}>
          <span style={{ fontSize: FONT.sm, fontWeight: 700 }}>실지급(입금액)</span>
          <span style={{ fontSize: FONT.lg, fontWeight: 700 }}>{"₩" + Math.round(allSum("final")).toLocaleString()}</span>
        </div>
      </div>
      <p style={{ fontSize: FONT.xs, color: t.sub, margin: "4px 2px" }}>
        월별 칸은 모델 수익(세전) 기준 · 세전 = 원천징수 + 입금액 · 소속모델 + 촬영관리 시스템의 외부모델·통역/매니저 지급건 포함{extLoaded ? "" : " (촬영관리 데이터 불러오는 중...)"}
      </p>
    </div>
  );
}

// ── 모델 추가/수정 모달 ────────────────────────────────────────────────────────
function ModelFormModal({ existing, onSave, onClose, dark }) {
  var t = T(dark);
  var [form, setForm] = useState(existing || { nameKr:"", nameEn:"", fullName:"", nationality:"", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" });
  var set = function(k, v) { setForm(function(p) { return Object.assign({}, p, { [k]: v }); }); };
  return (
    <div className="ui-scrim" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.32)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:t.card, borderRadius:18, padding:22, width:"100%", maxWidth:460, boxShadow:"0 30px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <h3 style={{ color:t.text, fontWeight:700, fontSize: FONT.lg, margin:0 }}>{existing ? "모델 정보 수정" : "새 모델 추가"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:22 }}>x</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["한국 이름 *","nameKr"],["영문 닉네임 *","nameEn"]].map(function(item) {
              return (
                <div key={item[1]}>
                  <label style={{ fontSize: FONT.xs, fontWeight:600, color:t.sub, display:"block", marginBottom:4 }}>{item[0]}</label>
                  <input value={form[item[1]]} onChange={function(e){ set(item[1], e.target.value); }} style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:8, padding:"8px 10px", fontSize: FONT.base, background:t.input, color:t.text, outline:"none", boxSizing:"border-box" }} />
                </div>
              );
            })}
          </div>
          {[["Full Name","fullName"],["국적","nationality"],["계좌번호","account"],["외국인등록번호","regNo"]].map(function(item) {
            return (
              <div key={item[1]}>
                <label style={{ fontSize: FONT.xs, fontWeight:600, color:t.sub, display:"block", marginBottom:4 }}>{item[0]}</label>
                <input value={form[item[1]]} onChange={function(e){ set(item[1], item[1]==="regNo" ? fmtRegNo(e.target.value) : e.target.value); }} maxLength={item[1]==="regNo"?14:undefined}
                  style={{ width:"100%", border:"1px solid "+t.ib, borderRadius:8, padding:"8px 10px", fontSize: FONT.base, background:t.input, color:t.text, outline:"none", boxSizing:"border-box", fontFamily:item[1]==="regNo"?"monospace":"inherit" }} />
              </div>
            );
          })}
          {existing && (
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:8, border:"1px solid "+(form.retired ? "#6E6E73" : t.border), background: form.retired ? (dark ? "#1C1C1E" : "#F2F2F7") : "transparent", cursor:"pointer" }}>
              <input type="checkbox" checked={!!form.retired} onChange={function(e){ set("retired", e.target.checked); }} />
              <span style={{ fontSize: FONT.sm, fontWeight:700, color:t.text }}>퇴사 처리</span>
              <span style={{ fontSize: FONT.xs, color:t.sub }}>— 삭제되지 않고 목록 맨 아래에 '퇴사' 표시로 보관됩니다</span>
            </label>
          )}
          {[["에이전시 촬영 AF","agencyAF","#B5462A"],["모델 직접 촬영 AF","modelAF","#8944AB"]].map(function(item) {
            return (
              <div key={item[1]}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <label style={{ fontSize: FONT.xs, fontWeight:600, color:t.sub }}>{item[0]}</label>
                  <span style={{ fontWeight:700, color:item[2], fontSize:14 }}>{Math.round(form[item[1]]*100)}%</span>
                </div>
                <input type="range" min={0} max={60} step={5} value={Math.round(form[item[1]]*100)} onChange={function(e){ set(item[1], Number(e.target.value)/100); }} style={{ width:"100%", accentColor:item[2] }} />
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <SecondaryButton onClick={onClose} style={{ flex:1 }} dark={dark}>취소</SecondaryButton>
          <button onClick={function(){
            if (!form.nameKr || !form.nameEn) { alert("이름은 필수입니다."); return; }
            onSave(form);
          }} style={{ flex:2, padding:"10px 0", borderRadius:RADIUS.sm, border:"none", background:"#B5462A", color:"#fff", fontWeight:600, cursor:"pointer" }}>
            {existing ? "수정 저장" : "모델 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── 모델 제출 승인함 (admin 전용) ───────────────────────────────────────────
function makeToken() {
  var a = new Uint8Array(18);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
}
function portalLink(token) { return window.location.origin + "/#/submit/" + token; }

function SubmissionsTab({ data, modelMeta, setModelMetaFn, addEntry, updateEntry, removeEntry, dark }) {
  var t = T(dark);
  var [subs, setSubs] = useState(null);
  var [err, setErr] = useState("");
  var [filter, setFilter] = useState("pending");
  var [edits, setEdits] = useState({});   // subId -> { itemIdx -> patch }
  var [picks, setPicks] = useState({});   // subId -> { itemIdx -> bool }
  var [copied, setCopied] = useState("");

  var load = function () {
    setErr("");
    fetch("/api/submissions").then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) { setSubs(j.submissions || []); }).catch(function () { setErr("제출 목록을 불러오지 못했습니다."); });
  };
  useEffect(function () { load(); }, []);

  // 링크 관리
  var issue = function (model) {
    setModelMetaFn(model, makeToken());
  };
  var copyMsg = function (model) {
    var m = modelMeta[model];
    var link = portalLink(m.submitToken);
    var text = "[MoMo Agency] " + (m.nameEn || m.nameKr) + ", please add your direct shoots on the calendar and press [Save] 👇\n" +
      "직접 진행한 촬영을 아래 링크의 달력에 입력하고 [저장]을 눌러주세요.\n" + link;
    var done = function () { setCopied(model); setTimeout(function () { setCopied(""); }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt("복사해서 카톡에 붙여넣으세요", text); });
    else window.prompt("복사해서 카톡에 붙여넣으세요", text);
  };

  var calcNet = function (model, type, inc) {
    var m = modelMeta[model] || {};
    return calc(inc, type === "agency" ? m.agencyAF : m.modelAF, 0).final;
  };
  var itemOf = function (sub, i) { return Object.assign({}, sub.items[i], (edits[sub.id] || {})[i] || {}); };
  var setEdit = function (subId, i, patch) {
    setEdits(function (p) { var o = Object.assign({}, p); o[subId] = Object.assign({}, o[subId] || {}); o[subId][i] = Object.assign({}, (o[subId] || {})[i] || {}, patch); return o; });
  };
  var defaultPick = function (it) {
    if (it.action === "absent") return false;
    if (it.source === "registered" && it.action === "confirm") return false; // 이미 정산에 있음
    return true;
  };
  var isPicked = function (sub, i) { var p = (picks[sub.id] || {})[i]; return p === undefined ? defaultPick(sub.items[i]) : p; };
  var togglePick = function (subId, i, v) { setPicks(function (p) { var o = Object.assign({}, p); o[subId] = Object.assign({}, o[subId] || {}); o[subId][i] = v; return o; }); };

  var saveStatus = function (sub, status, note, decisions) {
    return fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, status: status, reviewNote: note, decisions: decisions }) })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) { setSubs(function (prev) { return prev.map(function (x) { return x.id === sub.id ? j.submission : x; }); }); });
  };

  var approve = function (sub) {
    var monthLabel = Number(sub.month.slice(5, 7)) + "월";
    var decisions = [];
    sub.items.forEach(function (_, i) {
      var it = itemOf(sub, i);
      var picked = isPicked(sub, i);
      decisions.push({ i: i, applied: picked });
      if (!picked) return;
      var note = "모델 제출 승인" + (it.note ? " · " + it.note : "");
      if (it.source === "registered") {
        var parts = String(it.key).split(":"); // s:type:id
        var origType = parts[1], id = isNaN(Number(parts[2])) ? parts[2] : Number(parts[2]);
        if (it.action === "absent") { removeEntry(sub.model, monthLabel, origType, id); return; }
        if (origType !== it.type) {
          removeEntry(sub.model, monthLabel, origType, id);
          addEntry(sub.model, monthLabel, it.type, { brand: it.brand, income: it.income, otherDeduct: 0, note: note, paid: false, settleDate: it.date, id: Date.now() + i });
        } else {
          updateEntry(sub.model, monthLabel, origType, id, { brand: it.brand, income: it.income, settleDate: it.date, note: note });
        }
        return;
      }
      if (it.action === "absent") return;
      addEntry(sub.model, monthLabel, it.type, { brand: it.brand, income: it.income, otherDeduct: 0, note: note, paid: false, settleDate: it.date, id: Date.now() + i });
    });
    saveStatus(sub, "approved", "", decisions).catch(function () { alert("승인 상태 저장 실패 — 정산 반영은 완료됐습니다. 새로고침 후 확인해주세요."); });
  };
  var reject = function (sub) {
    var reason = window.prompt("반려 사유 (모델 화면에 표시됩니다)", "");
    if (reason === null) return;
    saveStatus(sub, "rejected", reason, []).catch(function () { alert("반려 저장 실패"); });
  };

  var srcLabel = { registered: "정산 등록건", project: "촬영관리", schedule: "캘린더 일정", new: "모델 추가" };
  var actLabel = { confirm: ["✅ 맞음", COLOR.success], edit: ["✏️ 수정", COLOR.primary], absent: ["❌ 안 함", COLOR.danger], new: ["➕ 추가", "#0A7EA4"] };
  var list = (subs || []).filter(function (s) { return filter === "all" ? true : s.status === filter; }).slice().reverse();
  var pendingCount = (subs || []).filter(function (s) { return s.status === "pending"; }).length;
  var inp = { padding: "5px 7px", borderRadius: 6, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12, boxSizing: "border-box" };

  return (
    <div>
      <div style={{ background: t.card, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: FONT.lg, fontWeight: 700, color: t.text, marginBottom: 4 }}>🔗 모델별 제출 링크</div>
        <div style={{ fontSize: FONT.xs, color: t.sub, marginBottom: 12 }}>"카톡 메시지 복사" → 모델 카톡에 붙여넣기. 링크가 유출되면 "재발급"하면 이전 링크는 즉시 막힙니다. 링크 생성·재발급 후 자동저장(3초)이 끝나야 링크가 작동합니다.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
          {sortedModelKeys(modelMeta).map(function (model) {
            var m = modelMeta[model];
            return (
              <div key={model} style={{ border: "1px solid " + t.border, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, opacity: m.retired ? 0.6 : 1 }}>
                <div>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: FONT.base, display: "flex", alignItems: "center" }}>{m.retired && <RetiredBadge />}{m.nameKr}</div>
                  <div style={{ fontSize: 10, color: m.submitToken ? COLOR.success : t.sub }}>{m.submitToken ? "링크 발급됨" : "링크 없음"}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {m.submitToken && <button onClick={function () { copyMsg(model); }} style={{ padding: "6px 9px", borderRadius: 7, border: "none", background: "#FEE500", color: "#191919", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{copied === model ? "복사됨 ✓" : "카톡 메시지 복사"}</button>}
                  <button onClick={function () { if (!m.submitToken || window.confirm(m.nameKr + " 링크를 재발급할까요? 이전 링크는 더 이상 열리지 않습니다.")) issue(model); }} style={{ padding: "6px 9px", borderRadius: 7, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{m.submitToken ? "재발급" : "링크 생성"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(function () {
        // 모델이 입력 링크로 직접 저장한 건 (정산에 즉시 반영됨) — 최근 순
        var recent = [];
        Object.keys(data || {}).forEach(function (model) {
          Object.keys(data[model] || {}).forEach(function (mo) {
            ((data[model][mo] && data[model][mo].self) || []).forEach(function (e) {
              if (e.portal) recent.push({ model: model, mo: mo, e: e, at: e.updatedAt || e.submittedAt || "" });
            });
          });
        });
        recent.sort(function (a, b) { return b.at.localeCompare(a.at); });
        var shown = recent.slice(0, 30);
        return (
          <div style={{ background: t.card, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: FONT.lg, fontWeight: 700, color: t.text, marginBottom: 4 }}>📱 최근 모델 직접 입력 <span style={{ fontSize: FONT.sm, color: t.sub, fontWeight: 600 }}>· 저장 즉시 정산 반영 · 총 {recent.length}건</span></div>
            <div style={{ fontSize: FONT.xs, color: t.sub, marginBottom: 10 }}>모델이 링크에서 [저장]하면 해당 모델·해당 월 정산내역(모델 직접 촬영)에 바로 들어갑니다. 정산내역에서는 '📱 모델입력' 표시로 구분되며, 금액 확인 후 필요하면 정산 화면에서 수정하세요. 입금완료 처리한 건은 모델이 더 이상 수정할 수 없습니다.</div>
            {shown.length === 0 ? <div style={{ color: t.sub, fontSize: FONT.sm, padding: "10px 0" }}>아직 모델이 직접 입력한 건이 없습니다.</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FONT.sm, minWidth: 920 }}>
                  <thead><tr style={{ color: t.sub }}>{["입력 시각", "모델", "촬영일", "브랜드", "고객사 금액", "입금자명", "예상 입금일", "담당자 연락처", "메모", "입금"].map(function (h) { return <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, borderBottom: "1px solid " + t.border, whiteSpace: "nowrap" }}>{h}</th>; })}</tr></thead>
                  <tbody>
                    {shown.map(function (r) {
                      var m = modelMeta[r.model];
                      return (
                        <tr key={r.model + r.e.id} style={{ borderBottom: "1px solid " + t.border }}>
                          <td style={{ padding: "6px 8px", color: t.sub, whiteSpace: "nowrap" }}>{r.at ? new Date(r.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                          <td style={{ padding: "6px 8px", color: t.text, fontWeight: 700, whiteSpace: "nowrap" }}>{m ? m.nameKr : r.model}</td>
                          <td style={{ padding: "6px 8px", color: t.text, whiteSpace: "nowrap" }}>{r.e.settleDate || r.mo}</td>
                          <td style={{ padding: "6px 8px", color: t.text }}>{r.e.brand}</td>
                          <td style={{ padding: "6px 8px", color: t.text, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(r.e.income)}</td>
                          <td style={{ padding: "6px 8px", color: t.text, whiteSpace: "nowrap" }}>{r.e.payerName || ""}</td>
                          <td style={{ padding: "6px 8px", color: t.text, whiteSpace: "nowrap" }}>{r.e.expectedPayDate || ""}</td>
                          <td style={{ padding: "6px 8px", color: t.text }}>{r.e.clientContact || ""}</td>
                          <td style={{ padding: "6px 8px", color: t.sub }}>{r.e.portalNote || ""}</td>
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap", color: r.e.paid ? COLOR.success : t.sub, fontWeight: 600 }}>{r.e.paid ? "입금완료" : "대기"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: FONT.lg, fontWeight: 700, color: t.text }}>📥 이전 방식 제출함 (승인 필요) {pendingCount > 0 && <span style={{ fontSize: FONT.sm, color: COLOR.danger }}>· 대기 {pendingCount}건</span>}</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["pending", "대기"], ["approved", "승인"], ["rejected", "반려"], ["all", "전체"]].map(function (f) {
            return <button key={f[0]} onClick={function () { setFilter(f[0]); }} style={{ padding: "6px 11px", borderRadius: 8, border: filter === f[0] ? "none" : "1px solid " + t.border, background: filter === f[0] ? COLOR.primary : "transparent", color: filter === f[0] ? "#fff" : t.sub, fontWeight: 600, fontSize: FONT.xs, cursor: "pointer" }}>{f[1]}</button>;
          })}
          <button onClick={load} style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontWeight: 600, fontSize: FONT.xs, cursor: "pointer" }}>↻ 새로고침</button>
        </div>
      </div>
      {err && <div style={{ color: COLOR.danger, fontWeight: 600, marginBottom: 10 }}>{err}</div>}
      {subs && list.length === 0 && <div style={{ background: t.card, borderRadius: 12, padding: 24, textAlign: "center", color: t.sub }}>해당 상태의 제출 건이 없습니다.</div>}

      {list.map(function (sub) {
        var m = modelMeta[sub.model] || { nameKr: sub.model };
        var pending = sub.status === "pending";
        var totals = sub.items.reduce(function (acc, _, i) { var it = itemOf(sub, i); if (it.action !== "absent") { acc.g += Number(it.income) || 0; acc.n += calcNet(sub.model, it.type, it.income); } return acc; }, { g: 0, n: 0 });
        return (
          <div key={sub.id} style={{ background: t.card, border: "1.5px solid " + (pending ? "#E8890C" : t.border), borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: FONT.md, fontWeight: 700, color: t.text }}>{m.nameKr} · {sub.month} <span style={{ fontSize: FONT.xs, color: t.sub, fontWeight: 600 }}>제출 {new Date(sub.submittedAt).toLocaleString("ko-KR")}</span></div>
              <span style={{ fontSize: FONT.xs, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: pending ? "#FFF4DC" : sub.status === "approved" ? "#E3F4E8" : "#FDECEA", color: pending ? "#9A5B00" : sub.status === "approved" ? "#1B6B32" : "#9B1C14" }}>{pending ? "승인 대기" : sub.status === "approved" ? "승인됨" : "반려됨"}</span>
            </div>
            {sub.comment && <div style={{ fontSize: FONT.sm, color: t.text, background: t.card2, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>💬 {sub.comment}</div>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FONT.sm, minWidth: 760 }}>
                <thead><tr style={{ color: t.sub }}>
                  {["반영", "모델 응답", "출처", "촬영일", "브랜드", "구분", "업체입금", "받을 금액(세후)", "메모"].map(function (h) { return <th key={h} style={{ textAlign: "left", padding: "6px", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "1px solid " + t.border }}>{h}</th>; })}
                </tr></thead>
                <tbody>
                  {sub.items.map(function (_, i) {
                    var it = itemOf(sub, i);
                    var a = actLabel[it.action] || ["-", t.sub];
                    var dec = (sub.decisions || []).find(function (d) { return d.i === i; });
                    var editable = pending && it.action !== "absent";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + t.border, opacity: it.action === "absent" && !isPicked(sub, i) ? 0.6 : 1 }}>
                        <td style={{ padding: 6 }}>{pending ? <input type="checkbox" checked={isPicked(sub, i)} onChange={function (e) { togglePick(sub.id, i, e.target.checked); }} title={it.action === "absent" ? (it.source === "registered" ? "체크하면 정산에서 삭제" : "반영할 내용 없음") : (it.source === "registered" && it.action === "confirm" ? "이미 정산에 있음" : "정산에 반영")} /> : (dec && dec.applied ? "✔" : "")}</td>
                        <td style={{ padding: 6, color: a[1], fontWeight: 700, whiteSpace: "nowrap" }}>{a[0]}</td>
                        <td style={{ padding: 6, color: t.sub, whiteSpace: "nowrap", fontSize: FONT.xs }}>{srcLabel[it.source] || it.source}</td>
                        <td style={{ padding: 6 }}>{editable ? <input type="date" value={it.date} onChange={function (e) { setEdit(sub.id, i, { date: e.target.value }); }} style={Object.assign({}, inp, { width: 130 })} /> : it.date}</td>
                        <td style={{ padding: 6 }}>{editable ? <input value={it.brand} onChange={function (e) { setEdit(sub.id, i, { brand: e.target.value }); }} style={Object.assign({}, inp, { width: 150 })} /> : it.brand}</td>
                        <td style={{ padding: 6 }}>{editable ? <select value={it.type} onChange={function (e) { setEdit(sub.id, i, { type: e.target.value }); }} style={inp}><option value="self">직접</option><option value="agency">에이전시</option></select> : (it.type === "agency" ? "에이전시" : "직접")}</td>
                        <td style={{ padding: 6, whiteSpace: "nowrap" }}>{editable ? <input type="number" value={it.income} onChange={function (e) { setEdit(sub.id, i, { income: Number(e.target.value) || 0 }); }} style={Object.assign({}, inp, { width: 110 })} /> : fmt(it.income)}{it.amountByModel && <span title="모델이 직접 입력한 고객사 금액" style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: COLOR.warning }}>모델입력</span>}</td>
                        <td style={{ padding: 6, color: COLOR.success, fontWeight: 700, whiteSpace: "nowrap" }}>{it.action === "absent" ? "-" : fmt(calcNet(sub.model, it.type, it.income))}</td>
                        <td style={{ padding: 6, color: t.sub, fontSize: FONT.xs }}>{it.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <div style={{ fontSize: FONT.sm, color: t.sub }}>업체입금 <b style={{ color: t.text }}>{fmt(totals.g)}</b> · 받을 금액 <b style={{ color: COLOR.success }}>{fmt(totals.n)}</b>{sub.reviewNote ? " · 반려사유: " + sub.reviewNote : ""}</div>
              {pending && (
                <div style={{ display: "flex", gap: 6 }}>
                  <DangerButton onClick={function () { reject(sub); }} outline small>반려</DangerButton>
                  <PrimaryButton onClick={function () { if (window.confirm("체크한 항목을 " + m.nameKr + " " + Number(sub.month.slice(5, 7)) + "월 정산에 반영할까요?")) approve(sub); }} small>✓ 승인 (체크 항목 정산 반영)</PrimaryButton>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
export default function App({ currentUser, onLogout }) {
  var serverBaseRef = useRef(null);
  var metaBaseRef = useRef(null);
  var [loadError, setLoadError] = useState(false);
  var isAdmin = !!(currentUser && currentUser.role === "admin");
  var [modelMeta, setModelMeta] = useState(function() {
    try { var s = localStorage.getItem(MODEL_META_KEY); return fixFullNames(s ? JSON.parse(s) : DEFAULT_MODELS); } catch(e) { return DEFAULT_MODELS; }
  });
  var [data, setData] = useState(function() {
    try { var s = localStorage.getItem(MODEL_DATA_KEY); return s ? JSON.parse(s) : initData(DEFAULT_MODELS); } catch(e) { return initData(DEFAULT_MODELS); }
  });
  var [tab, setTab] = useState("tax");
  var [dark, setDark] = useState(function() {
    try { return localStorage.getItem("darkMode") === "true"; } catch(e) { return false; }
  });
  var [saveStatus, setSaveStatus] = useState("idle");
  var [unsaved, setUnsaved] = useState(false);
  var [loading, setLoading] = useState(true);
  var [showModelForm, setShowModelForm] = useState(false);
  var [editingModel, setEditingModel] = useState(null);
  var [deleteConfirm, setDeleteConfirm] = useState(null);
  var [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  var [mobileNavOpen, setMobileNavOpen] = useState(false);

  var historyRef = useRef([{ data: initData(DEFAULT_MODELS), modelMeta: DEFAULT_MODELS }]);
  var historyIdx = useRef(0);
  var t = T(dark);

  useEffect(function() {
    var h = function() { setIsMobile(window.innerWidth < 768); };
    window.addEventListener("resize", h);
    return function() { window.removeEventListener("resize", h); };
  }, []);

  useEffect(function() {
    loadSheets().then(function(saved) {
      serverBaseRef.current = (saved && saved.data) || {};
      metaBaseRef.current = (saved && saved.modelMeta) || null;
      if (saved && saved.data) {
        setData(saved.data);
        historyRef.current = [{ data: saved.data, modelMeta: (saved.modelMeta || DEFAULT_MODELS) }];
      }
      if (saved && saved.modelMeta) setModelMeta(fixFullNames(saved.modelMeta));
      setLoading(false);
    }).catch(function() { setLoadError(true); setLoading(false); });
  }, []);

  useEffect(function() { localStorage.setItem("darkMode", dark); }, [dark]);

  var saveMeta = function(m) { setModelMeta(m); localStorage.setItem(MODEL_META_KEY, JSON.stringify(m)); };
  var saveData = function(d) { setData(d); localStorage.setItem(MODEL_DATA_KEY, JSON.stringify(d)); };
  var pushH = function(nd, nm) {
    var h = historyRef.current.slice(0, historyIdx.current + 1);
    h.push({ data: nd, modelMeta: nm });
    if (h.length > MAX_HISTORY) h.shift();
    historyRef.current = h;
    historyIdx.current = h.length - 1;
    setUnsaved(true);
  };

  var undo = useCallback(function() {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    var snap = historyRef.current[historyIdx.current];
    saveData(snap.data); saveMeta(snap.modelMeta); setUnsaved(true);
  }, []);

  var redo = useCallback(function() {
    if (historyIdx.current >= historyRef.current.length - 1) return;
    historyIdx.current++;
    var snap = historyRef.current[historyIdx.current];
    saveData(snap.data); saveMeta(snap.modelMeta); setUnsaved(true);
  }, []);

  var handleSave = useCallback(async function() {
    setSaveStatus("saving");
    // 다른 화면(촬영관리 연동, 다른 PC/탭)에서 바뀐 내용을 덮어쓰지 않도록 최신본과 병합 후 저장.
    // 최신본을 못 읽으면 저장하지 않는다 (예전엔 이 경우 화면 상태로 서버 전체를 덮어씀)
    var latest;
    try { latest = await loadSheets(); }
    catch (e) { setSaveStatus("error"); setTimeout(function() { setSaveStatus("idle"); }, 2500); return; }
    var remoteData = (latest && latest.data) || {};
    var merged = mergeSettlementData(serverBaseRef.current || {}, data, remoteData);
    var remoteMeta = latest && latest.modelMeta;
    var mergedMeta = modelMeta;
    if (remoteMeta) {
      if (!metaBaseRef.current) mergedMeta = Object.assign({}, modelMeta, remoteMeta); // 기준본이 없으면 서버 값 우선
      else if (sameJson(modelMeta, metaBaseRef.current)) mergedMeta = remoteMeta;         // 이 화면에서 안 바꿨으면 서버 값
    }
    var ok = await saveSheets({ data: merged, modelMeta: mergedMeta });
    setSaveStatus(ok ? "saved" : "error");
    if (ok) {
      serverBaseRef.current = merged;
      metaBaseRef.current = mergedMeta;
      if (!sameJson(merged, data)) setData(merged);
      if (!sameJson(mergedMeta, modelMeta)) setModelMeta(mergedMeta);
      setLoadError(false);
      setUnsaved(false);
    }
    setTimeout(function() { setSaveStatus("idle"); }, 2500);
  }, [data, modelMeta]);

  // 10분마다 자동 저장 — 저장 안 된 변경사항이 있을 때만 저장 (예비 안전장치)
  var unsavedRef = useRef(unsaved);
  useEffect(function() { unsavedRef.current = unsaved; }, [unsaved]);
  var handleSaveRef = useRef(handleSave);
  useEffect(function() { handleSaveRef.current = handleSave; }, [handleSave]);
  useEffect(function() {
    var AUTOSAVE_MS = 10 * 60 * 1000; // 10분
    var id = setInterval(function() {
      if (unsavedRef.current) { handleSaveRef.current(); }
    }, AUTOSAVE_MS);
    return function() { clearInterval(id); };
  }, []);

  // 다른 탭/화면에서 돌아오면 저장 안 된 변경이 없을 때 서버 최신본으로 갱신
  useEffect(function() {
    var onFocus = function() {
      if (unsavedRef.current) return;
      loadSheets().then(function(saved) {
        if (unsavedRef.current || !saved || !saved.data) return;
        serverBaseRef.current = saved.data;
        setData(saved.data);
        if (saved.modelMeta) { metaBaseRef.current = saved.modelMeta; setModelMeta(fixFullNames(saved.modelMeta)); }
      }).catch(function() {});
    };
    var onBeforeUnload = function(e) { if (unsavedRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    return function() {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (unsavedRef.current) handleSaveRef.current(); // 화면 전환 시 미저장분 즉시 저장
    };
  }, []);

  // 변경 후 잠시 멈추면 자동 저장 (디바운스 3초) — 수동 저장 없이도 실시간으로 안전하게 저장됨
  var autosaveTimerRef = useRef(null);
  useEffect(function() {
    if (!unsaved) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(function() {
      handleSaveRef.current();
    }, 3000);
    return function() {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [data, modelMeta, unsaved]);
  // 탭을 닫거나 새로고침할 때 저장 안 된 변경사항이 있으면 경고
  useEffect(function() {
    var onBeforeUnload = function(e) {
      if (unsavedRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return function() { window.removeEventListener("beforeunload", onBeforeUnload); };
  }, []);

  var addEntry = useCallback(function(model, month, type, entry) {
    setData(function(prev) {
      var d = JSON.parse(JSON.stringify(prev));
      if (!d[model]) { d[model] = {}; MONTHS.forEach(function(m) { d[model][m] = { agency: [], self: [] }; }); }
      d[model][month][type].push(entry);
      saveData(d); pushH(d, modelMeta); return d;
    });
  }, [modelMeta]);

  var removeEntry = useCallback(function(model, month, type, id) {
    setData(function(prev) {
      var d = JSON.parse(JSON.stringify(prev));
      d[model][month][type] = d[model][month][type].filter(function(e) { return e.id !== id; });
      saveData(d); pushH(d, modelMeta); return d;
    });
  }, [modelMeta]);

  var updateEntry = useCallback(function(model, month, type, id, patch) {
    setData(function(prev) {
      var d = JSON.parse(JSON.stringify(prev));
      d[model][month][type] = d[model][month][type].map(function(e) {
        return e.id === id ? Object.assign({}, e, patch) : e;
      });
      saveData(d); pushH(d, modelMeta); return d;
    });
  }, [modelMeta]);

  var updateRegNo = useCallback(function(model, regNo) {
    setModelMeta(function(prev) {
      var m = Object.assign({}, prev, { [model]: Object.assign({}, prev[model], { regNo: regNo }) });
      saveMeta(m); pushH(data, m); return m;
    });
  }, [data]);

  var setSubmitToken = useCallback(function(model, token) {
    setModelMeta(function(prev) {
      var m = Object.assign({}, prev, { [model]: Object.assign({}, prev[model], { submitToken: token }) });
      saveMeta(m); pushH(data, m); return m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  var updateAF = useCallback(function(model, key, value) {
    setModelMeta(function(prev) {
      var m = Object.assign({}, prev, { [model]: Object.assign({}, prev[model], { [key]: value }) });
      saveMeta(m); setUnsaved(true); return m;
    });
  }, []);

  var handleAddModel = useCallback(function(form) {
    var key = form.nameKr;
    if (modelMeta[key]) { alert("Duplicate model name."); return; }
    var nm = Object.assign({}, modelMeta, { [key]: Object.assign({}, form) });
    var nd = JSON.parse(JSON.stringify(data));
    nd[key] = {};
    MONTHS.forEach(function(m) { nd[key][m] = { agency: [], self: [] }; });
    saveMeta(nm); saveData(nd); pushH(nd, nm);
    setShowModelForm(false); setTab(key);
  }, [modelMeta, data]);

  var handleEditModel = useCallback(function(form) {
    var key = editingModel;
    var nm = Object.assign({}, modelMeta, { [key]: Object.assign({}, modelMeta[key], form, { nameKr: modelMeta[key].nameKr }) });
    saveMeta(nm); pushH(data, nm); setEditingModel(null);
  }, [modelMeta, data, editingModel]);

  var handleDeleteModel = useCallback(function(modelKey) {
    var nm = Object.assign({}, modelMeta);
    delete nm[modelKey];
    var nd = JSON.parse(JSON.stringify(data));
    delete nd[modelKey];
    saveMeta(nm); saveData(nd); pushH(nd, nm);
    setDeleteConfirm(null);
    if (tab === modelKey) setTab("tax");
  }, [modelMeta, data, tab]);

  var canUndo = historyIdx.current > 0;
  var canRedo = historyIdx.current < historyRef.current.length - 1;

  if (loading) return <Loading dark={dark} />;

  var activeModels = sortedModelKeys(modelMeta).filter(function(k){ return !modelMeta[k].retired; });
  var retiredCount = sortedModelKeys(modelMeta).length - activeModels.length;
  var smallIconBtn = { width:26, height:26, borderRadius:13, border:"none", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 };

  var NavContent = (
    <div style={{ padding:8 }}>
      {[["overview","연간 요약","📊"],["tax","세무 요약","📋"],["calendar","촬영 캘린더","📅"],["checklist","업무 체크리스트","📝"]].concat(isAdmin ? [["submissions","모델 입력 링크","📱"]] : []).map(function(item) {
        return <NavItem key={item[0]} active={tab===item[0]} icon={item[2]} label={item[1]} dark={dark} onClick={function(){ setTab(item[0]); setMobileNavOpen(false); }} />;
      })}
      <NavSection dark={dark} title={"모델 " + activeModels.length + "명" + (retiredCount ? " · 퇴사 " + retiredCount : "")}
        action={<button onClick={function(){ setShowModelForm(true); }} title="모델 추가" aria-label="모델 추가" style={Object.assign({}, smallIconBtn, { background:t.tintSoft, color: COLOR.primary, fontSize: FONT.lg, fontWeight:600 })}>+</button>} />
      {sortedModelKeys(modelMeta).map(function(m) {
        var on = tab === m;
        return (
          <NavItem key={m} small dark={dark} active={on} dim={modelMeta[m].retired}
            icon={<Avatar letter={modelMeta[m].nameEn[0]} active={on} dark={dark} />}
            label={<>{modelMeta[m].retired && <RetiredBadge />}{modelMeta[m].nameKr}</>}
            onClick={function(){ setTab(m); setMobileNavOpen(false); }}
            trailing={on ? (
              <div style={{ display:"flex", gap:2 }}>
                <button onClick={function(){ setEditingModel(m); }} title="모델 정보 수정" aria-label="모델 정보 수정" style={Object.assign({}, smallIconBtn, { background:t.fill, color:t.sub })}>✏</button>
                <button onClick={function(){ setDeleteConfirm(m); }} title="모델 삭제" aria-label="모델 삭제" style={Object.assign({}, smallIconBtn, { background:"rgba(217,45,32,0.12)", color: COLOR.danger })}>🗑</button>
              </div>
            ) : null} />
        );
      })}
    </div>
  );

  var overlays = (
    <>
      {showModelForm && <ModelFormModal onSave={handleAddModel} onClose={function(){ setShowModelForm(false); }} dark={dark} />}
      {editingModel && <ModelFormModal existing={modelMeta[editingModel]} onSave={handleEditModel} onClose={function(){ setEditingModel(null); }} dark={dark} />}
      {deleteConfirm && (
        <div className="ui-scrim" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.32)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:t.card, borderRadius: 18, padding:"26px 22px 20px", width:"100%", maxWidth:320, textAlign:"center" }}>
            <div style={{ fontSize:34, marginBottom:8 }}>⚠️</div>
            <h3 style={{ color:t.text, fontWeight:700, fontSize: FONT.lg, margin:"0 0 6px" }}>{deleteConfirm} 삭제</h3>
            <p style={{ color:t.sub, fontSize: FONT.base, margin:"0 0 20px", lineHeight:1.5 }}>이 모델의 모든 정산 데이터가 삭제됩니다.<br />되돌릴 수 없어요.</p>
            <div style={{ display:"flex", gap:8 }}>
              <SecondaryButton onClick={function(){ setDeleteConfirm(null); }} style={{ flex:1, padding:"11px 0", fontSize: FONT.md }} dark={dark}>취소</SecondaryButton>
              <DangerButton onClick={function(){ handleDeleteModel(deleteConfirm); }} style={{ flex:1, background: COLOR.danger, color:"#fff", padding:"11px 0", fontSize: FONT.md }}>삭제</DangerButton>
            </div>
          </div>
        </div>
      )}
    </>
  );

  var mobileTabs = [["overview","연간요약","📊"],["tax","세무요약","📋"],["calendar","캘린더","📅"],["checklist","체크리스트","📝"]].concat(isAdmin ? [["submissions","모델입력","📱"]] : []).concat(activeModels.slice(0,2).map(function(m){ return [m, modelMeta[m].nameKr, modelMeta[m].nameEn[0]]; }));

  return (
    <AppShell dark={dark} isMobile={isMobile} overlays={overlays} nav={NavContent}
      mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}
      title="모델 정산관리 시스템" subtitle="MoMo Agency · 2026 소속모델 정산관리"
      switchHref="#projects" switchLabel="촬영 프로젝트 관리 →" switchShort="프로젝트 →"
      undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
      onSave={handleSave} saveStatus={saveStatus} unsaved={unsaved}
      onToggleDark={function(){ setDark(function(v){ return !v; }); }}
      currentUser={currentUser} onLogout={onLogout}
      loadError={loadError ? "서버 데이터를 불러오지 못해 이 기기의 사본을 표시 중입니다. 새로고침(F5) 후 작업해주세요. (저장 시 서버 내용은 지워지지 않고 병합됩니다)" : null}
      tabs={mobileTabs} tab={tab} setTab={setTab}>
      {tab === "overview" && <Overview data={data} modelMeta={modelMeta} dark={dark} setTab={setTab} />}
      {tab === "tax" && <TaxSummary data={data} modelMeta={modelMeta} onUpdateRegNo={updateRegNo} dark={dark} />}
      {tab === "calendar" && <BookingCalendarTab modelMeta={modelMeta} data={data} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} dark={dark} />}
      {tab === "checklist" && <TaskChecklistTab dark={dark} />}
      {tab === "submissions" && isAdmin && <SubmissionsTab data={data} modelMeta={modelMeta} setModelMetaFn={setSubmitToken} addEntry={addEntry} updateEntry={updateEntry} removeEntry={removeEntry} dark={dark} />}
      {Object.keys(modelMeta).includes(tab) && <ModelDetail model={tab} meta={modelMeta[tab]} data={data} addEntry={addEntry} removeEntry={removeEntry} updateEntry={updateEntry} onUpdateAF={updateAF} dark={dark} />}
    </AppShell>
  );
}
