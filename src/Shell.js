import { T, COLOR, FONT, FONT_FAMILY } from "./theme";

// ── 정산관리 · 프로젝트관리 공용 화면 뼈대 (Apple 스타일) ─────────────────────
// 반투명 상단 바 + 왼쪽 사이드바(데스크톱) / 하단 탭바 + 서랍 메뉴(모바일).
// 두 시스템이 같은 자리에 같은 버튼을 두어, 어느 쪽에서도 똑같이 쓸 수 있게 한다.

// 얇은 선 아이콘 (이모지·특수문자 대신 어느 기기에서나 같은 모양)
var ICONS = {
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  undo: ["M9 14L4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["M15 14l5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"],
  sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.93 4.93l1.41 1.41", "M17.66 17.66l1.41 1.41", "M2 12h2", "M20 12h2", "M4.93 19.07l1.41-1.41", "M17.66 6.34l1.41-1.41"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
};
function Icon({ name, size }) {
  return (
    <svg width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name].map(function (d, i) { return <path key={i} d={d} />; })}
    </svg>
  );
}

export function Loading({ dark }) {
  var t = T(dark);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: FONT_FAMILY }}>
      <div style={{ textAlign: "center" }}>
        <div className="ui-spinner" style={{ margin: "0 auto 14px" }} />
        <div style={{ fontWeight: 600, fontSize: FONT.md, color: t.sub }}>데이터 불러오는 중…</div>
      </div>
    </div>
  );
}

// 사이드바 한 줄 (선택되면 옅은 틴트 배경 + 틴트 글자)
export function NavItem({ active, icon, label, onClick, dark, small, trailing, dim }) {
  var t = T(dark);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 1, opacity: dim && !active ? 0.5 : 1 }}>
      <button onClick={onClick} aria-current={active ? "page" : undefined} style={{
        flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: small ? 34 : 36, padding: "0 10px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? t.tintSoft : "transparent", color: active ? COLOR.primary : t.text,
        fontWeight: active ? 600 : 500, fontSize: small ? FONT.base : FONT.md,
      }}>
        <span style={{ width: 22, display: "flex", justifyContent: "center", flexShrink: 0, fontSize: small ? FONT.sm : FONT.lg }}>{icon}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>{label}</span>
      </button>
      {trailing}
    </div>
  );
}

