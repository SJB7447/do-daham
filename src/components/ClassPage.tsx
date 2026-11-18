import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { CrystalCube } from './CrystalCube';
import { SiteHeader } from './SiteHeader';
import StudentShowcaseSection from './StudentShowcaseSection';
import { JellySlider } from './JellySlider';
import { ScrambleNumber } from './ScrambleNumber';
import { DEFAULT_METRICS, fetchLiveClassMetrics, LiveClassMetrics } from '../lib/classMetrics';
import {
  InstructorProfile,
  fetchApprovedInstructors,
  getLeadInstructor,
  toThemeAccent
} from '../lib/instructorsData';
import {
  DEFAULT_SITE_SETTINGS,
  fetchSiteSettings,
  isInternalFormUrl,
  SiteSettings
} from '../lib/siteSettings';

const APPLY_FORM_URL = import.meta.env.VITE_APPLY_FORM_URL || 'https://forms.gle/w1cTzZYUCGkqdDTT6';
const MIN_TO_OPEN = 1;
const MAX_CAPACITY = 30;

const TIERS = [
  { id: 'small', min: 1, max: 5, label: '1~5명', name: '개인 특화 · 공모전', price: 80000, desc: '회당 80,000원' },
  { id: 'standard', min: 10, max: 15, label: '10~15명', name: '스탠다드', price: 25000, desc: '회당 25,000원' },
  { id: 'large', min: 16, max: 30, label: '16~30명', name: '대규모 클래스', price: 15000, desc: '회당 15,000원' }
];

const CURRICULUM = [
  {
    step: '1–2회 · BASIC',
    title: 'AI 업무 활용',
    items: ['내 업종 전용 프롬프트 세트', '홍보 문구 생성 템플릿', 'AI 업무 루틴표'],
    featured: false
  },
  {
    step: '3–4회 · CREATE',
    title: 'AI 이미지 · 영상 제작',
    items: ['Midjourney · Kling · Suno 프롬프트 치트시트', '컷 구성 설계 시트', '실습 피드백'],
    featured: false
  },
  {
    step: '5–6회 · MASTERPIECE',
    title: '작품 완성 · 피드백',
    items: ['포트폴리오용 AI 숏폼 1편', '사업 아이디어 1페이지 기획서', 'AI 실전 가이드북 영구 소장'],
    featured: true
  }
];

const FAQ_ITEMS = [
  {
    q: 'AI를 전혀 모르는데 들을 수 있나요?',
    a: '네. 처음 접하는 분을 기준으로 설계했습니다. 스마트폰으로 카카오톡을 쓸 수 있으면 충분합니다.'
  },
  {
    q: '노트북이 없어도 되나요?',
    a: '있으면 좋지만 없어도 됩니다. 태블릿이나 스마트폰으로도 실습할 수 있습니다.'
  },
  {
    q: '인원이 적게 모이거나 취소할 경우 환불은 어떻게 되나요?',
    a: '개설하려는 트랙(1~5명 소수정예 / 10~15인 / 16~30인)의 최소 개설 인원에 미달할 경우 개강 3일 전 안내 후 예약금(50,000원)은 100% 전액 환불됩니다. 개설 확정 후 개인 사정 취소 시 개강 7일 전 100% 환불, 개강 3일 전까지 50% 환불되며, 개강 이후에는 잔여 회차 기준에 따라 정산됩니다.'
  },
  {
    q: '장소와 시작일은 언제 알 수 있나요?',
    a: '장소를 섭외하는 중입니다. 확정되면 신청하신 분께 카카오톡으로 일정과 장소를 개별 안내드립니다.'
  },
  {
    q: '기업·기관 맞춤 출강도 가능한가요?',
    a: '네. 대상과 목적에 맞춰 커리큘럼을 구성합니다. 홈의 CONTACT 섹션이나 아래 신청 폼으로 문의해 주세요.'
  }
];

