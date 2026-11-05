import { useState, useEffect } from "react";

// ── 모델 전용 촬영내역 제출 화면 (카톡 링크로 접속, 로그인 없음) ────────────────
var L = {
  ko: {
    title: "촬영 내역 제출", hello: "님, 안녕하세요", intro: "이번 달 촬영 내역을 확인해주세요. 맞으면 ✅, 다르면 ✏️ 수정, 안 한 촬영이면 ❌ 를 눌러주세요. 목록에 없는 촬영은 아래 [+ 촬영 추가]로 입력해주세요.",
    month: "월", registered: "정산 등록됨", project: "촬영 예정/진행", schedule: "일정 (금액 입력 필요)", added: "새로 추가",
    ok: "맞음", edit: "수정", absent: "안 함", gross: "업체 입금", net: "받을 금액(세후)", estimate: "예상",
    agency: "에이전시 촬영", self: "직접 촬영", date: "촬영일", brand: "브랜드/업체", amount: "고객사로부터 받는 금액 (원)", amountEdit: "금액이 다를 때만 입력 (비우면 기존 금액 유지)", totalOnly: "이번 달 받을 금액 합계 (세후)", note: "메모", type: "구분",
    add: "+ 촬영 추가", remove: "삭제", totalG: "업체 입금 합계", totalN: "받을 금액 합계", comment: "전달할 말 (선택)",
    submit: "제출하기", submitting: "제출 중...", done: "제출 완료! 확인 후 승인되면 정산에 반영됩니다.", again: "다시 보기",
    history: "제출 내역", pending: "확인 중", approved: "승인됨", rejected: "반려됨", none: "이 달에 등록된 촬영이 없습니다. 촬영이 있었다면 [+ 촬영 추가]로 입력해주세요.",
    needAmount: "금액을 입력해주세요", nothing: "제출할 내용이 없습니다", invalid: "링크가 올바르지 않습니다. 담당자에게 새 링크를 요청해주세요.", loading: "불러오는 중...", err: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  },
  en: {
    title: "Submit your shoots", hello: ", hello", intro: "Please check your shoots for this month. Tap ✅ if correct, ✏️ to fix, or ❌ if it didn't happen. Add any missing shoot with [+ Add shoot] below.",
    month: "", registered: "Registered", project: "Booked shoot", schedule: "Schedule (enter amount)", added: "Added by you",
    ok: "Correct", edit: "Edit", absent: "Didn't happen", gross: "Client fee", net: "You receive (after tax)", estimate: "est.",
    agency: "Agency booking", self: "Direct booking", date: "Shoot date", brand: "Brand / client", amount: "Amount from client (KRW)", amountEdit: "Enter only if the amount is different (leave blank to keep)", totalOnly: "Total you receive this month (after tax)", note: "Note", type: "Type",
    add: "+ Add shoot", remove: "Remove", totalG: "Total client fee", totalN: "Total you receive", comment: "Message to us (optional)",
    submit: "Submit", submitting: "Submitting...", done: "Submitted! It will be added to your settlement after we review it.", again: "Back",
    history: "Your submissions", pending: "In review", approved: "Approved", rejected: "Returned", none: "No shoots registered for this month. If you had any, add them with [+ Add shoot].",
    needAmount: "Please enter the amount", nothing: "Nothing to submit", invalid: "This link is not valid. Please ask us for a new link.", loading: "Loading...", err: "Something went wrong. Please try again.",
  },
  ru: {
    title: "Отправка съёмок", hello: ", здравствуйте", intro: "Проверьте съёмки за месяц. Нажмите ✅ если всё верно, ✏️ чтобы исправить, ❌ если съёмки не было. Недостающие съёмки добавьте кнопкой [+ Добавить съёмку].",
    month: "", registered: "Зарегистрировано", project: "Запланированная съёмка", schedule: "Расписание (укажите сумму)", added: "Добавлено вами",
    ok: "Верно", edit: "Исправить", absent: "Не было", gross: "Оплата клиента", net: "Вы получите (после налога)", estimate: "прибл.",
    agency: "Через агентство", self: "Напрямую", date: "Дата съёмки", brand: "Бренд / клиент", amount: "Сумма от клиента (KRW)", amountEdit: "Укажите, только если сумма другая (пусто — без изменений)", totalOnly: "Итого к получению за месяц (после налога)", note: "Заметка", type: "Тип",
    add: "+ Добавить съёмку", remove: "Удалить", totalG: "Итого оплата клиента", totalN: "Итого вы получите", comment: "Сообщение (необязательно)",
    submit: "Отправить", submitting: "Отправка...", done: "Отправлено! После проверки съёмки будут добавлены в расчёт.", again: "Назад",
    history: "Ваши отправки", pending: "На проверке", approved: "Одобрено", rejected: "Возвращено", none: "За этот месяц съёмок нет. Если были — добавьте их кнопкой [+ Добавить съёмку].",
    needAmount: "Укажите сумму", nothing: "Нечего отправлять", invalid: "Ссылка недействительна. Попросите у нас новую ссылку.", loading: "Загрузка...", err: "Произошла ошибка. Попробуйте позже.",
  },
  fr: {
    title: "Déclarer vos shootings", hello: ", bonjour", intro: "Vérifiez vos shootings du mois. Appuyez sur ✅ si c'est correct, ✏️ pour corriger, ou ❌ si le shooting n'a pas eu lieu. Ajoutez un shooting manquant avec [+ Ajouter un shooting] ci-dessous.",
    month: "", registered: "Enregistré", project: "Shooting réservé", schedule: "Planning (montant à saisir)", added: "Ajouté par vous",
    ok: "Correct", edit: "Modifier", absent: "N'a pas eu lieu", gross: "Montant client", net: "Vous recevez (après impôt)", estimate: "est.",
    agency: "Via l'agence", self: "En direct", date: "Date du shooting", brand: "Marque / client", amount: "Montant reçu du client (KRW)", amountEdit: "À remplir seulement si le montant est différent (vide = inchangé)", totalOnly: "Total à recevoir ce mois-ci (après impôt)", note: "Note", type: "Type",
    add: "+ Ajouter un shooting", remove: "Supprimer", totalG: "Total client", totalN: "Total à recevoir", comment: "Message pour nous (facultatif)",
    submit: "Envoyer", submitting: "Envoi...", done: "Envoyé ! Ce sera ajouté à votre règlement après vérification.", again: "Retour",
    history: "Vos envois", pending: "En vérification", approved: "Approuvé", rejected: "Renvoyé", none: "Aucun shooting enregistré ce mois-ci. Si vous en avez eu, ajoutez-les avec [+ Ajouter un shooting].",
    needAmount: "Veuillez saisir le montant", nothing: "Rien à envoyer", invalid: "Ce lien n'est pas valide. Demandez-nous un nouveau lien.", loading: "Chargement...", err: "Une erreur s'est produite. Réessayez plus tard.",
  },
  pt: {
    title: "Enviar seus trabalhos", hello: ", olá", intro: "Confira seus trabalhos deste mês. Toque em ✅ se estiver correto, ✏️ para corrigir, ou ❌ se não aconteceu. Adicione trabalhos que faltam com [+ Adicionar trabalho] abaixo.",
    month: "", registered: "Registrado", project: "Trabalho agendado", schedule: "Agenda (informe o valor)", added: "Adicionado por você",
    ok: "Correto", edit: "Editar", absent: "Não aconteceu", gross: "Valor do cliente", net: "Você recebe (após imposto)", estimate: "aprox.",
    agency: "Pela agência", self: "Direto", date: "Data do trabalho", brand: "Marca / cliente", amount: "Valor recebido do cliente (KRW)", amountEdit: "Preencha só se o valor for diferente (vazio = mantém)", totalOnly: "Total a receber neste mês (após imposto)", note: "Observação", type: "Tipo",
    add: "+ Adicionar trabalho", remove: "Remover", totalG: "Total do cliente", totalN: "Total a receber", comment: "Mensagem para nós (opcional)",
    submit: "Enviar", submitting: "Enviando...", done: "Enviado! Será incluído no seu acerto depois da nossa revisão.", again: "Voltar",
    history: "Seus envios", pending: "Em revisão", approved: "Aprovado", rejected: "Devolvido", none: "Nenhum trabalho registrado neste mês. Se você teve algum, adicione com [+ Adicionar trabalho].",
    needAmount: "Informe o valor", nothing: "Nada para enviar", invalid: "Este link não é válido. Peça um novo link para nós.", loading: "Carregando...", err: "Ocorreu um erro. Tente novamente mais tarde.",
  },
  es: {
    title: "Enviar tus trabajos", hello: ", hola", intro: "Revisa tus trabajos de este mes. Toca ✅ si es correcto, ✏️ para corregir, o ❌ si no se realizó. Agrega los que falten con [+ Agregar trabajo] abajo.",
    month: "", registered: "Registrado", project: "Trabajo reservado", schedule: "Agenda (indica el monto)", added: "Agregado por ti",
    ok: "Correcto", edit: "Editar", absent: "No se realizó", gross: "Monto del cliente", net: "Recibes (después de impuestos)", estimate: "aprox.",
    agency: "Por la agencia", self: "Directo", date: "Fecha del trabajo", brand: "Marca / cliente", amount: "Monto recibido del cliente (KRW)", amountEdit: "Completa solo si el monto es distinto (vacío = se mantiene)", totalOnly: "Total a recibir este mes (después de impuestos)", note: "Nota", type: "Tipo",
    add: "+ Agregar trabajo", remove: "Eliminar", totalG: "Total del cliente", totalN: "Total a recibir", comment: "Mensaje para nosotros (opcional)",
    submit: "Enviar", submitting: "Enviando...", done: "¡Enviado! Se agregará a tu liquidación después de revisarlo.", again: "Volver",
    history: "Tus envíos", pending: "En revisión", approved: "Aprobado", rejected: "Devuelto", none: "No hay trabajos registrados este mes. Si tuviste alguno, agrégalo con [+ Agregar trabajo].",
    needAmount: "Indica el monto", nothing: "Nada que enviar", invalid: "Este enlace no es válido. Pídenos un enlace nuevo.", loading: "Cargando...", err: "Ocurrió un error. Inténtalo más tarde.",
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
// 처음 접속 시 휴대폰 언어로 자동 선택 (지원하지 않는 언어면 영어)
function detectLang() {
  try { var saved = localStorage.getItem("momoPortalLang"); if (saved && L[saved]) return saved; } catch (e) {}
  var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").slice(0, 2).toLowerCase();
  return L[nav] ? nav : "en";
}

function won(n) { return "₩" + Math.round(Number(n) || 0).toLocaleString(); }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }

export default function ModelPortal({ token }) {
  var langState = useState(detectLang);
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
        return Object.assign({}, it, { income: "", action: it.source === "schedule" ? "" : "confirm", note: "", editing: false, orig: { date: it.date, brand: it.brand, type: it.type } });
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
  // 금액을 새로 입력한 건은 입력 금액 기준, 아니면 서버 기록 기준 세후 금액
  var rowNet = function (r) { return Number(r.income) > 0 ? calcNet(r.income, r.type) : (Number(r.final) || 0); };
  var totalN = active.reduce(function (s, r) { return s + rowNet(r); }, 0);

  var submit = function () {
    var list = rows.filter(function (r) { return r.action; });
    if (!list.length) { setMsg(tx.nothing); return; }
    var missing = list.find(function (r) { return r.action !== "absent" && !(Number(r.income) > 0) && (r.source === "new" || r.source === "schedule"); });
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
  var monthName = function (i) { return lang === "ko" ? (i + 1) + "월" : (MONTHS_BY_LANG[lang] || MONTHS_BY_LANG.en)[i]; };
  var srcLabel = { registered: tx.registered, project: tx.project, schedule: tx.schedule, new: tx.added };
  var srcColor = { registered: "#4f46e5", project: "#0891b2", schedule: "#d97706", new: "#059669" };

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
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.amount}<input type="number" inputMode="numeric" value={r.income} onChange={function (e) { upd(r.key, { income: e.target.value }); }} placeholder={(r.source === "registered" || r.source === "project") ? tx.amountEdit : "0"} style={input} /></label>
                      <label style={{ fontSize: 12, color: C.sub }}>{tx.note}<input value={r.note} onChange={function (e) { upd(r.key, { note: e.target.value }); }} style={input} /></label>
                    </div>
                  )}
                  {r.source === "new" ? (
                    <button onClick={function () { removeRow(r.key); }} style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fff", color: C.bad, fontWeight: 800 }}>{tx.remove}</button>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
                      {[["confirm", "✅ " + tx.ok, C.ok], ["edit", "✏️ " + tx.edit, C.pri], ["absent", "❌ " + tx.absent, C.bad]].map(function (b) {
                        var on = r.action === b[0];
                        var disabled = b[0] === "confirm" && r.source === "schedule";
                        return <button key={b[0]} disabled={disabled} onClick={function () {
                          if (b[0] === "confirm") upd(r.key, Object.assign({ action: "confirm", editing: false, income: "" }, r.orig));
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: C.sub, fontWeight: 700 }}>{tx.totalOnly}</span>
                  <b style={{ color: C.ok, fontSize: 18 }}>{won(totalN)}</b>
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
