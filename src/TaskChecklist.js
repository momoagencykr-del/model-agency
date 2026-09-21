import { useState, useEffect, useCallback, useRef } from "react";

var MONTHS_LABEL = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
var TODAY = new Date();
var YEARS_LIST = [TODAY.getFullYear() - 1, TODAY.getFullYear(), TODAY.getFullYear() + 1];

function pad2(n) { return n < 10 ? ("0" + n) : ("" + n); }
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

function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function looksLikeHtml(s) { return /<\/?[a-z][\s\S]*>/i.test(s || ""); }
function textToHtml(s) { return escapeHtml(s || "").split("\n").map(function (line) { return line || "<br>"; }).join("<br>"); }

// ── 옛 구조(카테고리/템플릿/체크박스) 데이터를 새 구조(주차별 자유메모)로 1회 변환 ──
// 이미 새 형식(checklistWeeklyNotes)이 있으면 그대로 사용, 없으면 과거 기록에서
// "그 주차에 무슨 업무가 있었는지 · 완료했는지"를 텍스트 줄로 살려서 옮겨준다.
function migrateToNotes(saved) {
  if (!saved) return {};
  if (saved.checklistWeeklyNotes) return saved.checklistWeeklyNotes;
  var templates = saved.checklistTemplates || [];
  var completions = saved.checklistCompletions || {};
  if (templates.length === 0 && Object.keys(completions).length === 0) return {};

  var periodKeys = {};
  Object.keys(completions).forEach(function (k) {
    var parts = k.split("|");
    if (parts[1]) periodKeys[parts[1]] = true;
  });
  templates.forEach(function (tp) { if (tp.periodKey) periodKeys[tp.periodKey] = true; });

  var notes = {};
  Object.keys(periodKeys).forEach(function (pk) {
    var lines = [];
    templates.filter(function (tp) { return tp.frequency === "weekly" && (!tp.periodKey || tp.periodKey === pk); }).forEach(function (tp) {
      var done = !!completions[tp.id + "|" + pk];
      lines.push((done ? "[x] " : "[ ] ") + tp.title);
    });
    if (lines.length) notes[pk] = lines.join("\n");
  });
  return notes;
}

