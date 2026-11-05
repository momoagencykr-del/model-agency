import { useState, useEffect } from "react";
import App from "./App";
import ProjectApp from "./ProjectApp";
import ModelPortal from "./ModelPortal";

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 18, padding: 32, width: "100%", maxWidth: 340, boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={process.env.PUBLIC_URL + "/badge-icon.png"} alt="MoMo Agency" style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px", display: "block", objectFit: "contain" }} />
          <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 18 }}>MoMo Agency</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>내부 직원 전용 시스템</div>
        </div>
        <input
          value={id}
          onChange={function (e) { setId(e.target.value); }}
          onKeyDown={function (e) { if (e.key === "Enter") submit(); }}
          placeholder="아이디"
          style={{ width: "100%", border: "1px solid #475569", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "#0f172a", color: "#f1f5f9", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
        />
        <input
          type="password"
          value={pw}
          onChange={function (e) { setPw(e.target.value); }}
          onKeyDown={function (e) { if (e.key === "Enter") submit(); }}
          placeholder="비밀번호"
          style={{ width: "100%", border: "1px solid #475569", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "#0f172a", color: "#f1f5f9", outline: "none", marginBottom: 12, boxSizing: "border-box" }}
        />
        {err && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, textAlign: "center" }}>{err}</p>}
        <button onClick={submit} style={{ width: "100%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {busy ? "확인 중..." : "로그인"}
        </button>
      </div>
    </div>
  );
}

function AccessDenied({ user, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontFamily: "-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "36px 32px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#1e293b", marginBottom: 6 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{user.name}님은 모델 정산관리 시스템만 이용하실 수 있습니다.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <a href="#settlement" style={{ background: "#4f46e5", color: "#fff", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>모델 정산관리로 이동</a>
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, color: "#64748b", cursor: "pointer" }}>로그아웃</button>
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
