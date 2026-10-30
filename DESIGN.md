# DO-DAHAM (do-daham.com) Design Tokens & Architecture Guide

> **AI 작업 지침 (필독)**
> “이 프로젝트는 do-daham.com 브랜드 허브입니다. 디자인 토큰(DESIGN.md 기준)과 기존 링크 구조를 절대 임의로 변경하지 말고, 요청한 P0 항목(모바일 메뉴, 문의 동선, SEO, 히어로 문구)만 최소한의 코드로 수정하세요.”

---

## 1. Core Brand Design Tokens (`src/index.css` 기준)

아래 CSS 변수 및 타이포그래피 토큰은 브랜드 아이덴티티의 핵심이므로 **절대 임의로 변경하거나 삭제하지 마세요.**

### Color Tokens (`:root`)
| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg` | `#0A0A0A` | 기본 다크 배경색 |
| `--ink` | `#F2F2F2` | 기본 본문 및 헤드라인 텍스트 색상 |
| `--dim` | `#6C6C6C` | 보조/비활성 텍스트 및 캡션 색상 |
| `--acid` | `#C6FF00` | 브랜드 핵심 포인트 컬러 (Acid Lime) |
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

## 3. 작업 범위 원칙 (P0 항목에 집중)
- **허용된 수정 범위 (P0)**:
  1. 모바일 메뉴
  2. 문의 동선
  3. SEO
  4. 히어로 문구
- 위 요청된 P0 항목만 **최소한의 코드 변경**으로 수정하며, 기존 컴포넌트 구조·스타일 토큰·라우팅·CMS 기능은 건드리지 않습니다.
