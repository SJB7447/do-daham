import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAuthorizedAdmin } from '../data/defaultActivities';
import { checkIsRegisteredInstructor } from '../lib/instructorsData';
import { CrystalCube } from './CrystalCube';
import { MobileMenuOverlay } from './MobileMenuOverlay';
import { ThemePullCord } from './ThemePullCord';

interface SiteHeaderProps {
  brandName?: string;
  scrolled?: boolean;
  badge?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaHref?: string;
  watchHref?: string;
}

interface SubMenuItem {
  to: string;
  label: string;
  desc: string;
  tabKey?: string;
}

type DropdownKey = 'class' | 'instructor' | 'admin' | null;

const CLASS_SUBPAGES: SubMenuItem[] = [
  { to: '/class', label: '클래스 1기 · 수강료', desc: '커리큘럼 · GROUP-DROP 계산기' },
  { to: '/class/schedule', label: '수업 일정 · 신청 현황', desc: '월간 달력 · 개설 확정 현황' },
  { to: '/class/instructors', label: '강사진 프로필', desc: '강사 소개 · 만나는 요일/시간' },
  { to: '/apply/instructor-recruit', label: '강사 합류 지원', desc: '파트너 강사 지원서 접수' }
];

const INSTRUCTOR_SUBPAGES: SubMenuItem[] = [
  { to: '/instructor/profile', label: '내 강사 프로필 편집', desc: '프로필 · 이력 · 강의 요일 수정' },
  { to: '/instructor/classes', label: '내 수업 일정 관리', desc: '내 수업 현황 · 인원 · 일정 수정' },
  { to: '/instructor/classes/new', label: '+ 새 수업 개설 등록', desc: '새 클래스 일정 및 커리큘럼 등록' },
  { to: '/class#showcase', label: '수료생 결과물 등록', desc: '수료생 완성 작품 쇼케이스 업로드' }
];

const ADMIN_SUBPAGES: SubMenuItem[] = [
  { to: '/admin?tab=submissions', tabKey: 'submissions', label: '신청 · 문의 관리 (CRM)', desc: '수강 · 제작 · 강사합류 접수 내역' },
  { to: '/admin?tab=approvals', tabKey: 'approvals', label: '강사 프로필 승인', desc: '승인 대기 중인 강사 프로필 검토' },
  { to: '/admin?tab=invites', tabKey: 'invites', label: '강사 초대 링크 발급', desc: '파트너 강사 초대 토큰 생성 · 관리' },
  { to: '/admin?tab=classes', tabKey: 'classes', label: '수업 시작 · 실적 관리', desc: '수업 개시 상태 및 누적 지표 설정' },
  { to: '/admin?tab=content', tabKey: 'content', label: '사이트 콘텐츠 · 폼 설정', desc: '메인 문구 · 영상 · 신청 폼 설정' },
  { to: '/activity', label: '현장 활동 · 보도 관리', desc: '활동 기록 · 언론 보도 등록/삭제' }
];

