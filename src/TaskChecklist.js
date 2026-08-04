import { useState, useEffect, useCallback } from "react";

var CATEGORIES_DEFAULT_ORDER = ["외국인 정산 정리", "컨택", "자료 업데이트", "비자 준비"];
var MONTHS_LABEL = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
var TODAY = new Date();
var YEARS_LIST = [TODAY.getFullYear() - 1, TODAY.getFullYear(), TODAY.getFullYear() + 1];

function pad2(n) { return n < 10 ? ("0" + n) : ("" + n); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function dateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function weekStartOf(d) {
  var day = d.getDay();
  var diffToMonday = day === 0 ? -6 : 1 - day;
  var monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }

function weeksInMonth(year, month) {
  var first = new Date(year, month - 1, 1);
  var last = new Date(year, month, 0);
  var cur = weekStartOf(first);
  var weeks = [];
  while (cur <= last) {
    weeks.push(new Date(cur));
    cur = addDays(cur, 7);
  }
  return weeks;
}

var DEFAULT_TEMPLATES = [
  { id: uid(), category: "외국인 정산 정리", title: "단톡방 모니터링", desc: "비자 지원 모델 단톡방에 상주하며 모델들이 작성한 '모델 섭외 요청서' 확인", frequency: "daily" },
  { id: uid(), category: "외국인 정산 정리", title: "섭외 요청 내용 정산 시트 입력", desc: "확인된 섭외 요청 내용을 정산 시트에 입력 및 관리", frequency: "daily" },
  { id: uid(), category: "외국인 정산 정리", title: "입금 확인 후 정산 반영", desc: "정은아 확인 후 업체에서 입금된 건 정산 시스템에 바로 반영", frequency: "daily" },
  { id: uid(), category: "외국인 정산 정리", title: "말일 전 모델 알림 발송", desc: "추가로 입금 받을 건이 있는지 모델들에게 안내, 말일까지 입금되면 이번 달 정산에 포함", frequency: "monthly" },
  { id: uid(), category: "외국인 정산 정리", title: "정산 결과 제출 및 안내", desc: "정산 후 반영된 자료를 모델들에게 제출하고 확인 안내 공지", frequency: "monthly" },
  { id: uid(), category: "컨택", title: "신규 모델 프로필 수집", desc: "인스타그램/페이스북/스레드 등 SNS로 신규 국내외 모델에 촬영 제안(가짜) 후 프로필·포트폴리오 수집. 메일로 컨택한 인원은 별도 기재", frequency: "weekly" },
  { id: uid(), category: "컨택", title: "브랜드 컨택 메일 수집", desc: "영업 메일 발송용 브랜드 컨택 메일 주 5~10개 수집", frequency: "weekly" },
];

async function loadWork() {
  try {
    var r = await fetch("/api/work-sheets");
    var j = await r.json();
    return j.data || null;
  } catch (e) { return null; }
}
async function saveWork(payload) {
  try {
    var r = await fetch("/api/work-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });
    return r.ok;
  } catch (e) { return false; }
}

var CATEGORY_PALETTE = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
var UNSORTED_CATEGORY = "미분류";
function categoryColor(cat) {
  var str = cat || "";
  var h = 0;
  for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

function groupByCategory(list) {
  var groups = {};
  var order = [];
  list.forEach(function (tp) {
    if (!groups[tp.category]) { groups[tp.category] = []; order.push(tp.category); }
    groups[tp.category].push(tp);
  });
  order.sort(function (a, b) {
    var ia = CATEGORIES_DEFAULT_ORDER.indexOf(a), ib = CATEGORIES_DEFAULT_ORDER.indexOf(b);
    if (ia === -1) ia = 999; if (ib === -1) ib = 999;
    return ia - ib;
  });
  return order.map(function (cat) { return { category: cat, tasks: groups[cat] }; });
}


// ── 업무 추가 모달: 카테고리 선택 (업무 형태는 주간으로 고정) ──────────────
function AddTaskModal({ categories, defaultFrequency, onAdd, onClose, t, dark }) {
  var [category, setCategory] = useState(categories[0] || "기타");
  var [customCategory, setCustomCategory] = useState("");
  var [useCustom, setUseCustom] = useState(false);
  var [title, setTitle] = useState("");

  var submit = function () {
    var finalCategory = useCustom ? customCategory.trim() : category;
    if (!finalCategory) { alert("카테고리를 입력해주세요."); return; }
    if (!title.trim()) { alert("업무명을 입력해주세요."); return; }
    onAdd({ category: finalCategory, title: title.trim(), frequency: "weekly", desc: "" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 16, padding: 22, width: "100%", maxWidth: 400 }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ color: t.text, fontWeight: 900, marginBottom: 16, fontSize: 16 }}>주간 업무 추가</h3>

        <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, marginBottom: 4 }}>카테고리</div>
        {!useCustom ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <select value={category} onChange={function (e) { setCategory(e.target.value); }} style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13 }}>
              {categories.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
            <button onClick={function () { setUseCustom(true); }} style={{ padding: "0 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.text, fontSize: 12, cursor: "pointer" }}>+ 새 카테고리</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <input value={customCategory} onChange={function (e) { setCustomCategory(e.target.value); }} placeholder="새 카테고리명" style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13 }} />
            <button onClick={function () { setUseCustom(false); }} style={{ padding: "0 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontSize: 12, cursor: "pointer" }}>취소</button>
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, marginBottom: 4 }}>업무명</div>
        <input value={title} onChange={function (e) { setTitle(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") submit(); }} placeholder="예: 단톡방 모니터링" style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, marginBottom: 18, boxSizing: "border-box" }} />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontWeight: 700, cursor: "pointer" }}>취소</button>
          <button onClick={submit} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, cursor: "pointer" }}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── 카테고리(업무 형태 분류) 관리 — 별도 버튼으로 여는 모달 ────────────────
function CategoryManagerModal({ open, categories, onChange, onClose, dark, t }) {
  if (!open) return null;
  var updateName = function (idx, value) {
    var next = categories.slice();
    var oldName = next[idx];
    next[idx] = value;
    onChange(next, oldName, value);
  };
  var addCategory = function () {
    onChange(categories.concat(["새 카테고리"]), null, null);
  };
  var removeCategory = function (idx) {
    if (!window.confirm("이 카테고리를 목록에서 삭제할까요? 이미 등록된 업무의 카테고리 값은 그대로 남습니다.")) return;
    var next = categories.slice();
    next.splice(idx, 1);
    onChange(next, null, null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 16, padding: 22, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ color: t.text, fontWeight: 900, fontSize: 16, margin: 0 }}>카테고리 관리</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: t.sub, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: t.sub, marginBottom: 14 }}>업무를 분류하는 카테고리를 추가·수정·삭제합니다.</div>
        <button onClick={addCategory} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>+ 카테고리 추가</button>
        {categories.map(function (c, idx) {
          return (
            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: categoryColor(c), flexShrink: 0 }} />
              <input value={c} onChange={function (e) { updateName(idx, e.target.value); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13 }} />
              <button onClick={function () { removeCategory(idx); }} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer" }}>✕</button>
            </div>
          );
        })}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>완료</button>
        </div>
      </div>
    </div>
  );
}