export default function ClassPage() {
  const [sessions, setSessions] = useState<6 | 8>(6);
  const [headcount, setHeadcount] = useState<number>(12);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [metrics, setMetrics] = useState<LiveClassMetrics>(DEFAULT_METRICS);
  const [approvedInstructors, setApprovedInstructors] = useState<InstructorProfile[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetchLiveClassMetrics().then((m) => {
      if (!cancelled) setMetrics(m);
    });
    fetchSiteSettings().then((s) => {
      if (!cancelled) setSiteSettings(s);
    });
    fetchApprovedInstructors().then((list) => {
      if (!cancelled) setApprovedInstructors(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const allInstructors = useMemo(
    () => [getLeadInstructor(metrics), ...approvedInstructors],
    [metrics, approvedInstructors]
  );

  const pricing = useMemo(() => {
    let perSession = 80000;
    let activeTierId = 'small';
    let tierLabel = '개인 특화 · 공모전 대비 (1~5명)';
    let hint = '개인 목표 맞춤 커리큘럼 및 AI 공모전 출품작 완성까지 1:1 밀착 디렉팅합니다. (10명 이상 스탠다드 트랙 시 회당 25,000원)';

    if (headcount >= 16) {
      perSession = 15000;
      activeTierId = 'large';
      tierLabel = '대규모 클래스 (16~30명)';
      hint = '최대 규모 구간(16~30명 · 회당 15,000원)이 적용 중입니다.';
    } else if (headcount >= 10) {
      perSession = 25000;
      activeTierId = 'standard';
      tierLabel = '스탠다드 (10~15명)';
      hint = `${16 - headcount}명 더 모이면 16~30명 구간(회당 15,000원)으로 내려갑니다.`;
    } else if (headcount >= 6) {
      perSession = 25000;
      activeTierId = 'standard';
      tierLabel = '스탠다드 (10~15명 기준)';
      hint = `10~15인 클래스 개설까지 ${10 - headcount}명 더 필요합니다.`;
    }

    const total = perSession * sessions;
    const smallTotal = 80000 * sessions;
    const saved = Math.max(0, smallTotal - total);

    return { perSession, total, smallTotal, saved, hint, activeTierId, tierLabel };
  }, [headcount, sessions]);

  const canApply = Boolean(siteSettings.classApplicationOpen);
  const activeApplyTarget = siteSettings.classApplicationFormUrl || '/apply/class-apply';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Top Navigation */}
      <SiteHeader
        badge="CLASS"
        ctaLabel={canApply ? '1기 사전 신청 →' : '강의 문의 →'}
        ctaHref={canApply ? activeApplyTarget : siteSettings.classInquiryFormUrl}
      />

      {/* Hero */}
      <section className="section pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.85fr] gap-12 items-center">
          <div>
            <span className="hero-kicker uppercase tracking-widest">
              CREATIVE REBELS · 오프라인 실무 클래스
            </span>
            <h1 className="m-0 mb-5 break-keep">
              <span className="hero-h1 block !text-[clamp(44px,5.4vw,88px)]">하고싶은거</span>
              <span className="hero-h1-accent block mb-0 !text-[clamp(44px,5.8vw,92px)] whitespace-nowrap">
                작품으로 다함.
              </span>
            </h1>
            <p className="text-xs font-extrabold tracking-[0.12em] text-[#F2F2F2] uppercase mb-3">
              WE DON&apos;T JUST TEACH TOOLS. WE BUILD REAL MASTERPIECES.
            </p>
            <p className="text-[15px] font-medium leading-relaxed text-[#A3A79F] max-w-xl mb-7 break-keep">
              도구 사용법만 배우고 끝나지 않습니다.
              <br className="hidden sm:inline" />{' '}
              수료할 때 포트폴리오용 AI 숏폼 1편과 내 업무에 바로 쓰는 템플릿이 손에 남습니다.
            </p>

            <div className="hero-cta-row mb-8">
              {canApply ? (
                isInternalFormUrl(activeApplyTarget) ? (
                  <Link to={activeApplyTarget} className="hero-cta">
                    1기 사전 신청하기 →
                  </Link>
                ) : (
                  <a
                    href={activeApplyTarget}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta"
                  >
                    1기 사전 신청하기 →
                  </a>
                )
              ) : isInternalFormUrl(siteSettings.classInquiryFormUrl) ? (
                <Link to={siteSettings.classInquiryFormUrl} className="hero-cta">
                  {siteSettings.classApplicationClosedMessage} (문의 →)
                </Link>
              ) : (
                <a
                  href={siteSettings.classInquiryFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta"
                >
                  {siteSettings.classApplicationClosedMessage} (문의 →)
                </a>
              )}
              <a href="#group-drop" className="hero-cta-secondary">
                수강료 시뮬레이션 ↓
              </a>
            </div>

            <div>
              <div className="text-[11px] font-bold tracking-[0.12em] text-[#8C8C8C] uppercase mb-2.5">
                수료하면 손에 남는 것 · OUTPUT
              </div>
              <div className="flex flex-wrap gap-2">
                {['AI 숏폼 1편', '1페이지 기획서', '업종별 프롬프트 세트', 'AI 가이드북'].map((item) => (
                  <span key={item} className="class-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 1기 Summary Card */}
          <div className="relative bg-gradient-to-br from-[#14180A] to-[#0B0B0B] border border-[#C6FF00]/45 rounded-[2px] p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="class-status-pill mb-2">
                  {canApply ? '1기 사전 신청 접수 중' : '1기 개강 준비 중'}
                </div>
                <h2 className="font-bold text-2xl tracking-tight">오프라인 실무 클래스</h2>
              </div>
              <CrystalCube size={44} pfx="clscard" />
            </div>

            <div className="divide-y divide-white/[0.08] text-sm">
              <div className="py-3.5 grid grid-cols-[72px_1fr] gap-3">
                <span className="text-[#8C8C8C] font-bold">회차</span>
                <div>
                  <div className="font-semibold">6회 또는 8회 완성 과정</div>
                  <div className="text-xs text-[#C6FF00] mt-0.5">세부 요일 · 시간 확정 후 공지</div>
                </div>
              </div>
              <div className="py-3.5 grid grid-cols-[72px_1fr] gap-3">
                <span className="text-[#8C8C8C] font-bold">정원 구간</span>
                <div>
                  <div className="font-semibold">1~5명 (8만원) · 10~15명 (2.5만원) · 16~30명 (1.5만원)</div>
                  <div className="text-xs text-[#8C8C8C] mt-0.5">1인 1회차 기준 · 규모별 선택 개설</div>
                </div>
              </div>
              <div className="py-3.5 grid grid-cols-[72px_1fr] gap-3">
                <span className="text-[#8C8C8C] font-bold">장소</span>
                <div className="font-semibold">확정 시 개별 안내</div>
              </div>
              <div className="py-3.5 grid grid-cols-[72px_1fr] gap-3">
                <span className="text-[#8C8C8C] font-bold">시작일</span>
                <div>
                  <div className="font-semibold">일정 확정 후 공지</div>
                  <div className="text-xs text-[#8C8C8C] mt-0.5">문의 폼 접수 시 오픈 알림 우선 안내</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01 GROUP-DROP Simulator */}
      <section className="section" id="group-drop">
        <div className="sec-head mb-4">
          <span className="sec-num">01</span>
          <h2 className="sec-title">모일수록 내려가는 수강료</h2>
        </div>
        <p className="text-[15px] text-[#8C8C8C] mb-8 max-w-2xl break-keep">
          함께 듣는 사람이 늘수록 모두의 회당 수강료가 내려갑니다. 인원을 움직여 보세요.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.85fr] gap-8 items-start">
          {/* Left Interactive Controls */}
          <div className="bg-[#0E0E0E] border border-white/[0.08] rounded-[2px] p-7">
            <div className="flex flex-wrap gap-2 mb-7" role="group" aria-label="과정 회차 선택">
              {([6, 8] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={sessions === count}
                  onClick={() => setSessions(count)}
                  className={`px-4 py-2.5 text-xs font-extrabold tracking-wider rounded-[2px] border cursor-pointer transition-colors ${
                    sessions === count
                      ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                      : 'bg-transparent text-[#F2F2F2] border-white/20 hover:border-[#C6FF00]'
                  }`}
                >
                  {count}회 완성 과정
                </button>
              ))}
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm font-bold text-[#8C8C8C]">
                함께 듣는 인원
              </span>
              <div>
                <ScrambleNumber
                  value={headcount}
                  className="ff-disp text-4xl text-[#C6FF00]"
                  durationMs={180}
                />
                <span className="text-sm font-bold ml-1">명</span>
              </div>
            </div>

            <div className="mb-6">
              <JellySlider
                min={MIN_TO_OPEN}
                max={MAX_CAPACITY}
                value={headcount}
                onChange={setHeadcount}
                ariaLabel="함께 듣는 인원 조절"
              />
            </div>

            {/* Tier Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {TIERS.map((tier) => {
                const isActive = pricing.activeTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setHeadcount(tier.min === 1 ? 3 : tier.min)}
                    className={`text-left p-3.5 rounded-[2px] border cursor-pointer transition-colors ${
                      isActive
                        ? 'border-[#C6FF00] bg-[#C6FF00]/10 text-[#F2F2F2]'
                        : 'border-white/10 bg-transparent text-[#8C8C8C] hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-extrabold">{tier.label}</span>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-[#C6FF00]' : 'text-[#8C8C8C]'}`}>
                        {tier.name}
                      </span>
                    </div>
                    <div className={`text-sm font-black ${isActive ? 'text-[#C6FF00]' : 'text-[#F2F2F2]'}`}>
                      {tier.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-sm font-bold text-[#C6FF00]">{pricing.hint}</div>
          </div>

          {/* Right Notched Receipt */}
          <div className="ticket-voucher" aria-live="polite">
            <div className="ticket-head text-center">{pricing.tierLabel}</div>
            <div className="ticket-main-row">
              <span className="text-sm font-bold text-[#333]">1인 1회차 수강료</span>
              <span className="ticket-price">
                <ScrambleNumber value={pricing.perSession} suffix="원" durationMs={260} />
              </span>
            </div>
            <div className="ticket-sub-row">
              <span>{sessions}회 총 수강료</span>
              <span className="font-extrabold text-[#0A0A0A]">
                <ScrambleNumber value={pricing.total} suffix="원" durationMs={280} />
              </span>
            </div>
            <div className="py-3 flex items-center justify-between text-xs border-b border-black/15">
              <span className="text-[#444]">소수정예(8만원) 대비</span>
              <span className="px-2 py-0.5 bg-[#0A0A0A] text-[#C6FF00] font-extrabold rounded-[2px]">
                {pricing.saved > 0 ? (
                  <ScrambleNumber value={pricing.saved} prefix="SAVE " suffix="원" durationMs={280} />
                ) : (
                  '개인 맞춤 · 공모전 디렉팅'
                )}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between text-xs">
              <span className="font-bold text-[#222]">노쇼 방지 예약금</span>
              <span className="font-extrabold text-[#0A0A0A]">50,000원</span>
            </div>
            <div className="ticket-note">
              개설 확정 후 최종 수강료에서 예약금 50,000원을 차감한 잔금만 결제합니다.
            </div>
          </div>
        </div>

        {/* Clear Opening & Refund Policy */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px]">
            <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#C6FF00] mb-1.5">
              OPENING RULE · 개설 기준
            </div>
            <div className="text-sm font-bold mb-1">규모별 최소 인원 달성 시 개설</div>
            <p className="text-xs text-[#8C8C8C] leading-relaxed break-keep">
              선택한 트랙(1~5명 · 10~15명 · 16~30명)의 최소 인원에 미달하면 개강 3일 전 안내 후 <strong className="text-[#F2F2F2]">예약금 100% 전액 환불</strong>됩니다.
            </p>
          </div>
          <div className="p-5 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px]">
            <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#C6FF00] mb-1.5">
              DEPOSIT · 예약금 정산
            </div>
            <div className="text-sm font-bold mb-1">노쇼 방지 예약금 50,000원</div>
            <p className="text-xs text-[#8C8C8C] leading-relaxed break-keep">
              개설 확정 후 최종 확정 인원의 GROUP-DROP 할인 수강료에서 <strong className="text-[#F2F2F2]">50,000원을 전액 차감</strong>한 잔금만 결제합니다.
            </p>
          </div>
          <div className="p-5 bg-[#0E0F0B] border border-white/[0.1] rounded-[2px]">
            <div className="text-[10px] font-extrabold tracking-[0.14em] text-[#C6FF00] mb-1.5">
              REFUND · 취소/환불 규정
            </div>
            <div className="text-sm font-bold mb-1">개강 7일 전 100% · 3일 전 50%</div>
            <p className="text-xs text-[#8C8C8C] leading-relaxed break-keep">
              개강 7일 전까지 전액 환불, 3일 전까지 50% 환불되며, 개강 이후에는 진행된 회차를 제외한 잔여 회차 기준으로 환불됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 02 TRACK RECORD */}
      <section className="section" id="track-record">
        <div className="sec-head">
          <span className="sec-num">02</span>
          <h2 className="sec-title">가르치는 사람이 직접 만듭니다</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white/[0.08] mb-10">
          {[
            { label: 'LECTURE HOURS', val: `${metrics.totalHours.toLocaleString('ko-KR')}시간+\n누적 AI 실무 강의`, accent: true },
            { label: 'STUDENTS', val: `${metrics.totalStudents.toLocaleString('ko-KR')}명+\n누적 수강생`, accent: true },
            { label: 'AWARD', val: '경기관광공사\n영상 공모전 입상', accent: false },
            { label: 'TEACHING', val: 'AI 디지털 튜터 양성\n에이블런 · 배움터 출강', accent: false }
          ].map((item, idx) => (
            <div key={idx} className="p-6 border-b sm:border-b-0 sm:border-r last:border-r-0 border-white/[0.08]">
              <div className="trust-label">{item.label}</div>
              <div className={`font-bold text-lg sm:text-xl tracking-tight whitespace-pre-line leading-snug ${item.accent ? 'text-[#C6FF00]' : ''}`}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* Unified Instructor Profile Cards (Lead + Approved Partner Instructors) */}
        <div
          className={
            allInstructors.length === 1
              ? 'space-y-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
          }
        >
          {allInstructors.map((inst) => {
            const isSingle = allInstructors.length === 1;
            const accentColor = toThemeAccent(inst.accent);
            const chips = inst.isLead
              ? [
                  `누적 강의 ${(inst.lectureHours || 400).toLocaleString('ko-KR')}시간+`,
                  `누적 수강생 ${(inst.studentCount || 320).toLocaleString('ko-KR')}명+`,
                  'AI 디지털 튜터 양성 과정 메인 강사',
                  '에이블런 · 디지털 배움터 출강',
                  '경기관광공사 영상 공모전 입상'
                ]
              : [
                  ...(inst.showStats && ((inst.lectureHours || 0) > 0 || (inst.studentCount || 0) > 0)
                    ? [
                        `강의 ${(inst.lectureHours || 0).toLocaleString('ko-KR')}시간+ · 수강생 ${(inst.studentCount || 0).toLocaleString('ko-KR')}명+`
                      ]
                    : []),
                  ...inst.tags,
                  ...inst.credentials.slice(0, 2).map((c) => c.text)
                ];

            return (
              <article
                key={inst.id}
                className={`inst-card ${inst.isLead ? 'is-lead' : ''} ${
                  isSingle ? '!grid grid-cols-1 lg:grid-cols-[260px_1fr]' : ''
                }`}
              >
                <div
                  className={`inst-card-media ${
                    isSingle ? '!h-[220px] lg:!h-full lg:border-b-0 lg:border-r lg:border-white/[0.08]' : '!h-[210px]'
                  }`}
                >
                  <span className={`inst-badge ${inst.isLead ? 'is-lead' : ''}`}>
                    {inst.badgeText}
                  </span>

                  <div
                    className="inst-avatar-circle overflow-hidden"
                    style={{ borderColor: accentColor }}
                  >
                    {inst.photoUrl ? (
                      <img
                        src={inst.photoUrl}
                        alt={inst.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : inst.isLead ? (
                      <CrystalCube size={56} pfx={`clsinst-${inst.id}`} />
                    ) : (
                      <span
                        className="font-bold text-2xl tracking-wider"
                        style={{ color: accentColor }}
                      >
                        {inst.initials}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-bold tracking-[0.14em] text-[#A3A79F] mt-3 uppercase">
                    {inst.isLead ? 'DIRECTOR' : 'PARTNER INSTRUCTOR'}
                  </div>
                </div>

                <div className="inst-card-body justify-between">
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-2xl tracking-tight leading-tight">
                          {inst.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#A3A79F] mt-1">{inst.role}</p>
                      </div>
                      {inst.scheduleTime && (
                        <span className="text-[11px] font-semibold text-[#A3A79F] border border-white/[0.12] px-2.5 py-1 rounded-[2px]">
                          {inst.activeDays.length > 0 ? `${inst.activeDays.join('·')} · ` : ''}
                          {inst.scheduleTime}
                        </span>
                      )}
                    </div>

                    <p className="text-[14.5px] font-medium leading-[1.75] text-[#F2F2F2]/90 mb-5 break-keep">
                      {inst.isLead
                        ? '수업에서 보여드리는 작품은 모두 직접 만든 것입니다. 만드는 과정에서 막힌 지점을 그대로 가르칩니다.'
                        : inst.bio}
                    </p>

                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {chips.map((b) => (
                          <span key={b} className="what-tag">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#A3A79F]">
                      {inst.activeClassTitle}
                    </span>
                    <Link
                      to="/class/instructors"
                      className="text-xs font-bold hover:underline shrink-0"
                      style={{ color: accentColor }}
                    >
                      상세 프로필 · 수업 일정 보기 →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 03 PROGRAM */}
      <section className="section" id="program">
        <div className="sec-head mb-4">
          <span className="sec-num">03</span>
          <h2 className="sec-title">6회 만에 작품까지</h2>
        </div>
        <p className="text-[15px] font-medium text-[#A3A79F] mb-8 break-keep">
          6회 기준 예시 구성입니다. 8회 과정은 작품 완성 단계가 늘어납니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {CURRICULUM.map((c) => (
            <div
              key={c.step}
              className={`what-card ${c.featured ? 'featured' : ''}`}
            >
              <div>
                <div className="what-card-top">
                  <span>{c.step}</span>
                </div>
                <h3>{c.title}</h3>
                <ul className="space-y-2 text-sm text-[#8C8C8C]">
                  {c.items.map((it) => (
                    <li key={it}>· {it}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: '수료 후 1개월 그룹 피드백 단톡방', desc: '결과물 공유와 질문, 피드백을 이어갑니다.' },
            { title: '카카오톡 상시 질문', desc: '수업이 끝나도 디렉터가 직접 답변합니다.' },
            { title: 'AI 공모전 출품 · 입상 디렉팅', desc: '1~5인 개인 특화 반은 공모전 출품작 완성 및 개인 목표에 맞춰 밀착 피드백합니다.' }
          ].map((b) => (
            <div key={b.title} className="p-6 bg-[#0E0E0E] border border-white/[0.08] rounded-[2px]">
              <div className="font-bold text-sm mb-1.5">{b.title}</div>
              <div className="text-xs text-[#8C8C8C] leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 04 SHOWCASE (수료생 완성 결과물 · 로그인 강사/운영자 업로드) */}
      <StudentShowcaseSection />

      {/* 05 FAQ */}
      <section className="section" id="faq">
        <div className="sec-head">
          <span className="sec-num">05</span>
          <h2 className="sec-title">FAQ</h2>
        </div>

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08] max-w-3xl">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full py-5 flex items-center justify-between gap-4 text-left font-bold text-base cursor-pointer bg-transparent border-0 text-[#F2F2F2] hover:text-[#C6FF00] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#C6FF00]' : 'text-[#8C8C8C]'}`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 text-sm leading-relaxed text-[#8C8C8C] break-keep">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 06 APPLY */}
      <section className="section text-center py-24">
        <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#C6FF00] mb-3">
          06 · APPLY
        </div>
        <h2 className="ff-disp text-5xl md:text-7xl leading-none mb-5">
          JOIN THE<br />
          <span className="acid">REBELLION.</span>
        </h2>
        <p className="text-sm text-[#8C8C8C] mb-8 max-w-md mx-auto break-keep">
          {canApply
            ? '1기 사전 신청을 받고 있습니다. 접수 후 카카오톡으로 일정과 상담을 안내드립니다.'
            : '현재 1기 강의 신청 폼을 정비 중입니다. 기관·소그룹 강의 문의나 오픈 알림은 아래 문의 폼 또는 카카오톡으로 남겨주세요.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-5">
          {canApply ? (
            isInternalFormUrl(activeApplyTarget) ? (
              <Link to={activeApplyTarget} className="hero-cta">
                1기 사전 신청하기 →
              </Link>
            ) : (
              <a
                href={activeApplyTarget}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta"
              >
                1기 사전 신청하기 →
              </a>
            )
          ) : isInternalFormUrl(siteSettings.classInquiryFormUrl) ? (
            <Link to={siteSettings.classInquiryFormUrl} className="hero-cta">
              강의 문의 · 오픈 알림 신청 →
            </Link>
          ) : (
            <a
              href={siteSettings.classInquiryFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-cta"
            >
              강의 문의 · 오픈 알림 신청 →
            </a>
          )}
          <Link to="/" className="hero-cta-secondary">
            <ArrowLeft size={14} />
            <span>홈으로 돌아가기</span>
          </Link>
        </div>
        <div className="text-xs text-[#8C8C8C]">
          문의 · 카카오톡 {siteSettings.kakaoHandle}
          {siteSettings.kakaoUrl && (
            <>
              {' '}·{' '}
              <a
                href={siteSettings.kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C6FF00] underline"
              >
                바로 연결 →
              </a>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-logo">
          <CrystalCube size={38} pfx="clsftr" />
          <span className="footer-logo-text uppercase tracking-widest">DO-DAHAM</span>
        </div>
        <div className="footer-copy">
          <div>do-daham.com</div>
          <div>© {new Date().getFullYear()} ALL RIGHTS RESERVED.</div>
          <div className="text-[#8C8C8C] my-1">문의 · 카카오톡 @AI다함스튜디오</div>
        </div>
      </footer>
    </div>
  );
}
