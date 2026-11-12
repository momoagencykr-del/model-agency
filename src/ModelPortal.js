import { useState, useEffect } from "react";

// ── 모델 전용 촬영 입력 화면 (카톡 링크로 접속, 로그인 없음) ────────────────────
// 달력에서 날짜를 눌러 촬영을 추가하고 [저장]을 누르면 모델 정산관리 시스템에 바로 반영된다.
var L = {
  ko: {
    hint: "날짜를 눌러 촬영을 추가하세요. 저장하면 바로 정산에 반영됩니다.", saveCh: "변경사항 저장", logTitle: "님의 촬영 기록",
    title: "촬영 입력", hello: "님, 안녕하세요", intro: "촬영한 날짜를 눌러 [+ 촬영 추가]로 입력하고, 마지막에 [저장]을 눌러주세요. 저장하면 바로 정산에 반영됩니다.",
    totalCount: "이번 달 촬영", countUnit: "건", totalAmount: "고객사로부터 받는 금액 합계", add: "+ 촬영 추가",
    date: "촬영일", brand: "브랜드 / 고객사", amount: "고객사로부터 받는 금액 (원)", note: "메모 (선택)",
    save: "저장", saving: "저장 중...", saved: "저장되었습니다. 정산에 반영됐어요.", unsaved: "저장하지 않은 변경사항이 있습니다",
    del: "삭제", ok: "확인", close: "닫기", paid: "입금 완료 · 수정 불가", list: "이번 달 입력 내역", none: "아직 입력한 촬영이 없습니다. 달력에서 날짜를 눌러 추가하세요.",
    need: "브랜드와 금액을 입력해주세요", invalid: "링크가 올바르지 않습니다. 담당자에게 새 링크를 요청해주세요.", loading: "불러오는 중...", err: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    leave: "저장하지 않은 내용이 있습니다. 다른 달로 이동할까요?", wd: ["일","월","화","수","목","금","토"],
  },
  en: {
    hint: "Tap a day to add a shoot. Saved shoots go straight into your settlement.", saveCh: "Save changes", logTitle: "'s shoots",
    title: "Your shoots", hello: ", hello", intro: "Tap the day you had a shoot, add it with [+ Add shoot], then press [Save]. Saved shoots go straight into your settlement.",
    totalCount: "Shoots this month", countUnit: "", totalAmount: "Total received from clients", add: "+ Add shoot",
    date: "Shoot date", brand: "Brand / client", amount: "Amount from client (KRW)", note: "Note (optional)",
    save: "Save", saving: "Saving...", saved: "Saved. Added to your settlement.", unsaved: "You have unsaved changes",
    del: "Delete", ok: "OK", close: "Close", paid: "Paid · cannot be changed", list: "This month's shoots", none: "No shoots yet. Tap a day on the calendar to add one.",
    need: "Please enter the brand and amount", invalid: "This link is not valid. Please ask us for a new link.", loading: "Loading...", err: "Something went wrong. Please try again.",
    leave: "You have unsaved changes. Move to another month?", wd: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  },
  ru: {
    hint: "Нажмите на день, чтобы добавить съёмку. После сохранения она сразу попадает в расчёт.", saveCh: "Сохранить изменения", logTitle: " — ваши съёмки",
    title: "Ваши съёмки", hello: ", здравствуйте", intro: "Нажмите на день съёмки, добавьте её кнопкой [+ Добавить съёмку] и нажмите [Сохранить]. Сохранённые съёмки сразу попадают в расчёт.",
    totalCount: "Съёмок за месяц", countUnit: "", totalAmount: "Итого получено от клиентов", add: "+ Добавить съёмку",
    date: "Дата съёмки", brand: "Бренд / клиент", amount: "Сумма от клиента (KRW)", note: "Заметка (необязательно)",
    save: "Сохранить", saving: "Сохранение...", saved: "Сохранено. Добавлено в расчёт.", unsaved: "Есть несохранённые изменения",
    del: "Удалить", ok: "Готово", close: "Закрыть", paid: "Оплачено · изменить нельзя", list: "Съёмки за месяц", none: "Съёмок пока нет. Нажмите на день в календаре, чтобы добавить.",
    need: "Укажите бренд и сумму", invalid: "Ссылка недействительна. Попросите у нас новую ссылку.", loading: "Загрузка...", err: "Произошла ошибка. Попробуйте позже.",
    leave: "Есть несохранённые изменения. Перейти к другому месяцу?", wd: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"],
  },
  fr: {
    hint: "Touchez un jour pour ajouter un shooting. Une fois enregistré, il est ajouté à votre règlement.", saveCh: "Enregistrer", logTitle: " — vos shootings",
    title: "Vos shootings", hello: ", bonjour", intro: "Touchez le jour du shooting, ajoutez-le avec [+ Ajouter un shooting], puis appuyez sur [Enregistrer]. Les shootings enregistrés sont ajoutés directement à votre règlement.",
    totalCount: "Shootings ce mois-ci", countUnit: "", totalAmount: "Total reçu des clients", add: "+ Ajouter un shooting",
    date: "Date du shooting", brand: "Marque / client", amount: "Montant reçu du client (KRW)", note: "Note (facultatif)",
    save: "Enregistrer", saving: "Enregistrement...", saved: "Enregistré. Ajouté à votre règlement.", unsaved: "Modifications non enregistrées",
    del: "Supprimer", ok: "OK", close: "Fermer", paid: "Payé · non modifiable", list: "Shootings du mois", none: "Aucun shooting pour l'instant. Touchez un jour du calendrier pour en ajouter.",
    need: "Veuillez saisir la marque et le montant", invalid: "Ce lien n'est pas valide. Demandez-nous un nouveau lien.", loading: "Chargement...", err: "Une erreur s'est produite. Réessayez plus tard.",
    leave: "Modifications non enregistrées. Changer de mois ?", wd: ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],
  },
  pt: {
    hint: "Toque em um dia para adicionar um trabalho. Ao salvar, ele entra direto no seu acerto.", saveCh: "Salvar alterações", logTitle: " — seus trabalhos",
    title: "Seus trabalhos", hello: ", olá", intro: "Toque no dia do trabalho, adicione com [+ Adicionar trabalho] e depois toque em [Salvar]. Os trabalhos salvos entram direto no seu acerto.",
    totalCount: "Trabalhos no mês", countUnit: "", totalAmount: "Total recebido dos clientes", add: "+ Adicionar trabalho",
    date: "Data do trabalho", brand: "Marca / cliente", amount: "Valor recebido do cliente (KRW)", note: "Observação (opcional)",
    save: "Salvar", saving: "Salvando...", saved: "Salvo. Incluído no seu acerto.", unsaved: "Há alterações não salvas",
    del: "Excluir", ok: "OK", close: "Fechar", paid: "Pago · não pode ser alterado", list: "Trabalhos do mês", none: "Nenhum trabalho ainda. Toque em um dia do calendário para adicionar.",
    need: "Informe a marca e o valor", invalid: "Este link não é válido. Peça um novo link para nós.", loading: "Carregando...", err: "Ocorreu um erro. Tente novamente mais tarde.",
    leave: "Há alterações não salvas. Mudar de mês?", wd: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
  },
  es: {
    hint: "Toca un día para agregar un trabajo. Al guardar, se agrega directamente a tu liquidación.", saveCh: "Guardar cambios", logTitle: " — tus trabajos",
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
function detectLang() {
  try { var saved = localStorage.getItem("momoPortalLang"); if (saved && L[saved]) return saved; } catch (e) {}
  var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").slice(0, 2).toLowerCase();
  return L[nav] ? nav : "en";
}
var LOCALE = { ko: "ko-KR", en: "en-US", ru: "ru-RU", fr: "fr-FR", pt: "pt-BR", es: "es-ES" };
// 달력 칸에 들어갈 짧은 금액 (예: 75만 / 750K / 1.2M)
function compactWon(n, lang) {
  n = Number(n) || 0;
  if (lang === "ko") {
    if (n >= 100000000) return (Math.round(n / 10000000) / 10) + "억";
    if (n >= 10000) return (Math.round(n / 1000) / 10).toString().replace(/\.0$/, "") + "만";
    return n.toLocaleString("en-US");
  }
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toString().replace(/\.0$/, "") + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
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
  var startAddFor = function (ds) { return function () { setDraft({ id: null, tmp: "n" + Date.now(), date: ds, brand: "", income: "", note: "" }); }; };
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

  // ── 디자인 토큰: MoMo 로고의 러스트 컬러 하나만 포인트로, 나머지는 잉크·종이 톤으로 조용하게 ──
  var C = { paper: "#FAF9F6", card: "#FFFFFF", ink: "#221E1B", sub: "#857C75", faint: "#B9B1AA", line: "#ECE7E1", rust: "#B5462A", rustSoft: "#F6E7E1", sat: "#3E5F8A", bad: "#B42318" };
  var FF = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif";
  var input = { width: "100%", padding: "12px 13px", borderRadius: 10, border: "1px solid " + C.line, fontSize: 16, boxSizing: "border-box", background: "#fff", color: C.ink, marginTop: 6, fontFamily: FF, outline: "none" };
  var loc = LOCALE[lang] || "en-US";
  var totalCount = entries.length;
  var totalAmount = entries.reduce(function (s, e) { return s + (Number(e.income) || 0); }, 0);
  var y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7));
  var monthTitle = new Intl.DateTimeFormat(loc, { year: "numeric", month: "long" }).format(new Date(y, mo - 1, 1));
  var dayTitle = function (ds) { var p = ds.split("-"); return new Intl.DateTimeFormat(loc, { month: "long", day: "numeric", weekday: "short" }).format(new Date(+p[0], +p[1] - 1, +p[2])); };
  var stepMonth = function (delta) {
    var nm = mo + delta;
    if (nm < 1 || nm > 12) return;
    changeMonth(y + "-" + pad2(nm));
  };
  var name = info ? (lang === "ko" ? info.model.nameKr : (info.model.nameEn || info.model.nameKr)) : "";

  var head = (
    <header style={{ padding: "18px 18px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="MoMo Agency" style={{ width: 26, height: 26, borderRadius: 6 }} />
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.2, color: C.ink }}>MoMo Agency</span>
      </div>
      <select value={lang} onChange={function (e) { setLang(e.target.value); }} aria-label="Language"
        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid " + C.line, fontWeight: 700, fontSize: 13, background: "#fff", color: C.ink, fontFamily: FF, maxWidth: 130 }}>
        {LANGS.map(function (l) { return <option key={l[0]} value={l[0]}>{l[1]}</option>; })}
      </select>
    </header>
  );

  if (status === "invalid") return <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FF }}>{head}<div style={{ padding: "40px 24px", color: C.bad, fontWeight: 700, lineHeight: 1.6 }}>{tx.invalid}</div></div>;

  var first = new Date(y, mo - 1, 1).getDay();
  var days = new Date(y, mo, 0).getDate();
  var cells = [];
  for (var i = 0; i < first; i++) cells.push(null);
  for (var d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  var today = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  var dayEntries = day ? entries.filter(function (e) { return e.date === day; }) : [];
  var isExisting = draft && (draft.id !== null || entries.some(function (x) { return x.tmp && x.tmp === draft.tmp; }));
  var arrowBtn = { width: 36, height: 36, borderRadius: 18, border: "1px solid " + C.line, background: "#fff", color: C.ink, fontSize: 18, lineHeight: "34px", padding: 0, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FF, color: C.ink, WebkitTextSizeAdjust: "100%" }}>
      {head}
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "8px 14px 120px" }}>
        {name && (
          <div style={{ margin: "6px 4px 14px" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{(lang === "ko" || lang === "en") ? name + tx.logTitle : tx.title}</h1>
            {!(lang === "ko" || lang === "en") && <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{name}</div>}
          </div>
        )}

        {/* 월 이동 + 이번 달 요약 */}
        <section style={{ background: C.card, borderRadius: 16, border: "1px solid " + C.line, padding: "14px 16px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button aria-label="previous month" onClick={function () { stepMonth(-1); }} disabled={mo <= 1} style={Object.assign({}, arrowBtn, { opacity: mo <= 1 ? 0.3 : 1 })}>‹</button>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{monthTitle}</div>
            <button aria-label="next month" onClick={function () { stepMonth(1); }} disabled={mo >= 12} style={Object.assign({}, arrowBtn, { opacity: mo >= 12 ? 0.3 : 1 })}>›</button>
          </div>
          {status === "ready" && (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.line }}>
              <div>
                <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{tx.totalAmount}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{won(totalAmount)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{tx.totalCount}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.rust, marginTop: 2 }}>{totalCount}{tx.countUnit}</div>
              </div>
            </div>
          )}
        </section>

        {status === "loading" && <div style={{ padding: 40, textAlign: "center", color: C.sub }}>{tx.loading}</div>}
        {status === "error" && <div style={{ padding: 40, textAlign: "center", color: C.bad, fontWeight: 600 }}>{tx.err}</div>}

        {status === "ready" && (
          <>
            {/* 달력: 날짜마다 업체명 + 짧은 금액 */}
            <section style={{ background: C.card, borderRadius: 16, border: "1px solid " + C.line, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {tx.wd.map(function (w, wi) { return <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: wi === 0 ? C.rust : wi === 6 ? C.sat : C.sub, padding: "10px 0 8px", borderBottom: "1px solid " + C.line }}>{w}</div>; })}
                {cells.map(function (dd, ci) {
                  var wi = ci % 7;
                  var rightEdge = wi === 6;
                  var lastRow = ci >= cells.length - 7;
                  var cellBorder = { borderRight: rightEdge ? "none" : "1px solid " + C.line, borderBottom: lastRow ? "none" : "1px solid " + C.line };
                  if (!dd) return <div key={"e" + ci} style={Object.assign({ minHeight: 76, background: "#FCFBF9" }, cellBorder)} />;
                  var ds = ym + "-" + pad2(dd);
                  var list = entries.filter(function (e) { return e.date === ds; });
                  var sel = day === ds;
                  var isToday = ds === today;
                  return (
                    <button key={ds} onClick={function () { openDay(ds); if (!list.length) setTimeout(startAddFor(ds), 0); }}
                      style={Object.assign({ minHeight: 76, padding: "6px 3px 5px", background: sel ? C.rustSoft : "#fff", border: "none", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 3, cursor: "pointer", textAlign: "left", minWidth: 0, fontFamily: FF }, cellBorder)}>
                      <span style={{ alignSelf: "flex-start", marginLeft: 2, fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? "#fff" : (wi === 0 ? C.rust : wi === 6 ? C.sat : C.ink), background: isToday ? C.rust : "transparent", borderRadius: 9, padding: isToday ? "0 6px" : 0, lineHeight: "18px" }}>{dd}</span>
                      {list.slice(0, 2).map(function (e, ei) {
                        return (
                          <span key={ei} style={{ display: "block", background: e.paid ? "#EEF3EC" : C.rustSoft, borderRadius: 5, padding: "2px 2px 2px 3px", minWidth: 0 }}>
                            <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontSize: 10, fontWeight: 700, color: C.ink, overflow: "hidden", wordBreak: "break-all", lineHeight: "12px", letterSpacing: -0.3 }}>{e.brand}</span>
                            <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.rust, lineHeight: "12px", fontVariantNumeric: "tabular-nums" }}>{compactWon(e.income, lang)}</span>
                          </span>
                        );
                      })}
                      {list.length > 2 && <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, paddingLeft: 3 }}>+{list.length - 2}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
            <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, margin: "10px 4px 18px" }}>{tx.hint}</p>

            {/* 이번 달 목록 */}
            {entries.length > 0 && <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 4px 8px" }}>{tx.list}</h2>}
            {entries.length > 0 && (
              <section style={{ background: C.card, borderRadius: 16, border: "1px solid " + C.line, overflow: "hidden" }}>
                {entries.map(function (e, ei) {
                  return (
                    <button key={(e.id || e.tmp) + "_" + ei} onClick={function () { openDay(e.date); startEdit(e); }}
                      style={{ width: "100%", textAlign: "left", background: "#fff", border: "none", borderTop: ei ? "1px solid " + C.line : "none", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: FF }}>
                      <span style={{ width: 38, flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.sub, fontVariantNumeric: "tabular-nums" }}>{Number(e.date.slice(5, 7))}/{Number(e.date.slice(8, 10))}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.brand}</span>
                        {(e.note || e.paid) && <span style={{ display: "block", fontSize: 12, color: e.paid ? "#4F7A43" : C.sub, marginTop: 1 }}>{e.paid ? "✓ " + tx.paid : e.note}</span>}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{won(e.income)}</span>
                    </button>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* 날짜 시트 */}
      {day && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(34,30,27,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
          <div role="dialog" style={{ background: "#fff", width: "100%", maxWidth: 560, margin: "0 auto", borderRadius: "20px 20px 0 0", padding: "10px 18px calc(18px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.line, margin: "0 auto 12px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{dayTitle(draft ? draft.date : day)}</div>
              <button onClick={function () { setDay(null); setDraft(null); setMsg({ text: "", ok: false }); }} style={{ border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: C.sub, padding: 6, fontFamily: FF }}>{tx.close}</button>
            </div>

            {!draft && dayEntries.map(function (e, ei) {
              return (
                <button key={(e.id || e.tmp) + "_" + ei} onClick={function () { startEdit(e); }} disabled={e.paid}
                  style={{ width: "100%", textAlign: "left", border: "1px solid " + C.line, background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontFamily: FF, cursor: e.paid ? "default" : "pointer" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: C.ink }}>{e.brand}</span>
                    <span style={{ display: "block", fontSize: 12, color: e.paid ? "#4F7A43" : C.sub, marginTop: 2 }}>{e.paid ? "✓ " + tx.paid : (e.note || "")}</span>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: C.ink }}>{won(e.income)}</span>
                </button>
              );
            })}
            {!draft && <button onClick={startAdd} style={{ width: "100%", padding: 15, borderRadius: 12, border: "1.5px dashed " + C.rust, background: C.rustSoft, color: C.rust, fontWeight: 800, fontSize: 15, fontFamily: FF }}>{tx.add}</button>}

            {draft && (
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{tx.brand}<input autoFocus value={draft.brand} onChange={function (e) { setDraft(Object.assign({}, draft, { brand: e.target.value })); }} style={input} /></label>
                <label style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{tx.amount}
                  <input type="text" inputMode="numeric" value={draft.income === "" || draft.income == null ? "" : Number(draft.income).toLocaleString("en-US")}
                    onChange={function (e) { var dg = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); setDraft(Object.assign({}, draft, { income: dg === "" ? "" : Number(dg) })); }} placeholder="0" style={Object.assign({}, input, { fontVariantNumeric: "tabular-nums", fontWeight: 700 })} />
                </label>
                <label style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{tx.date}<input type="date" value={draft.date} min={ym + "-01"} max={ym + "-" + pad2(days)} onChange={function (e) { setDraft(Object.assign({}, draft, { date: e.target.value })); }} style={input} /></label>
                <label style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{tx.note}<input value={draft.note} onChange={function (e) { setDraft(Object.assign({}, draft, { note: e.target.value })); }} style={input} /></label>
                {msg.text && !msg.ok && <div style={{ color: C.bad, fontSize: 13, fontWeight: 600 }}>{msg.text}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {isExisting && <button onClick={function () { var target = entries.find(function (x) { return draft.id !== null ? x.id === draft.id : x.tmp === draft.tmp; }); if (target) removeEntry(target); }} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid " + C.line, background: "#fff", color: C.bad, fontWeight: 700, fontSize: 15, fontFamily: FF }}>{tx.del}</button>}
                  <button onClick={commitDraft} style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: C.ink, color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: FF }}>{tx.ok}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 저장 바: 바뀐 내용이 있을 때만 강조 */}
      {status === "ready" && !day && (dirty || msg.text) && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "rgba(250,249,246,0.96)", borderTop: "1px solid " + C.line, padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", zIndex: 40 }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {msg.text && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: msg.ok ? "#4F7A43" : C.bad }}>{msg.text}</div>}
            {dirty && <button onClick={save} disabled={busy} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: C.rust, color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FF }}>{busy ? tx.saving : tx.saveCh}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
