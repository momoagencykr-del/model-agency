import { useState, useEffect, useCallback } from "react";

// ── 상수 ──────────────────────────────────────────────────────────────────
var MONTHS12 = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
var NOW = new Date();
var NOW_YEAR = NOW.getFullYear();
var NOW_MONTH_NUM = NOW.getMonth() + 1;
var YEARS = [NOW_YEAR - 1, NOW_YEAR, NOW_YEAR + 1, NOW_YEAR + 2];

function pad2(n) { return n < 10 ? ("0" + n) : ("" + n); }

function monthKey(year, monthNum) {
  return year + "-" + pad2(monthNum);
}

function monthKeyOfDate(dateStr) {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

function defaultDateForMonth(year, monthNum) {
  return year + "-" + pad2(monthNum) + "-01";
}

function monthKeyToIndex(mKey) {
  var p = mKey.split("-");
  return Number(p[0]) * 12 + (Number(p[1]) - 1);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmt(n) {
  var v = Math.round(Number(n) || 0);
  if (v === 0) return "-";
  return (v < 0 ? "-₩" : "₩") + Math.abs(v).toLocaleString();
}

function T(dark) {
  return {
    bg: dark ? "#0f172a" : "#f1f5f9",
    card: dark ? "#1e293b" : "#fff",
    border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#1e293b",
    sub: dark ? "#94a3b8" : "#64748b",
    input: dark ? "#0f172a" : "#fff",
    ib: dark ? "#475569" : "#d1d5db",
    thead: dark ? "#0f172a" : "#f8fafc",
    card2: dark ? "#162032" : "#f8fafc",
  };
}

// ── 계산 로직 ─────────────────────────────────────────────────────────────
// partnerRate 는 이제 % 단위(0~100)로 저장됩니다.
function calcModel(m) {
  var agencyPrice = Number(m.agencyPrice) || 0;
  var handPay = Number(m.handPay) || 0;
  var opCost = Number(m.opCost) || 0;
  var ratePercent = Number(m.partnerRate) || 0;
  var rate = ratePercent / 100;
  var grossMargin = agencyPrice - handPay;
  var partnerFee = Math.round(grossMargin * rate);
  var netExclOpCost = grossMargin - partnerFee;
  var net = netExclOpCost - opCost;
  return { agencyPrice: agencyPrice, handPay: handPay, opCost: opCost, partnerFee: partnerFee, grossMargin: grossMargin, netExclOpCost: netExclOpCost, net: net };
}

function modelSumAgencyPrice(models) {
  return (models || []).reduce(function (s, m) { return s + (Number(m.agencyPrice) || 0); }, 0);
}

function projectAgg(project) {
  var grossMargin = 0, netExclOpCost = 0, net = 0;
  (project.models || []).forEach(function (m) {
    var c = calcModel(m);
    grossMargin += c.grossMargin; netExclOpCost += c.netExclOpCost; net += c.net;
  });
  return { grossMargin: grossMargin, netExclOpCost: netExclOpCost, net: net };
}

function projectsForMonth(allProjects, mKey) {
  return (allProjects || []).filter(function (p) { return monthKeyOfDate(p.date) === mKey; });
}

function monthProjectTotals(projects) {
  var totalCost = 0, agencyRevenue = 0, netExclOpCost = 0, netProfit = 0;
  (projects || []).forEach(function (p) {
    var agg = projectAgg(p);
    totalCost += Number(p.totalCost) || 0;
    agencyRevenue += agg.grossMargin;
    netExclOpCost += agg.netExclOpCost;
    netProfit += agg.net;
  });
  return { totalCost: totalCost, agencyRevenue: agencyRevenue, netExclOpCost: netExclOpCost, netProfit: netProfit };
}

// ── 운영비용 (일회성 + 정기 반복) ────────────────────────────────────────
function recurringAppliesToMonth(tmpl, mKey) {
  if (!tmpl.startMonth) return false;
  var diff = monthKeyToIndex(mKey) - monthKeyToIndex(tmpl.startMonth);
  if (diff < 0) return false;
  if (tmpl.frequency === "quarterly") return diff % 3 === 0;
  return true;
}

function recurringInstancesForMonth(mKey, recurringExpenses) {
  return (recurringExpenses || []).filter(function (tp) { return recurringAppliesToMonth(tp, mKey); }).map(function (tp) {
    return { id: tp.id + "__" + mKey, item: tp.item, amount: tp.amount, desc: tp.desc, vat: tp.vat, isRecurring: true, templateId: tp.id };
  });
}

function effectiveExpensesForMonth(mKey, expenses, recurringExpenses) {
  var manual = (expenses && expenses[mKey]) || [];
  var recurring = recurringInstancesForMonth(mKey, recurringExpenses);
  return recurring.concat(manual);
}

function monthExpenseTotal(list) {
  var sum = 0;
  (list || []).forEach(function (e) {
    var amt = Number(e.amount) || 0;
    sum += e.vat ? Math.round(amt * 1.1) : amt;
  });
  return sum;
}

function calcPayment(handPay, taxType) {
  var hp = Number(handPay) || 0;
  if (taxType === "vat10") {
    var add = Math.round(hp * 0.1);
    return { deduction: add, final: hp + add, label: "부가세 10%" };
  }
  if (taxType === "none") {
    return { deduction: 0, final: hp, label: "-" };
  }
  var ded = Math.round(hp * 0.033);
  return { deduction: ded, final: hp - ded, label: "3.3%" };
}

function dueDateLabel(mKey) {
  var parts = mKey.split("-");
  var y = Number(parts[0]), m = Number(parts[1]);
  var ny = m === 12 ? y + 1 : y;
  var nm = m === 12 ? 1 : m + 1;
  var lastDay = new Date(ny, nm, 0).getDate();
  return ny + "년 " + nm + "월 " + lastDay + "일";
}

// ── Google Sheets 연동 (기존 정산 시스템과 완전히 분리된 별도 탭 사용) ──────
async function loadProjectSheets() {
  try {
    var r = await fetch("/api/project-sheets");
    var j = await r.json();
    return j.data || null;
  } catch (e) { return null; }
}

async function saveProjectSheets(payload) {
  try {
    var r = await fetch("/api/project-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });
    return r.ok;
  } catch (e) { return false; }
}

var LOCAL_KEY = "momoProjectData_v3";

// ── 모델 정산관리(기존 시스템) 연동 ─────────────────────────────────────
// 같은 스프레드시트의 "Data" 탭(모델 정산관리 시스템이 쓰는 탭)을 읽고,
// 소속모델로 선택된 모델 라인은 저장 시 해당 모델의 정산 데이터에도 자동 반영합니다.
function koreanMonthLabel(dateStr) {
  if (!dateStr) return null;
  var mm = Number(dateStr.split("-")[1]);
  if (!mm) return null;
  return mm + "월";
}

async function fetchAffiliatedModels() {
  try {
    var r = await fetch("/api/sheets");
    var j = await r.json();
    return (j && j.data && j.data.modelMeta) || {};
  } catch (e) { return {}; }
}

async function syncLinkedModelsToSettlement(project, prevProject) {
  var hasLinks = (project.models || []).some(function (m) { return m.linkedModel; })
    || (prevProject ? (prevProject.models || []).some(function (m) { return m.linkedModel; }) : false);
  if (!hasLinks) return;

  try {
    var r = await fetch("/api/sheets");
    var j = await r.json();
    var settlement = (j && j.data) || {};
    var modelMeta = settlement.modelMeta || {};
    var data = settlement.data || {};
    var changed = false;

    // 이전 버전에서 연동돼있었지만 이번 저장에서 더 이상 연동되지 않는 라인은 정리
    if (prevProject) {
      (prevProject.models || []).forEach(function (pm) {
        if (!pm.linkedModel || !pm.linkedEntryId) return;
        var stillSame = (project.models || []).some(function (m) {
          return m.id === pm.id && m.linkedModel === pm.linkedModel && m.linkedEntryId === pm.linkedEntryId;
        });
        if (!stillSame && data[pm.linkedModel]) {
          Object.keys(data[pm.linkedModel]).forEach(function (mo) {
            var arr = (data[pm.linkedModel][mo] && data[pm.linkedModel][mo].agency) || [];
            var idx = arr.findIndex(function (e) { return e.id === pm.linkedEntryId; });
            if (idx >= 0) { arr.splice(idx, 1); changed = true; }
          });
        }
      });
    }

    var monthLabel = koreanMonthLabel(project.date);
    (project.models || []).forEach(function (m) {
      if (!m.linkedModel || !modelMeta[m.linkedModel] || !monthLabel) return;
      if (!data[m.linkedModel]) data[m.linkedModel] = {};
      if (!data[m.linkedModel][monthLabel]) data[m.linkedModel][monthLabel] = { agency: [], self: [] };
      var arr = data[m.linkedModel][monthLabel].agency;
      var entryId = m.linkedEntryId || (Date.now() + Math.floor(Math.random() * 1000));
      var entry = { id: entryId, brand: project.brand, income: Number(m.agencyPrice) || 0, otherDeduct: 0, note: "촬영정산내역 자동연동" };
      var idx = arr.findIndex(function (e) { return e.id === entryId; });
      if (idx >= 0) { arr[idx] = entry; } else { arr.push(entry); }
      m.linkedEntryId = entryId;
      changed = true;
    });

    if (changed) {
      await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settlement }),
      });
    }
  } catch (e) { console.error("정산관리 연동 실패", e); }
}

