# DO-DAHAM (do-daham.com) Design Tokens & Architecture Guide

> **AI 작업 지침 (필독)**
> “이 프로젝트는 do-daham.com 브랜드 허브 + CLASS 플랫폼입니다. 핵심 브랜드 토큰(`--bg`, `--ink`, `--acid`, `--font-display`, 프리즘 큐브)과 기존 라우트(`/`, `/activity`, `/admin`, `/workshop`, `/workshop-preview`)를 유지하면서, 승인된 개편안(Phase 1~4)을 순차적으로 구현하세요.”

---

## 1. Core Brand Design Tokens (`src/index.css` 기준)

아래 CSS 변수 및 타이포그래피 토큰은 브랜드 아이덴티티의 핵심이므로 **절대 임의로 변경하거나 삭제하지 마세요.**

### Color Tokens (`:root`)
| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg` | `#0A0A0A` | 기본 다크 배경색 |
| `--ink` | `#F2F2F2` | 기본 본문 및 헤드라인 텍스트 색상 |
| `--dim` | `#6C6C6C` | 장식 · 비활성 전용 텍스트 색상 (소형 본문 사용 금지) |
| `--dim-aa` | `#8C8C8C` | 접근성 AA(약 5.9:1) 기준 보조 텍스트 및 레이블 색상 |
| `--acid` | `#C6FF00` | 브랜드 핵심 포인트 컬러 (Acid Lime) |
| `--cyan` | `#28B8E8` | 보조/강사 구분/사용 완료 상태 시안 컬러 |
| `--amber` | `#F5C400` | 경고/승인 대기 상태 앰버 컬러 |
| `--magenta` | `#E02898` | 오류/거부 상태 마젠타 컬러 |
| `--div` | `rgba(255,255,255,.08)` | 섹션 및 요소 구분선 색상 |
| `--card-bd` | `rgba(255,255,255,.07)` | 카드 테두리 색상 |
| `--nav-blur` | `rgba(10,10,10,.82)` | 스크롤 시 상단 네비게이션 블러 배경 |

### Workshop Scoped Tokens (`.workshop-page`)
| Token | Value |
| :--- | :--- |
| `--workshop-navy` | `#1F2A44` |
| `--workshop-orange` | `#EA580C` |
| `--workshop-teal` | `#14B8A6` |
| `--workshop-dark` | `#0F172A` |
| `--workshop-white` | `#FFFFFF` |
| `--workshop-gray` | `#6B7280` |
| `--workshop-light` | `#E5E7EB` |
| `--workshop-soft` | `#F8FAFC` |

### Typography Tokens (`@theme`)
- `--font-sans`: `'Plus Jakarta Sans', "Noto Sans KR", sans-serif` (본문 및 UI 기본 폰트)
- `--font-display` / `.ff-disp`: `'Black Han Sans', "Noto Sans KR", sans-serif` (디스플레이/헤드라인 폰트)

---

## 2. 기존 라우트 및 링크 구조 (임의 변경 금지)

### React Router 경로 (`src/App.tsx`)
- `/` : 메인 브랜드 허브 (`PortfolioHome`)
- `/activity` : 대외활동 및 미디어 아카이브 (`ActivityPage`)
- `/workshop` : 현재 메인(`/`)으로 리다이렉트 유지 (`<Navigate to="/" replace />`)
- `/workshop-preview` : 워크숍 페이지 미리보기 (`WorkshopPage`)
- `/admin` : CMS 관리자 대시보드 (`AdminDashboard`)

### 메인 네비게이션 및 앵커 구조
- `#manifesto` : MANIFESTO 섹션 (`01`)
- `#masterpiece` : MASTERPIECE 섹션 (`02`)
- `#actions` : ACTIONS 프로젝트 그리드 섹션 (`03`)
- `/activity` : ACTIVITY 페이지 이동 링크
- `/admin` : CMS 관리 페이지 이동 링크
- `WATCH →` (`watchHref`) : 대표 유튜브 영상 또는 기본 채널(`https://www.youtube.com/@CodeM_Studio_AI11`) 연결 구조 유지
- 프로젝트 카드(`actions`)의 외부/내부 링크 및 Firestore(`portfolio/main`) 데이터 바인딩 구조 유지

---

## 3. 작업 범위 원칙 (순차 개편 Phase 1~4)
- **Phase 1 (P0 + 브랜드 허브 개편)**:
  1. 모바일 햄버거 메뉴 및 전체화면 오버레이(포커스 트랩 · ESC 닫기 · 의뢰/교육 진입점)
  2. 홈 히어로(`<h1>` · 3D 크리스탈 큐브 · 의뢰/클래스 CTA) 및 신뢰 띠 · WHAT WE DO · CLASS 1기 티저 · 강사 · CONTACT(`#contact`)
  3. SEO(`lang="ko"`, 페이지별 title/description/OG/canonical, `robots.txt`, `sitemap.xml`, `noindex` 분리)
  4. `ACTIONS` 프로젝트 카드 호버 시 풀컬러 복원
- **Phase 2+ (CLASS 플랫폼)**: `/class`, `/class/schedule`, `/class/instructors`, `/join/:token`, `/instructor` 및 Firestore 보안 규칙 순차 확장