// 모델 이름 앞 동그란 머리글자
export function Avatar({ letter, active, dark }) {
  var t = T(dark);
  return (
    <span style={{ width: 22, height: 22, borderRadius: 11, background: active ? COLOR.primary : t.fill, color: active ? "#fff" : t.sub,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{letter}</span>
  );
}

export function NavSection({ title, action, dark }) {
  var t = T(dark);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 10px 6px" }}>
      <span style={{ fontSize: FONT.xs, fontWeight: 600, color: t.sub, letterSpacing: "0.02em" }}>{title}</span>
      {action}
    </div>
  );
}

function SaveButton({ saveStatus, unsaved, onSave, dark }) {
  var t = T(dark);
  var saving = saveStatus === "saving";
  var bg = saveStatus === "saved" ? (dark ? "#14281B" : "#E3F4E8")
    : saveStatus === "error" ? (dark ? "#2D1513" : "#FDECEA")
    : unsaved ? COLOR.primary : t.fill;
  var fg = saveStatus === "saved" ? COLOR.success : saveStatus === "error" ? COLOR.danger : unsaved ? "#fff" : t.sub;
  var label = saving ? "저장 중…" : saveStatus === "saved" ? "✓ 저장됨" : saveStatus === "error" ? "저장 실패 · 다시 시도" : unsaved ? "저장" : "저장됨";
  return (
    <button onClick={onSave} disabled={saving} style={{ height: 32, padding: "0 14px", borderRadius: 16, border: "none", cursor: saving ? "not-allowed" : "pointer",
      fontWeight: 600, fontSize: FONT.sm, background: bg, color: fg, whiteSpace: "nowrap", boxShadow: unsaved && !saveStatus ? "0 2px 8px rgba(181,70,42,0.28)" : "none" }}>
      {label}
    </button>
  );
}

export default function AppShell(props) {
  var dark = props.dark, isMobile = props.isMobile, t = T(dark);
  var iconBtn = function (enabled) {
    return { width: 32, height: 32, borderRadius: 16, border: "none", background: "transparent", color: enabled ? t.text : t.sub,
      opacity: enabled ? 1 : 0.4, cursor: enabled ? "pointer" : "not-allowed", fontSize: FONT.lg, display: "flex", alignItems: "center", justifyContent: "center" };
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: FONT_FAMILY, colorScheme: dark ? "dark" : "light" }}>
      {props.overlays}

      {isMobile && props.mobileNavOpen && (
        <div className="ui-scrim" style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.32)" }} onClick={function () { props.setMobileNavOpen(false); }}>
          <div className="ui-drawer" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 268, background: t.card, overflowY: "auto", paddingBottom: 24 }} onClick={function (e) { e.stopPropagation(); }}>
            <div style={{ padding: "18px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: t.text, fontSize: FONT.xl, letterSpacing: "-0.02em" }}>메뉴</span>
              <button onClick={function () { props.setMobileNavOpen(false); }} aria-label="닫기" style={{ width: 30, height: 30, borderRadius: 15, border: "none", background: t.fill, color: t.sub, cursor: "pointer", fontSize: FONT.md, fontWeight: 700 }}>✕</button>
            </div>
            {props.nav}
          </div>
        </div>
      )}

      <header className="ui-glass" style={{ background: t.glass, boxShadow: "0 0.5px 0 " + t.border, padding: isMobile ? "0 10px" : "0 18px", height: 56, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 20 }}>
        {isMobile && (
          <button onClick={function () { props.setMobileNavOpen(true); }} aria-label="메뉴 열기" style={iconBtn(true)}><Icon name="menu" size={20} /></button>
        )}
        <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="MoMo Agency" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, objectFit: "contain" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: t.text, fontSize: isMobile ? FONT.md : FONT.lg, lineHeight: 1.2, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{props.title}</div>
          {!isMobile && <div style={{ fontSize: FONT.xs, color: t.sub, marginTop: 1 }}>{props.subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 6, flexShrink: 0 }}>
          <a href={props.switchHref} title={props.switchLabel} style={{ height: 32, padding: "0 12px", borderRadius: 16, background: t.fill, display: "flex", alignItems: "center", fontWeight: 600, fontSize: FONT.sm, color: t.text, textDecoration: "none", whiteSpace: "nowrap" }}>
            {isMobile ? props.switchShort : props.switchLabel}
          </a>
          <div style={{ display: "flex", alignItems: "center", marginLeft: isMobile ? 0 : 4 }}>
            <button onClick={props.undo} disabled={!props.canUndo} title="실행 취소" aria-label="실행 취소" style={iconBtn(props.canUndo)}><Icon name="undo" /></button>
            <button onClick={props.redo} disabled={!props.canRedo} title="다시 실행" aria-label="다시 실행" style={iconBtn(props.canRedo)}><Icon name="redo" /></button>
          </div>
          <SaveButton saveStatus={props.saveStatus} unsaved={props.unsaved} onSave={props.onSave} dark={dark} />
          <button onClick={props.onToggleDark} title={dark ? "밝은 화면" : "어두운 화면"} aria-label="화면 모드 전환" style={iconBtn(true)}><Icon name={dark ? "sun" : "moon"} /></button>
          {props.currentUser && !isMobile && <span style={{ fontSize: FONT.sm, color: t.sub, marginLeft: 2, whiteSpace: "nowrap" }}>{props.currentUser.name}</span>}
          {props.onLogout && <button onClick={props.onLogout} title="로그아웃" aria-label="로그아웃" style={Object.assign(iconBtn(true), { color: t.sub })}><Icon name="logout" /></button>}
        </div>
      </header>

      <div style={{ display: "flex", gap: 20, padding: isMobile ? "14px 12px" : "18px 20px", paddingBottom: isMobile ? 96 : 28, maxWidth: 1600, margin: "0 auto" }}>
        {!isMobile && (
          <aside style={{ width: 216, flexShrink: 0 }}>
            <nav style={{ background: t.card, borderRadius: 14, position: "sticky", top: 74, overflowY: "auto", maxHeight: "calc(100vh - 92px)", boxShadow: dark ? "none" : "0 1px 2px rgba(0,0,0,0.04)" }}>
              {props.nav}
            </nav>
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0 }}>
          {props.loadError && (
            <div role="alert" style={{ background: dark ? "#2D1513" : "#FEF3F2", color: dark ? "#FF9F95" : "#9B1C14", borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: FONT.base, fontWeight: 600, lineHeight: 1.5 }}>
              ⚠️ {props.loadError}
            </div>
          )}
          {props.children}
        </main>
      </div>

      {isMobile && (
        <nav className="ui-glass" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.glass, boxShadow: "0 -0.5px 0 " + t.border, display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {props.tabs.map(function (item) {
            var on = props.tab === item[0];
            return (
              <button key={item[0]} onClick={function () { props.setTab(item[0]); }} aria-current={on ? "page" : undefined} style={{ flex: 1, minWidth: 0, padding: "8px 2px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 20, lineHeight: 1, filter: on ? "none" : "grayscale(1)", opacity: on ? 1 : 0.55 }}>{item[2]}</span>
                <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, color: on ? COLOR.primary : t.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item[1]}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
