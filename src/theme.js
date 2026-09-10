import React from "react";

// ── 공용 컬러 테마 (정산관리 · 프로젝트관리 시스템이 함께 사용) ──────────────
// 두 시스템에서 각자 복사해서 쓰던 T()를 여기 하나로 합쳤습니다.
// 앞으로 색상을 바꿀 땐 이 파일 하나만 고치면 양쪽에 동시에 반영됩니다.
export function T(dark) {
  return {
    bg: dark ? "#0f172a" : "#f1f5f9",
    card: dark ? "#1e293b" : "#fff",
    border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#1e293b",
    sub: dark ? "#94a3b8" : "#64748b",
    input: dark ? "#0f172a" : "#fff",
    ib: dark ? "#475569" : "#d1d5db",
    thead: dark ? "#0f172a" : "#f8fafc",
    card2: dark ? "#162032" : "#f8fafc",
  };
}

// ── 상태 컬러 (입금완료/미입금, 경고 등 의미가 있는 색은 항상 이 값을 씀) ──
export const COLOR = {
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  purple: "#7c3aed",
  cyan: "#0891b2",
};

// ── 라운드 스케일: 무분별하게 섞여있던 6~20px 값을 3단계로 정리 ─────────────
export const RADIUS = { sm: 8, md: 12, lg: 16 };

// ── 타이포 스케일: 10~19px 사이 20종 가까이 흩어져 있던 값을 8단계로 정리 ──
export const FONT = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 19, xxl: 22, display: 26 };

// ── 공용 버튼 컴포넌트 (padding/radius/font-weight를 화면마다 다시 정하지 않도록) ──
var baseBtnStyle = {
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  borderRadius: RADIUS.sm,
  fontSize: FONT.sm,
  padding: "9px 16px",
  lineHeight: 1.2,
};

export function PrimaryButton({ children, onClick, style, disabled, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={Object.assign({}, baseBtnStyle, {
        background: disabled ? "#a5a6f0" : COLOR.primary,
        color: "#fff",
        padding: small ? "6px 12px" : baseBtnStyle.padding,
        fontSize: small ? FONT.xs : FONT.sm,
        opacity: disabled ? 0.7 : 1,
      }, style)}
    >{children}</button>
  );
}

export function SecondaryButton({ children, onClick, style, dark, small }) {
  var t = T(dark);
  return (
    <button
      onClick={onClick}
      style={Object.assign({}, baseBtnStyle, {
        background: "transparent",
        color: t.text,
        border: "1px solid " + t.border,
        padding: small ? "6px 12px" : baseBtnStyle.padding,
        fontSize: small ? FONT.xs : FONT.sm,
      }, style)}
    >{children}</button>
  );
}

export function DangerButton({ children, onClick, style, outline, small }) {
  return (
    <button
      onClick={onClick}
      style={Object.assign({}, baseBtnStyle, outline ? {
        background: "transparent",
        color: COLOR.danger,
        border: "1px solid " + COLOR.danger,
      } : {
        background: COLOR.danger + "40",
        color: COLOR.danger,
      }, {
        padding: small ? "6px 12px" : baseBtnStyle.padding,
        fontSize: small ? FONT.xs : FONT.sm,
      }, style)}
    >{children}</button>
  );
}
