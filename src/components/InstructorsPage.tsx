import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, Calendar, CheckCircle2, ExternalLink, Sparkles, UserPlus, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { BASE_LECTURE_HOURS, BASE_STUDENTS } from '../lib/classMetrics';
import {
  DEFAULT_SITE_SETTINGS,
  fetchSiteSettings,
  isInternalFormUrl,
  SiteSettings
} from '../lib/siteSettings';
import { CrystalCube } from './CrystalCube';
import { SiteHeader } from './SiteHeader';

type FieldFilter = 'ALL' | 'AI 영상 · 연출' | '웹 · 서비스' | '업무 자동화';
type DayKey = 'ALL' | '일' | '월' | '화' | '수' | '목' | '금' | '토';

interface InstructorProfile {
  id: string;
  name: string;
  initials: string;
  isLead: boolean;
  isExample: boolean;
  badgeText: string;
  accent: string;
  role: string;
  bio: string;
  detailBio: string;
  fields: Exclude<FieldFilter, 'ALL'>[];
  tags: string[];
  credentials: { label: string; text: string }[];
  activeDays: Exclude<DayKey, 'ALL'>[];
  scheduleTime: string;
  activeClassTitle: string;
  activeClassStatus: string;
  activeClassTo?: string;
  showStats?: boolean;
  lectureHours?: number;
  studentCount?: number;
  photoUrl?: string;
}

const WEEK_DAYS: Exclude<DayKey, 'ALL'>[] = ['일', '월', '화', '수', '목', '금', '토'];
const FIELD_OPTIONS: { value: FieldFilter; label: string }[] = [
  { value: 'ALL', label: '전체 분야' },
  { value: 'AI 영상 · 연출', label: 'AI 영상 · 연출' },
  { value: '웹 · 서비스', label: '웹 · 서비스' },
  { value: '업무 자동화', label: '업무 자동화' }
];

function toThemeAccent(hex: string): string {
  const normalized = hex.trim().toUpperCase();
  if (normalized === '#C6FF00') return 'var(--acid)';
  if (normalized === '#28B8E8' || normalized === '#28C8F0') return 'var(--cyan)';
  if (normalized === '#F5C400') return 'var(--amber)';
  if (normalized === '#E02898') return 'var(--magenta)';
  return hex;
}

const INSTRUCTORS: InstructorProfile[] = [
  {
    id: 'sim-jeongbo',
    name: '심정보',
    initials: 'SJB',
    isLead: true,
    isExample: false,
    badgeText: '대표 강사',
    accent: '#C6FF00',
    role: 'DO-DAHAM 대표 · AI 크리에이티브 디렉터',
    bio: '광고·숏폼·웹서비스를 직접 제작하는 크리에이터. 도구를 외우는 수업이 아니라 각자의 실제 결과물을 완성하는 실전 강의를 진행합니다.',
    detailBio:
      '경기관광공사 AI 영상 공모전 입상작(Code:M Studio)을 비롯해 다양한 AI 영상 프로젝트와 웹서비스를 직접 기획·제작하고 있습니다. 수강생의 직무와 목표에 맞춘 프롬프트 설계부터 최종 결과물 피드백까지 전 과정을 함께합니다.',
    fields: ['AI 영상 · 연출', '웹 · 서비스', '업무 자동화'],
    tags: ['AI 영상 연출', '홈페이지 · 웹 구축', '실무 AI 자동화'],
    credentials: [
      { label: 'AWARD', text: '경기관광공사 AI 영상 공모전 입상 (Code:M Studio)' },
      { label: 'LECTURE', text: '기관 · 기업 · 소그룹 AI 실무/영상 출강 다수' },
      { label: 'STUDIO', text: 'AI 영상 · 홈페이지 · 웹서비스 직접 기획 및 개발' }
    ],
    activeDays: ['화', '목', '토'],
    scheduleTime: '19:00 – 21:00 · 주말 협의',
    activeClassTitle: 'AI 실무 클래스 1기 (6회)',
    activeClassStatus: '사전 모집 중 · 1~30명 규모별 개설',
    activeClassTo: '/class',
    showStats: true,
    lectureHours: BASE_LECTURE_HOURS,
    studentCount: BASE_STUDENTS
  }
];

