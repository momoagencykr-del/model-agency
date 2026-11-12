# MoMo Agency 내부 시스템 — Claude Code 작업 가이드

모델 캐스팅 에이전시(MoMo Agency) 내부용 웹앱. 운영자는 한국어로 소통하며, 변경 사항은 바로 쓸 수 있는 결과물로 간결하게 보고한다.

## 구성
- 배포: Vercel (`https://model-agency-ochre.vercel.app`) — `main`에 푸시하면 자동 배포
- 프론트: Create React App (`src/`), 서버: Vercel Functions (`api/`)
- 저장소: 구글 스프레드시트 탭에 JSON 저장 (`api/_store.js`가 40,000자 단위로 여러 칸에 나눠 저장 — 셀 50,000자 한도 대응)

| 화면 | 파일 | 주소 |
|---|---|---|
| 로그인/라우팅 | `src/Root.js` | |
| 모델 정산관리 | `src/App.js` | `#settlement` |
| 촬영 프로젝트 관리 | `src/ProjectApp.js` | `#projects` |
| 업무 체크리스트(주차별 메모) | `src/TaskChecklist.js` | 정산관리 탭 |
| 모델 입력 링크(모델용, 로그인 없음) | `src/ModelPortal.js` | `#/submit/<토큰>` |
| 공용 테마·버튼 | `src/theme.js` | |

| API | 시트 탭 | 비고 |
|---|---|---|
| `api/sheets.js` | Data | 정산 데이터 `{ data, modelMeta }` |
| `api/project-sheets.js` | ProjectData | 촬영건·지급정보·운영비 |
| `api/calendar-sheets.js` | CalendarData | 정산관리 캘린더 일정 |
| `api/work-sheets.js` | WorkData | 업무 체크리스트 메모 |
| `api/model-portal.js` | Data | 모델 토큰으로 본인 '모델 입력' 건만 조회·저장 |
| `api/login.js`, `api/_auth.js` | | 서버 로그인 → 토큰, 데이터 API는 토큰 필수 |

## 반드시 지킬 규칙 (과거 데이터 유실 사고에서 나온 것)
- 불러오기 실패를 "빈 데이터"로 취급하지 말 것. 로드 함수는 실패 시 예외를 던지고, 실패 상태에서는 저장하지 않거나 서버 최신본과 병합한다.
- 저장은 항상 서버 최신본을 읽고 3-way 병합(base=마지막 동기화본, local, remote) 후 기록. 통째로 덮어쓰기 금지.
- 촬영관리 → 정산관리 연동(`syncLinkedModelsToSettlement`)은 정산 데이터를 못 읽으면 즉시 중단.
- 촬영관리는 2초 디바운스 자동 저장. 연동은 즉시 반영되므로 저장 누락이 생기면 두 시스템이 어긋난다.
- contentEditable 편집기에 `dangerouslySetInnerHTML`을 리렌더마다 쓰지 말 것(커서 튐). 마운트 시 1회만 innerHTML 설정.
- 입력 팝업은 바깥 클릭으로 닫히지 않게 유지(입력 유실 방지).
- 모델용 화면/API에는 에이전시가 등록한 건, 고객사 청구액, 주민번호, 계좌를 절대 노출하지 않는다. 모델은 본인이 입력한 건과 '고객사로부터 받는 금액' 합계만 본다.
- 퇴사 모델은 삭제하지 않는다(`modelMeta[key].retired`), 목록 맨 아래 + '퇴사' 표시.
- 2026년 1~6월은 시스템 도입 전 내역 → 지급완료로 간주.

## 확정된 명칭 (임의 변경 금지)
'모델 지급 관리', '통역비(or 현장매니저)', '월별 촬영 정산내역', '모델 입력 링크', '📱 모델입력'

## 작업 순서
1. `npm install`
2. 수정 후 반드시 `CI=true npx react-scripts build` 통과 확인 (경고도 에러로 처리됨 — 미사용 변수 주의)
3. `main`에 커밋·푸시 → Vercel 배포 상태 확인
4. 사용자에게 무엇이 바뀌었는지 짧게 한국어로 보고

## 로컬 실행
- 화면만: `npm start` (API 호출은 실패함)
- API 포함: `npm i -g vercel` → `vercel link` → `vercel env pull .env.local` → `vercel dev`
  (환경변수: `REACT_APP_CLIENT_EMAIL`, `REACT_APP_PRIVATE_KEY`, `REACT_APP_SHEET_ID` 등 — 커밋 금지)

## 알려진 함정
- 배포 후 예전 화면이 보이면 브라우저 캐시 문제 → `vercel.json`에서 index.html 캐시 금지 중. 사용자에게 Ctrl+Shift+R 안내.
- Vercel 자동 배포가 멈춘 적 있음 → GitHub 커밋 상태에 Vercel 체크가 없으면 Vercel 대시보드에서 Redeploy.
- 정산 데이터의 월 키는 연도 없이 "7월" 형식(올해 기준).
