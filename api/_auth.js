// 서버 측 로그인/권한 확인.
// 예전엔 비밀번호가 화면 코드(누구나 볼 수 있는 JS)에 들어 있었고, 데이터 API는 인증 없이 열려 있었다.
// 이제 비밀번호는 해시로만 서버에 두고, 로그인하면 서명된 토큰을 발급해 모든 데이터 요청에서 확인한다.
const crypto = require("crypto");

const USERS = {
  admin: { name: "운영자", role: "admin", salt: "d31736909794dea511dfbdd30713a02d", hash: "b3685c3b8347ef33e05ba1ba9a5e8443f18859f2637880a4ca0ec3f82a8ee906" },
  JJ: { name: "모델정산관리자", role: "settlement", salt: "ea7ec9255970788bcc82d11af56512ac", hash: "09d739ad7ab6164c0c1bc3adc85e8312a03781af334d19ee7ef3ab5345b5a3e9" },
};
const TOKEN_DAYS = 30;

function secret() {
  // 서버에만 있는 환경변수(구글 서비스계정 키)에서 서명 키를 만든다 — 별도 설정 불필요
  const base = (process.env.AUTH_SECRET || "") + (process.env.REACT_APP_PRIVATE_KEY || "") + (process.env.REACT_APP_SHEET_ID || "");
  return crypto.createHash("sha256").update("momo-auth:" + base).digest();
}
function b64u(buf) { return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function fromB64u(s) { return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

function checkPassword(id, pw) {
  const u = USERS[id];
  if (!u || typeof pw !== "string") return null;
  const h = crypto.pbkdf2Sync(pw, u.salt, 120000, 32, "sha256");
  const ok = crypto.timingSafeEqual(h, Buffer.from(u.hash, "hex"));
  return ok ? { id: id, name: u.name, role: u.role } : null;
}

function signToken(user) {
  const payload = b64u(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + TOKEN_DAYS * 86400000 }));
  const sig = b64u(crypto.createHmac("sha256", secret()).update(payload).digest());
  return payload + "." + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") < 0) return null;
  const [payload, sig] = token.split(".");
  const expect = b64u(crypto.createHmac("sha256", secret()).update(payload).digest());
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(fromB64u(payload).toString("utf8"));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}

// roles: 허용할 역할 목록. 통과 시 사용자 정보 반환, 실패 시 401/403 응답 후 null 반환
function requireAuth(req, res, roles) {
  const h = req.headers["authorization"] || "";
  const user = verifyToken(h.replace(/^Bearer\s+/i, ""));
  if (!user) { res.status(401).json({ error: "로그인이 필요합니다" }); return null; }
  if (roles && roles.indexOf(user.role) === -1) { res.status(403).json({ error: "권한이 없습니다" }); return null; }
  return user;
}

module.exports = { checkPassword, signToken, verifyToken, requireAuth };