// 이전 버전 데이터를 새 구조로 변환
function normalizeLoaded(saved) {
  var projects = [];
  var expenses = {};
  var paymentInfo = {};
  var recurringExpenses = [];
  if (!saved) return { projects: projects, expenses: expenses, paymentInfo: paymentInfo, recurringExpenses: recurringExpenses };

  if (Array.isArray(saved.projects)) {
    projects = saved.projects;
  } else if (saved.projects && typeof saved.projects === "object") {
    Object.keys(saved.projects).forEach(function (k) {
      (saved.projects[k] || []).forEach(function (p) { projects.push(p); });
    });
  }

  expenses = saved.expenses || {};
  recurringExpenses = Array.isArray(saved.recurringExpenses) ? saved.recurringExpenses : [];

  if (saved.paymentInfo && typeof saved.paymentInfo === "object") {
    var looksNested = Object.keys(saved.paymentInfo).some(function (k) { return /^\d{4}-\d{2}$/.test(k); });
    if (looksNested) {
      Object.keys(saved.paymentInfo).forEach(function (mk) {
        Object.keys(saved.paymentInfo[mk] || {}).forEach(function (pid) {
          paymentInfo[pid] = saved.paymentInfo[mk][pid];
        });
      });
    } else {
      paymentInfo = saved.paymentInfo;
    }
  }

  return { projects: projects, expenses: expenses, paymentInfo: paymentInfo, recurringExpenses: recurringExpenses };
}

// ── 공통 소형 UI ─────────────────────────────────────────────────────────
function Field({ label, children, t }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function inputStyle(t) {
  return { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, boxSizing: "border-box" };
}

function Card({ title, value, color, sub, t }) {
  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11, color: t.sub, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color || t.text }}>{value}</div>
      {sub ? <div style={{ fontSize: 10, color: t.sub, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function MonthPicker({ year, month, setYear, setMonth, t }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={year} onChange={function (e) { setYear(Number(e.target.value)); }} style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, fontWeight: 700 }}>
        {YEARS.map(function (y) { return <option key={y} value={y}>{y}년</option>; })}
      </select>
      <select value={month} onChange={function (e) { setMonth(Number(e.target.value)); }} style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, fontWeight: 700 }}>
        {MONTHS12.map(function (label, i) { return <option key={i} value={i + 1}>{label}</option>; })}
      </select>
    </div>
  );
}

function MonthHeading({ year, month, t }) {
  return (
    <div style={{ fontSize: 26, fontWeight: 900, color: t.text, marginBottom: 14, letterSpacing: -0.5 }}>{year}년 {month}월</div>
  );
}

