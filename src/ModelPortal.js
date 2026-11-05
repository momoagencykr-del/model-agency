import { useState, useEffect } from "react";

// ── 모델 전용 촬영내역 제출 화면 (카톡 링크로 접속, 로그인 없음) ────────────────
var L = {
  ko: {
    title: "촬영 내역 제출", hello: "님, 안녕하세요", intro: "이번 달 촬영 내역을 확인해주세요. 맞으면 ✅, 다르면 ✏️ 수정, 안 한 촬영이면 ❌ 를 눌러주세요. 목록에 없는 촬영은 아래 [+ 촬영 추가]로 입력해주세요.",
    month: "월", registered: "정산 등록됨", project: "촬영 예정/진행", schedule: "일정 (금액 입력 필요)", added: "새로 추가",
    ok: "맞음", edit: "수정", absent: "안 함", gross: "업체 입금", net: "받을 금액(세후)", estimate: "예상",
    agency: "에이전시 촬영", self: "직접 촬영", date: "촬영일", brand: "브랜드/업체", amount: "업체 입금액 (원)", note: "메모", type: "구분",
    add: "+ 촬영 추가", remove: "삭제", totalG: "업체 입금 합계", totalN: "받을 금액 합계", comment: "전달할 말 (선택)",
    submit: "제출하기", submitting: "제출 중...", done: "제출 완료! 확인 후 승인되면 정산에 반영됩니다.", again: "다시 보기",
    history: "제출 내역", pending: "확인 중", approved: "승인됨", rejected: "반려됨", none: "이 달에 등록된 촬영이 없습니다. 촬영이 있었다면 [+ 촬영 추가]로 입력해주세요.",
    needAmount: "금액을 입력해주세요", nothing: "제출할 내용이 없습니다", invalid: "링크가 올바르지 않습니다. 담당자에게 새 링크를 요청해주세요.", loading: "불러오는 중...", err: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  },
  en: {
    title: "Submit your shoots", hello: ", hello", intro: "Please check your shoots for this month. Tap ✅ if correct, ✏️ to fix, or ❌ if it didn't happen. Add any missing shoot with [+ Add shoot] below.",
    month: "", registered: "Registered", project: "Booked shoot", schedule: "Schedule (enter amount)", added: "Added by you",
    ok: "Correct", edit: "Edit", absent: "Didn't happen", gross: "Client fee", net: "You receive (after tax)", estimate: "est.",
    agency: "Agency booking", self: "Direct booking", date: "Shoot date", brand: "Brand / client", amount: "Client fee (KRW)", note: "Note", type: "Type",
    add: "+ Add shoot", remove: "Remove", totalG: "Total client fee", totalN: "Total you receive", comment: "Message to us (optional)",
    submit: "Submit", submitting: "Submitting...", done: "Submitted! It will be added to your settlement after we review it.", again: "Back",
    history: "Your submissions", pending: "In review", approved: "Approved", rejected: "Returned", none: "No shoots registered for this month. If you had any, add them with [+ Add shoot].",
    needAmount: "Please enter the amount", nothing: "Nothing to submit", invalid: "This link is not valid. Please ask us for a new link.", loading: "Loading...", err: "Something went wrong. Please try again.",
  },
  ru: {
    title: "Отправка съёмок", hello: ", здравствуйте", intro: "Проверьте съёмки за месяц. Нажмите ✅ если всё верно, ✏️ чтобы исправить, ❌ если съёмки не было. Недостающие съёмки добавьте кнопкой [+ Добавить съёмку].",
    month: "", registered: "Зарегистрировано", project: "Запланированная съёмка", schedule: "Расписание (укажите сумму)", added: "Добавлено вами",
    ok: "Верно", edit: "Исправить", absent: "Не было", gross: "Оплата клиента", net: "Вы получите (после налога)", estimate: "прибл.",
    agency: "Через агентство", self: "Напрямую", date: "Дата съёмки", brand: "Бренд / клиент", amount: "Оплата клиента (KRW)", note: "Заметка", type: "Тип",
    add: "+ Добавить съёмку", remove: "Удалить", totalG: "Итого оплата клиента", totalN: "Итого вы получите", comment: "Сообщение (необязательно)",
    submit: "Отправить", submitting: "Отправка...", done: "Отправлено! После проверки съёмки будут добавлены в расчёт.", again: "Назад",
    history: "Ваши отправки", pending: "На проверке", approved: "Одобрено", rejected: "Возвращено", none: "За этот месяц съёмок нет. Если были — добавьте их кнопкой [+ Добавить съёмку].",
    needAmount: "Укажите сумму", nothing: "Нечего отправлять", invalid: "Ссылка недействительна. Попросите у нас новую ссылку.", loading: "Загрузка...", err: "Произошла ошибка. Попробуйте позже.",
  },
};
var MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var MONTH_RU = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