// ── 전체 업무 정리 (상단 마스터 목록, 주간 업무만) ─────────────────────────
function OverviewSection({ templates, onRemoveTask, onOpenAdd, onManageCategories, t, dark }) {
  var list = templates.filter(function (tp) { return tp.frequency === "weekly"; });
  var groups = groupByCategory(list);
  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>전체 주간 업무 <span style={{ color: t.sub, fontWeight: 700, fontSize: 13 }}>({list.length}개)</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onManageCategories} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>⚙ 카테고리 관리</button>
          <button onClick={function () { onOpenAdd(null); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ 업무 추가</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ color: t.sub, fontSize: 12, padding: "20px 0", textAlign: "center" }}>등록된 업무가 없습니다.</div>
      ) : (
        <>
          {/* 카테고리별 개수 배지 — 한눈에 보는 요약 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0 16px" }}>
            {groups.map(function (g) {
              return (
                <span key={g.category} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: t.text, background: t.card2, border: "1px solid " + t.border, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: categoryColor(g.category), flexShrink: 0 }} />
                  {g.category} {g.tasks.length}
                </span>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {groups.map(function (g) {
              var color = categoryColor(g.category);
              return (
                <div key={g.category} style={{ border: "1px solid " + t.border, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: t.card2, borderLeft: "3px solid " + color }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{g.category}</span>
                  </div>
                  <div>
                    {g.tasks.map(function (tp, idx) {
                      return (
                        <div key={tp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderTop: idx === 0 ? "none" : "1px solid " + t.border }}>
                          <span style={{ fontSize: 12.5, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tp.title || "(제목 없음)"}</span>
                          <button onClick={function () { onRemoveTask(tp.id); }} style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── 기간 카드 (주간) ───────────────────────────────────────────────────────
function PeriodCard({ topLabel, mainLabel, isCurrent, groups, periodKey, completions, onToggle, onUpdateTitle, onRemoveTask, onQuickAdd, adhocItems, onToggleAdhocDone, onRemoveAdhoc, categories, t, dark, style }) {
  var [quickText, setQuickText] = useState("");
  var submitQuick = function () {
    if (!quickText.trim()) return;
    onQuickAdd(UNSORTED_CATEGORY, quickText.trim());
    setQuickText("");
  };
  var allTasks = [];
  groups.forEach(function (g) { allTasks = allTasks.concat(g.tasks); });

  return (
    <div style={Object.assign({ background: isCurrent ? (dark ? "#1e2a4a" : "#eef2ff") : t.card2, border: isCurrent ? "2.5px solid #4f46e5" : "1px solid " + t.border, borderRadius: 12, padding: "12px 12px", boxShadow: isCurrent ? "0 0 0 3px rgba(79,70,229,0.15)" : "none" }, style)}>
      {topLabel ? <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? "#4f46e5" : t.sub, marginBottom: 2 }}>{topLabel}</div> : null}
      <div style={{ fontSize: 18, fontWeight: 900, color: isCurrent ? "#4f46e5" : t.text, marginBottom: 8 }}>{mainLabel}</div>
      {allTasks.length === 0 && (!adhocItems || adhocItems.length === 0) && <div style={{ fontSize: 11, color: t.sub, marginBottom: 6 }}>업무 없음</div>}

      {allTasks.map(function (tp) {
        var key = tp.id + "|" + periodKey;
        var checked = !!completions[key];
        var color = categoryColor(tp.category);
        return (
          <div key={tp.id} title={tp.category} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, paddingLeft: 6, borderLeft: "3px solid " + color, borderRadius: 3 }}>
            <input type="checkbox" checked={checked} onChange={function () { onToggle(tp.id, periodKey); }} style={{ width: 14, height: 14, flexShrink: 0, accentColor: "#4f46e5" }} />
            <input value={tp.title} onChange={function (e) { onUpdateTitle(tp.id, e.target.value); }} title={tp.desc} style={{ flex: 1, minWidth: 0, fontSize: 12, background: "transparent", border: "none", color: checked ? t.sub : t.text, textDecoration: checked ? "line-through" : "none", padding: "3px 3px", borderRadius: 4 }} />
            <button onClick={function () { onRemoveTask(tp.id); }} style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
          </div>
        );
      })}

      {adhocItems && adhocItems.length > 0 && (
        <div style={{ marginTop: allTasks.length > 0 ? 6 : 0, marginBottom: 4 }}>
          {adhocItems.map(function (e) {
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, paddingLeft: 6, borderLeft: "3px solid #f59e0b", borderRadius: 3 }}>
                <input type="checkbox" checked={!!e.done} onChange={function () { if (!e.done) onToggleAdhocDone(e.id); }} style={{ width: 14, height: 14, flexShrink: 0, accentColor: "#f59e0b" }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: e.done ? t.sub : t.text, textDecoration: e.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "3px 0" }}>{e.title}</span>
                <button onClick={function () { onRemoveAdhoc(e.id); }} style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <input value={quickText} onChange={function (e) { setQuickText(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") submitQuick(); }} placeholder="+ 업무 입력 후 Enter" style={{ width: "100%", marginTop: 8, padding: "6px 8px", borderRadius: 6, border: "1px dashed " + t.ib, background: "transparent", color: t.text, fontSize: 12, boxSizing: "border-box" }} />
    </div>
  );
}

function PeriodSection({ title, subtitle, cards, gridStyle, categories, onToggleAdhocDone, onRemoveAdhoc, t, dark }) {
  var totalCount = 0, doneCount = 0;
  cards.forEach(function (c) {
    c.groups.forEach(function (g) { g.tasks.forEach(function (tp) { totalCount++; if (c.completions[tp.id + "|" + c.periodKey]) doneCount++; }); });
  });

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: doneCount === totalCount && totalCount > 0 ? "#10b981" : "#4f46e5" }}>{doneCount}/{totalCount} 완료</div>
      </div>
      {subtitle ? <div style={{ fontSize: 11, color: t.sub, marginBottom: 12 }}>{subtitle}</div> : null}
      <div style={gridStyle}>
        {cards.map(function (c) {
          return (
            <PeriodCard key={c.periodKey} topLabel={c.topLabel} mainLabel={c.mainLabel} isCurrent={c.isCurrent} groups={c.groups} periodKey={c.periodKey}
              completions={c.completions} onToggle={c.onToggle} onUpdateTitle={c.onUpdateTitle} onRemoveTask={c.onRemoveTask} onQuickAdd={c.onQuickAdd}
              adhocItems={c.adhocItems} onToggleAdhocDone={onToggleAdhocDone} onRemoveAdhoc={onRemoveAdhoc} categories={categories} t={t} dark={dark} style={c.cardStyle} />
          );
        })}
      </div>
    </div>
  );
}

// ── 비정기 업무: 기한을 등록해두고 처리하면 체크, 또는 즉시 완료 로그 ─────
function AdhocSection({ entries, onAdd, onToggleDone, onRemove, onDeleteMonth, t, dark }) {
  var [text, setText] = useState("");
  var [rangeMode, setRangeMode] = useState(false);
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [delMonth, setDelMonth] = useState(dateStr(TODAY).slice(0, 7));

  var submitInstant = function () {
    if (!text.trim()) return;
    if (rangeMode) {
      if (!startDate || !endDate || startDate > endDate) { alert("시작일/종료일을 확인해주세요."); return; }
      onAdd(text.trim(), startDate, true, endDate);
    } else {
      onAdd(text.trim(), null, true); // 기한 없이 바로 완료 처리 (오늘 날짜)
    }
    setText(""); setStartDate(""); setEndDate("");
  };
  var submitDue = function () {
    if (!text.trim()) return;
    if (rangeMode) {
      if (!startDate || !endDate || startDate > endDate) { alert("시작일/종료일을 확인해주세요."); return; }
      onAdd(text.trim(), startDate, false, endDate);
    } else {
      if (!startDate) return;
      onAdd(text.trim(), startDate, false);
    }
    setText(""); setStartDate(""); setEndDate("");
  };

  var pending = entries.filter(function (e) { return !e.done; }).sort(function (a, b) { return (a.dueDate || "").localeCompare(b.dueDate || ""); });
  var done = entries.filter(function (e) { return e.done; });

  var monthCount = entries.filter(function (e) { return (e.completedDate || e.dueDate || e.date || "").slice(0, 7) === delMonth; }).length;
  var handleDeleteMonth = function () {
    if (monthCount === 0) return;
    if (!window.confirm(delMonth + " 기록 " + monthCount + "건을 모두 삭제할까요? 되돌릴 수 없습니다.")) return;
    onDeleteMonth(delMonth);
  };
  var inputStyleSm = { padding: "7px 9px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12 };
  var todayStr = dateStr(TODAY);

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: t.text, marginBottom: 4 }}>비정기 업무</div>
      <div style={{ fontSize: 11, color: t.sub, marginBottom: 10 }}>기한이 있는 업무는 "기한 등록"으로 날짜를 지정해두면 목록에 남고, 처리하면 체크하세요. 이미 처리한 업무는 바로 "완료 등록"하면 오늘 날짜로 기록됩니다. "기간 등록"을 켜면 시작~종료일을 지정할 수 있고, 해당 기간이 걸치는 주간 업무 카드에도 자동으로 표시됩니다.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={text} onChange={function (e) { setText(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter" && !rangeMode) submitInstant(); }} placeholder="예: 모델 DB 업데이트, 비자 서류 준비" style={{ flex: 1, minWidth: 180, padding: "9px 12px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.sub, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={rangeMode} onChange={function (e) { setRangeMode(e.target.checked); }} style={{ width: 14, height: 14 }} />
          기간 등록
        </label>
        {rangeMode ? (
          <>
            <input type="date" value={startDate} onChange={function (e) { setStartDate(e.target.value); }} style={inputStyleSm} title="시작일" />
            <span style={{ color: t.sub, fontSize: 12 }}>~</span>
            <input type="date" value={endDate} onChange={function (e) { setEndDate(e.target.value); }} style={inputStyleSm} title="종료일" />
          </>
        ) : (
          <input type="date" value={startDate} onChange={function (e) { setStartDate(e.target.value); }} style={inputStyleSm} title="기한 (선택 시 '기한 등록' 버튼 사용)" />
        )}
        <button onClick={submitInstant} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>완료 등록</button>
        <button onClick={submitDue} disabled={!startDate} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: startDate ? "#4f46e5" : (dark ? "#334155" : "#e2e8f0"), color: startDate ? "#fff" : t.sub, fontWeight: 700, fontSize: 12, cursor: startDate ? "pointer" : "default" }}>기한 등록</button>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: t.text, marginBottom: 6 }}>처리 대기 중 ({pending.length}건)</div>
          {pending.map(function (e) {
            var overdue = (e.endDate || e.dueDate) && (e.endDate || e.dueDate) < todayStr;
            var dueLabel = e.endDate && e.endDate !== e.dueDate ? (e.dueDate + " ~ " + e.endDate) : e.dueDate;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: overdue ? (dark ? "#2a1010" : "#fef2f2") : t.card2, border: "1px solid " + (overdue ? "#ef4444" : t.border), borderRadius: 9, marginBottom: 6 }}>
                <input type="checkbox" checked={false} onChange={function () { onToggleDone(e.id); }} style={{ width: 15, height: 15, flexShrink: 0, accentColor: "#4f46e5" }} />
                <span style={{ fontSize: 11, color: overdue ? "#ef4444" : "#4f46e5", fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>{overdue ? "지연 · " : "기한 "}{dueLabel}</span>
                <span style={{ flex: 1, fontSize: 13, color: t.text }}>{e.title}</span>
                <button onClick={function () { onRemove(e.id); }} style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 10px", background: t.card2, border: "1px solid " + t.border, borderRadius: 9 }}>
        <span style={{ fontSize: 11, color: t.sub, fontWeight: 700 }}>월별 일괄삭제</span>
        <input type="month" value={delMonth} onChange={function (e) { setDelMonth(e.target.value); }} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12 }} />
        <span style={{ fontSize: 11, color: t.sub }}>{monthCount}건</span>
        <button onClick={handleDeleteMonth} disabled={monthCount === 0} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 7, border: "none", background: monthCount === 0 ? (dark ? "#334155" : "#e2e8f0") : "#ef4444", color: monthCount === 0 ? t.sub : "#fff", fontWeight: 700, fontSize: 11, cursor: monthCount === 0 ? "default" : "pointer" }}>이 달 기록 삭제</button>
      </div>
      {done.length === 0 && <div style={{ color: t.sub, fontSize: 12, textAlign: "center", padding: "10px 0" }}>완료 기록이 없습니다.</div>}
      {done.slice(0, 20).map(function (e) {
        var dateLabel = e.endDate && e.endDate !== e.completedDate ? (e.completedDate + " ~ " + e.endDate) : (e.completedDate || e.date);
        return (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: t.card2, border: "1px solid " + t.border, borderRadius: 9, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>✓ {dateLabel}</span>
            <span style={{ flex: 1, fontSize: 13, color: t.text }}>{e.title}</span>
            <button onClick={function () { onRemove(e.id); }} style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function normalizeLoaded(saved) {
  var templates = DEFAULT_TEMPLATES;
  var completions = {};
  var adhocEntries = [];
  var categories = CATEGORIES_DEFAULT_ORDER.slice();

  if (saved && saved.checklistTemplates && saved.checklistTemplates.length) {
    templates = saved.checklistTemplates.filter(function (tp) { return tp.frequency !== "adhoc"; });
  }
  if (saved && saved.checklistCompletions) completions = saved.checklistCompletions;

  if (saved && Array.isArray(saved.checklistCategories) && saved.checklistCategories.length) {
    categories = saved.checklistCategories.slice();
  }
  templates.forEach(function (tp) { if (categories.indexOf(tp.category) === -1) categories.push(tp.category); });

  if (saved && Array.isArray(saved.checklistAdhocEntries)) {
    adhocEntries = saved.checklistAdhocEntries.map(function (e) {
      if (e.done === undefined) {
        // 이전 버전 데이터: date에 완료된 것으로 간주
        return Object.assign({}, e, { done: true, completedDate: e.completedDate || e.date });
      }
      return e;
    });
  } else if (saved && saved.checklistAdhocLogs && saved.checklistTemplates) {
    var oldAdhocTemplates = saved.checklistTemplates.filter(function (tp) { return tp.frequency === "adhoc"; });
    oldAdhocTemplates.forEach(function (tp) {
      var dates = saved.checklistAdhocLogs[tp.id] || [];
      dates.forEach(function (d) { adhocEntries.push({ id: uid(), title: tp.title, date: d, completedDate: d, done: true }); });
    });
  }
  adhocEntries.sort(function (a, b) { return (b.completedDate || b.dueDate || b.date || "").localeCompare(a.completedDate || a.dueDate || a.date || ""); });

  return { templates: templates, completions: completions, adhocEntries: adhocEntries, categories: categories };
}

export default function TaskChecklistTab({ dark }) {
  var t = {
    bg: dark ? "#0f172a" : "#f1f5f9", card: dark ? "#1e293b" : "#fff", border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#1e293b", sub: dark ? "#94a3b8" : "#64748b", input: dark ? "#0f172a" : "#fff",
    ib: dark ? "#475569" : "#d1d5db", thead: dark ? "#0f172a" : "#f8fafc", card2: dark ? "#162032" : "#f8fafc",
  };

  var [loading, setLoading] = useState(true);
  var [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  var [completions, setCompletions] = useState({});
  var [adhocEntries, setAdhocEntries] = useState([]);
  var [categories, setCategories] = useState(CATEGORIES_DEFAULT_ORDER.slice());
  var [addModalFreq, setAddModalFreq] = useState(null);
  var [showCategoryModal, setShowCategoryModal] = useState(false);
  var [year, setYear] = useState(TODAY.getFullYear());
  var [month, setMonth] = useState(TODAY.getMonth() + 1);
  var [saveStatus, setSaveStatus] = useState("idle");

  useEffect(function () {
    loadWork().then(function (saved) {
      var norm = normalizeLoaded(saved);
      setTemplates(norm.templates);
      setCompletions(norm.completions);
      setAdhocEntries(norm.adhocEntries);
      setCategories(norm.categories);
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, []);

  var persist = useCallback(async function (nextTemplates, nextCompletions, nextAdhocEntries, nextCategories) {
    setSaveStatus("saving");
    var current = (await loadWork()) || {};
    var merged = Object.assign({}, current, {
      checklistTemplates: nextTemplates, checklistCompletions: nextCompletions, checklistAdhocEntries: nextAdhocEntries,
      checklistCategories: nextCategories,
    });
    delete merged.checklistAdhocLogs;
    var ok = await saveWork(merged);
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(function () { setSaveStatus("idle"); }, 2000);
  }, []);

  var toggleCompletion = function (taskId, periodKey) {
    var key = taskId + "|" + periodKey;
    setCompletions(function (prev) {
      var next = Object.assign({}, prev);
      if (next[key]) { delete next[key]; } else { next[key] = true; }
      persist(templates, next, adhocEntries, categories);
      return next;
    });
  };

  var updateTask = function (id, key, value) {
    setTemplates(function (prev) {
      var next = prev.map(function (tp) { return tp.id === id ? Object.assign({}, tp, { [key]: value }) : tp; });
      persist(next, completions, adhocEntries, categories);
      return next;
    });
  };
  var updateTaskTitle = function (id, title) { updateTask(id, "title", title); };
  var removeTask = function (id) {
    setTemplates(function (prev) {
      var next = prev.filter(function (tp) { return tp.id !== id; });
      persist(next, completions, adhocEntries, categories);
      return next;
    });
  };
  var openAddModal = function (frequency) { setAddModalFreq(frequency || "daily"); };
  var confirmAddTask = function (newTask) {
    setTemplates(function (prev) {
      var next = prev.concat([{ id: uid(), category: newTask.category, title: newTask.title, desc: newTask.desc || "", frequency: newTask.frequency }]);
      persist(next, completions, adhocEntries, categories);
      return next;
    });
    if (categories.indexOf(newTask.category) === -1) {
      setCategories(function (prev) {
        var next = prev.concat([newTask.category]);
        persist(templates.concat([]), completions, adhocEntries, next);
        return next;
      });
    }
    setAddModalFreq(null);
  };
  var changeCategories = function (nextCategories, oldName, newName) {
    setCategories(nextCategories);
    if (oldName && newName && oldName !== newName) {
      setTemplates(function (prev) {
        var next = prev.map(function (tp) { return tp.category === oldName ? Object.assign({}, tp, { category: newName }) : tp; });
        persist(next, completions, adhocEntries, nextCategories);
        return next;
      });
    } else {
      persist(templates, completions, adhocEntries, nextCategories);
    }
  };

  var quickAddWeeklyTask = function (category, title) {
    confirmAddTask({ category: category, title: title, frequency: "weekly", desc: "" });
  };

  var addAdhoc = function (title, startDate, doneFlag, endDate) {
    setAdhocEntries(function (prev) {
      var entry = doneFlag
        ? { id: uid(), title: title, done: true, completedDate: startDate || dateStr(new Date()), endDate: endDate || null }
        : { id: uid(), title: title, done: false, dueDate: startDate, endDate: endDate || null };
      var next = [entry].concat(prev);
      persist(templates, completions, next, categories);
      return next;
    });
  };
  var toggleAdhocDone = function (id) {
    setAdhocEntries(function (prev) {
      var next = prev.map(function (e) {
        return e.id === id ? Object.assign({}, e, { done: true, completedDate: dateStr(new Date()) }) : e;
      });
      persist(templates, completions, next, categories);
      return next;
    });
  };
  var removeAdhoc = function (id) {
    setAdhocEntries(function (prev) {
      var next = prev.filter(function (e) { return e.id !== id; });
      persist(templates, completions, next, categories);
      return next;
    });
  };
  var deleteAdhocMonth = function (monthKey) {
    setAdhocEntries(function (prev) {
      var next = prev.filter(function (e) { return (e.completedDate || e.dueDate || e.date || "").slice(0, 7) !== monthKey; });
      persist(templates, completions, next, categories);
      return next;
    });
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: t.sub }}>업무 체크리스트 불러오는 중...</div>;
  }

  var weeklyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "weekly"; }));

  var weeks = weeksInMonth(year, month);
  var todayWeekKey = dateStr(weekStartOf(TODAY));

  // 비정기 업무의 유효 기간(시작~종료)을 계산
  var adhocRange = function (e) {
    var start = e.done ? (e.completedDate || e.date) : e.dueDate;
    var end = e.endDate || start;
    return { start: start, end: end };
  };

  var weeklyCards = weeks.map(function (mon, i) {
    var end = addDays(mon, 6);
    var periodKey = dateStr(mon);
    var weekStartStr = periodKey, weekEndStr = dateStr(end);
    var adhocItems = adhocEntries.filter(function (e) {
      var r = adhocRange(e);
      if (!r.start) return false;
      return r.start <= weekEndStr && r.end >= weekStartStr;
    });
    return {
      periodKey: periodKey, topLabel: (i + 1) + "주차" + (periodKey === todayWeekKey ? " · 이번 주" : ""),
      mainLabel: (mon.getMonth() + 1) + "." + mon.getDate() + " ~ " + (end.getMonth() + 1) + "." + end.getDate(),
      isCurrent: periodKey === todayWeekKey, groups: weeklyGroups, completions: completions, onToggle: toggleCompletion,
      onUpdateTitle: updateTaskTitle, onRemoveTask: removeTask, onQuickAdd: quickAddWeeklyTask, adhocItems: adhocItems,
    };
  });

  // 월간 정리: 이번 달에 속한 주차별로 어떤 업무가 완료됐는지 정리
  var monthlyRollup = weeklyGroups.map(function (g) {
    return {
      category: g.category,
      tasks: g.tasks.map(function (tp) {
        var weekFlags = weeklyCards.map(function (c) { return !!completions[tp.id + "|" + c.periodKey]; });
        var doneWeeks = weekFlags.filter(Boolean).length;
        return { id: tp.id, title: tp.title, weekFlags: weekFlags, done: doneWeeks, total: weeklyCards.length };
      }),
    };
  });
  var monthlyAdhoc = (function () {
    var seen = {};
    var list = [];
    weeklyCards.forEach(function (c, wi) {
      (c.adhocItems || []).forEach(function (e) {
        if (!seen[e.id]) { seen[e.id] = { id: e.id, title: e.title, done: e.done, weeks: [] }; list.push(seen[e.id]); }
        seen[e.id].weeks.push(wi + 1);
      });
    });
    return list;
  })();

  return (
    <div>
      {addModalFreq && <AddTaskModal categories={categories} defaultFrequency={addModalFreq} onAdd={confirmAddTask} onClose={function () { setAddModalFreq(null); }} t={t} dark={dark} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: t.text, letterSpacing: -0.5 }}>업무 체크리스트</div>
        <div style={{ fontSize: 11, color: t.sub }}>{saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "저장됨" : saveStatus === "error" ? "저장 실패" : ""}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <select value={year} onChange={function (e) { setYear(Number(e.target.value)); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13, fontWeight: 700 }}>
          {YEARS_LIST.map(function (y) { return <option key={y} value={y}>{y}년</option>; })}
        </select>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {MONTHS_LABEL.map(function (label, i) {
            var m = i + 1;
            var active = m === month;
            return <button key={m} onClick={function () { setMonth(m); }} style={{ padding: "6px 11px", borderRadius: 8, border: active ? "none" : "1px solid " + t.border, background: active ? "#4f46e5" : (dark ? t.card2 : t.card), color: active ? "#fff" : t.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{label}</button>;
          })}
        </div>
        <button onClick={function () { setYear(TODAY.getFullYear()); setMonth(TODAY.getMonth() + 1); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontSize: 12, cursor: "pointer" }}>오늘</button>
      </div>

      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text, marginBottom: 4 }}>{year}년 {month}월 월간 정리</div>
        <div style={{ fontSize: 11, color: t.sub, marginBottom: 12 }}>이 달의 주간 업무를 몇 주차에 처리했는지 모아서 보여줍니다.</div>
        {monthlyRollup.every(function (g) { return g.tasks.length === 0; }) && monthlyAdhoc.length === 0 && <div style={{ color: t.sub, fontSize: 12, textAlign: "center", padding: "10px 0" }}>등록된 업무가 없습니다.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          {monthlyRollup.map(function (g) {
            if (g.tasks.length === 0) return null;
            return (
              <div key={g.category}>
                <div style={{ fontSize: 11, fontWeight: 800, color: categoryColor(g.category), marginBottom: 6 }}>{g.category}</div>
                {g.tasks.map(function (tp) {
                  var full = tp.total > 0 && tp.done === tp.total;
                  return (
                    <div key={tp.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: t.text }}>{tp.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: full ? "#10b981" : t.sub }}>{tp.done}/{tp.total}주</span>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {tp.weekFlags.map(function (done, wi) {
                          return (
                            <div key={wi} title={(wi + 1) + "주차" + (done ? " 완료" : " 미완료")} style={{ flex: 1, textAlign: "center", padding: "3px 0", borderRadius: 5, fontSize: 9.5, fontWeight: 800, background: done ? "#10b981" : t.card2, color: done ? "#fff" : t.sub, border: done ? "none" : "1px solid " + t.border }}>{wi + 1}주</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {monthlyAdhoc.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", marginBottom: 6 }}>비정기</div>
              {monthlyAdhoc.map(function (e) {
                return (
                  <div key={e.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: t.text }}>{e.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: e.done ? "#10b981" : "#f59e0b" }}>{e.done ? "완료" : "진행중"}</span>
                    </div>
                    <div style={{ fontSize: 10, color: t.sub }}>{e.weeks.map(function (w) { return w + "주차"; }).join(", ")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CategoryManagerModal open={showCategoryModal} categories={categories} onChange={changeCategories} onClose={function () { setShowCategoryModal(false); }} dark={dark} t={t} />

      <OverviewSection templates={templates} onUpdateTask={updateTask} onRemoveTask={removeTask} onOpenAdd={openAddModal} onManageCategories={function () { setShowCategoryModal(true); }} t={t} dark={dark} />

      <PeriodSection title={year + "년 " + month + "월 주간 업무"} subtitle="화면 너비에 맞춰 모든 주차가 한 번에 표시됩니다. 카드 아래 입력창에 바로 업무를 적고 Enter로 추가하세요." cards={weeklyCards} categories={categories} onToggleAdhocDone={toggleAdhocDone} onRemoveAdhoc={removeAdhoc} t={t} dark={dark}
        gridStyle={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }} />

      <AdhocSection entries={adhocEntries} onAdd={addAdhoc} onToggleDone={toggleAdhocDone} onRemove={removeAdhoc} onDeleteMonth={deleteAdhocMonth} t={t} dark={dark} />
    </div>
  );
}
