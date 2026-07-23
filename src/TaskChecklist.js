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
  { id: uid(), category: "자료 업데이트", title: "모델 DB 업데이트", desc: "비정기적으로 발생 - 모델 DB 최신화", frequency: "adhoc" },
  { id: uid(), category: "비자 준비", title: "비자 준비", desc: "비정기적으로 발생 - 비자 서류/절차 준비", frequency: "adhoc" },
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

function inputStyle(t) {
  return { width: "100%", padding: "7px 9px", borderRadius: 7, border: "1px solid " + t.ib, background: t.input, color: t.text, fontSize: 12, boxSizing: "border-box" };
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

function GridSection({ title, subtitle, periods, groups, completions, onToggle, t, dark, colWidth, highlightKey }) {
  var totalCount = 0, doneCount = 0;
  groups.forEach(function (g) { g.tasks.forEach(function (tp) { periods.forEach(function (p) { totalCount++; if (completions[tp.id + "|" + p.key]) doneCount++; }); }); });

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: t.text }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: doneCount === totalCount && totalCount > 0 ? "#10b981" : "#4f46e5" }}>{doneCount}/{totalCount} 완료</div>
      </div>
      {subtitle ? <div style={{ fontSize: 11, color: t.sub, marginBottom: 10 }}>{subtitle}</div> : null}
      {groups.length === 0 ? (
        <div style={{ color: t.sub, fontSize: 12, padding: "16px 0", textAlign: "center" }}>등록된 업무가 없습니다.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 220 + periods.length * colWidth }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 2, background: t.card, textAlign: "left", padding: "6px 10px", fontSize: 12, color: t.sub, minWidth: 220, borderBottom: "1px solid " + t.border }}>업무</th>
                {periods.map(function (p) {
                  var isHighlight = highlightKey && p.key === highlightKey;
                  return <th key={p.key} style={{ padding: "6px 4px", fontSize: 11, fontWeight: isHighlight ? 900 : 700, color: isHighlight ? "#4f46e5" : t.sub, textAlign: "center", minWidth: colWidth, borderBottom: "1px solid " + t.border }}>{p.label}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {groups.map(function (g) {
                return (
                  <>
                    <tr key={g.category + "_hdr"}>
                      <td colSpan={periods.length + 1} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 800, color: "#4f46e5", background: t.thead, position: "sticky", left: 0 }}>{g.category}</td>
                    </tr>
                    {g.tasks.map(function (tp) {
                      return (
                        <tr key={tp.id}>
                          <td title={tp.desc} style={{ position: "sticky", left: 0, background: t.card2, padding: "6px 10px", fontSize: 12, color: t.text, fontWeight: 700, borderBottom: "1px solid " + t.border, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{tp.title}</td>
                          {periods.map(function (p) {
                            var key = tp.id + "|" + p.key;
                            var checked = !!completions[key];
                            var isHighlight = highlightKey && p.key === highlightKey;
                            return (
                              <td key={p.key} style={{ textAlign: "center", padding: 3, borderBottom: "1px solid " + t.border, background: isHighlight ? (dark ? "#1e2a4a" : "#eef2ff") : "transparent" }}>
                                <button onClick={function () { onToggle(tp.id, p.key); }} style={{ width: 26, height: 26, borderRadius: 6, border: checked ? "none" : "1px solid " + t.ib, background: checked ? "#10b981" : "transparent", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 12 }}>{checked ? "✓" : ""}</button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdhocSection({ groups, adhocLogs, onToggle, t, dark }) {
  var today = dateStr(new Date());
  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: t.text, marginBottom: 10 }}>비정기 업무</div>
      {groups.length === 0 && <div style={{ color: t.sub, fontSize: 12, padding: "16px 0", textAlign: "center" }}>등록된 비정기 업무가 없습니다.</div>}
      {groups.map(function (g) {
        return (
          <div key={g.category} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", marginBottom: 6 }}>{g.category}</div>
            {g.tasks.map(function (tp) {
              var log = adhocLogs[tp.id] || [];
              var doneToday = log.indexOf(today) >= 0;
              return (
                <div key={tp.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: doneToday ? (dark ? "#0f2a1e" : "#ecfdf5") : t.card2, border: "1px solid " + (doneToday ? "#10b981" : t.border), borderRadius: 10, marginBottom: 8 }}>
                  <button onClick={function () { onToggle(tp.id); }} style={{ width: 24, height: 24, borderRadius: 7, border: doneToday ? "none" : "1px solid " + t.ib, background: doneToday ? "#10b981" : "transparent", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>{doneToday ? "✓" : ""}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{tp.title}</div>
                    {tp.desc ? <div style={{ fontSize: 11, color: t.sub, lineHeight: 1.4 }}>{tp.desc}</div> : null}
                  </div>
                  <div style={{ fontSize: 10, color: t.sub, whiteSpace: "nowrap", flexShrink: 0 }}>{log.length > 0 ? "최근: " + log[0] : "기록 없음"}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TemplateManager({ templates, onChange, dark, t }) {
  var [open, setOpen] = useState(false);
  var addTemplate = function () {
    onChange(templates.concat([{ id: uid(), category: "기타", title: "", desc: "", frequency: "daily" }]));
  };
  var update = function (id, key, value) {
    onChange(templates.map(function (tp) { return tp.id === id ? Object.assign({}, tp, { [key]: value }) : tp; }));
  };
  var remove = function (id) {
    if (!window.confirm("이 업무 항목을 삭제할까요? 지금까지의 체크 기록은 남지만 목록에서 사라집니다.")) return;
    onChange(templates.filter(function (tp) { return tp.id !== id; }));
  };

  return (
    <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 12, overflow: "hidden", marginTop: 4 }}>
      <button onClick={function () { setOpen(!open); }} style={{ width: "100%", padding: "10px 12px", background: t.thead, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: t.text }}>업무 항목 관리 (추가/수정/삭제)</span>
        <span style={{ fontSize: 11, color: t.sub }}>{open ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>
      {open && (
        <div style={{ padding: 12 }}>
          <button onClick={addTemplate} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", marginBottom: 10 }}>+ 업무 항목 추가</button>
          {templates.map(function (tp) {
            return (
              <div key={tp.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.6fr 0.8fr 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input value={tp.category} onChange={function (e) { update(tp.id, "category", e.target.value); }} placeholder="카테고리" style={inputStyle(t)} />
                <input value={tp.title} onChange={function (e) { update(tp.id, "title", e.target.value); }} placeholder="업무명" style={inputStyle(t)} />
                <input value={tp.desc} onChange={function (e) { update(tp.id, "desc", e.target.value); }} placeholder="설명" style={inputStyle(t)} />
                <select value={tp.frequency} onChange={function (e) { update(tp.id, "frequency", e.target.value); }} style={inputStyle(t)}>
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                  <option value="adhoc">비정기</option>
                </select>
                <button onClick={function () { remove(tp.id); }} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "#ef444440", color: "#ef4444", cursor: "pointer" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  var [adhocLogs, setAdhocLogs] = useState({});
  var [year, setYear] = useState(TODAY.getFullYear());
  var [month, setMonth] = useState(TODAY.getMonth() + 1);
  var [saveStatus, setSaveStatus] = useState("idle");

  useEffect(function () {
    loadWork().then(function (saved) {
      if (saved) {
        setTemplates(saved.checklistTemplates && saved.checklistTemplates.length ? saved.checklistTemplates : DEFAULT_TEMPLATES);
        setCompletions(saved.checklistCompletions || {});
        setAdhocLogs(saved.checklistAdhocLogs || {});
      }
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, []);

  var persist = useCallback(async function (nextTemplates, nextCompletions, nextAdhocLogs) {
    setSaveStatus("saving");
    var current = (await loadWork()) || {};
    var merged = Object.assign({}, current, {
      checklistTemplates: nextTemplates, checklistCompletions: nextCompletions, checklistAdhocLogs: nextAdhocLogs,
    });
    var ok = await saveWork(merged);
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(function () { setSaveStatus("idle"); }, 2000);
  }, []);

  var toggleCompletion = function (taskId, periodKey) {
    var key = taskId + "|" + periodKey;
    setCompletions(function (prev) {
      var next = Object.assign({}, prev);
      if (next[key]) { delete next[key]; } else { next[key] = true; }
      persist(templates, next, adhocLogs);
      return next;
    });
  };

  var toggleAdhoc = function (taskId) {
    var today = dateStr(new Date());
    setAdhocLogs(function (prev) {
      var list = prev[taskId] || [];
      var next;
      if (list.indexOf(today) >= 0) {
        next = Object.assign({}, prev, { [taskId]: list.filter(function (d) { return d !== today; }) });
      } else {
        next = Object.assign({}, prev, { [taskId]: [today].concat(list).slice(0, 30) });
      }
      persist(templates, completions, next);
      return next;
    });
  };

  var changeTemplates = function (next) {
    setTemplates(next);
    persist(next, completions, adhocLogs);
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: t.sub }}>업무 체크리스트 불러오는 중...</div>;
  }

  var monthlyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "monthly"; }));
  var weeklyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "weekly"; }));
  var dailyGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "daily"; }));
  var adhocGroups = groupByCategory(templates.filter(function (tp) { return tp.frequency === "adhoc"; }));

  var monthlyPeriods = MONTHS_LABEL.map(function (label, i) { return { key: year + "-" + pad2(i + 1), label: label }; });
  var weeks = weeksInMonth(year, month);
  var weeklyPeriods = weeks.map(function (mon, i) { return { key: dateStr(mon), label: (mon.getMonth() + 1) + "." + mon.getDate() + "~" }; });
  var daysInMonth = new Date(year, month, 0).getDate();
  var dailyPeriods = [];
  for (var d = 1; d <= daysInMonth; d++) dailyPeriods.push({ key: year + "-" + pad2(month) + "-" + pad2(d), label: "" + d });

  var todayMonthKey = year + "-" + pad2(month);
  var todayWeekKey = dateStr(weekStartOf(new Date(year, month - 1, Math.min(TODAY.getDate(), daysInMonth))));
  var todayDayKey = (year === TODAY.getFullYear() && month === TODAY.getMonth() + 1) ? dateStr(TODAY) : null;

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

      <GridSection title={year + "년 월별 업무"} subtitle="매월 반복되는 업무 - 가로축은 해당 연도의 1~12월" periods={monthlyPeriods} groups={monthlyGroups} completions={completions} onToggle={toggleCompletion} t={t} dark={dark} colWidth={44} highlightKey={todayMonthKey} />

      <GridSection title={year + "년 " + month + "월 주별 업무"} subtitle="매주 반복되는 업무 - 가로축은 이번 달의 각 주(월요일 기준)" periods={weeklyPeriods} groups={weeklyGroups} completions={completions} onToggle={toggleCompletion} t={t} dark={dark} colWidth={56} highlightKey={todayWeekKey} />

      <GridSection title={year + "년 " + month + "월 일별 업무"} subtitle="매일 반복되는 업무 - 가로축은 이번 달의 날짜" periods={dailyPeriods} groups={dailyGroups} completions={completions} onToggle={toggleCompletion} t={t} dark={dark} colWidth={30} highlightKey={todayDayKey} />

      <AdhocSection groups={adhocGroups} adhocLogs={adhocLogs} onToggle={toggleAdhoc} t={t} dark={dark} />

      <TemplateManager templates={templates} onChange={changeTemplates} dark={dark} t={t} />
    </div>
  );
}
