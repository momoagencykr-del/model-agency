import { useState, useEffect } from "react";

// ── 모델 전용 촬영 입력 화면 (카톡 링크로 접속, 로그인 없음) ────────────────────
// 달력에서 날짜를 눌러 촬영을 추가하고 [저장]을 누르면 모델 정산관리 시스템에 바로 반영된다.
var L = {
  ko: {
    title: "촬영 입력", hello: "님, 안녕하세요", intro: "촬영한 날짜를 눌러 [+ 촬영 추가]로 입력하고, 마지막에 [저장]을 눌러주세요. 저장하면 바로 정산에 반영됩니다.",
    totalCount: "이번 달 촬영", countUnit: "건", totalAmount: "고객사로부터 받는 금액 합계", add: "+ 촬영 추가",
    date: "촬영일", brand: "브랜드 / 고객사", amount: "고객사로부터 받는 금액 (원)", note: "메모 (선택)",
    save: "저장", saving: "저장 중...", saved: "저장되었습니다. 정산에 반영됐어요.", unsaved: "저장하지 않은 변경사항이 있습니다",
    del: "삭제", ok: "확인", close: "닫기", paid: "입금 완료 · 수정 불가", list: "이번 달 입력 내역", none: "아직 입력한 촬영이 없습니다. 달력에서 날짜를 눌러 추가하세요.",
    need: "브랜드와 금액을 입력해주세요", invalid: "링크가 올바르지 않습니다. 담당자에게 새 링크를 요청해주세요.", loading: "불러오는 중...", err: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    leave: "저장하지 않은 내용이 있습니다. 다른 달로 이동할까요?", wd: ["일","월","화","수","목","금","토"],
  },
  en: {
    title: "Your shoots", hello: ", hello", intro: "Tap the day you had a shoot, add it with [+ Add shoot], then press [Save]. Saved shoots go straight into your settlement.",
    totalCount: "Shoots this month", countUnit: "", totalAmount: "Total received from clients", add: "+ Add shoot",
    date: "Shoot date", brand: "Brand / client", amount: "Amount from client (KRW)", note: "Note (optional)",
    save: "Save", saving: "Saving...", saved: "Saved. Added to your settlement.", unsaved: "You have unsaved changes",
    del: "Delete", ok: "OK", close: "Close", paid: "Paid · cannot be changed", list: "This month's shoots", none: "No shoots yet. Tap a day on the calendar to add one.",
    need: "Please enter the brand and amount", invalid: "This link is not valid. Please ask us for a new link.", loading: "Loading...", err: "Something went wrong. Please try again.",
    leave: "You have unsaved changes. Move to another month?", wd: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  },
  ru: {
    title: "Ваши съёмки", hello: ", здравствуйте", intro: "Нажмите на день съёмки, добавьте её кнопкой [+ Добавить съёмку] и нажмите [Сохранить]. Сохранённые съёмки сразу попадают в расчёт.",
    totalCount: "Съёмок за месяц", countUnit: "", totalAmount: "Итого получено от клиентов", add: "+ Добавить съёмку",
    date: "Дата съёмки", brand: "Бренд / клиент", amount: "Сумма от клиента (KRW)", note: "Заметка (необязательно)",
    save: "Сохранить", saving: "Сохранение...", saved: "Сохранено. Добавлено в расчёт.", unsaved: "Есть несохранённые изменения",
    del: "Удалить", ok: "Готово", close: "Закрыть", paid: "Оплачено · изменить нельзя", list: "Съёмки за месяц", none: "Съёмок пока нет. Нажмите на день в календаре, чтобы добавить.",
    need: "Укажите бренд и сумму", invalid: "Ссылка недействительна. Попросите у нас новую ссылку.", loading: "Загрузка...", err: "Произошла ошибка. Попробуйте позже.",
    leave: "Есть несохранённые изменения. Перейти к другому месяцу?", wd: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"],
  },
  fr: {
    title: "Vos shootings", hello: ", bonjour", intro: "Touchez le jour du shooting, ajoutez-le avec [+ Ajouter un shooting], puis appuyez sur [Enregistrer]. Les shootings enregistrés sont ajoutés directement à votre règlement.",
    totalCount: "Shootings ce mois-ci", countUnit: "", totalAmount: "Total reçu des clients", add: "+ Ajouter un shooting",
    date: "Date du shooting", brand: "Marque / client", amount: "Montant reçu du client (KRW)", note: "Note (facultatif)",
    save: "Enregistrer", saving: "Enregistrement...", saved: "Enregistré. Ajouté à votre règlement.", unsaved: "Modifications non enregistrées",
    del: "Supprimer", ok: "OK", close: "Fermer", paid: "Payé · non modifiable", list: "Shootings du mois", none: "Aucun shooting pour l'instant. Touchez un jour du calendrier pour en ajouter.",
    need: "Veuillez saisir la marque et le montant", invalid: "Ce lien n'est pas valide. Demandez-nous un nouveau lien.", loading: "Chargement...", err: "Une erreur s'est produite. Réessayez plus tard.",
    leave: "Modifications non enregistrées. Changer de mois ?", wd: ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],
  },
  pt: {
    title: "Seus trabalhos", hello: ", olá", intro: "Toque no dia do trabalho, adicione com [+ Adicionar trabalho] e depois toque em [Salvar]. Os trabalhos salvos entram direto no seu acerto.",
    totalCount: "Trabalhos no mês", countUnit: "", totalAmount: "Total recebido dos clientes", add: "+ Adicionar trabalho",
    date: "Data do trabalho", brand: "Marca / cliente", amount: "Valor recebido do cliente (KRW)", note: "Observação (opcional)",
    save: "Salvar", saving: "Salvando...", saved: "Salvo. Incluído no seu acerto.", unsaved: "Há alterações não salvas",
    del: "Excluir", ok: "OK", close: "Fechar", paid: "Pago · não pode ser alterado", list: "Trabalhos do mês", none: "Nenhum trabalho ainda. Toque em um dia do calendário para adicionar.",
    need: "Informe a marca e o valor", invalid: "Este link não é válido. Peça um novo link para nós.", loading: "Carregando...", err: "Ocorreu um erro. Tente novamente mais tarde.",
    leave: "Há alterações não salvas. Mudar de mês?", wd: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
  },
  es: {
    title: "Tus trabajos", hello: ", hola", intro: "Toca el día del trabajo, agrégalo con [+ Agregar trabajo] y luego pulsa [Guardar]. Los trabajos guardados se agregan directamente a tu liquidación.",
    totalCount: "Trabajos este mes", countUnit: "", totalAmount: "Total recibido de clientes", add: "+ Agregar trabajo",
    date: "Fecha del trabajo", brand: "Marca / cliente", amount: "Monto recibido del cliente (KRW)", note: "Nota (opcional)",
    save: "Guardar", saving: "Guardando...", saved: "Guardado. Agregado a tu liquidación.", unsaved: "Hay cambios sin guardar",
    del: "Eliminar", ok: "OK", close: "Cerrar", paid: "Pagado · no se puede cambiar", list: "Trabajos del mes", none: "Aún no hay trabajos. Toca un día del calendario para agregar uno.",
    need: "Indica la marca y el monto", invalid: "Este enlace no es válido. Pídenos un enlace nuevo.", loading: "Cargando...", err: "Ocurrió un error. Inténtalo más tarde.",
    leave: "Hay cambios sin guardar. ¿Cambiar de mes?", wd: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
  },
};
var LANGS = [["en", "English"], ["ko", "한국어"], ["ru", "Русский"], ["fr", "Français"], ["pt", "Português"], ["es", "Español"]];
var MONTHS_BY_LANG = {
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  ru: ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],
  fr: ["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"],
  pt: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
};
function detectLang() {
  try { var saved = localStorage.getItem("momoPortalLang"); if (saved && L[saved]) return saved; } catch (e) {}
  var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").slice(0, 2).toLowerCase();
  return L[nav] ? nav : "en";
}
function won(n) { return "₩" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function sameJ(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export default function ModelPortal({ token }) {
  var [lang, setLangRaw] = useState(detectLang);
  var setLang = function (l) { setLangRaw(l); try { localStorage.setItem("momoPortalLang", l); } catch (e) {} };
  var tx = L[lang];

  var now = new Date();
  var [ym, setYm] = useState(now.getFullYear() + "-" + pad2(now.getMonth() + 1));
  var [info, setInfo] = useState(null);
  var [status, setStatus] = useState("loading"); // loading | ready | invalid | error
  var [entries, setEntries] = useState([]);
  var [savedEntries, setSavedEntries] = useState([]);
  var [day, setDay] = useState(null);          // 열려 있는 날짜 (YYYY-MM-DD)
  var [draft, setDraft] = useState(null);      // 추가/수정 중인 건
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState({ text: "", ok: false });

  var dirty = !sameJ(entries, savedEntries);

  var load = function (month) {
    setStatus("loading"); setMsg({ text: "", ok: false }); setDay(null); setDraft(null);
    fetch("/api/model-portal?t=" + encodeURIComponent(token) + "&month=" + month).then(function (r) {
      if (r.status === 404) { setStatus("invalid"); return null; }
      if (!r.ok) throw new Error("load");
      return r.json();
    }).then(function (j) {
      if (!j) return;
      setInfo(j); setEntries(j.entries); setSavedEntries(j.entries); setStatus("ready");
    }).catch(function () { setStatus("error"); });
  };
  useEffect(function () {
    load(ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);
  useEffect(function () {
    var h = function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return function () { window.removeEventListener("beforeunload", h); };
  }, [dirty]);

  var changeMonth = function (key) {
    if (key === ym) return;
    if (dirty && !window.confirm(tx.leave)) return;
    setYm(key);
  };

  var save = function () {
    setBusy(true); setMsg({ text: "", ok: false });
    fetch("/api/model-portal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, month: ym, entries: entries.map(function (e) { return { id: e.id, date: e.date, brand: e.brand, income: e.income, note: e.note }; }) }),
    }).then(function (r) { if (!r.ok) throw new Error("save"); return r.json(); })
      .then(function (j) { setEntries(j.entries); setSavedEntries(j.entries); setBusy(false); setMsg({ text: tx.saved, ok: true }); })
      .catch(function () { setBusy(false); setMsg({ text: tx.err, ok: false }); });
  };

  // 날짜 패널: 추가/수정/삭제 (로컬 반영 → [저장]으로 서버 반영)
  var openDay = function (d) { setDay(d); setDraft(null); };
  var startAdd = function () { setDraft({ id: null, tmp: "n" + Date.now(), date: day, brand: "", income: "", note: "" }); };
  var startEdit = function (e) { if (!e.paid) setDraft(Object.assign({}, e)); };
  var commitDraft = function () {
    if (!draft.brand.trim() || !(Number(draft.income) > 0)) { setMsg({ text: tx.need, ok: false }); return; }
    setMsg({ text: "", ok: false });
    setEntries(function (prev) {
      var key = draft.id !== null ? "id" : "tmp";
      var exists = prev.some(function (e) { return e[key] !== undefined && e[key] === draft[key]; });
      var row = { id: draft.id, tmp: draft.tmp, date: draft.date, brand: draft.brand.trim(), income: Number(draft.income), note: draft.note, paid: false };
      var next = exists ? prev.map(function (e) { return e[key] === draft[key] ? row : e; }) : prev.concat([row]);
      return next.sort(function (a, b) { return a.date.localeCompare(b.date); });
    });
    setDraft(null);
  };
  var removeEntry = function (e) {
    setEntries(function (prev) { return prev.filter(function (x) { return x !== e; }); });
    setDraft(null);
  };

  var C = { bg: "#f6f7fb", card: "#fff", line: "#e5e7eb", text: "#111827", sub: "#6b7280", pri: "#4f46e5", ok: "#059669", bad: "#dc2626" };
  var input = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.line, fontSize: 16, boxSizing: "border-box", background: "#fff", color: C.text, marginTop: 4 };
  var monthName = function (i) { return lang === "ko" ? (i + 1) + "월" : (MONTHS_BY_LANG[lang] || MONTHS_BY_LANG.en)[i]; };
  var totalCount = entries.length;
  var totalAmount = entries.reduce(function (s, e) { return s + (Number(e.income) || 0); }, 0);

  var head = (
    <div style={{ background: "#111827", color: "#fff", padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <div style={{ fontWeight: 900, fontSize: 15 }}>MoMo Agency</div>
        </div>
        <select value={lang} onChange={function (e) { setLang(e.target.value); }} aria-label="Language"
          style={{ padding: "7px 10px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 14, background: "#fff", color: "#111827" }}>
          {LANGS.map(function (l) { return <option key={l[0]} value={l[0]}>🌐 {l[1]}</option>; })}
        </select>
      </div>
      <div style={{ marginTop: 12, fontSize: 19, fontWeight: 900 }}>{tx.title}</div>
      {info && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{(lang === "ko" ? info.model.nameKr : (info.model.nameEn || info.model.nameKr)) + tx.hello}</div>}
    </div>
  );

  if (status === "invalid") return <div style={{ minHeight: "100vh", background: C.bg }}>{head}<div style={{ padding: 24, textAlign: "center", color: C.bad, fontWeight: 700 }}>{tx.invalid}</div></div>;

  // 달력 칸 만들기
  var y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7));
  var first = new Date(y, mo - 1, 1).getDay();
  var days = new Date(y, mo, 0).getDate();
  var cells = [];
  for (var i = 0; i < first; i++) cells.push(null);
  for (var d = 1; d <= days; d++) cells.push(d);
  var today = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  var dayEntries = day ? entries.filter(function (e) { return e.date === day; }) : [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.text }}>
      {head}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 12px 120px" }}>
        {info && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
            {Array.from({ length: 12 }).map(function (_, idx) {
              var key = info.year + "-" + pad2(idx + 1);
              var on = key === ym;
              return <button key={key} onClick={function () { changeMonth(key); }} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 20, border: on ? "none" : "1px solid " + C.line, background: on ? C.pri : "#fff", color: on ? "#fff" : C.text, fontWeight: 800, fontSize: 13 }}>{monthName(idx)}</button>;
            })}
          </div>
        )}

        {status === "loading" && <div style={{ padding: 30, textAlign: "center", color: C.sub }}>{tx.loading}</div>}
        {status === "error" && <div style={{ padding: 30, textAlign: "center", color: C.bad }}>{tx.err}</div>}

        {status === "ready" && (
          <>
            {/* 상단 요약: 촬영 건수 · 고객사로부터 받는 금액 합계 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8, marginBottom: 10 }}>
              <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.totalCount}</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{totalCount}{tx.countUnit}</div>
              </div>
              <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.totalAmount}</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2, color: C.pri }}>{won(totalAmount)}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55, marginBottom: 10 }}>{tx.intro}</div>

            {/* 달력 */}
            <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 14, padding: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {tx.wd.map(function (w, wi) { return <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: wi === 0 ? C.bad : wi === 6 ? C.pri : C.sub, padding: "4px 0" }}>{w}</div>; })}
                {cells.map(function (dd, ci) {
                  if (!dd) return <div key={"e" + ci} />;
                  var ds = ym + "-" + pad2(dd);
                  var list = entries.filter(function (e) { return e.date === ds; });
                  var sel = day === ds;
                  var wi = ci % 7;
                  return (
                    <button key={ds} onClick={function () { openDay(ds); }} style={{ aspectRatio: "1", borderRadius: 10, border: sel ? "2px solid " + C.pri : (ds === today ? "1.5px solid #a5b4fc" : "1px solid " + C.line), background: list.length ? "#eef2ff" : "#fff", padding: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", cursor: "pointer" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: wi === 0 ? C.bad : wi === 6 ? C.pri : C.text }}>{dd}</span>
                      {list.length > 0 && <span style={{ marginTop: 2, fontSize: 11, fontWeight: 900, color: "#fff", background: C.pri, borderRadius: 10, padding: "0 6px" }}>{list.length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 이번 달 입력 내역 */}
            <div style={{ fontWeight: 800, fontSize: 14, margin: "16px 2px 8px" }}>{tx.list}</div>
            {entries.length === 0 && <div style={{ background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: 16, color: C.sub, fontSize: 14 }}>{tx.none}</div>}
            {entries.map(function (e, ei) {
              return (
                <button key={(e.id || e.tmp) + "_" + ei} onClick={function () { openDay(e.date); startEdit(e); }} style={{ width: "100%", textAlign: "left", background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: "11px 13px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{e.date.slice(5).replace("-", "/")}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, marginLeft: 8, color: C.text }}>{e.brand}</span>
                    {e.paid && <span style={{ fontSize: 11, color: C.ok, fontWeight: 800, marginLeft: 6 }}>✓ {tx.paid}</span>}
                  </span>
                  <b style={{ fontSize: 15, color: C.text, whiteSpace: "nowrap" }}>{won(e.income)}</b>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* 날짜 패널 (아래에서 올라오는 시트) */}
      {day && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: C.card, width: "100%", maxWidth: 560, margin: "0 auto", borderRadius: "18px 18px 0 0", padding: "16px 14px calc(16px + env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{day}</div>
              <button onClick={function () { setDay(null); setDraft(null); setMsg({ text: "", ok: false }); }} style={{ border: "none", background: "#f3f4f6", borderRadius: 8, padding: "7px 12px", fontWeight: 800, color: C.text }}>{tx.close}</button>
            </div>

            {!draft && dayEntries.map(function (e, ei) {
              return (
                <div key={(e.id || e.tmp) + "_" + ei} style={{ border: "1px solid " + C.line, borderRadius: 12, padding: "11px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{e.brand}</div>
                    <div style={{ fontSize: 13, color: C.sub }}>{won(e.income)}{e.note ? " · " + e.note : ""}</div>
                    {e.paid && <div style={{ fontSize: 12, color: C.ok, fontWeight: 800 }}>✓ {tx.paid}</div>}
                  </div>
                  {!e.paid && <button onClick={function () { startEdit(e); }} style={{ border: "1px solid " + C.line, background: "#fff", borderRadius: 8, padding: "7px 12px", fontWeight: 800, color: C.pri, flexShrink: 0 }}>✏️</button>}
                </div>
              );
            })}

            {!draft && <button onClick={startAdd} style={{ width: "100%", padding: 14, borderRadius: 12, border: "2px dashed " + C.pri, background: "transparent", color: C.pri, fontWeight: 900, fontSize: 15 }}>{tx.add}</button>}

            {draft && (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.date}<input type="date" value={draft.date} min={ym + "-01"} max={ym + "-" + pad2(days)} onChange={function (e) { setDraft(Object.assign({}, draft, { date: e.target.value })); }} style={input} /></label>
                <label style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.brand}<input value={draft.brand} onChange={function (e) { setDraft(Object.assign({}, draft, { brand: e.target.value })); }} style={input} /></label>
                <label style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.amount}
                  <input type="text" inputMode="numeric" value={draft.income === "" || draft.income == null ? "" : Number(draft.income).toLocaleString("en-US")}
                    onChange={function (e) { var dg = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); setDraft(Object.assign({}, draft, { income: dg === "" ? "" : Number(dg) })); }} placeholder="0" style={input} />
                </label>
                <label style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{tx.note}<input value={draft.note} onChange={function (e) { setDraft(Object.assign({}, draft, { note: e.target.value })); }} style={input} /></label>
                {msg.text && !msg.ok && <div style={{ color: C.bad, fontSize: 13, fontWeight: 700 }}>{msg.text}</div>}
                <div style={{ display: "grid", gridTemplateColumns: (draft.id !== null || entries.some(function (x) { return x.tmp && x.tmp === draft.tmp; })) ? "1fr 2fr" : "1fr", gap: 8 }}>
                  {(draft.id !== null || entries.some(function (x) { return x.tmp && x.tmp === draft.tmp; })) && (
                    <button onClick={function () { var target = entries.find(function (x) { return draft.id !== null ? x.id === draft.id : x.tmp === draft.tmp; }); if (target) removeEntry(target); }} style={{ padding: 13, borderRadius: 12, border: "1px solid #fecaca", background: "#fff", color: C.bad, fontWeight: 900 }}>{tx.del}</button>
                  )}
                  <button onClick={commitDraft} style={{ padding: 13, borderRadius: 12, border: "none", background: C.pri, color: "#fff", fontWeight: 900, fontSize: 15 }}>{tx.ok}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 저장 바 */}
      {status === "ready" && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid " + C.line, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", zIndex: 40 }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {(dirty || msg.text) && !day && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: msg.text ? (msg.ok ? C.ok : C.bad) : "#d97706" }}>{msg.text || ("● " + tx.unsaved)}</div>}
            <button onClick={save} disabled={busy || !dirty} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: dirty ? C.pri : "#c7d2fe", color: "#fff", fontWeight: 900, fontSize: 16 }}>{busy ? tx.saving : tx.save}</button>
          </div>
        </div>
      )}
    </div>
  );
}
