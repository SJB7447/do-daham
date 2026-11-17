import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import { CrystalCube } from './CrystalCube';
import { MobileMenuOverlay } from './MobileMenuOverlay';

interface SiteHeaderProps {
  brandName?: string;
  scrolled?: boolean;
  badge?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaHref?: string;
  watchHref?: string;
}

const CLASS_SUBPAGES = [
  { to: '/class', label: '클래스 1기 · 수강료', desc: '커리큘럼 · GROUP-DROP 계산기' },
  { to: '/class/schedule', label: '수업 일정 · 신청 현황', desc: '월간 달력 · 개설 확정 현황' },
  { to: '/class/instructors', label: '강사진 프로필', desc: '강사 소개 · 만나는 요일/시간' }
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
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';
  const isProject = pathname === '/project';
  const isClassGroup = pathname.startsWith('/class');
  const isActivity = pathname === '/activity';

  // Close dropdown on route change
  useEffect(() => {
    setClassMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!classMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClassMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClassMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [classMenuOpen]);

  return (
    <>
      <nav className={`bar ${scrolled ? 'scrolled' : ''}`} id="main-nav">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="nav-logo">
            <CrystalCube size={26} pfx="sitenav" />
            <span className="nav-logo-text uppercase tracking-wider">{brandName}</span>
          </Link>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-widest bg-[#C6FF00] text-[#0A0A0A] rounded-[2px] shrink-0">
              {badge}
            </span>
          )}
        </div>

        {/* Desktop Unified Navigation */}
        <div className="nav-links">
          <Link to="/" className={isHome ? 'is-active' : ''}>
            {isHome && <span className="nav-active-dot" aria-hidden="true" />}
            홈
          </Link>

          <Link to="/project" className={isProject ? 'is-active' : ''}>
            {isProject && <span className="nav-active-dot" aria-hidden="true" />}
            제작 의뢰
          </Link>

          {/* AI 클래스 Link + Dropdown (Click navigates to /class, Hover/Chevron opens subpages) */}
          <div
            ref={dropdownRef}
            className="nav-dropdown-wrap"
            onMouseEnter={() => setClassMenuOpen(true)}
            onMouseLeave={() => setClassMenuOpen(false)}
          >
            <Link
              to="/class"
              onClick={() => setClassMenuOpen(false)}
              className={`nav-dropdown-trigger ${isClassGroup || classMenuOpen ? 'is-active' : ''}`}
            >
              {isClassGroup && <span className="nav-active-dot" aria-hidden="true" />}
              <span>AI 클래스</span>
            </Link>
            <button
              type="button"
              aria-label="AI 클래스 하위 메뉴 열기"
              aria-expanded={classMenuOpen}
              aria-haspopup="menu"
              onClick={() => setClassMenuOpen((prev) => !prev)}
              className={`nav-dropdown-chevron ${isClassGroup || classMenuOpen ? 'is-active' : ''}`}
            >
              <ChevronDown
                size={13}
                className={`transition-transform duration-150 ${classMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {classMenuOpen && (
              <div className="nav-dropdown-menu" role="menu" aria-label="AI 클래스 하위 메뉴">
                {CLASS_SUBPAGES.map((sub) => {
                  const subActive = pathname === sub.to;
                  return (
                    <Link
                      key={sub.to}
                      to={sub.to}
                      role="menuitem"
                      onClick={() => setClassMenuOpen(false)}
                      className={`nav-dropdown-item ${subActive ? 'is-active' : ''}`}
                    >
                      <span className="nav-dropdown-item-title">{sub.label}</span>
                      <span className="nav-dropdown-item-desc">{sub.desc}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/activity" className={isActivity ? 'is-active' : ''}>
            {isActivity && <span className="nav-active-dot" aria-hidden="true" />}
            활동 기록
          </Link>
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
      />
    </>
  );
}
