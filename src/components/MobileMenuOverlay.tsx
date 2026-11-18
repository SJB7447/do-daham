import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Settings, ShieldCheck, GraduationCap, X } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAuthorizedAdmin } from '../data/defaultActivities';
import { checkIsRegisteredInstructor } from '../lib/instructorsData';
import { CrystalCube } from './CrystalCube';

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  watchHref?: string;
  mode?: 'public' | 'instructor';
  currentUser?: User | null;
  isAdmin?: boolean;
  isInstructor?: boolean;
  onLogout?: () => void;
}

interface MenuItem {
  num: string;
  label: string;
  sub: string;
  to: string;
  children?: { label: string; to: string }[];
}

const PUBLIC_MENU_ITEMS: MenuItem[] = [
  { num: '01', label: '홈', sub: '브랜드 허브 · 대표 작품', to: '/' },
  { num: '02', label: '제작 의뢰', sub: 'AI 영상 · 홈페이지 제작', to: '/project' },
  {
    num: '03',
    label: 'AI 클래스',
    sub: '실무 교육 · 일정 · 강사진',
    to: '/class',
    children: [
      { label: '클래스 1기 · 수강료', to: '/class' },
      { label: '수업 일정 · 신청 현황', to: '/class/schedule' },
      { label: '강사진 프로필', to: '/class/instructors' },
      { label: '강사 합류 지원', to: '/apply/instructor-recruit' }
    ]
  },
  { num: '04', label: '활동 기록', sub: '교육 현장 · 언론 보도', to: '/activity' },
  { num: '05', label: '문의하기', sub: '빠른 상담 · 카카오톡', to: '/#contact' }
];

const INSTRUCTOR_MENU_ITEMS: MenuItem[] = [
  { num: '01', label: '내 프로필', sub: '프로필 편집 · 승인 요청', to: '/instructor/profile' },
  { num: '02', label: '내 수업 관리', sub: '일정 · 회차 · 장소 정리', to: '/instructor/classes' },
  { num: '03', label: '수업 등록', sub: '새 수업 · 강의 계획 작성', to: '/instructor/classes/new' },
  { num: '04', label: '공개 강사진', sub: '강사진 페이지 확인', to: '/class/instructors' },
  { num: '05', label: '수업 일정표', sub: '달력 · 신청 현황', to: '/class/schedule' }
];

const INSTRUCTOR_QUICK_LINKS = [
  { label: '내 프로필 편집', to: '/instructor/profile' },
  { label: '내 수업 관리', to: '/instructor/classes' },
  { label: '+ 새 수업 등록', to: '/instructor/classes/new' },
  { label: '수료생 작품 등록', to: '/class#showcase' }
];

const ADMIN_QUICK_LINKS = [
  { label: '신청 · 문의 관리', to: '/admin?tab=submissions', tabKey: 'submissions' },
  { label: '강사 프로필 승인', to: '/admin?tab=approvals', tabKey: 'approvals' },
  { label: '강사 초대 링크', to: '/admin?tab=invites', tabKey: 'invites' },
  { label: '수업 · 실적 관리', to: '/admin?tab=classes', tabKey: 'classes' },
  { label: '사이트 콘텐츠', to: '/admin?tab=content', tabKey: 'content' },
  { label: '활동 기록 관리', to: '/activity' }
];

