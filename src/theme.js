import React from "react";

// ── 공용 디자인 토큰 (정산관리 · 프로젝트관리 · 체크리스트가 함께 사용) ─────────
// Apple 시스템 스타일: 그룹 배경(#F2F2F7) 위에 흰 카드, 얇은 구분선, 브랜드 틴트 1색.
// 색상을 바꿀 땐 이 파일 하나만 고치면 모든 화면에 반영됩니다.
export var FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard Variable', Pretendard, 'Segoe UI', 'Malgun Gothic', sans-serif";

export function T(dark) {
  return {
    bg: dark ? "#000000" : "#F2F2F7",      // 페이지 배경 (iOS grouped background)
    card: dark ? "#1C1C1E" : "#FFFFFF",    // 카드
    border: dark ? "#38383A" : "#E5E5EA",  // 구분선
    text: dark ? "#F5F5F7" : "#1C1C1E",    // 본문
    sub: dark ? "#98989D" : "#6E6E73",     // 보조 텍스트
    input: dark ? "#2C2C2E" : "#FFFFFF",   // 입력칸 배경
    ib: dark ? "#48484A" : "#D1D1D6",      // 입력칸 테두리
    thead: dark ? "#2C2C2E" : "#F7F7FA",   // 표 머리
    card2: dark ? "#2C2C2E" : "#F7F7FA",   // 카드 안의 보조 영역
    fill: dark ? "rgba(120,120,128,0.24)" : "rgba(118,118,128,0.12)", // 회색 채움(세그먼트·칩)
    glass: dark ? "rgba(28,28,30,0.72)" : "rgba(255,255,255,0.72)",   // 반투명 헤더·탭바
    tintSoft: dark ? "#3A1F17" : "#FBEDE8", // 선택 항목 배경
  };
}

// ── 상태 컬러 (입금완료/미입금, 경고 등 의미가 있는 색은 항상 이 값을 씀) ──
export const COLOR = {
  primary: "#B5462A",      // 브랜드 틴트 (로고 M 색)
  primaryDark: "#8E3520",
  success: "#248A3D",
  danger: "#D92D20",
  warning: "#E8890C",
  purple: "#8944AB",
  cyan: "#0A7EA4",
};

// ── 라운드 스케일 ─────────────
export const RADIUS = { sm: 10, md: 12, lg: 16 };

// ── 타이포 스케일 ──
export const FONT = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 19, xxl: 22, display: 28 };

// ── 공용 버튼 컴포넌트 ──
var baseBtnStyle = {
  border: "none",
  fontWeight: 600,
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
        background: COLOR.primary,
        color: "#fff",
        padding: small ? "6px 12px" : baseBtnStyle.padding,
        fontSize: small ? FONT.xs : FONT.sm,
        opacity: disabled ? 0.4 : 1,
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
        background: t.fill,
        color: t.text,
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
        background: "rgba(217,45,32,0.12)",
        color: COLOR.danger,
      }, {
        padding: small ? "6px 12px" : baseBtnStyle.padding,
        fontSize: small ? FONT.xs : FONT.sm,
      }, style)}
    >{children}</button>
  );
}