// ── 촬영 정산 추가/수정 모달 ──────────────────────────────────────────────
function ProjectFormModal({ existing, defaultDate, affiliatedModels, onSave, onClose, dark }) {
  affiliatedModels = affiliatedModels || {};
  var t = T(dark);
  var [date, setDate] = useState(existing ? existing.date : defaultDate);
  var [brand, setBrand] = useState(existing ? existing.brand : "");
  var [time, setTime] = useState(existing ? existing.time : "");
  var [depositStatus, setDepositStatus] = useState(existing ? existing.depositStatus : "미입금");
  var [note, setNote] = useState(existing ? existing.note : "");
  var [models, setModels] = useState(existing && existing.models ? existing.models.map(function (m) { return Object.assign({}, m); }) : [{ id: uid(), name: "", time: "", agencyPrice: "", handPay: "", opCost: "", partnerRate: 0, useAffiliated: false, linkedModel: "" }]);
  var [totalCost, setTotalCost] = useState(existing ? existing.totalCost : modelSumAgencyPrice(models));

  var modelSum = modelSumAgencyPrice(models);

  var addModelRow = function () {
    setModels(models.concat([{ id: uid(), name: "", time: "", agencyPrice: "", handPay: "", opCost: "", partnerRate: 0, useAffiliated: false, linkedModel: "" }]));
  };
  var removeModelRow = function (id) {
    setModels(models.filter(function (m) { return m.id !== id; }));
  };
  var updateModelRow = function (id, key, value) {
    setModels(models.map(function (m) { return m.id === id ? Object.assign({}, m, { [key]: value }) : m; }));
  };

  var handleSubmit = function () {
    if (!brand.trim()) { alert("촬영 브랜드를 입력해주세요."); return; }
    if (!date) { alert("촬영 날짜를 입력해주세요. 이 날짜를 기준으로 해당 월에 저장됩니다."); return; }
    var cleanModels = models.filter(function (m) { return m.name.trim(); }).map(function (m) {
      return Object.assign({}, m, {
        agencyPrice: Number(m.agencyPrice) || 0,
        handPay: Number(m.handPay) || 0,
        opCost: Number(m.opCost) || 0,
        partnerRate: Number(m.partnerRate) || 0,
      });
    });
    var finalTotalCost = Number(totalCost) || 0;
    var finalModelSum = modelSumAgencyPrice(cleanModels);
    if (finalTotalCost !== finalModelSum) {
      alert("입력하신 총 섭외비용(" + fmt(finalTotalCost) + ")이 섭외 모델 업체가 합계(" + fmt(finalModelSum) + ")와 다릅니다. 확인 후 저장해주세요.");
    }
    onSave({
      id: existing ? existing.id : uid(),
      date: date, brand: brand.trim(), totalCost: finalTotalCost, time: time,
      depositStatus: depositStatus, note: note, models: cleanModels,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 16, padding: 22, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ color: t.text, fontWeight: 900, marginBottom: 14, fontSize: 16 }}>{existing ? "촬영 정산 수정" : "촬영 정산 추가"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="촬영 날짜 (이 날짜 기준으로 해당 월에 저장됩니다)" t={t}><input type="date" value={date} onChange={function (e) { setDate(e.target.value); }} style={inputStyle(t)} /></Field>
          <Field label="촬영 시간" t={t}><input value={time} onChange={function (e) { setTime(e.target.value); }} placeholder="예: Full, 4H" style={inputStyle(t)} /></Field>
        </div>
        <Field label="촬영 브랜드" t={t}><input value={brand} onChange={function (e) { setBrand(e.target.value); }} style={inputStyle(t)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="총 섭외비용 (클라이언트 청구액)" t={t}>
            <input type="number" value={totalCost} onChange={function (e) { setTotalCost(e.target.value); }} style={inputStyle(t)} />
            <div style={{ fontSize: 10, color: Number(totalCost) === modelSum ? t.sub : "#f59e0b", marginTop: 3, fontWeight: Number(totalCost) === modelSum ? 400 : 700 }}>
              모델 업체가 합계: {fmt(modelSum)}{Number(totalCost) !== modelSum ? " (입력값과 다름)" : ""}
            </div>
          </Field>
          <Field label="입금여부" t={t}>
            <select value={depositStatus} onChange={function (e) { setDepositStatus(e.target.value); }} style={inputStyle(t)}>
              <option value="입금">입금</option>
              <option value="미입금">미입금</option>
            </select>
          </Field>
        </div>

        <div style={{ margin: "14px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: t.text }}>섭외 모델 내역</span>
          <button onClick={addModelRow} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ 모델 추가</button>
        </div>

        {models.map(function (m) {
          var c = calcModel(m);
          return (
            <div key={m.id} style={{ background: t.card2, border: "1px solid " + t.border, borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.sub, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  <input type="checkbox" checked={!!m.useAffiliated} onChange={function (e) {
                    var checked = e.target.checked;
                    updateModelRow(m.id, "useAffiliated", checked);
                    if (!checked) { updateModelRow(m.id, "linkedModel", ""); }
                  }} style={{ width: 14, height: 14 }} />
                  소속모델
                </label>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                {m.useAffiliated ? (
                  <select value={m.linkedModel || ""} onChange={function (e) {
                    var key = e.target.value;
                    updateModelRow(m.id, "linkedModel", key);
                    if (key && affiliatedModels[key]) updateModelRow(m.id, "name", affiliatedModels[key].nameKr);
                  }} style={Object.assign({}, inputStyle(t), { flex: 1 })}>
                    <option value="">소속모델 선택...</option>
                    {Object.keys(affiliatedModels || {}).map(function (key) {
                      return <option key={key} value={key}>{affiliatedModels[key].nameKr}</option>;
                    })}
                  </select>
                ) : (
                  <input value={m.name} onChange={function (e) { updateModelRow(m.id, "name", e.target.value); }} placeholder="모델명" style={Object.assign({}, inputStyle(t), { flex: 1 })} />
                )}
                <input value={m.time || ""} onChange={function (e) { updateModelRow(m.id, "time", e.target.value); }} placeholder="시간 (예: 5H)" style={Object.assign({}, inputStyle(t), { width: 100, flexShrink: 0 })} />
                <button onClick={function () { removeModelRow(m.id); }} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
              </div>
              {m.useAffiliated && m.linkedModel ? <div style={{ fontSize: 10, color: "#4f46e5", marginBottom: 6 }}>저장 시 "{affiliatedModels[m.linkedModel] ? affiliatedModels[m.linkedModel].nameKr : ""}"의 모델 정산관리 데이터에도 자동으로 반영됩니다.</div> : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: t.sub, marginBottom: 3 }}>모델 업체가 (청구가)</div>
                  <input type="number" value={m.agencyPrice} onChange={function (e) { updateModelRow(m.id, "agencyPrice", e.target.value); }} style={inputStyle(t)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.sub, marginBottom: 3 }}>모델 손 Pay</div>
                  <input type="number" value={m.handPay} onChange={function (e) { updateModelRow(m.id, "handPay", e.target.value); }} style={inputStyle(t)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.sub, marginBottom: 3 }}>운영비 (교통/통역 등)</div>
                  <input type="number" value={m.opCost} onChange={function (e) { updateModelRow(m.id, "opCost", e.target.value); }} style={inputStyle(t)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.sub, marginBottom: 3 }}>협력사 지급비율 (%)</div>
                  <input type="number" step="1" min="0" max="100" value={m.partnerRate} onChange={function (e) { updateModelRow(m.id, "partnerRate", e.target.value); }} style={inputStyle(t)} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.sub, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>협력사 지급액: <b style={{ color: t.text }}>{fmt(c.partnerFee)}</b></span>
                <span>모델 라인 순수익: <b style={{ color: "#10b981" }}>{fmt(c.net)}</b></span>
              </div>
            </div>
          );
        })}

        <Field label="비고" t={t}><textarea value={note} onChange={function (e) { setNote(e.target.value); }} rows={2} style={Object.assign({}, inputStyle(t), { resize: "vertical" })} /></Field>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer" }}>취소</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, cursor: "pointer" }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ── 촬영 정산내역 탭 ──────────────────────────────────────────────────────
function ProjectsTab({ year, month, setYear, setMonth, allProjects, expenses, recurringExpenses, affiliatedModels, onAdd, onUpdate, onRemove, dark }) {
  var t = T(dark);
  var mKey = monthKey(year, month);
  var list = projectsForMonth(allProjects, mKey);
  var [showForm, setShowForm] = useState(false);
  var [editing, setEditing] = useState(null);
  var [deleteId, setDeleteId] = useState(null);
  var totals = monthProjectTotals(list);
  var monthExpTotal = monthExpenseTotal(effectiveExpensesForMonth(mKey, expenses, recurringExpenses));
  var netProfitAfterExpenses = totals.netExclOpCost - monthExpTotal;

  return (
    <div>
      {showForm && <ProjectFormModal defaultDate={defaultDateForMonth(year, month)} affiliatedModels={affiliatedModels} onSave={function (p) { onAdd(p); setShowForm(false); }} onClose={function () { setShowForm(false); }} dark={dark} />}
      {editing && <ProjectFormModal existing={editing} affiliatedModels={affiliatedModels} onSave={function (p) { onUpdate(p); setEditing(null); }} onClose={function () { setEditing(null); }} dark={dark} />}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ color: t.text, fontWeight: 900, marginBottom: 8 }}>촬영 정산 삭제</h3>
            <p style={{ color: t.sub, fontSize: 13, marginBottom: 20 }}>이 건의 모든 모델 내역이 삭제됩니다.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function () { setDeleteId(null); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={function () { onRemove(deleteId); setDeleteId(null); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, cursor: "pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <MonthHeading year={year} month={month} t={t} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <MonthPicker year={year} month={month} setYear={setYear} setMonth={setMonth} t={t} />
          <button onClick={function () { setShowForm(true); }} style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ 촬영 정산 추가</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Card title={"총 섭외비용 (" + list.length + "건)"} value={fmt(totals.totalCost)} color="#4f46e5" t={t} />
        <Card title="에이전시 수익" value={fmt(totals.agencyRevenue)} color="#7c3aed" sub="업체가 - 모델손Pay" t={t} />
        <Card title="비용제외 순수익" value={fmt(totals.netExclOpCost)} color="#0891b2" sub="협력사 지급액 반영, 운영비 제외" t={t} />
        <Card title="순수익" value={fmt(netProfitAfterExpenses)} color={netProfitAfterExpenses >= 0 ? "#10b981" : "#ef4444"} sub="비용제외 순수익 - 월 운영비용" t={t} />
      </div>

      {list.length === 0 && <div style={{ color: t.sub, fontSize: 13, padding: "30px 0", textAlign: "center" }}>{year}년 {month}월에 등록된 촬영 정산 내역이 없습니다.</div>}

      {list.map(function (p, idx) {
        var agg = projectAgg(p);
        return (
          <div key={p.id} style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: t.sub, fontWeight: 700 }}>No.{idx + 1} · {p.date || "날짜 미정"}</span>
                  {p.time ? <span style={{ fontSize: 10, fontWeight: 800, color: "#4f46e5", background: dark ? "#1e293b" : "#eef2ff", padding: "2px 7px", borderRadius: 6 }}>⏱ {p.time}</span> : null}
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: t.text }}>{p.brand}</div>
              </div>
              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: p.depositStatus === "입금" ? "#d1fae5" : "#fee2e2", color: p.depositStatus === "입금" ? "#065f46" : "#991b1b", flexShrink: 0 }}>{p.depositStatus || "미입금"}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8, marginTop: 10 }}>
              <div style={{ background: dark ? "#1e2a4a" : "#eef2ff", border: "1px solid " + (dark ? "#3730a3" : "#c7d2fe"), borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>총 섭외비용</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: t.text }}>{fmt(p.totalCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>순수익</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: "#10b981" }}>{fmt(agg.net)}</span>
                </div>
              </div>
              {(p.models || []).length > 0 ? (p.models || []).map(function (m, i2) {
                var c = calcModel(m);
                var timeLabel = m.time || p.time;
                return (
                  <div key={i2} style={{ background: t.card2, border: "1px solid " + t.border, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: t.text }}>{m.name}</span>
                      {timeLabel ? <span style={{ fontSize: 13, fontWeight: 800, color: "#4f46e5" }}>⏱ {timeLabel}</span> : null}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13, color: t.sub }}>
                      <div>섭외료 <b style={{ color: t.text }}>{fmt(m.agencyPrice)}</b></div>
                      <div>손Pay <b style={{ color: t.text }}>{fmt(m.handPay)}</b></div>
                      <div>운영비 <b style={{ color: t.text }}>{fmt(m.opCost)}</b></div>
                      <div>협력비율 <b style={{ color: t.text }}>{Number(m.partnerRate) || 0}%</b></div>
                    </div>
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid " + t.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: t.sub }}>모델 라인 순수익</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "#10b981" }}>{fmt(c.net)}</span>
                    </div>
                  </div>
                );
              }) : <div style={{ display: "flex", alignItems: "center" }}><span style={{ fontSize: 11, color: t.sub }}>모델 미지정</span></div>}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 11, color: t.sub }}>{p.note ? "비고: " + p.note : ""}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function () { setEditing(p); }} style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid " + t.border, background: "transparent", color: t.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>수정</button>
                <button onClick={function () { setDeleteId(p.id); }} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#ef444440", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>삭제</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 정기 운영비 항목 관리 ────────────────────────────────────────────────
