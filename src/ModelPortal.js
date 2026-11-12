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

  // ── 디자인 토큰 (Apple 스타일) ──────────────────────────────────────────────
  // 회색 그룹 배경 + 흰 카드, 테두리 대신 얇은 구분선, 포인트 색은 MoMo 러스트 하나만.
  var C = {
    bg: "#F2F2F7", card: "#FFFFFF", ink: "#1C1C1E", sub: "#6E6E73", faint: "#AEAEB2",
    sep: "rgba(60,60,67,0.13)", fill: "rgba(118,118,128,0.12)",
    tint: "#B5462A", tintSoft: "#FBEDE8", sat: "#2F6DB5",
    ok: "#2E7D4F", okSoft: "#E6F2EA", bad: "#C62828", badSoft: "#FDECEC",
  };
  var FF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Apple SD Gothic Neo', 'Pretendard Variable', Pretendard, 'Segoe UI', 'Malgun Gothic', sans-serif";
  var NUM = { fontVariantNumeric: "tabular-nums" };
  var card = { background: C.card, borderRadius: 14, overflow: "hidden" };
  var fieldLabel = { display: "block", fontSize: 13, color: C.sub, fontWeight: 500, margin: "0 4px 6px" };
  var input = { width: "100%", height: 46, padding: "0 14px", borderRadius: 11, border: "none", fontSize: 17, boxSizing: "border-box", background: C.fill, color: C.ink, fontFamily: FF };
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

  // 누르는 순간 반응(:active), 시트 등장, 접근성 설정은 인라인 스타일로 안 되므로 여기에 모아둔다.
  var css =
    ".mp button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".mp-press{transition:transform 120ms ease-out,background-color 120ms ease-out,opacity 120ms ease-out}" +
    ".mp-press:active:not(:disabled){transform:scale(0.97)}" +
    ".mp-row{transition:background-color 120ms ease-out}" +
    ".mp-row:active:not(:disabled){background-color:#E5E5EA !important}" +
    ".mp-cell:active{background-color:#F2F2F7 !important}" +
    ".mp input:focus{outline:none;box-shadow:0 0 0 2px " + C.tint + " inset;background:#fff !important}" +
    ".mp button:focus-visible,.mp select:focus-visible{outline:2px solid " + C.tint + ";outline-offset:2px}" +
    "@keyframes mpScrim{from{opacity:0}to{opacity:1}}" +
    "@keyframes mpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}" +
    "@keyframes mpRise{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}" +
    ".mp-scrim{animation:mpScrim 240ms ease-out both}" +
    ".mp-sheet{animation:mpSheet 380ms cubic-bezier(0.32,0.72,0,1) both}" +
    ".mp-bar{animation:mpRise 260ms cubic-bezier(0.32,0.72,0,1) both}" +
    ".mp-glass{background:rgba(242,242,247,0.78);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%)}" +
    "@media (prefers-reduced-motion:reduce){.mp-sheet,.mp-bar{animation:mpScrim 200ms ease-out both}.mp-press:active:not(:disabled){transform:none}}" +
    "@media (prefers-reduced-transparency:reduce){.mp-glass{background:#F2F2F7;-webkit-backdrop-filter:none;backdrop-filter:none}}";

  var head = (
    <header className="mp-glass" style={{ position: "sticky", top: 0, zIndex: 30, boxShadow: "0 0.5px 0 " + C.sep }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="MoMo Agency" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: C.ink }}>MoMo Agency</span>
        </div>
        <select value={lang} onChange={function (e) { setLang(e.target.value); }} aria-label="Language"
          style={{ height: 32, padding: "0 10px", borderRadius: 16, border: "none", fontWeight: 600, fontSize: 14, background: C.fill, color: C.ink, fontFamily: FF, maxWidth: 140 }}>
          {LANGS.map(function (l) { return <option key={l[0]} value={l[0]}>{l[1]}</option>; })}
        </select>
      </div>
    </header>
  );

  var shell = function (body) {
    return (
      <div className="mp" style={{ minHeight: "100vh", background: C.bg, fontFamily: FF, color: C.ink, WebkitTextSizeAdjust: "100%", WebkitFontSmoothing: "antialiased" }}>
        <style>{css}</style>
        {head}
        {body}
      </div>
    );
  };

  if (status === "invalid") return shell(
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ background: C.card, borderRadius: 14, padding: "22px 20px", fontSize: 16, lineHeight: 1.55, color: C.ink }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: C.badSoft, color: C.bad, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>!</div>
        {tx.invalid}
      </div>
    </div>
  );

  var first = new Date(y, mo - 1, 1).getDay();
  var days = new Date(y, mo, 0).getDate();
  var cells = [];
  for (var i = 0; i < first; i++) cells.push(null);
  for (var d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  var today = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  var dayEntries = day ? entries.filter(function (e) { return e.date === day; }) : [];
  var isExisting = draft && (draft.id !== null || entries.some(function (x) { return x.tmp && x.tmp === draft.tmp; }));
  var arrowBtn = { width: 34, height: 34, borderRadius: 17, border: "none", background: C.fill, color: C.tint, fontSize: 22, fontWeight: 500, lineHeight: "32px", padding: 0, cursor: "pointer", fontFamily: FF };
  var closeSheet = function () { setDay(null); setDraft(null); setMsg({ text: "", ok: false }); };
  var wdColor = function (wi) { return wi === 0 ? C.tint : wi === 6 ? C.sat : C.sub; };

  return shell(
    <>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "4px 16px 132px" }}>
        {name && (
          <div style={{ margin: "14px 4px 18px" }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.15 }}>{(lang === "ko" || lang === "en") ? name + tx.logTitle : tx.title}</h1>
            {!(lang === "ko" || lang === "en") && <div style={{ fontSize: 17, color: C.sub, marginTop: 4 }}>{name}</div>}
          </div>
        )}

        {/* 월 이동 + 이번 달 요약 */}
        <section style={Object.assign({}, card, { padding: "14px 16px 18px", marginBottom: 14 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="mp-press" aria-label="previous month" onClick={function () { stepMonth(-1); }} disabled={mo <= 1} style={Object.assign({}, arrowBtn, { opacity: mo <= 1 ? 0.35 : 1 })}>‹</button>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{monthTitle}</div>
            <button className="mp-press" aria-label="next month" onClick={function () { stepMonth(1); }} disabled={mo >= 12} style={Object.assign({}, arrowBtn, { opacity: mo >= 12 ? 0.35 : 1 })}>›</button>
          </div>
          {status === "ready" && (
            <div style={{ marginTop: 16, paddingTop: 16, boxShadow: "0 -0.5px 0 " + C.sep }}>
              <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{tx.totalAmount}</div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12, rowGap: 8, marginTop: 4 }}>
                <div style={Object.assign({ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1 }, NUM)}>{won(totalAmount)}</div>
                <div style={Object.assign({ flexShrink: 0, whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: C.tint, background: C.tintSoft, borderRadius: 999, padding: "5px 10px" }, NUM)}>{tx.totalCount} {totalCount}{tx.countUnit}</div>
              </div>
            </div>
          )}
        </section>

        {status === "loading" && <div style={{ padding: "48px 0", textAlign: "center", color: C.sub, fontSize: 15 }}>{tx.loading}</div>}
        {status === "error" && <div style={{ background: C.badSoft, color: C.bad, borderRadius: 14, padding: "16px 18px", fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>{tx.err}</div>}

        {status === "ready" && (
          <>
            {/* 달력: 날짜마다 업체명 + 짧은 금액 */}
            <section style={Object.assign({}, card, { padding: "4px 4px 6px" })}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {tx.wd.map(function (w, wi) { return <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: wdColor(wi), padding: "10px 0 8px" }}>{w}</div>; })}
                {cells.map(function (dd, ci) {
                  var wi = ci % 7;
                  var rowTop = { boxShadow: "inset 0 0.5px 0 " + C.sep };
                  if (!dd) return <div key={"e" + ci} style={Object.assign({ minHeight: 78 }, rowTop)} />;
                  var ds = ym + "-" + pad2(dd);
                  var list = entries.filter(function (e) { return e.date === ds; });
                  var sel = day === ds;
                  var isToday = ds === today;
                  return (
                    <button key={ds} className="mp-cell" aria-label={dayTitle(ds)} onClick={function () { openDay(ds); if (!list.length) setTimeout(startAddFor(ds), 0); }}
                      style={Object.assign({ minHeight: 78, padding: "5px 2px 6px", background: sel ? C.tintSoft : "transparent", border: "none", borderRadius: sel ? 10 : 0, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 3, cursor: "pointer", textAlign: "left", minWidth: 0, fontFamily: FF }, rowTop)}>
                      <span style={Object.assign({ alignSelf: "center", width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : (wi === 0 ? C.tint : wi === 6 ? C.sat : C.ink), background: isToday ? C.tint : "transparent" }, NUM)}>{dd}</span>
                      {list.slice(0, 2).map(function (e, ei) {
                        return (
                          <span key={ei} style={{ display: "block", background: e.paid ? C.okSoft : C.tintSoft, borderRadius: 6, padding: "3px 3px 3px 4px", minWidth: 0 }}>
                            <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontSize: 11, fontWeight: 600, color: C.ink, overflow: "hidden", wordBreak: "break-all", lineHeight: "13px" }}>{e.brand}</span>
                            <span style={Object.assign({ display: "block", fontSize: 11, fontWeight: 600, color: e.paid ? C.ok : C.tint, lineHeight: "14px", marginTop: 1 }, NUM)}>{compactWon(e.income, lang)}</span>
                          </span>
                        );
                      })}
                      {list.length > 2 && <span style={{ fontSize: 11, fontWeight: 600, color: C.sub, textAlign: "center" }}>+{list.length - 2}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
            <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, margin: "8px 16px 26px" }}>{tx.hint}</p>

            {/* 이번 달 목록 */}
            {entries.length > 0 && <h2 style={{ fontSize: 13, fontWeight: 500, color: C.sub, margin: "0 16px 7px", textTransform: "uppercase", letterSpacing: "0.02em" }}>{tx.list}</h2>}
            {entries.length > 0 && (
              <section style={card}>
                {entries.map(function (e, ei) {
                  return (
                    <button key={(e.id || e.tmp) + "_" + ei} className="mp-row" onClick={function () { openDay(e.date); startEdit(e); }}
                      style={{ width: "100%", textAlign: "left", background: C.card, border: "none", padding: "0 0 0 16px", display: "flex", alignItems: "stretch", gap: 12, cursor: "pointer", fontFamily: FF }}>
                      <span style={Object.assign({ width: 40, flexShrink: 0, alignSelf: "center", fontSize: 15, fontWeight: 600, color: C.sub }, NUM)}>{Number(e.date.slice(5, 7))}/{Number(e.date.slice(8, 10))}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 12px 0", boxShadow: ei ? "inset 0 0.5px 0 " + C.sep : "none" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 17, fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{e.brand}</span>
                          {(e.note || e.paid) && <span style={{ display: "block", fontSize: 13, color: e.paid ? C.ok : C.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.paid ? "✓ " + tx.paid : e.note}</span>}
                        </span>
                        <span style={Object.assign({ fontSize: 17, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }, NUM)}>{won(e.income)}</span>
                        <span aria-hidden="true" style={{ fontSize: 20, color: C.faint, lineHeight: 1, visibility: e.paid ? "hidden" : "visible" }}>›</span>
                      </span>
                    </button>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* 날짜 시트: 아래에서 올라오고, 바깥을 눌러도 닫히지 않음(입력 유실 방지) */}
      {day && (
        <div className="mp-scrim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
          <div role="dialog" aria-modal="true" aria-label={dayTitle(draft ? draft.date : day)} className="mp-sheet"
            style={{ background: C.card, width: "100%", maxWidth: 560, margin: "0 auto", borderRadius: "22px 22px 0 0", padding: "8px 18px calc(20px + env(safe-area-inset-bottom))", maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}>
            <div style={{ width: 36, height: 5, borderRadius: 3, background: "#D1D1D6", margin: "0 auto 14px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{dayTitle(draft ? draft.date : day)}</div>
              <button className="mp-press" onClick={closeSheet} aria-label={tx.close}
                style={{ height: 32, padding: "0 14px", borderRadius: 16, border: "none", background: C.fill, fontSize: 15, fontWeight: 600, color: C.sub, fontFamily: FF, cursor: "pointer" }}>{tx.close}</button>
            </div>

            {!draft && dayEntries.length > 0 && (
              <div style={{ background: C.bg, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
                {dayEntries.map(function (e, ei) {
                  return (
                    <button key={(e.id || e.tmp) + "_" + ei} className="mp-row" onClick={function () { startEdit(e); }} disabled={e.paid}
                      style={{ width: "100%", textAlign: "left", border: "none", background: C.bg, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontFamily: FF, cursor: e.paid ? "default" : "pointer", boxShadow: ei ? "inset 0 0.5px 0 " + C.sep : "none" }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 17, fontWeight: 500, color: C.ink }}>{e.brand}</span>
                        {(e.paid || e.note) && <span style={{ display: "block", fontSize: 13, color: e.paid ? C.ok : C.sub, marginTop: 2 }}>{e.paid ? "✓ " + tx.paid : e.note}</span>}
                      </span>
                      <span style={Object.assign({ fontSize: 17, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }, NUM)}>{won(e.income)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {!draft && <button className="mp-press" onClick={startAdd} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: C.tintSoft, color: C.tint, fontWeight: 600, fontSize: 17, fontFamily: FF, cursor: "pointer" }}>{tx.add}</button>}

            {draft && (
              <div style={{ display: "grid", gap: 16 }}>
                <label><span style={fieldLabel}>{tx.brand}</span><input autoFocus value={draft.brand} onChange={function (e) { setDraft(Object.assign({}, draft, { brand: e.target.value })); }} style={input} /></label>
                <label><span style={fieldLabel}>{tx.amount}</span>
                  <input type="text" inputMode="numeric" value={draft.income === "" || draft.income == null ? "" : Number(draft.income).toLocaleString("en-US")}
                    onChange={function (e) { var dg = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); setDraft(Object.assign({}, draft, { income: dg === "" ? "" : Number(dg) })); }} placeholder="0" style={Object.assign({}, input, NUM, { fontWeight: 600, fontSize: 20 })} />
                </label>
                <label><span style={fieldLabel}>{tx.date}</span><input type="date" value={draft.date} min={ym + "-01"} max={ym + "-" + pad2(days)} onChange={function (e) { setDraft(Object.assign({}, draft, { date: e.target.value })); }} style={input} /></label>
                <label><span style={fieldLabel}>{tx.note}</span><input value={draft.note} onChange={function (e) { setDraft(Object.assign({}, draft, { note: e.target.value })); }} style={input} /></label>
                {msg.text && !msg.ok && <div role="alert" style={{ background: C.badSoft, color: C.bad, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 500 }}>{msg.text}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {isExisting && <button className="mp-press" onClick={function () { var target = entries.find(function (x) { return draft.id !== null ? x.id === draft.id : x.tmp === draft.tmp; }); if (target) removeEntry(target); }} style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: C.badSoft, color: C.bad, fontWeight: 600, fontSize: 17, fontFamily: FF, cursor: "pointer" }}>{tx.del}</button>}
                  <button className="mp-press" onClick={commitDraft} style={{ flex: 2, height: 52, borderRadius: 14, border: "none", background: C.tint, color: "#fff", fontWeight: 600, fontSize: 17, fontFamily: FF, cursor: "pointer" }}>{tx.ok}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 저장 바: 바뀐 내용이 있을 때만, 반투명 재질로 콘텐츠 위에 떠 있음 */}
      {status === "ready" && !day && (dirty || msg.text) && (
        <div className="mp-glass mp-bar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, boxShadow: "0 -0.5px 0 " + C.sep, padding: "10px 16px calc(12px + env(safe-area-inset-bottom))", zIndex: 40 }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {msg.text && <div role="status" style={{ fontSize: 14, fontWeight: 500, marginBottom: dirty ? 8 : 0, color: msg.ok ? C.ok : C.bad, textAlign: "center" }}>{msg.ok ? "✓ " : ""}{msg.text}</div>}
            {dirty && <button className="mp-press" onClick={save} disabled={busy} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: C.tint, color: "#fff", fontWeight: 600, fontSize: 17, fontFamily: FF, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? tx.saving : tx.saveCh}</button>}
            {dirty && !msg.text && <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 6 }}>{tx.unsaved}</div>}
          </div>
        </div>
      )}
    </>
  );
}