function won(n) { return "₩" + Math.round(Number(n) || 0).toLocaleString(); }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }

export default function ModelPortal({ token }) {
  var langState = useState(function () { try { return localStorage.getItem("momoPortalLang") || "en"; } catch (e) { return "en"; } });
  var lang = langState[0], setLangRaw = langState[1];
  var setLang = function (l) { setLangRaw(l); try { localStorage.setItem("momoPortalLang", l); } catch (e) {} };
  var tx = L[lang];

  var now = new Date();
  var [ym, setYm] = useState(now.getFullYear() + "-" + pad2(now.getMonth() + 1));
  var [info, setInfo] = useState(null);
  var [status, setStatus] = useState("loading"); // loading | ready | invalid | error | done
  var [rows, setRows] = useState([]);
  var [comment, setComment] = useState("");
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState("");

  var load = function (month) {
    setStatus("loading"); setMsg("");
    fetch("/api/model-portal?t=" + encodeURIComponent(token) + "&month=" + month).then(function (r) {
      if (r.status === 404) { setStatus("invalid"); return null; }
      if (!r.ok) throw new Error("load");
      return r.json();
    }).then(function (j) {
      if (!j) return;
      setInfo(j);
      setRows(j.items.map(function (it) {
        return Object.assign({}, it, { action: it.source === "schedule" ? "" : "confirm", note: "", editing: false, orig: { date: it.date, brand: it.brand, type: it.type, income: it.income } });
      }));
      setComment("");
      setStatus("ready");
    }).catch(function () { setStatus("error"); });
  };
  useEffect(function () {
    load(ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  var calcNet = function (inc, type) {
    if (!info) return 0;
    var af = type === "agency" ? info.af.agency : info.af.self;
    var i = Number(inc) || 0;
    var after = i - Math.round(i * (Number(af) || 0));
    return after - Math.round(after * info.taxRate);
  };
  var upd = function (key, patch) { setRows(function (prev) { return prev.map(function (r) { return r.key === key ? Object.assign({}, r, patch) : r; }); }); };
  var addRow = function () {
    setRows(function (prev) { return prev.concat([{ key: "n:" + Date.now(), source: "new", action: "new", date: ym + "-01", brand: "", type: "self", income: "", note: "", editing: true }]); });
  };
  var removeRow = function (key) { setRows(function (prev) { return prev.filter(function (r) { return r.key !== key; }); }); };

  var active = rows.filter(function (r) { return r.action === "confirm" || r.action === "edit" || r.action === "new"; });
  var totalG = active.reduce(function (s, r) { return s + (Number(r.income) || 0); }, 0);
  var totalN = active.reduce(function (s, r) { return s + calcNet(r.income, r.type); }, 0);

  var submit = function () {
    var list = rows.filter(function (r) { return r.action; });
    if (!list.length) { setMsg(tx.nothing); return; }
    var missing = list.find(function (r) { return r.action !== "absent" && !(Number(r.income) > 0); });
    if (missing) { setMsg(tx.needAmount + " — " + (missing.brand || missing.date)); return; }
    setBusy(true); setMsg("");
    fetch("/api/model-portal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, month: ym, comment: comment, items: list.map(function (r) {
        return { key: r.key, source: r.source, action: r.action, date: r.date, brand: r.brand, type: r.type, income: Number(r.income) || 0, note: r.note };
      }) }),
    }).then(function (r) { if (!r.ok) throw new Error("save"); return r.json(); })
      .then(function () { setBusy(false); setStatus("done"); })
      .catch(function () { setBusy(false); setMsg(tx.err); });
  };

  var C = { bg: "#f6f7fb", card: "#fff", line: "#e5e7eb", text: "#111827", sub: "#6b7280", pri: "#4f46e5", ok: "#059669", bad: "#dc2626", warn: "#d97706" };
  var input = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.line, fontSize: 16, boxSizing: "border-box", background: "#fff", color: C.text };
  var monthName = function (i) { return lang === "ko" ? (i + 1) + tx.month : lang === "ru" ? MONTH_RU[i] : MONTH_EN[i]; };
  var srcLabel = { registered: tx.registered, project: tx.project, schedule: tx.schedule, new: tx.added };
  var srcColor = { registered: "#4f46e5", project: "#0891b2", schedule: "#d97706", new: "#059669" };

  var head = (
    <div style={{ background: "#111827", color: "#fff", padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <div style={{ fontWeight: 900, fontSize: 15 }}>MoMo Agency</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["ko", "en", "ru"].map(function (l) {
            return <button key={l} onClick={function () { setLang(l); }} style={{ padding: "5px 9px", borderRadius: 7, border: "none", fontWeight: 800, fontSize: 12, background: lang === l ? "#fff" : "rgba(255,255,255,0.15)", color: lang === l ? "#111827" : "#fff" }}>{l.toUpperCase()}</button>;
          })}
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 19, fontWeight: 900 }}>{tx.title}</div>
      {info && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{(lang === "ko" ? info.model.nameKr : (info.model.nameEn || info.model.nameKr)) + tx.hello}</div>}
    </div>
  );

  if (status === "invalid") return <div style={{ minHeight: "100vh", background: C.bg }}>{head}<div style={{ padding: 24, textAlign: "center", color: C.bad, fontWeight: 700 }}>{tx.invalid}</div></div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.text }}>
      {head}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 14px 120px" }}>
        {info && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
            {Array.from({ length: 12 }).map(function (_, i) {
              var key = info.year + "-" + pad2(i + 1);
              var on = key === ym;
              return <button key={key} onClick={function () { setYm(key); }} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 20, border: on ? "none" : "1px solid " + C.line, background: on ? C.pri : "#fff", color: on ? "#fff" : C.text, fontWeight: 800, fontSize: 13 }}>{monthName(i)}</button>;
            })}
          </div>
        )}

        {status === "loading" && <div style={{ padding: 30, textAlign: "center", color: C.sub }}>{tx.loading}</div>}
        {status === "error" && <div style={{ padding: 30, textAlign: "center", color: C.bad }}>{tx.err}</div>}

        {status === "done" && (
          <div style={{ background: C.card, borderRadius: 14, padding: 24, textAlign: "center", border: "1px solid " + C.line }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontWeight: 800, margin: "10px 0 16px" }}>{tx.done}</div>
            <button onClick={function () { load(ym); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: C.pri, color: "#fff", fontWeight: 800, fontSize: 15 }}>{tx.again}</button>
          </div>
        )}

        {status === "ready" && (
          <>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>{tx.intro}</div>
            {rows.length === 0 && <div style={{ background: C.card, borderRadius: 12, padding: 18, color: C.sub, fontSize: 14, border: "1px solid " + C.line, marginBottom: 10 }}>{tx.none}</div>}

            {rows.map(function (r) {
              var dim = r.action === "absent";
              var showForm = r.editing || r.action === "edit" || r.action === "new";
              return (
                <div key={r.key} style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 10, border: "1.5px solid " + (r.action === "confirm" ? "#a7f3d0" : r.action === "absent" ? "#fecaca" : r.action ? "#c7d2fe" : C.line), opacity: dim ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: srcColor[r.source], background: srcColor[r.source] + "18", padding: "3px 8px", borderRadius: 6 }}>{srcLabel[r.source]}</span>
                    <span style={{ fontSize: 13, color: C.sub, fontWeight: 700 }}>{r.date}</span>
                  </div>
                  {!showForm && (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 800, margin: "8px 0 6px", textDecoration: dim ? "line-through" : "none" }}>{r.brand || "-"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub }}>
                        <span>{tx.gross} <b style={{ color: C.text }}>{Number(r.income) > 0 ? won(r.income) : "-"}</b></span>
                        <span>{tx.net} <b style={{ color: C.ok }}>{Number(r.income) > 0 ? won(calcNet(r.income, r.type)) : "-"}</b></span>
                      </div>
                    </>
                  )}
                  {showForm && (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.date}<input type="date" value={r.date} onChange={function (e) { upd(r.key, { date: e.target.value }); }} style={input} /></label>
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.brand}<input value={r.brand} onChange={function (e) { upd(r.key, { brand: e.target.value }); }} style={input} /></label>
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.type}
                        <select value={r.type} onChange={function (e) { upd(r.key, { type: e.target.value }); }} style={input}>
                          <option value="self">{tx.self}</option><option value="agency">{tx.agency}</option>
                        </select>
                      </label>
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.amount}<input type="number" inputMode="numeric" value={r.income} onChange={function (e) { upd(r.key, { income: e.target.value }); }} placeholder="0" style={input} /></label>
                      {Number(r.income) > 0 && <div style={{ fontSize: 13, color: C.ok, fontWeight: 800 }}>{tx.net}: {won(calcNet(r.income, r.type))} <span style={{ color: C.sub, fontWeight: 600 }}>({tx.estimate})</span></div>}
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.note}<input value={r.note} onChange={function (e) { upd(r.key, { note: e.target.value }); }} style={input} /></label>
                    </div>
                  )}
                  {r.source === "new" ? (
                    <button onClick={function () { removeRow(r.key); }} style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fff", color: C.bad, fontWeight: 800 }}>{tx.remove}</button>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
                      {[["confirm", "✅ " + tx.ok, C.ok], ["edit", "✏️ " + tx.edit, C.pri], ["absent", "❌ " + tx.absent, C.bad]].map(function (b) {
                        var on = r.action === b[0];
                        var disabled = b[0] === "confirm" && !(Number(r.orig.income) > 0) && r.source === "schedule";
                        return <button key={b[0]} disabled={disabled} onClick={function () {
                          if (b[0] === "confirm") upd(r.key, Object.assign({ action: "confirm", editing: false }, r.orig));
                          else upd(r.key, { action: b[0], editing: b[0] === "edit" });
                        }} style={{ padding: "10px 4px", borderRadius: 10, border: on ? "none" : "1px solid " + C.line, background: on ? b[2] : "#fff", color: on ? "#fff" : (disabled ? "#d1d5db" : C.text), fontWeight: 800, fontSize: 13 }}>{b[1]}</button>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={addRow} style={{ width: "100%", padding: 14, borderRadius: 12, border: "2px dashed " + C.pri, background: "transparent", color: C.pri, fontWeight: 900, fontSize: 15, marginBottom: 14 }}>{tx.add}</button>

            <label style={{ fontSize: 12, color: C.sub }}>{tx.comment}<textarea value={comment} onChange={function (e) { setComment(e.target.value); }} rows={2} style={Object.assign({}, input, { resize: "vertical" })} /></label>

            {info.submissions && info.submissions.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{tx.history}</div>
                {info.submissions.map(function (s) {
                  var color = s.status === "approved" ? C.ok : s.status === "rejected" ? C.bad : C.warn;
                  return (
                    <div key={s.id} style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 10, padding: "10px 12px", marginBottom: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{s.month} · {s.count}</span>
                        <b style={{ color: color }}>{tx[s.status]}</b>
                      </div>
                      {s.reviewNote && <div style={{ color: C.sub, marginTop: 4 }}>💬 {s.reviewNote}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid " + C.line, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))" }}>
              <div style={{ maxWidth: 560, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: C.sub }}>{tx.totalG} <b style={{ color: C.text }}>{won(totalG)}</b></span>
                  <span style={{ color: C.sub }}>{tx.totalN} <b style={{ color: C.ok }}>{won(totalN)}</b></span>
                </div>
                {msg && <div style={{ color: C.bad, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{msg}</div>}
                <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.pri, color: "#fff", fontWeight: 900, fontSize: 16, opacity: busy ? 0.7 : 1 }}>{busy ? tx.submitting : tx.submit}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