function RecurringManager({ recurringExpenses, onChange, dark, t }) {
  var addTemplate = function () {
    onChange(recurringExpenses.concat([{ id: uid(), item: "", amount: "", desc: "", vat: false, frequency: "monthly", startMonth: monthKey(NOW_YEAR, NOW_MONTH_NUM) }]));
  };
  var updateTemplate = function (id, key, value) {
    onChange(recurringExpenses.map(function (tp) { return tp.id === id ? Object.assign({}, tp, { [key]: value }) : tp; }));
  };
  var removeTemplate = function (id) {
    if (!window.confirm("이 정기 항목을 삭제하면 앞으로의 모든 달에서 자동 반영이 중단됩니다. 삭제할까요?")) return;
    onChange(recurringExpenses.filter(function (tp) { return tp.id !== id; }));
  };

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 12px", background: t.thead, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: t.text }}>정기 운영비 항목 (매월/분기별 자동 반영 · 매번 재입력 불필요)</span>
        <button onClick={addTemplate} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ 정기 항목 추가</button>
      </div>
      {recurringExpenses.length === 0 && <div style={{ padding: 16, textAlign: "center", color: t.sub, fontSize: 12 }}>등록된 정기 항목이 없습니다. 월세·인건비처럼 매달 고정으로 나가는 비용을 등록해두면 매월 자동으로 반영됩니다.</div>}
      {recurringExpenses.map(function (tp) {
        return (
          <div key={tp.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr 1.3fr 0.55fr 1fr 1fr 40px", gap: 6, padding: "8px 12px", borderTop: "1px solid " + t.border, alignItems: "center" }}>
            <input value={tp.item} onChange={function (e) { updateTemplate(tp.id, "item", e.target.value); }} placeholder="예: 사무실 월세" style={inputStyle(t)} />
            <input type="number" value={tp.amount} onChange={function (e) { updateTemplate(tp.id, "amount", e.target.value); }} style={inputStyle(t)} />
            <input value={tp.desc} onChange={function (e) { updateTemplate(tp.id, "desc", e.target.value); }} placeholder="설명" style={inputStyle(t)} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input type="checkbox" checked={!!tp.vat} onChange={function (e) { updateTemplate(tp.id, "vat", e.target.checked); }} style={{ width: 18, height: 18 }} />
            </div>
            <select value={tp.frequency} onChange={function (e) { updateTemplate(tp.id, "frequency", e.target.value); }} style={{ padding: "7px 6px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 11 }}>
              <option value="monthly">매월 반복</option>
              <option value="quarterly">분기별(3개월)</option>
            </select>
            <input type="month" value={tp.startMonth} onChange={function (e) { updateTemplate(tp.id, "startMonth", e.target.value); }} style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 11 }} />
            <button onClick={function () { removeTemplate(tp.id); }} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ── 운영비용 탭 ──────────────────────────────────────────────────────────
function ExpensesTab({ year, month, setYear, setMonth, expenses, recurringExpenses, allProjects, onChange, onChangeRecurring, dark }) {
  var t = T(dark);
  var mKey = monthKey(year, month);
  var manualList = expenses[mKey] || [];
  var combinedList = effectiveExpensesForMonth(mKey, expenses, recurringExpenses);
  var expTotal = monthExpenseTotal(combinedList);
  var projTotals = monthProjectTotals(projectsForMonth(allProjects, mKey));
  var companyNetProfit = projTotals.netExclOpCost - expTotal;

  var addRow = function () {
    onChange(mKey, manualList.concat([{ id: uid(), item: "", amount: "", desc: "", vat: false }]));
  };
  var updateRow = function (id, key, value) {
    onChange(mKey, manualList.map(function (e) { return e.id === id ? Object.assign({}, e, { [key]: value }) : e; }));
  };
  var removeRow = function (id) {
    onChange(mKey, manualList.filter(function (e) { return e.id !== id; }));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <MonthHeading year={year} month={month} t={t} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <MonthPicker year={year} month={month} setYear={setYear} setMonth={setMonth} t={t} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Card title="비용제외 순수익 합계" value={fmt(projTotals.netExclOpCost)} color="#0891b2" t={t} />
        <Card title={"월 운영비용 합계 (정기+일회성)"} value={fmt(expTotal)} color="#f59e0b" t={t} />
        <Card title="회사 순익 (운영비 차감 후)" value={fmt(companyNetProfit)} color={companyNetProfit >= 0 ? "#10b981" : "#ef4444"} t={t} />
      </div>

      <RecurringManager recurringExpenses={recurringExpenses} onChange={onChangeRecurring} dark={dark} t={t} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.text }}>이번 달 운영비 내역</span>
        <button onClick={addRow} style={{ padding: "7px 12px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ 이번 달 항목 추가</button>
      </div>
      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.6fr 0.6fr 40px", gap: 8, padding: "10px 12px", background: t.thead, fontSize: 11, fontWeight: 800, color: t.sub }}>
          <div>항목명</div><div>금액</div><div>설명</div><div>부가세10%</div><div></div>
        </div>
        {combinedList.length === 0 && <div style={{ padding: 20, textAlign: "center", color: t.sub, fontSize: 12 }}>등록된 운영비 항목이 없습니다.</div>}
        {combinedList.map(function (e) {
          if (e.isRecurring) {
            return (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.6fr 0.6fr 40px", gap: 8, padding: "8px 12px", borderTop: "1px solid " + t.border, alignItems: "center", opacity: 0.9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: t.text, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#4f46e5", background: dark ? "#1e293b" : "#eef2ff", padding: "2px 6px", borderRadius: 5 }}>정기</span>
                  {e.item}
                </div>
                <div style={{ color: t.text, fontSize: 13 }}>{fmt(e.amount)}</div>
                <div style={{ color: t.sub, fontSize: 12 }}>{e.desc}</div>
                <div style={{ textAlign: "center", color: t.sub, fontSize: 12 }}>{e.vat ? "✓" : "-"}</div>
                <div />
              </div>
            );
          }
          return (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.6fr 0.6fr 40px", gap: 8, padding: "8px 12px", borderTop: "1px solid " + t.border, alignItems: "center" }}>
              <input value={e.item} onChange={function (ev) { updateRow(e.id, "item", ev.target.value); }} placeholder="예: 이번 달 일회성 지출" style={inputStyle(t)} />
              <input type="number" value={e.amount} onChange={function (ev) { updateRow(e.id, "amount", ev.target.value); }} style={inputStyle(t)} />
              <input value={e.desc} onChange={function (ev) { updateRow(e.id, "desc", ev.target.value); }} style={inputStyle(t)} />
              <input type="checkbox" checked={!!e.vat} onChange={function (ev) { updateRow(e.id, "vat", ev.target.checked); }} style={{ width: 18, height: 18 }} />
              <button onClick={function () { removeRow(e.id); }} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 지급관리 탭 ──────────────────────────────────────────────────────────
function buildPaymentRows(mKey, allProjects, paymentInfo) {
  var list = projectsForMonth(allProjects, mKey);
  var rows = [];
  list.forEach(function (p) {
    (p.models || []).forEach(function (m) {
      var pid = p.id + "_" + m.id;
      var info = paymentInfo[pid] || { regNo: "", taxType: "3.3%", bank: "", account: "", paid: false };
      rows.push({
        pid: pid, date: p.date, brand: p.brand, modelName: m.name, time: p.time,
        handPay: m.handPay, regNo: info.regNo, taxType: info.taxType, bank: info.bank, account: info.account, paid: info.paid,
      });
    });
  });
  rows.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
  return rows;
}

function PaymentsTab({ year, month, setYear, setMonth, allProjects, paymentInfo, onChangeInfo, dark }) {
  var t = T(dark);
  var mKey = monthKey(year, month);
  var rows = buildPaymentRows(mKey, allProjects, paymentInfo);
  var totalHandPay = 0, totalDeduction = 0, totalFinal = 0;
  rows.forEach(function (r) { var c = calcPayment(r.handPay, r.taxType); totalHandPay += Number(r.handPay) || 0; totalDeduction += c.deduction; totalFinal += c.final; });

  var update = function (pid, key, value) {
    onChangeInfo(pid, key, value);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <MonthHeading year={year} month={month} t={t} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <MonthPicker year={year} month={month} setYear={setYear} setMonth={setMonth} t={t} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: t.sub, fontWeight: 700, marginBottom: 10 }}>지급 예정일: {dueDateLabel(mKey)} (익월말)</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Card title="모델 손Pay 합계" value={fmt(totalHandPay)} t={t} />
        <Card title="공제/부가세 합계" value={fmt(totalDeduction)} color="#f59e0b" t={t} />
        <Card title="최종 지급 합계" value={fmt(totalFinal)} color="#10b981" t={t} />
      </div>

      <div style={{ overflowX: "auto", background: t.card, border: "1px solid " + t.border, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 920 }}>
          <thead>
            <tr style={{ background: t.thead, color: t.sub }}>
              {["촬영날짜", "브랜드", "모델명", "주민등록번호", "손 Pay", "공제방식", "공제액", "최종 입금액", "입금은행", "입금계좌", "지급여부"].map(function (h) {
                return <th key={h} style={{ padding: "9px 8px", textAlign: "left", fontWeight: 800, whiteSpace: "nowrap" }}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 20, textAlign: "center", color: t.sub }}>{year}년 {month}월 지급 대상 내역이 없습니다.</td></tr>
            )}
            {rows.map(function (r) {
              var c = calcPayment(r.handPay, r.taxType);
              return (
                <tr key={r.pid} style={{ borderTop: "1px solid " + t.border }}>
                  <td style={{ padding: "7px 8px", color: t.text, whiteSpace: "nowrap" }}>{r.date}</td>
                  <td style={{ padding: "7px 8px", color: t.text, whiteSpace: "nowrap" }}>{r.brand}</td>
                  <td style={{ padding: "7px 8px", color: t.text, fontWeight: 700, whiteSpace: "nowrap" }}>{r.modelName}</td>
                  <td style={{ padding: "7px 8px" }}><input value={r.regNo} onChange={function (e) { update(r.pid, "regNo", e.target.value); }} placeholder="주민등록번호" style={Object.assign({}, inputStyle(t), { width: 130, padding: "5px 8px" })} /></td>
                  <td style={{ padding: "7px 8px", color: t.text, whiteSpace: "nowrap" }}>{fmt(r.handPay)}</td>
                  <td style={{ padding: "7px 8px" }}>
                    <select value={r.taxType} onChange={function (e) { update(r.pid, "taxType", e.target.value); }} style={{ padding: "5px 6px", borderRadius: 6, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 11 }}>
                      <option value="3.3%">3.3% 원천징수</option>
                      <option value="vat10">부가세 10% (세금계산서)</option>
                      <option value="none">공제없음</option>
                    </select>
                  </td>
                  <td style={{ padding: "7px 8px", color: "#ef4444", whiteSpace: "nowrap" }}>{c.label === "-" ? "-" : (r.taxType === "vat10" ? "+" : "-") + fmt(c.deduction).replace("₩", "₩")}</td>
                  <td style={{ padding: "7px 8px", color: t.text, fontWeight: 800, whiteSpace: "nowrap" }}>{fmt(c.final)}</td>
                  <td style={{ padding: "7px 8px" }}><input value={r.bank} onChange={function (e) { update(r.pid, "bank", e.target.value); }} placeholder="은행" style={Object.assign({}, inputStyle(t), { width: 70, padding: "5px 8px" })} /></td>
                  <td style={{ padding: "7px 8px" }}><input value={r.account} onChange={function (e) { update(r.pid, "account", e.target.value); }} placeholder="계좌번호" style={Object.assign({}, inputStyle(t), { width: 140, padding: "5px 8px" })} /></td>
                  <td style={{ padding: "7px 8px" }}>
                    <button onClick={function () { update(r.pid, "paid", !r.paid); }} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: r.paid ? "#d1fae5" : "#fee2e2", color: r.paid ? "#065f46" : "#991b1b" }}>{r.paid ? "입금완료" : "미입금"}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 회사 대시보드 탭 ─────────────────────────────────────────────────────
function DashboardTab({ year, setYear, allProjects, expenses, recurringExpenses, dark }) {
  var t = T(dark);
  var bars = MONTHS12.map(function (label, i) {
    var mKey = monthKey(year, i + 1);
    var pt = monthProjectTotals(projectsForMonth(allProjects, mKey));
    var exp = monthExpenseTotal(effectiveExpensesForMonth(mKey, expenses, recurringExpenses));
    var companyNet = pt.netExclOpCost - exp;
    return { month: label, totalCost: pt.totalCost, netProfit: pt.netExclOpCost, expense: exp, companyNet: companyNet, isNow: year === NOW_YEAR && (i + 1) === NOW_MONTH_NUM };
  });
  var maxCost = Math.max.apply(null, bars.map(function (b) { return b.totalCost; }).concat([1]));
  var yearCost = bars.reduce(function (s, b) { return s + b.totalCost; }, 0);
  var yearNet = bars.reduce(function (s, b) { return s + b.netProfit; }, 0);
  var yearExpense = bars.reduce(function (s, b) { return s + b.expense; }, 0);
  var yearCompanyNet = bars.reduce(function (s, b) { return s + b.companyNet; }, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: t.text, letterSpacing: -0.5 }}>{year}년 실적 대시보드</div>
        <select value={year} onChange={function (e) { setYear(Number(e.target.value)); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, fontWeight: 700 }}>
          {YEARS.map(function (y) { return <option key={y} value={y}>{y}년</option>; })}
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Card title={year + "년 전체 섭외비용"} value={fmt(yearCost)} color="#4f46e5" t={t} />
        <Card title="비용제외 순수익 합계" value={fmt(yearNet)} color="#0891b2" t={t} />
        <Card title="운영비용 합계" value={fmt(yearExpense)} color="#f59e0b" t={t} />
        <Card title="회사 순익 합계" value={fmt(yearCompanyNet)} color={yearCompanyNet >= 0 ? "#10b981" : "#ef4444"} t={t} />
      </div>

      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ color: t.text, fontWeight: 900, fontSize: 14, margin: 0 }}>월별 섭외비용 · 회사 순익</h3>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: t.sub }}>
            <span><span style={{ color: "#4f46e5" }}>■</span> 총 섭외비용</span>
            <span><span style={{ color: "#10b981" }}>■</span> 회사 순익</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, paddingBottom: 4 }}>
          {bars.map(function (b) {
            var h = b.totalCost > 0 ? Math.max(Math.round((b.totalCost / maxCost) * 140), 6) : 2;
            var nh = b.totalCost > 0 && b.companyNet > 0 ? Math.min(Math.round((b.companyNet / maxCost) * 140), h) : 0;
            return (
              <div key={b.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                {b.totalCost > 0 && <div style={{ fontSize: 9, color: b.isNow ? "#4f46e5" : t.sub, fontWeight: b.isNow ? 900 : 600 }}>{Math.round(b.totalCost / 10000)}만</div>}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 140 }}>
                  {b.totalCost > 0 ? (
                    <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", border: b.isNow ? "2px solid #4f46e5" : "none" }}>
                      <div style={{ width: "100%", flex: 1, background: dark ? "#1e293b" : "#e2e8f0" }} />
                      <div style={{ width: "100%", height: nh, background: "#10b981" }} />
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 2, background: t.border, borderRadius: 2 }} />
                  )}
                </div>
                <div style={{ fontSize: 10, color: b.isNow ? "#4f46e5" : t.sub, fontWeight: b.isNow ? 900 : 600 }}>{b.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginTop: 14 }}>
        {bars.map(function (b) {
          return (
            <div key={b.month} style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.text, marginBottom: 6 }}>{year}년 {b.month}</div>
              <div style={{ fontSize: 10, color: t.sub }}>섭외비용</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 4 }}>{fmt(b.totalCost)}</div>
              <div style={{ fontSize: 10, color: t.sub }}>운영비용</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", marginBottom: 4 }}>{fmt(b.expense)}</div>
              <div style={{ fontSize: 10, color: t.sub }}>회사 순익</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: b.companyNet >= 0 ? "#10b981" : "#ef4444" }}>{fmt(b.companyNet)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 App ─────────────────────────────────────────────────────────────
export default function ProjectApp() {
  var [allProjects, setAllProjects] = useState([]);
  var [expenses, setExpenses] = useState({});
  var [recurringExpenses, setRecurringExpenses] = useState([]);
  var [paymentInfo, setPaymentInfo] = useState({});
  var [loading, setLoading] = useState(true);
  var [saveStatus, setSaveStatus] = useState("idle");
  var [unsaved, setUnsaved] = useState(false);
  var [dark, setDark] = useState(function () {
    try { return localStorage.getItem("darkMode") === "true"; } catch (e) { return false; }
  });
  var [tab, setTab] = useState("dashboard");
  var [year, setYear] = useState(NOW_YEAR);
  var [month, setMonth] = useState(NOW_MONTH_NUM);
  var [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  var [mobileNavOpen, setMobileNavOpen] = useState(false);
  var [affiliatedModels, setAffiliatedModels] = useState({});

  useEffect(function () {
    fetchAffiliatedModels().then(function (roster) { setAffiliatedModels(roster); });
  }, []);

  useEffect(function () {
    var h = function () { setIsMobile(window.innerWidth < 768); };
    window.addEventListener("resize", h);
    return function () { window.removeEventListener("resize", h); };
  }, []);

  useEffect(function () {
    loadProjectSheets().then(function (saved) {
      var norm;
      if (saved) {
        norm = normalizeLoaded(saved);
      } else {
        norm = { projects: [], expenses: {}, paymentInfo: {}, recurringExpenses: [] };
        try {
          var local = localStorage.getItem(LOCAL_KEY);
          if (local) norm = normalizeLoaded(JSON.parse(local));
        } catch (e) {}
      }
      setAllProjects(norm.projects);
      setExpenses(norm.expenses);
      setPaymentInfo(norm.paymentInfo);
      setRecurringExpenses(norm.recurringExpenses);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  useEffect(function () { localStorage.setItem("darkMode", dark); }, [dark]);

  var persistLocal = function (p, e, pi, re) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ projects: p, expenses: e, paymentInfo: pi, recurringExpenses: re })); } catch (err) {}
  };

  var addProject = useCallback(async function (project) {
    await syncLinkedModelsToSettlement(project, null);
    setAllProjects(function (prev) {
      var next = prev.concat([project]);
      persistLocal(next, expenses, paymentInfo, recurringExpenses); setUnsaved(true); return next;
    });
  }, [expenses, paymentInfo, recurringExpenses]);

  var updateProject = useCallback(async function (project) {
    var prevProject = allProjects.find(function (p) { return p.id === project.id; }) || null;
    await syncLinkedModelsToSettlement(project, prevProject);
    setAllProjects(function (prev) {
      var next = prev.map(function (p) { return p.id === project.id ? project : p; });
      persistLocal(next, expenses, paymentInfo, recurringExpenses); setUnsaved(true); return next;
    });
  }, [expenses, paymentInfo, recurringExpenses, allProjects]);

  var removeProject = useCallback(function (id) {
    setAllProjects(function (prev) {
      var next = prev.filter(function (p) { return p.id !== id; });
      persistLocal(next, expenses, paymentInfo, recurringExpenses); setUnsaved(true); return next;
    });
  }, [expenses, paymentInfo, recurringExpenses]);

  var changeExpenses = useCallback(function (mKey, list) {
    setExpenses(function (prev) {
      var next = Object.assign({}, prev, { [mKey]: list });
      persistLocal(allProjects, next, paymentInfo, recurringExpenses); setUnsaved(true); return next;
    });
  }, [allProjects, paymentInfo, recurringExpenses]);

  var changeRecurringExpenses = useCallback(function (list) {
    setRecurringExpenses(function () {
      persistLocal(allProjects, expenses, paymentInfo, list); setUnsaved(true); return list;
    });
  }, [allProjects, expenses, paymentInfo]);

  var changePaymentInfo = useCallback(function (pid, key, value) {
    setPaymentInfo(function (prev) {
      var current = Object.assign({ regNo: "", taxType: "3.3%", bank: "", account: "", paid: false }, prev[pid]);
      current[key] = value;
      var next = Object.assign({}, prev, { [pid]: current });
      persistLocal(allProjects, expenses, next, recurringExpenses); setUnsaved(true); return next;
    });
  }, [allProjects, expenses, recurringExpenses]);

  var handleSave = useCallback(async function () {
    setSaveStatus("saving");
    var ok = await saveProjectSheets({ projects: allProjects, expenses: expenses, paymentInfo: paymentInfo, recurringExpenses: recurringExpenses });
    setSaveStatus(ok ? "saved" : "error");
    if (ok) setUnsaved(false);
    setTimeout(function () { setSaveStatus("idle"); }, 2500);
  }, [allProjects, expenses, paymentInfo, recurringExpenses]);

  var t = T(dark);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700, color: "#4f46e5" }}>데이터 불러오는 중...</div>
        </div>
      </div>
    );
  }

  var navItems = [["dashboard", "실적 대시보드", "📈"], ["projects", "촬영 정산내역", "🎬"], ["expenses", "운영비용", "🧾"], ["payments", "모델 지급관리", "💸"]];

  var NavContent = (
    <div style={{ padding: 8 }}>
      {navItems.map(function (item) {
        return (
          <button key={item[0]} onClick={function () { setTab(item[0]); setMobileNavOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", background: tab === item[0] ? "#4f46e5" : "transparent", color: tab === item[0] ? "#fff" : t.sub, fontWeight: 700, fontSize: 13, marginBottom: 2, textAlign: "left" }}>
            <span>{item[2]}</span>{item[1]}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {isMobile && mobileNavOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={function () { setMobileNavOpen(false); }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 220, background: t.card, borderRight: "1px solid " + t.border, boxShadow: "4px 0 20px rgba(0,0,0,0.2)", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
            <div style={{ padding: "14px 14px 8px", borderBottom: "1px solid " + t.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900, color: t.text, fontSize: 14 }}>메뉴</span>
              <button onClick={function () { setMobileNavOpen(false); }} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", fontSize: 20 }}>x</button>
            </div>
            {NavContent}
          </div>
        </div>
      )}

      <header style={{ background: t.card, borderBottom: "1px solid " + t.border, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
        {isMobile && (
          <button onClick={function () { setMobileNavOpen(true); }} style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid " + t.border, background: "transparent", color: t.text, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
        )}
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#10b981,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>PJ</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: t.text, fontSize: 13, lineHeight: 1.1 }}>MoMo Agency</div>
          <div style={{ fontSize: 10, color: t.sub }}>촬영 정산 · 회사 손익 관리</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <a href="#settlement" style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid " + t.border, display: "flex", alignItems: "center", fontWeight: 700, fontSize: 11, color: t.text, textDecoration: "none" }}>모델 정산관리 →</a>
          <button onClick={handleSave} disabled={saveStatus === "saving"} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", cursor: saveStatus === "saving" ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 11, background: saveStatus === "saved" ? "#d1fae5" : saveStatus === "error" ? "#fee2e2" : unsaved ? "#4f46e5" : (dark ? "#1e293b" : "#e2e8f0"), color: saveStatus === "saved" ? "#065f46" : saveStatus === "error" ? "#991b1b" : unsaved ? "#fff" : t.sub }}>
            {saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "저장됨" : saveStatus === "error" ? "실패" : unsaved ? "저장" : "저장됨"}
          </button>
          <button onClick={function () { setDark(function (v) { return !v; }); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + t.border, background: t.card, color: t.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{dark ? "☀" : "🌙"}</button>
        </div>
      </header>

      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "12px " + (isMobile ? "12px" : "16px"), display: "flex", gap: 14, paddingBottom: isMobile ? 70 : 16 }}>
        {!isMobile && (
          <aside style={{ width: 175, flexShrink: 0 }}>
            <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, position: "sticky", top: 56 }}>
              {NavContent}
            </div>
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0 }}>
          {tab === "dashboard" && <DashboardTab year={year} setYear={setYear} allProjects={allProjects} expenses={expenses} recurringExpenses={recurringExpenses} dark={dark} />}
          {tab === "projects" && <ProjectsTab year={year} month={month} setYear={setYear} setMonth={setMonth} allProjects={allProjects} expenses={expenses} recurringExpenses={recurringExpenses} affiliatedModels={affiliatedModels} onAdd={addProject} onUpdate={updateProject} onRemove={removeProject} dark={dark} />}
          {tab === "expenses" && <ExpensesTab year={year} month={month} setYear={setYear} setMonth={setMonth} expenses={expenses} recurringExpenses={recurringExpenses} allProjects={allProjects} onChange={changeExpenses} onChangeRecurring={changeRecurringExpenses} dark={dark} />}
          {tab === "payments" && <PaymentsTab year={year} month={month} setYear={setYear} setMonth={setMonth} allProjects={allProjects} paymentInfo={paymentInfo} onChangeInfo={changePaymentInfo} dark={dark} />}
        </main>
      </div>

      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.card, borderTop: "1px solid " + t.border, display: "flex", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.1)" }}>
          {navItems.map(function (item) {
            return (
              <button key={item[0]} onClick={function () { setTab(item[0]); }} style={{ flex: 1, padding: "8px 4px 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: tab === item[0] ? 20 : 16 }}>{item[2]}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: tab === item[0] ? "#4f46e5" : t.sub, whiteSpace: "nowrap" }}>{item[1]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