export function MobileMenuOverlay({
  isOpen,
  onClose,
  triggerRef,
  watchHref = 'https://www.youtube.com/@CodeM_Studio_AI11',
  mode = 'public',
  currentUser,
  isAdmin,
  isInstructor,
  onLogout
}: MobileMenuOverlayProps) {
  const { pathname, search } = useLocation();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [fallbackUser, setFallbackUser] = useState<User | null>(() => auth.currentUser);
  const [fallbackInstructor, setFallbackInstructor] = useState(false);

  useEffect(() => {
    if (currentUser !== undefined) return;
    const unsub = onAuthStateChanged(auth, setFallbackUser);
    return () => unsub();
  }, [currentUser]);

  const resolvedUser = currentUser !== undefined ? currentUser : fallbackUser;
  const resolvedIsAdmin =
    isAdmin !== undefined ? isAdmin : isAuthorizedAdmin(resolvedUser?.email);

  useEffect(() => {
    if (isInstructor !== undefined) return;
    let cancelled = false;
    if (!resolvedUser) {
      setFallbackInstructor(false);
      return;
    }
    checkIsRegisteredInstructor(resolvedUser).then((ok) => {
      if (!cancelled) setFallbackInstructor(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedUser, isInstructor]);

  const resolvedIsInstructor =
    resolvedIsAdmin || (isInstructor !== undefined ? isInstructor : fallbackInstructor);
  const activeAdminTab = new URLSearchParams(search).get('tab') || 'content';

  const handleSignOut = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    onClose();
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && overlayRef.current) {
        const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const items = mode === 'instructor' ? INSTRUCTOR_MENU_ITEMS : PUBLIC_MENU_ITEMS;

  return (
    <div
      ref={overlayRef}
      id="mobile-nav-overlay"
      className="mobile-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="모바일 내비게이션 메뉴"
    >
      <div>
        <div className="mobile-menu-head">
          <Link to="/" onClick={handleClose} className="nav-logo">
            <CrystalCube size={24} pfx="mobmenu" />
            <span className="nav-logo-text uppercase tracking-wider">DO-DAHAM</span>
          </Link>
          <div className="nav-actions-right">
            <a
              href={watchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold tracking-normal text-[#A3A79F] hover:text-[#C6FF00] px-2.5 py-2 border border-white/15 rounded-[2px]"
            >
              유튜브 →
            </a>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              className="mobile-menu-close"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="mobile-menu-list" aria-label="모바일 주요 메뉴">
          {items.map((item) => {
            const isActive =
              item.to === '/'
                ? pathname === '/'
                : item.children
                  ? pathname.startsWith('/class') || pathname.startsWith('/apply')
                  : pathname === item.to;

            return (
              <div key={item.num} className="border-b border-white/[0.08]">
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={`mobile-menu-item border-b-0 ${isActive ? 'is-accent' : ''}`}
                >
                  <span className="mobile-menu-num">{item.num}</span>
                  <div className="flex flex-col">
                    <span className="mobile-menu-title">{item.label}</span>
                    <span className="text-[12.5px] font-medium text-[#A3A79F] mt-0.5">{item.sub}</span>
                  </div>
                </Link>

                {item.children && (
                  <div className="pl-10 pb-3.5 flex flex-wrap gap-2">
                    {item.children.map((sub) => {
                      const subActive = pathname === sub.to;
                      return (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          onClick={onClose}
                          className={`text-[13px] font-semibold px-3 py-2 rounded-[2px] border transition-colors ${
                            subActive
                              ? 'border-[#C6FF00] bg-[#C6FF00]/15 text-[#C6FF00]'
                              : 'border-white/[0.14] text-[#F2F2F2]/80 hover:border-[#C6FF00] hover:text-[#C6FF00]'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Role-Based Quick Menus (Visible ONLY to registered instructors / admin) */}
        {(resolvedIsInstructor || resolvedIsAdmin) && (
          <div className="space-y-4 mb-6">
            {resolvedIsInstructor && (
              <div className="p-3.5 border border-[#C6FF00]/30 bg-[#C6FF00]/[0.05] rounded-[2px]">
                <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-[#C6FF00] mb-2.5">
                  <GraduationCap size={14} aria-hidden="true" />
                  <span>강사 전용 메뉴</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {INSTRUCTOR_QUICK_LINKS.map((link) => {
                    const active = pathname === link.to;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={onClose}
                        className={`text-[13px] font-semibold px-3 py-2.5 rounded-[2px] border transition-colors ${
                          active
                            ? 'border-[#C6FF00] bg-[#C6FF00] text-[#0A0A0A]'
                            : 'border-white/[0.14] text-[#F2F2F2] hover:border-[#C6FF00] hover:text-[#C6FF00]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {resolvedIsAdmin && (
              <div className="p-3.5 border border-[#28C8F0]/35 bg-[#28C8F0]/[0.06] rounded-[2px]">
                <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-[#28C8F0] mb-2.5">
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>관리자 전용 CMS</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ADMIN_QUICK_LINKS.map((link) => {
                    const active = link.tabKey
                      ? pathname === '/admin' && activeAdminTab === link.tabKey
                      : pathname === link.to;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={onClose}
                        className={`text-[13px] font-semibold px-3 py-2.5 rounded-[2px] border transition-colors ${
                          active
                            ? 'border-[#28C8F0] bg-[#28C8F0] text-[#0A0A0A]'
                            : 'border-white/[0.14] text-[#F2F2F2] hover:border-[#28C8F0] hover:text-[#28C8F0]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mobile-menu-foot">
        <Link to="/#contact" onClick={onClose} className="mobile-menu-cta">
          프로젝트 · 강의 문의 →
        </Link>
        <div className="mobile-menu-meta">
          <span>{resolvedUser ? resolvedUser.email : '카카오톡 @AI다함스튜디오'}</span>
          <div className="flex items-center gap-3">
            {resolvedUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline cursor-pointer"
                style={{ color: 'var(--magenta)' }}
              >
                <LogOut size={12} /> 로그아웃
              </button>
            ) : (
              <>
                <Link
                  to="/instructor/login"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 hover:text-[#C6FF00] transition-colors"
                >
                  강사 로그인
                </Link>
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 hover:text-[#C6FF00] transition-colors"
                >
                  <Settings size={12} /> 관리자
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