export function SiteHeader({
  brandName = 'DO-DAHAM',
  scrolled = true,
  badge,
  ctaLabel = '문의하기 →',
  ctaTo = '/#contact',
  ctaHref,
  watchHref = 'https://www.youtube.com/@CodeM_Studio_AI11'
}: SiteHeaderProps) {
  const { pathname, search } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<DropdownKey>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [isRegisteredInstructor, setIsRegisteredInstructor] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setIsRegisteredInstructor(false);
      return;
    }
    checkIsRegisteredInstructor(currentUser).then((ok) => {
      if (!cancelled) setIsRegisteredInstructor(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const isAdmin = isAuthorizedAdmin(currentUser?.email);
  const isInstructor = isAdmin || isRegisteredInstructor;

  const isHome = pathname === '/';
  const isProject = pathname === '/project';
  const isClassGroup = pathname.startsWith('/class') || pathname.startsWith('/apply');
  const isActivity = pathname === '/activity';
  const isInstructorGroup = pathname.startsWith('/instructor');
  const isAdminGroup = pathname.startsWith('/admin');
  const activeAdminTab = new URLSearchParams(search).get('tab') || 'content';

  // Close menus on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
  }, [pathname, search]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (navLinksRef.current && !navLinksRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const handleLogout = async () => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors
    }
  };

  const renderDropdown = (
    key: Exclude<DropdownKey, null>,
    label: string,
    to: string,
    isActiveGroup: boolean,
    items: SubMenuItem[],
    withLogout = false,
    alignRight = false
  ) => {
    const isOpen = openMenu === key;
    return (
      <div
        className="nav-dropdown-wrap"
        onMouseEnter={() => setOpenMenu(key)}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <Link
          to={to}
          onClick={() => setOpenMenu(null)}
          className={`nav-dropdown-trigger ${isActiveGroup || isOpen ? 'is-active' : ''}`}
        >
          {isActiveGroup && <span className="nav-active-dot" aria-hidden="true" />}
          <span>{label}</span>
        </Link>
        <button
          type="button"
          aria-label={`${label} 하위 메뉴 열기`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setOpenMenu((prev) => (prev === key ? null : key))}
          className={`nav-dropdown-chevron ${isActiveGroup || isOpen ? 'is-active' : ''}`}
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            className="nav-dropdown-menu"
            style={alignRight ? { left: 'auto', right: -12 } : undefined}
            role="menu"
            aria-label={`${label} 하위 메뉴`}
          >
            {items.map((sub) => {
              const subActive = sub.tabKey
                ? pathname === '/admin' && activeAdminTab === sub.tabKey
                : pathname === sub.to;
              return (
                <Link
                  key={sub.to}
                  to={sub.to}
                  role="menuitem"
                  onClick={() => setOpenMenu(null)}
                  className={`nav-dropdown-item ${subActive ? 'is-active' : ''}`}
                >
                  <span className="nav-dropdown-item-title">{sub.label}</span>
                  <span className="nav-dropdown-item-desc">{sub.desc}</span>
                </Link>
              );
            })}

            {withLogout && (
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="nav-dropdown-item w-full text-left border-t border-white/[0.08] mt-1 pt-2.5 cursor-pointer"
              >
                <span
                  className="nav-dropdown-item-title inline-flex items-center gap-1.5"
                  style={{ color: 'var(--magenta)' }}
                >
                  <LogOut size={13} aria-hidden="true" />
                  로그아웃
                </span>
                <span className="nav-dropdown-item-desc">
                  {currentUser?.email || '계정 로그아웃'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className={`bar ${scrolled ? 'scrolled' : ''}`} id="main-nav">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="nav-logo">
            <CrystalCube size={26} pfx="sitenav" />
            <span className="nav-logo-text uppercase tracking-wider">{brandName}</span>
          </Link>
          {badge && (
            <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider bg-[#C6FF00] text-[#0A0A0A] rounded-[2px] shrink-0">
              {badge}
            </span>
          )}
        </div>

        {/* Desktop Unified Navigation */}
        <div
          ref={navLinksRef}
          className={`nav-links ${isInstructor || isAdmin ? '!gap-5 xl:!gap-7' : ''}`}
        >
          <Link to="/" className={isHome ? 'is-active' : ''}>
            {isHome && <span className="nav-active-dot" aria-hidden="true" />}
            홈
          </Link>

          <Link to="/project" className={isProject ? 'is-active' : ''}>
            {isProject && <span className="nav-active-dot" aria-hidden="true" />}
            제작 의뢰
          </Link>

          {renderDropdown('class', 'AI 클래스', '/class', isClassGroup, CLASS_SUBPAGES)}

          <Link to="/activity" className={isActivity ? 'is-active' : ''}>
            {isActivity && <span className="nav-active-dot" aria-hidden="true" />}
            활동 기록
          </Link>

          {isInstructor &&
            renderDropdown(
              'instructor',
              '강사 메뉴',
              '/instructor/profile',
              isInstructorGroup,
              INSTRUCTOR_SUBPAGES,
              !isAdmin
            )}

          {isAdmin &&
            renderDropdown(
              'admin',
              '관리자 CMS',
              '/admin?tab=submissions',
              isAdminGroup,
              ADMIN_SUBPAGES,
              true,
              true
            )}
        </div>

        {/* Right Primary CTA + Mobile Hamburger */}
        <div className="nav-actions-right">
          {ctaHref ? (
            ctaHref.startsWith('/') ? (
              <Link to={ctaHref} className="nav-watch">
                {ctaLabel}
              </Link>
            ) : (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-watch"
              >
                {ctaLabel}
              </a>
            )
          ) : (
            <Link to={ctaTo} className="nav-watch">
              {ctaLabel}
            </Link>
          )}
          <button
            ref={menuBtnRef}
            type="button"
            className="nav-menu-btn"
            aria-label="전체 메뉴 열기"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-overlay"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <MobileMenuOverlay
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        triggerRef={menuBtnRef}
        watchHref={watchHref}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isInstructor={isInstructor}
        onLogout={handleLogout}
      />
      <ThemePullCord />
    </>
  );
}
