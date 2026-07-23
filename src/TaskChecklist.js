import { useState, useEffect, useCallback } from "react";

var CATEGORIES_DEFAULT_ORDER = ["외국인 정산 정리", "컨택", "자료 업데이트", "비자 준비"];
var MONTHS_LABEL = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
var WEEKDAYS_KR = ["일","월","화","수","목","금","토"];
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


// ── 전체 업무 정리 (상단 마스터 목록) ──────────────────────────────────────
function OverviewSection({ templates, onUpdateTask, onRemoveTask, onAddTask, t, dark }) {
  var groups = groupByCategory(templates);
  var addTask = function () { onAddTask(); };

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>전체 업무 정리 ({templates.length}개)</div>
        <button onClick={addTask} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ 업무 추가</button>
      </div>
      {groups.length === 0 && <div style={{ color: t.sub, fontSize: 12, padding: "12px 0", textAlign: "center" }}>등록된 업무가 없습니다.</div>}
      {groups.map(function (g) {
        return (
          <div key={g.category} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", marginBottom: 4 }}>{g.category}</div>
            {g.tasks.map(function (tp) {
              return (
                <div key={tp.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 32px", gap: 6, marginBottom: 5, alignItems: "center" }}>
                  <input value={tp.category} onChange={function (e) { onUpdateTask(tp.id, "category", e.target.value); }} style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12 }} />
                  <input value={tp.title} onChange={function (e) { onUpdateTask(tp.id, "title", e.target.value); }} placeholder="업무명" style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12 }} />
                  <select value={tp.frequency} onChange={function (e) { onUpdateTask(tp.id, "frequency", e.target.value); }} style={{ padding: "6px 4px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 11 }}>
                    <option value="daily">매일</option>
                    <option value="weekly">매주</option>
                    <option value="monthly">매월</option>
                  </select>
                  <button onClick={function () { onRemoveTask(tp.id); }} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer" }}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── 기간 카드 (월/주차/일 공통) ───────────────────────────────────────────
function PeriodCard({ topLabel, mainLabel, isCurrent, groups, periodKey, completions, onToggle, onUpdateTitle, onRemoveTask, onAddTask, t, dark, style }) {
  return (
    <div style={Object.assign({ background: isCurrent ? (dark ? "#1e2a4a" : "#eef2ff") : t.card2, border: isCurrent ? "2.5px solid #4f46e5" : "1px solid " + t.border, borderRadius: 12, padding: "12px 12px", boxShadow: isCurrent ? "0 0 0 3px rgba(79,70,229,0.15)" : "none" }, style)}>
      {topLabel ? <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? "#4f46e5" : t.sub, marginBottom: 2 }}>{topLabel}</div> : null}
      <div style={{ fontSize: 18, fontWeight: 900, color: isCurrent ? "#4f46e5" : t.text, marginBottom: 8 }}>{mainLabel}</div>
      {groups.length === 0 && <div style={{ fontSize: 11, color: t.sub, marginBottom: 6 }}>업무 없음</div>}
      {groups.map(function (g) {
        return (
          <div key={g.category} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#7c7fdb", marginBottom: 3 }}>{g.category}</div>
            {g.tasks.map(function (tp) {
              var key = tp.id + "|" + periodKey;
              var checked = !!completions[key];
              return (
                <div key={tp.id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <input type="checkbox" checked={checked} onChange={function () { onToggle(tp.id, periodKey); }} style={{ width: 14, height: 14, flexShrink: 0, accentColor: "#4f46e5" }} />
                  <input value={tp.title} onChange={function (e) { onUpdateTitle(tp.id, e.target.value); }} title={tp.desc} style={{ flex: 1, minWidth: 0, fontSize: 11.5, background: "transparent", border: "none", color: checked ? t.sub : t.text, textDecoration: checked ? "line-through" : "none", padding: "2px 3px", borderRadius: 4 }} />
                  <button onClick={function () { onRemoveTask(tp.id); }} style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <button onClick={onAddTask} style={{ width: "100%", marginTop: 4, padding: "4px 0", borderRadius: 6, border: "1px dashed " + t.ib, background: "transparent", color: t.sub, fontSize: 11, cursor: "pointer" }}>+ 업무 추가</button>
    </div>
  );
}

function PeriodSection({ title, subtitle, cards, gridStyle, t, dark }) {
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
              completions={c.completions} onToggle={c.onToggle} onUpdateTitle={c.onUpdateTitle} onRemoveTask={c.onRemoveTask} onAddTask={c.onAddTask} t={t} dark={dark} style={c.cardStyle} />
          );
        })}
      </div>
    </div>
  );
}

// ── 비정기 업무: 등록과 동시에 완료 처리하는 빠른 로그 ─────────────────────
function AdhocSection({ entries, onAdd, onRemove, t, dark }) {
  var [text, setText] = useState("");
  var submit = function () {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: t.text, marginBottom: 4 }}>비정기 업무</div>
      <div style={{ fontSize: 11, color: t.sub, marginBottom: 10 }}>미리 등록할 필요 없이, 처리한 업무를 바로 입력하고 등록하면 오늘 날짜로 기록됩니다.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={text} onChange={function (e) { setText(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") submit(); }} placeholder="예: 모델 DB 업데이트, 비자 서류 준비" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 13 }} />
        <button onClick={submit} style={{ padding: "0 16px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>완료 등록</button>
      </div>
      {entries.length === 0 && <div style={{ color: t.sub, fontSize: 12, textAlign: "center", padding: "10px 0" }}>등록된 기록이 없습니다.</div>}
      {entries.slice(0, 20).map(function (e) {
        return (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: t.card2, border: "1px solid " + t.border, borderRadius: 9, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 800, flexShrink: 0 }}>{e.date}</span>
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

  if (saved && saved.checklistTemplates && saved.checklistTemplates.length) {
    templates = saved.checklistTemplates.filter(function (tp) { return tp.frequency !== "adhoc"; });
  }
  if (saved && saved.checklistCompletions) completions = saved.checklistCompletions;

  if (saved && Array.isArray(saved.checklistAdhocEntries)) {
    adhocEntries = saved.checklistAdhocEntries;
  } else if (saved && saved.checklistAdhocLogs && saved.checklistTemplates) {
    var oldAdhocTemplates = saved.checklistTemplates.filter(function (tp) { return tp.frequency === "adhoc"; });
    oldAdhocTemplates.forEach(function (tp) {
      var dates = saved.checklistAdhocLogs[tp.id] || [];
      dates.forEach(function (d) { adhocEntries.push({ id: uid(), title: tp.title, date: d }); });
    });
  }
  adhocEntries.sort(function (a, b) { return b.date.localeCompare(a.date); });

  return { templates: templates, completions: completions, adhocEntries: adhocEntries };
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
  var [year, setYear] = useState(TODAY.getFullYear());
  var [month, setMonth] = useState(TODAY.getMonth() + 1);
  var [dailyWeekStart, setDailyWeekStart] = useState(weekStartOf(TODAY));
  var [saveStatus, setSaveStatus] = useState("idle");

  useEffect(function () {
    loadWork().then(function (saved) {
      var norm = normalizeLoaded(saved);
      setTemplates(norm.templates);
      setCompletions(norm.completions);
      setAdhocEntries(norm.adhocEntries);
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, []);

  var persist = useCallback(async function (nextTemplates, nextCompletions, nextAdhocEntries) {
    setSaveStatus("saving");
    var current = (await loadWork()) || {};
    var merged = Object.assign({}, current, {
      checklistTemplates: nextTemplates, checklistCompletions: nextCompletions, checklistAdhocEntries: nextAdhocEntries,
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
      persist(templates, next, adhocEntries);
      return next;
    });
  };

  var updateTask = function (id, key, value) {
    setTemplates(function (prev) {
      var next = prev.map(function (tp) { return tp.id === id ? Object.assign({}, tp, { [key]: value }) : tp; });
      persist(next, completions, adhocEntries);
      return next;
    });
  };
  var updateTaskTitle = function (id, title) { updateTask(id, "title", title); };
  var removeTask = function (id) {
    setTemplates(function (prev) {
      var next = prev.filter(function (tp) { return tp.id !== id; });
      persist(next, completions, adhocEntries);
      return next;
    });
  };
  var addTask = function (frequency) {
    setTemplates(function (prev) {
      var next = prev.concat([{ id: uid(), category: "기타", title: "", desc: "", frequency: frequency || "daily" }]);
      persist(next, completions, adhocEntries);
      return next;
    });
  };

  var addAdhoc = function (title) {
    setAdhocEntries(function (prev) {
      var next = [{ id: uid(), title: title, date: dateStr(new Date()) }].concat(prev);
      persist(templates, completions, next);
      return next;
    });
  };
  var removeAdhoc = function (id) {
    setAdhocEntries(function (prev) {
      var next = prev.filter(function (e) { return e.id !== id; });
      persist(templates, completions, next);
      return next;
    });
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: t.sub }}>업무 체크리스트 불러오는 중...</div>;
  }

  var monthlyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "monthly"; }));
  var weeklyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "weekly"; }));
  var dailyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "daily"; }));

  var todayMonthKey = TODAY.getFullYear() + "-" + pad2(TODAY.getMonth() + 1);
  var monthlyCards = MONTHS_LABEL.map(function (label, i) {
    var m = i + 1;
    var periodKey = year + "-" + pad2(m);
    return {
      periodKey: periodKey, topLabel: null, mainLabel: label, isCurrent: periodKey === todayMonthKey,
      groups: monthlyGroups, completions: completions, onToggle: toggleCompletion,
      onUpdateTitle: updateTaskTitle, onRemoveTask: removeTask, onAddTask: function () { addTask("monthly"); },
    };
  });

  var weeks = weeksInMonth(year, month);
  var todayWeekKey = dateStr(weekStartOf(TODAY));
  var weeklyCards = weeks.map(function (mon, i) {
    var end = addDays(mon, 6);
    var periodKey = dateStr(mon);
    return {
      periodKey: periodKey, topLabel: (i + 1) + "주차" + (periodKey === todayWeekKey ? " · 이번 주" : ""),
      mainLabel: (mon.getMonth() + 1) + "." + mon.getDate() + " ~ " + (end.getMonth() + 1) + "." + end.getDate(),
      isCurrent: periodKey === todayWeekKey, groups: weeklyGroups, completions: completions, onToggle: toggleCompletion,
      onUpdateTitle: updateTaskTitle, onRemoveTask: removeTask, onAddTask: function () { addTask("weekly"); },
      cardStyle: { minWidth: 210, flexShrink: 0 },
    };
  });

  var todayDayKey = dateStr(TODAY);
  var dailyCards = [];
  for (var di = 0; di < 7; di++) {
    var dObj = addDays(dailyWeekStart, di);
    var periodKey = dateStr(dObj);
    dailyCards.push({
      periodKey: periodKey, topLabel: WEEKDAYS_KR[dObj.getDay()] + (periodKey === todayDayKey ? " · 오늘" : ""),
      mainLabel: (dObj.getMonth() + 1) + "." + dObj.getDate(), isCurrent: periodKey === todayDayKey, groups: dailyGroups, completions: completions, onToggle: toggleCompletion,
      onUpdateTitle: updateTaskTitle, onRemoveTask: removeTask, onAddTask: function () { addTask("daily"); },
    });
  }
  var dailyWeekEnd = addDays(dailyWeekStart, 6);
  var dailyRangeLabel = (dailyWeekStart.getMonth() + 1) + "." + dailyWeekStart.getDate() + " ~ " + (dailyWeekEnd.getMonth() + 1) + "." + dailyWeekEnd.getDate();

  return (
    <div>
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

      <OverviewSection templates={templates} onUpdateTask={updateTask} onRemoveTask={removeTask} onAddTask={function () { addTask("daily"); }} t={t} dark={dark} />

      <PeriodSection title={year + "년 월별 업무"} subtitle="1~6월, 7~12월 두 줄로 표시" cards={monthlyCards} t={t} dark={dark}
        gridStyle={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 }} />

      <PeriodSection title={year + "년 " + month + "월 주차별 업무"} subtitle="가로로 넘기면 다른 주 확인 가능" cards={weeklyCards} t={t} dark={dark}
        gridStyle={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }} />

      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>일별 업무 ({dailyRangeLabel})</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={function () { setDailyWeekStart(addDays(dailyWeekStart, -7)); }} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid " + t.border, background: t.card2, color: t.text, cursor: "pointer" }}>‹</button>
          <button onClick={function () { setDailyWeekStart(addDays(dailyWeekStart, 7)); }} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid " + t.border, background: t.card2, color: t.text, cursor: "pointer" }}>›</button>
          <button onClick={function () { setDailyWeekStart(weekStartOf(TODAY)); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + t.border, background: "transparent", color: t.sub, fontSize: 12, cursor: "pointer" }}>이번 주</button>
          <input type="date" onChange={function (e) { if (e.target.value) setDailyWeekStart(weekStartOf(new Date(e.target.value + "T00:00:00"))); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12 }} />
          <span style={{ fontSize: 11, color: t.sub }}>날짜를 고르면 그 주로 이동합니다</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 }}>
          {dailyCards.map(function (c) {
            return (
              <PeriodCard key={c.periodKey} topLabel={c.topLabel} mainLabel={c.mainLabel} isCurrent={c.isCurrent} groups={c.groups} periodKey={c.periodKey}
                completions={c.completions} onToggle={c.onToggle} onUpdateTitle={c.onUpdateTitle} onRemoveTask={c.onRemoveTask} onAddTask={c.onAddTask} t={t} dark={dark} style={c.cardStyle} />
            );
          })}
        </div>
      </div>

      <AdhocSection entries={adhocEntries} onAdd={addAdhoc} onRemove={removeAdhoc} t={t} dark={dark} />
    </div>
  );
}
