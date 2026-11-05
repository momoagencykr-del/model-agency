const { checkPassword, signToken } = require("./_auth");

// 무차별 대입 완화: 실패 시 약간 지연
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body || {};
  const user = checkPassword(String(body.id || ""), String(body.pw || ""));
  if (!user) {
    await new Promise(function (r) { setTimeout(r, 800); });
    return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
  }
  return res.status(200).json({ user: user, token: signToken(user) });
};