export default function TaskChecklistTab({ dark }) {
  var t = {
    bg: dark ? "#0f172a" : "#f1f5f9", card: dark ? "#1e293b" : "#fff", border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#1e293b", sub: dark ? "#94a3b8" : "#64748b", input: dark ? "#0f172a" : "#fff",
    ib: dark ? "#475569" : "#d1d5db", thead: dark ? "#0f172a" : "#f8fafc", card2: dark ? "#162032" : "#f8fafc",
  };

  var [loading, setLoading] = useState(true);
  var [notes, setNotes] = useState({});
  var [year, setYear] = useState(TODAY.getFullYear());
  var [month, setMonth] = useState(TODAY.getMonth() + 1);
  var [saveStatus, setSaveStatus] = useState("idle");

  var weeks = weeksInMonth(year, month);
  var todayWeekKey = dateStr(weekStartOf(TODAY));
  var defaultWeekIdx = weeks.findIndex(function (mon) { return dateStr(mon) === todayWeekKey; });
  var [selWeekIdx, setSelWeekIdx] = useState(defaultWeekIdx >= 0 ? defaultWeekIdx : 0);

  useEffect(function () {
    loadWork().then(function (saved) {
      setNotes(migrateToNotes(saved));
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, []);

  // 월이 바뀌면 선택된 주차를 그 달의 "이번 주"(있으면) 또는 1주차로 리셋
  useEffect(function () {
    var idx = weeks.findIndex(function (mon) { return dateStr(mon) === todayWeekKey; });
    setSelWeekIdx(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  var persist = useCallback(async function (nextNotes) {
    setSaveStatus("saving");
    var current = (await loadWork()) || {};
    var merged = Object.assign({}, current, { checklistWeeklyNotes: nextNotes });
    delete merged.checklistTemplates;
    delete merged.checklistCompletions;
    delete merged.checklistAdhocEntries;
    delete merged.checklistCategories;
    delete merged.checklistAdhocLogs;
    var ok = await saveWork(merged);
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(function () { setSaveStatus("idle"); }, 2000);
  }, []);

  // 타이핑 중 매 글자마다 저장하지 않도록 0.7초 디바운스
  var saveTimerRef = useRef(null);
  var notesRef = useRef(notes);
  notesRef.current = notes;
  var updateNote = function (periodKey, html) {
    setNotes(function (prev) {
      var next = Object.assign({}, prev);
      var plain = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
      if (plain) { next[periodKey] = html; } else { delete next[periodKey]; }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(function () { persist(next); }, 700);
      return next;
    });
  };
  var saveNow = function () {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    persist(notesRef.current);
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: t.sub }}>업무 체크리스트 불러오는 중...</div>;
  }

  var weekTabs = weeks.map(function (mon, i) {
    var end = addDays(mon, 6);
    var periodKey = dateStr(mon);
    return {
      idx: i, periodKey: periodKey,
      label: (i + 1) + "주차",
      range: (mon.getMonth() + 1) + "." + mon.getDate() + " ~ " + (end.getMonth() + 1) + "." + end.getDate(),
      isCurrent: periodKey === todayWeekKey,
      hasContent: !!(notes[periodKey] && notes[periodKey].trim()),
    };
  });
  var activeTab = weekTabs[selWeekIdx] || weekTabs[0];
  var activeText = (activeTab && notes[activeTab.periodKey]) || "";

  return (
    <div>
      <style>{"[data-placeholder]:empty:before{content:attr(data-placeholder);color:" + t.sub + ";pointer-events:none;}"}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: t.text, letterSpacing: -0.5 }}>업무 체크리스트</div>
        <div style={{ fontSize: 11, color: t.sub }}>{saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "저장됨" : saveStatus === "error" ? "저장 실패" : ""}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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

      <div style={{ fontSize: 12, color: t.sub, marginBottom: 10 }}>주차를 골라 자유롭게 메모하듯 적어두세요. 형식은 자유입니다 — 목록, 체크(- [ ]), 시간 메모 등 편한 대로 쓰면 됩니다.</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {weekTabs.map(function (w) {
          var active = w.idx === selWeekIdx;
          return (
            <button
              key={w.periodKey}
              onClick={function () { setSelWeekIdx(w.idx); }}
              style={{
                padding: "9px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                border: active ? "2px solid #4f46e5" : (w.isCurrent ? "1.5px solid #4f46e5" : "1px solid " + t.border),
                background: active ? "#4f46e5" : t.card,
                minWidth: 132,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: active ? "#fff" : t.text }}>{w.label}</span>
                {w.isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: active ? "#fff" : "#4f46e5" }}>· 이번 주</span>}
                {!active && w.hasContent && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f46e5", marginLeft: "auto" }} />}
              </div>
              <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.85)" : t.sub, marginTop: 2 }}>{w.range}</div>
            </button>
          );
        })}
      </div>

      <div style={{ background: t.card, border: "1px solid " + t.border, borderRadius: 14, padding: 4 }}>
        <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: t.text }}>{activeTab.label}</span>
            <span style={{ fontSize: 12, color: t.sub }}>{activeTab.range}</span>
          </div>
          <button onClick={saveNow} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>💾 저장</button>
        </div>

        <NoteEditor key={activeTab.periodKey} initialHtml={looksLikeHtml(activeText) ? activeText : textToHtml(activeText)} onChange={function (html) { updateNote(activeTab.periodKey, html); }} t={t} dark={dark} />
      </div>
    </div>
  );
}

// ── 서식 툴바 + contentEditable 메모 영역 ───────────────────────────────
function NoteEditor({ initialHtml, onChange, t, dark }) {
  var editorRef = useRef(null);

  var exec = function (cmd, value) {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(cmd, false, value || null);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  var toolBtn = function (label, title, onClick) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={function (e) { e.preventDefault(); }}
        onClick={onClick}
        style={{ minWidth: 30, height: 30, padding: "0 8px", borderRadius: 6, border: "1px solid " + t.border, background: t.card2, color: t.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >{label}</button>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 12px", borderTop: "1px solid " + t.border, borderBottom: "1px solid " + t.border }}>
        {toolBtn(<b>B</b>, "굵게", function () { exec("bold"); })}
        {toolBtn(<i>I</i>, "기울임", function () { exec("italic"); })}
        {toolBtn(<span style={{ textDecoration: "underline" }}>U</span>, "밑줄", function () { exec("underline"); })}
        <div style={{ width: 1, background: t.border, margin: "3px 3px" }} />
        {toolBtn("•", "글머리 목록", function () { exec("insertUnorderedList"); })}
        {toolBtn("1.", "번호 목록", function () { exec("insertOrderedList"); })}
        <div style={{ width: 1, background: t.border, margin: "3px 3px" }} />
        {toolBtn("→", "들여쓰기", function () { exec("indent"); })}
        {toolBtn("←", "내어쓰기", function () { exec("outdent"); })}
        <div style={{ width: 1, background: t.border, margin: "3px 3px" }} />
        {toolBtn("↶", "실행 취소", function () { exec("undo"); })}
        {toolBtn("↷", "다시 실행", function () { exec("redo"); })}
        {toolBtn("✕", "서식 지우기", function () { exec("removeFormat"); })}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={function (e) { onChange(e.currentTarget.innerHTML); }}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        data-placeholder="이번 주에 한 일, 할 일, 메모를 자유롭게 적어보세요."
        style={{
          width: "100%", minHeight: 400, padding: "14px 16px 18px", outline: "none",
          background: "transparent", color: t.text, fontSize: 14, lineHeight: 1.7,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
