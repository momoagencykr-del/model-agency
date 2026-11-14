import { useState, useEffect } from "react";
import App from "./App";
import ProjectApp from "./ProjectApp";
import ModelPortal from "./ModelPortal";
import { FONT_FAMILY } from "./theme";

// ── 계정 ─────────────────────────────────────────────────────────────────
// 비밀번호 확인은 서버(/api/login)에서만 한다. 로그인 성공 시 받은 토큰을 세션에 보관하고,
// 모든 /api 요청에 자동으로 첨부한다 (index.js 의 fetch 래퍼).
// admin: 두 시스템 전체 / JJ: 모델 정산관리만
export var AUTH_KEY = "momoAgencyAuth_v2";

function getRouteFromHash() {
  var h = window.location.hash || "";
  if (h.indexOf("#/submit/") === 0) return "portal";
  return h === "#projects" ? "projects" : "settlement";
}

function LoginScreen({ onLogin }) {
  var idState = useState("");
  var id = idState[0], setId = idState[1];
  var pwState = useState("");
  var pw = pwState[0], setPw = pwState[1];
  var errState = useState("");
  var err = errState[0], setErr = errState[1];

  var busyState = useState(false);
  var busy = busyState[0], setBusy = busyState[1];
  var submit = async function () {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      var r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, pw: pw }) });
      var j = await r.json();
      if (!r.ok) { setErr(j.error || "로그인 실패"); setBusy(false); return; }
      var session = Object.assign({}, j.user, { token: j.token });
      try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch (e) {}
      onLogin(session);
    } catch (e) { setErr("서버에 연결할 수 없습니다."); setBusy(false); }
  };

  var field = { width: "100%", height: 48, border: "none", padding: "0 16px", fontSize: 16, background: "transparent", color: "#1C1C1E", outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2F2F7", fontFamily: FONT_FAMILY, padding: 20, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="MoMo Agency" style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px", display: "block", objectFit: "contain", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />
          <div style={{ color: "#1C1C1E", fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em" }}>MoMo Agency</div>
          <div style={{ color: "#6E6E73", fontSize: 14, marginTop: 4 }}>내부 직원 전용 시스템</div>
        </div>
        <form onSubmit={function (e) { e.preventDefault(); submit(); }}>
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <input value={id} onChange={function (e) { setId(e.target.value); }} placeholder="아이디" autoComplete="username" autoFocus aria-label="아이디" style={field} />
            <div style={{ height: 0.5, background: "#E5E5EA", marginLeft: 16 }} />
            <input type="password" value={pw} onChange={function (e) { setPw(e.target.value); }} placeholder="비밀번호" autoComplete="current-password" aria-label="비밀번호" style={field} />
          </div>
          {err && <p role="alert" style={{ color: "#D92D20", fontSize: 13, margin: "12px 4px 0", textAlign: "center", fontWeight: 500 }}>{err}</p>}
          <button type="submit" disabled={busy} style={{ width: "100%", height: 50, marginTop: 16, background: "#B5462A", color: "#fff", border: "none", borderRadius: 14, fontWeight: 600, fontSize: 16, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AccessDenied({ user, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2F2F7", fontFamily: FONT_FAMILY, padding: 20 }}>
      <div style={{ textAlign: "center", background: "#fff", borderRadius: 18, padding: "36px 28px", maxWidth: 360, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 19, color: "#1C1C1E", marginBottom: 6, letterSpacing: "-0.02em" }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 14, color: "#6E6E73", marginBottom: 24, lineHeight: 1.5 }}>{user.name}님은 모델 정산관리 시스템만 이용하실 수 있습니다.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href="#settlement" style={{ background: "#B5462A", color: "#fff", borderRadius: 12, padding: "13px 18px", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>모델 정산관리로 이동</a>
          <button onClick={onLogout} style={{ background: "rgba(118,118,128,0.12)", border: "none", borderRadius: 12, padding: "13px 18px", fontWeight: 600, fontSize: 15, color: "#1C1C1E", cursor: "pointer" }}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  var userState = useState(function () {
    try {
      var s = sessionStorage.getItem(AUTH_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  });
  var user = userState[0], setUser = userState[1];

  var routeState = useState(getRouteFromHash());
  var route = routeState[0], setRoute = routeState[1];

  useEffect(function () {
    var onHashChange = function () { setRoute(getRouteFromHash()); };
    window.addEventListener("hashchange", onHashChange);
    return function () { window.removeEventListener("hashchange", onHashChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  var logout = function () {
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    setUser(null);
  };

  // 모델 제출 페이지: 로그인 없이 개인 링크로 접근
  if (route === "portal") return <ModelPortal token={decodeURIComponent((window.location.hash || "").slice("#/submit/".length))} />;

  if (!user || !user.token) {
    return <LoginScreen onLogin={setUser} />;
  }

  if (route === "projects" && user.role !== "admin") {
    return <AccessDenied user={user} onLogout={logout} />;
  }

  if (route === "projects") return <ProjectApp currentUser={user} onLogout={logout} />;
  return <App currentUser={user} onLogout={logout} />;
}