export default function InstructorsPage() {
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>('ALL');
  const [dayFilter, setDayFilter] = useState<DayKey>('ALL');
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorProfile | null>(null);
  const [approvedInstructors, setApprovedInstructors] = useState<InstructorProfile[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    fetchSiteSettings().then(setSiteSettings);
  }, []);

  const canApply = Boolean(siteSettings.classApplicationOpen);
  const activeApplyTarget = siteSettings.classApplicationFormUrl || '/apply/class-apply';

  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadApprovedInstructors() {
      try {
        const snap = await getDocs(
          query(collection(db, 'instructors'), where('status', '==', 'approved'))
        );
        if (cancelled || snap.empty) return;

        const palette = ['#28B8E8', '#F5C400', '#C6FF00'];
        const loaded: InstructorProfile[] = snap.docs.map((docSnap, idx) => {
          const d = docSnap.data();
          const name = String(d.displayName || '파트너 강사');
          const accent = palette[idx % palette.length];
          const tags: string[] = Array.isArray(d.tags) ? d.tags : [];
          return {
            id: docSnap.id,
            name,
            initials: name.slice(0, 2).toUpperCase(),
            isLead: false,
            isExample: false,
            badgeText: '파트너 강사',
            accent,
            role: String(d.title || 'DO-DAHAM 파트너 강사'),
            bio: String(d.bio || ''),
            detailBio: String(d.bio || ''),
            fields: ['AI 영상 · 연출', '웹 · 서비스', '업무 자동화'],
            tags,
            credentials: Array.isArray(d.credentials)
              ? d.credentials.map((c: string, i: number) => ({ label: `CAREER ${i + 1}`, text: c }))
              : [],
            activeDays: Array.isArray(d.activeDays) ? d.activeDays : [],
            scheduleTime: String(d.scheduleTime || '시간 협의'),
            activeClassTitle: '개설 수업 준비 중',
            activeClassStatus: '일정 공지 예정',
            showStats: Boolean(d.showStats),
            lectureHours: Number(d.lectureHours || 0),
            studentCount: Number(d.studentCount || 0),
            photoUrl: String(d.photoUrl || '')
          };
        });
        setApprovedInstructors(loaded);
      } catch {
        // Ignore if Firestore rules/network unavailable
      }
    }
    loadApprovedInstructors();
    return () => {
      cancelled = true;
    };
  }, []);

  const allInstructors = useMemo(
    () => [...INSTRUCTORS, ...approvedInstructors],
    [approvedInstructors]
  );

  const filteredInstructors = useMemo(() => {
    return allInstructors.filter((inst) => {
      const matchField = fieldFilter === 'ALL' || inst.fields.includes(fieldFilter);
      const matchDay = dayFilter === 'ALL' || inst.activeDays.includes(dayFilter);
      return matchField && matchDay;
    });
  }, [allInstructors, fieldFilter, dayFilter]);

  useEffect(() => {
    if (!selectedInstructor) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalCloseRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedInstructor(null);
        requestAnimationFrame(() => lastTriggerRef.current?.focus());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedInstructor]);

  const closeModal = () => {
    setSelectedInstructor(null);
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Top Navigation */}
      <SiteHeader
        badge="CLASS"
        ctaLabel={canApply ? '1기 사전 신청 →' : '강의 문의 →'}
        ctaHref={canApply ? activeApplyTarget : siteSettings.classInquiryFormUrl}
      />

      {/* Page Hero */}
      <header className="pt-28 sm:pt-36 pb-12 sm:pb-16 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/class"
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.14em] text-[#8C8C8C] hover:text-[#C6FF00] transition-colors mb-6 min-h-[44px]"
          >
            <ArrowLeft size={14} /> AI 실무 클래스로 돌아가기
          </Link>

          <div className="text-[11px] font-extrabold tracking-[0.18em] text-[#C6FF00] mb-3">
            CLASS · INSTRUCTORS
          </div>
          <h1 className="ff-disp text-4xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight mb-5">
            가르치는 사람이
            <br />
            <span className="text-[#C6FF00]">직접 만듭니다.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#8C8C8C] leading-relaxed max-w-2xl break-keep">
            실제 AI 영상과 웹서비스를 제작·수상한 현업 디렉터와 승인된 파트너 강사진의 전문 분야 및 만나는 시간을 확인하세요.
          </p>
        </div>
      </header>

      {/* Filters */}
      <section
        className="py-6 sm:py-8 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08] bg-[#0D0E0A]"
        aria-label="강사 필터"
      >
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-2.5">
              FIELD · 전문 분야
            </div>
            <div className="inst-filter-scroll">
              {FIELD_OPTIONS.map((opt) => {
                const active = fieldFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFieldFilter(opt.value)}
                    className={`inst-filter-chip ${active ? 'is-active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold tracking-[0.16em] text-[#8C8C8C] mb-2.5">
              DAY · 만나는 요일
            </div>
            <div className="inst-filter-scroll">
              <button
                type="button"
                aria-pressed={dayFilter === 'ALL'}
                onClick={() => setDayFilter('ALL')}
                className={`inst-filter-chip ${dayFilter === 'ALL' ? 'is-active' : ''}`}
              >
                전체
              </button>
              {WEEK_DAYS.map((day) => {
                const active = dayFilter === day;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDayFilter(day)}
                    className={`inst-filter-chip day-only ${active ? 'is-active' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Cards Grid */}
      <main className="py-12 sm:py-16 px-[22px] sm:px-8 lg:px-14 border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="text-xs font-bold text-[#8C8C8C]">
              총 <span className="text-[#F2F2F2]">{filteredInstructors.length}</span>명의 강사 프로필
            </div>
            {(fieldFilter !== 'ALL' || dayFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFieldFilter('ALL');
                  setDayFilter('ALL');
                }}
                className="text-xs font-bold text-[#C6FF00] hover:underline min-h-[44px] px-2"
              >
                필터 초기화
              </button>
            )}
          </div>

          {filteredInstructors.length === 0 ? (
            <div className="border border-white/[0.1] bg-[#11120E] rounded-[2px] p-10 text-center">
              <p className="text-base font-bold text-[#F2F2F2] mb-2">
                선택한 조건에 맞는 강사가 없습니다.
              </p>
              <p className="text-sm text-[#8C8C8C] mb-6">
                다른 분야나 요일을 선택하거나 필터를 초기화해 주세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFieldFilter('ALL');
                  setDayFilter('ALL');
                }}
                className="hero-cta"
              >
                전체 강사 보기 →
              </button>
            </div>
          ) : (
            <div className="inst-cards-grid">
              {filteredInstructors.map((inst) => (
                <article
                  key={inst.id}
                  className={`inst-card ${inst.isLead ? 'is-lead' : ''}`}
                >
                  {/* Top Photo / Avatar Area */}
                  <div className="inst-card-media">
                    <span
                      className={`inst-badge ${inst.isLead ? 'is-lead' : ''}`}
                    >
                      {inst.badgeText}
                    </span>

                    <div
                      className="inst-avatar-circle"
                      style={{ borderColor: toThemeAccent(inst.accent) }}
                    >
                      {inst.isLead ? (
                        <CrystalCube size={56} pfx={`inst-${inst.id}`} />
                      ) : (
                        <span
                          className="ff-disp text-2xl tracking-wider"
                          style={{ color: toThemeAccent(inst.accent) }}
                        >
                          {inst.initials}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-bold tracking-[0.12em] text-[#8C8C8C] mt-3">
                      {inst.isLead ? '실사 프로필 사진 교체 예정' : '예시 프로필 · 자리표시'}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="inst-card-body">
                    <div className="mb-3">
                      <h2 className="ff-disp text-[30px] leading-tight mb-1">{inst.name}</h2>
                      <p className="text-xs font-bold tracking-wide text-[#8C8C8C]">{inst.role}</p>
                    </div>

                    {inst.showStats && ((inst.lectureHours || 0) > 0 || (inst.studentCount || 0) > 0) && (
                      <div
                        className="inline-flex items-center gap-2 text-[11px] font-extrabold px-2.5 py-1 rounded-[2px] border mb-3 self-start bg-white/[0.04]"
                        style={{
                          color: toThemeAccent(inst.accent),
                          borderColor: toThemeAccent(inst.accent)
                        }}
                      >
                        강의 {(inst.lectureHours || 0).toLocaleString('ko-KR')}시간+ · 수강생{' '}
                        {(inst.studentCount || 0).toLocaleString('ko-KR')}명+
                      </div>
                    )}

                    <p className="text-sm text-[#F2F2F2]/85 leading-relaxed break-keep mb-4">
                      {inst.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {inst.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-[2px] border border-white/[0.12] bg-white/[0.03] text-[#F2F2F2]/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="border-t border-white/[0.08] pt-4 mb-5 space-y-2.5">
                      {inst.credentials.map((cred) => (
                        <div key={cred.label} className="text-xs leading-relaxed">
                          <span
                            className="inline-block font-extrabold tracking-[0.12em] mr-2"
                            style={{ color: toThemeAccent(inst.accent) }}
                          >
                            {cred.label}
                          </span>
                          <span className="text-[#8C8C8C] break-keep">{cred.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Day Strip */}
                    <div className="border-t border-white/[0.08] pt-4 mb-5">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#8C8C8C] inline-flex items-center gap-1.5">
                          <Calendar size={12} aria-hidden="true" /> 만나는 시간
                        </span>
                        <span className="text-[11px] font-bold text-[#F2F2F2]/80">
                          {inst.scheduleTime}
                        </span>
                      </div>
                      <div className="inst-day-strip" aria-label="강의 가능 요일">
                        {WEEK_DAYS.map((day) => {
                          const isActive = inst.activeDays.includes(day);
                          const accentVar = toThemeAccent(inst.accent);
                          return (
                            <span
                              key={day}
                              className={`inst-day-cell ${isActive ? 'is-active' : ''}`}
                              style={
                                isActive
                                  ? { backgroundColor: accentVar, color: 'var(--bg)', borderColor: accentVar }
                                  : undefined
                              }
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Class Summary */}
                    <div className="bg-black/40 border border-white/[0.08] rounded-[2px] px-3.5 py-3 mb-5">
                      <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#8C8C8C] mb-1">
                        OPEN CLASS
                      </div>
                      <div className="text-sm font-bold text-[#F2F2F2] mb-0.5">
                        {inst.activeClassTitle}
                      </div>
                      <div className="text-xs font-semibold" style={{ color: toThemeAccent(inst.accent) }}>
                        {inst.activeClassStatus}
                      </div>
                    </div>

                    {/* Action Button Only (Card itself is not clickable) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        lastTriggerRef.current = e.currentTarget;
                        setSelectedInstructor(inst);
                      }}
                      className={inst.isLead ? 'hero-cta w-full justify-center' : 'hero-cta-secondary w-full justify-center'}
                    >
                      프로필 · 수업 보기 →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Instructor Recruitment Banner Card */}
          <div className="mt-10 border border-dashed border-white/[0.2] bg-gradient-to-br from-[#13130C] to-[#0B0B0B] rounded-[2px] p-6 sm:p-9 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-2.5">
                <UserPlus size={14} aria-hidden="true" /> RECRUITING PARTNERS
              </div>
              <h2 className="ff-disp text-2xl sm:text-3xl leading-tight mb-2.5">
                DO-DAHAM CLASS와 함께할 현업 AI 강사를 찾습니다
              </h2>
              <p className="text-sm text-[#8C8C8C] leading-relaxed break-keep">
                자신만의 AI 영상·디자인·웹 개발·업무 자동화 실무 노하우를 가진 크리에이터라면 누구나 파트너 강사로 합류할 수 있습니다.
                카카오톡 채널(@AI다함스튜디오) 또는 문의 폼으로 포트폴리오를 보내주세요.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {siteSettings.instructorRecruitOpen && siteSettings.instructorRecruitFormUrl ? (
                isInternalFormUrl(siteSettings.instructorRecruitFormUrl) ? (
                  <Link
                    to={siteSettings.instructorRecruitFormUrl}
                    className="hero-cta-secondary justify-center"
                  >
                    강사 합류 문의 →
                  </Link>
                ) : (
                  <a
                    href={siteSettings.instructorRecruitFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta-secondary justify-center"
                  >
                    강사 합류 문의 → <ExternalLink size={14} />
                  </a>
                )
              ) : (
                <>
                  <span className="inline-flex items-center justify-center min-h-[48px] px-5 border border-white/20 text-[#8C8C8C] text-xs font-extrabold rounded-[2px]">
                    강사 합류 폼 준비 중
                  </span>
                  {siteSettings.kakaoUrl && (
                    <a
                      href={siteSettings.kakaoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hero-cta-secondary justify-center"
                    >
                      카카오톡 문의 → <ExternalLink size={14} />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <div className="footer-logo">
          <CrystalCube size={34} pfx="instftr" />
          <span className="footer-logo-text uppercase tracking-widest">DO-DAHAM</span>
        </div>
        <div className="footer-copy">
          <div>do-daham.com</div>
          <div>문의 · 카카오톡 @AI다함스튜디오</div>
          <div className="acid mt-1">CREATIVE REBELS · AI STUDIO × EDUCATION</div>
        </div>
      </footer>

      {/* Instructor Detail Modal */}
      {selectedInstructor && (
        <div
          className="fixed inset-0 z-[320] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inst-modal-title"
            className="w-full max-w-xl bg-[#0D0E0A] border border-white/[0.16] rounded-[2px] p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
              <div>
                <span
                  className="inline-block text-[10px] font-extrabold tracking-[0.14em] px-2.5 py-1 rounded-[2px] mb-2.5"
                  style={
                    selectedInstructor.isLead
                      ? { backgroundColor: 'var(--acid)', color: 'var(--bg)', border: '1px solid var(--acid)' }
                      : {
                          backgroundColor: 'transparent',
                          color: toThemeAccent(selectedInstructor.accent),
                          border: `1px solid ${toThemeAccent(selectedInstructor.accent)}`
                        }
                  }
                >
                  {selectedInstructor.badgeText}
                </span>
                <h2 id="inst-modal-title" className="ff-disp text-3xl sm:text-4xl leading-none">
                  {selectedInstructor.name}
                </h2>
                <p className="text-xs font-bold text-[#8C8C8C] mt-1.5">{selectedInstructor.role}</p>
              </div>
              <button
                ref={modalCloseRef}
                type="button"
                onClick={closeModal}
                aria-label="프로필 창 닫기"
                className="w-11 h-11 flex items-center justify-center border border-white/[0.18] rounded-[2px] text-[#F2F2F2] hover:border-[#C6FF00] hover:text-[#C6FF00] shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-5 space-y-5">
              <p className="text-sm sm:text-base text-[#F2F2F2]/90 leading-relaxed break-keep">
                {selectedInstructor.detailBio}
              </p>

              <div className="space-y-2.5">
                {selectedInstructor.credentials.map((cred) => (
                  <div
                    key={cred.label}
                    className="flex items-start gap-2.5 text-sm text-[#F2F2F2]/85"
                  >
                    <CheckCircle2
                      size={16}
                      className="shrink-0 mt-0.5"
                      style={{ color: toThemeAccent(selectedInstructor.accent) }}
                    />
                    <span className="break-keep">
                      <strong className="text-xs tracking-wider mr-1.5" style={{ color: toThemeAccent(selectedInstructor.accent) }}>
                        {cred.label}
                      </strong>
                      {cred.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 border border-white/[0.08] rounded-[2px] p-4">
                <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#8C8C8C] mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={12} style={{ color: toThemeAccent(selectedInstructor.accent) }} /> 담당 클래스 · 가능 시간
                </div>
                <div className="text-sm font-bold text-[#F2F2F2] mb-1">
                  {selectedInstructor.activeClassTitle}
                </div>
                <div className="text-xs text-[#8C8C8C]">
                  {selectedInstructor.activeDays.join(' · ')}요일 ({selectedInstructor.scheduleTime}) — {selectedInstructor.activeClassStatus}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row gap-3">
              {selectedInstructor.activeClassTo ? (
                <Link
                  to={selectedInstructor.activeClassTo}
                  onClick={() => setSelectedInstructor(null)}
                  className="hero-cta flex-1 justify-center"
                >
                  클래스 커리큘럼 · 수강료 보기 →
                </Link>
              ) : isInternalFormUrl(siteSettings.classInquiryFormUrl) ? (
                <Link
                  to={siteSettings.classInquiryFormUrl}
                  onClick={() => setSelectedInstructor(null)}
                  className="hero-cta flex-1 justify-center"
                >
                  개설 알림 · 문의하기 →
                </Link>
              ) : (
                <a
                  href={siteSettings.classInquiryFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta flex-1 justify-center"
                >
                  개설 알림 · 문의하기 →
                </a>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="hero-cta-secondary justify-center"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
