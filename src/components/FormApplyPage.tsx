import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { SiteHeader } from './SiteHeader';
import { CrystalCube } from './CrystalCube';
import { LetterLimitTextarea } from './LetterLimitTextarea';
import { DEFAULT_SITE_SETTINGS, fetchSiteSettings, SiteSettings } from '../lib/siteSettings';
import {
  createFormSubmission,
  FORM_TYPE_COLORS,
  FORM_TYPE_LABELS,
  FormSubmissionType
} from '../lib/formSubmissions';

type FormSlug = 'class-apply' | 'instructor-recruit' | 'class-inquiry' | 'project-inquiry';

interface FormTabMeta {
  slug: FormSlug;
  type: FormSubmissionType;
  shortLabel: string;
  title: string;
  subtitle: string;
  badge: string;
}

const FORM_TABS: FormTabMeta[] = [
  {
    slug: 'class-inquiry',
    type: 'class_inquiry',
    shortLabel: '강의 · 출강 문의',
    title: 'AI 강의 · 기업/기관 출강 & 오픈 알림 문의',
    subtitle: '기업·기관·학교 맞춤형 AI 특강, 소그룹 출강 또는 1기 오픈 알림을 신청할 수 있습니다.',
    badge: 'CLASS INQUIRY'
  },
  {
    slug: 'project-inquiry',
    type: 'project_inquiry',
    shortLabel: '제작 의뢰 문의',
    title: 'AI 영상 · 홈페이지 · 콘텐츠 제작 의뢰',
    subtitle: '광고·숏폼·뮤직비디오부터 반응형 홈페이지·브랜드 웹서비스까지 디렉터가 직접 제작합니다.',
    badge: 'PROJECT BRIEF'
  },
  {
    slug: 'class-apply',
    type: 'class_apply',
    shortLabel: '1기 수강 신청',
    title: 'DO-DAHAM AI 실무 클래스 수강 신청',
    subtitle: '모일수록 내려가는 수강료(GROUP-DROP) · 신청 확인 후 카카오톡으로 예약금 및 상세 일정을 안내합니다.',
    badge: 'CLASS APPLY'
  },
  {
    slug: 'instructor-recruit',
    type: 'instructor_recruit',
    shortLabel: '파트너 강사 합류',
    title: 'DO-DAHAM CLASS 파트너 강사 합류 신청',
    subtitle: '직접 만들고 직접 가르치는 현업 AI 크리에이터라면 누구나 파트너 강사로 합류할 수 있습니다.',
    badge: 'RECRUITING'
  }
];

const SLUG_TO_META: Record<FormSlug, FormTabMeta> = FORM_TABS.reduce(
  (acc, item) => {
    acc[item.slug] = item;
    return acc;
  },
  {} as Record<FormSlug, FormTabMeta>
);

const CLASS_TIERS = [
  {
    value: '개인 특화 · 공모전 대비 (1~5명 / 회당 80,000원)',
    title: '1~5명 · 개인 특화 / 공모전',
    price: '회당 80,000원',
    desc: '목표 맞춤 1:1 밀착 디렉팅 · 공모전 출품 완성'
  },
  {
    value: '스탠다드 클래스 (10~15명 / 회당 25,000원)',
    title: '10~15명 · 스탠다드',
    price: '회당 25,000원',
    desc: '팀 피드백 + AI 숏폼·업무 템플릿 완성'
  },
  {
    value: '대규모 클래스 (16~30명 / 회당 15,000원)',
    title: '16~30명 · 대규모',
    price: '회당 15,000원',
    desc: '최대 할인 구간 · 실무 집중 워크숍'
  }
];

const CLASS_SESSIONS = ['6회 완성 과정', '8회 심화 과정', '상담 후 결정'];

const CLASS_INTERESTS = [
  'AI 영상 · CF · 뮤직비디오 제작',
  '바이브 코딩 · 홈페이지/웹앱 제작',
  '업무 자동화 · 생성형 AI 실무',
  '공모전 · 포트폴리오 1:1 디렉팅'
];

const INSTRUCTOR_SPECIALTIES = [
  'AI 영상',
  '홈페이지 · 웹',
  '업무 자동화',
  '바이브 코딩',
  'AI 디자인',
  'AI 사운드',
  '숏폼 · 릴스',
  '노코드 툴',
  '프롬프트 엔지니어링'
];

const CLASS_INQUIRY_SCALES = [
  '1기 오픈 알림 신청 (개인)',
  '1~5명 (소규모 / 임원)',
  '10~15명 (실무진)',
  '16~30명 (단체)',
  '30명 이상 (특강 / 세미나)'
];

const PROJECT_CATEGORIES = [
  'AI 영상 제작 (광고 · MV · 홍보영상)',
  '홈페이지 · 웹/랜딩페이지 제작',
  'AI 음원 · 사운드 디자인',
  '브랜드 패키지 · 기타'
];

const PROJECT_BUDGETS = [
  '100만원 미만',
  '100만 ~ 300만원',
  '300만 ~ 500만원',
  '500만원 이상',
  '상담 후 결정'
];

export default function FormApplyPage() {
  const { formType } = useParams<{ formType?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPreview = searchParams.get('preview') === '1';

  const activeSlug: FormSlug = useMemo(() => {
    if (formType && formType in SLUG_TO_META) {
      return formType as FormSlug;
    }
    return 'class-inquiry';
  }, [formType]);

  const activeMeta = SLUG_TO_META[activeSlug];

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Common form state
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [tier, setTier] = useState('');
  const [sessions, setSessions] = useState('6회 완성 과정');
  const [categories, setCategories] = useState<string[]>([]);
  const [budget, setBudget] = useState('상담 후 결정');
  const [schedulePref, setSchedulePref] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedInfo, setSubmittedInfo] = useState<{
    name: string;
    formTitle: string;
    contact: string;
  } | null>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((res) => setSiteSettings(res))
      .finally(() => setSettingsLoading(false));
  }, []);

  // Reset form defaults cleanly when switching form type
  useEffect(() => {
    setSubmitError('');
    setSubmittedInfo(null);
    setCategories([]);
    setSchedulePref('');
    setPortfolioUrl('');
    setMessage('');
    setConsent(false);

    if (activeSlug === 'class-apply') {
      setTier(CLASS_TIERS[1].value);
      setSessions('6회 완성 과정');
    } else if (activeSlug === 'class-inquiry') {
      setTier(CLASS_INQUIRY_SCALES[0]);
      setSessions('');
    } else if (activeSlug === 'project-inquiry') {
      setTier('');
      setBudget('상담 후 결정');
    } else {
      setTier('');
      setSessions('');
    }
  }, [activeSlug]);

  const isFormOpen = useMemo(() => {
    if (isPreview) return true;
    if (activeSlug === 'class-apply') return siteSettings.classApplicationOpen;
    if (activeSlug === 'instructor-recruit') return siteSettings.instructorRecruitOpen;
    return true;
  }, [activeSlug, isPreview, siteSettings.classApplicationOpen, siteSettings.instructorRecruitOpen]);

  const isExternalRedirectConfigured = useMemo(() => {
    if (activeSlug === 'class-apply') {
      return (
        siteSettings.classApplicationFormUrl &&
        !siteSettings.classApplicationFormUrl.startsWith('/')
      );
    }
    if (activeSlug === 'instructor-recruit') {
      return (
        siteSettings.instructorRecruitFormUrl &&
        !siteSettings.instructorRecruitFormUrl.startsWith('/')
      );
    }
    if (activeSlug === 'class-inquiry') {
      return (
        siteSettings.classInquiryFormUrl && !siteSettings.classInquiryFormUrl.startsWith('/')
      );
    }
    return siteSettings.projectInquiryFormUrl && !siteSettings.projectInquiryFormUrl.startsWith('/');
  }, [activeSlug, siteSettings]);

  const externalUrlForSlug = useMemo(() => {
    if (activeSlug === 'class-apply') return siteSettings.classApplicationFormUrl;
    if (activeSlug === 'instructor-recruit') return siteSettings.instructorRecruitFormUrl;
    if (activeSlug === 'class-inquiry') return siteSettings.classInquiryFormUrl;
    return siteSettings.projectInquiryFormUrl;
  }, [activeSlug, siteSettings]);

  const toggleCategory = (val: string) => {
    setCategories((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!name.trim()) {
      setSubmitError('성함 또는 담당자명을 입력해 주세요.');
      return;
    }
    if (!contact.trim()) {
      setSubmitError('연락처(휴대폰 번호 또는 카카오톡 ID)를 입력해 주세요.');
      return;
    }
    if (activeSlug === 'instructor-recruit') {
      if (!email.trim() || !email.includes('@')) {
        setSubmitError('강사 초대 링크 수령용 Google 이메일(Gmail)을 정확히 입력해 주세요.');
        return;
      }
      if (categories.length === 0) {
        setSubmitError('강의 가능 전문 분야를 1개 이상 선택해 주세요.');
        return;
      }
      if (!message.trim()) {
        setSubmitError('주요 경력 및 강사 소개를 입력해 주세요.');
        return;
      }
    }
    if (activeSlug === 'class-inquiry' && !message.trim()) {
      setSubmitError('희망 교육 주제 또는 상세 문의 내용을 입력해 주세요.');
      return;
    }
    if (activeSlug === 'project-inquiry') {
      if (categories.length === 0) {
        setSubmitError('의뢰 분야를 1개 이상 선택해 주세요.');
        return;
      }
      if (!message.trim()) {
        setSubmitError('프로젝트 상세 내용을 입력해 주세요.');
        return;
      }
    }
    if (!consent) {
      setSubmitError('개인정보 수집 및 이용 동의에 체크해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await createFormSubmission({
        formType: activeMeta.type,
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        organization: organization.trim(),
        tier: tier.trim(),
        sessions: sessions.trim(),
        categories,
        budget: activeSlug === 'project-inquiry' ? budget.trim() : '',
        schedulePref: schedulePref.trim(),
        portfolioUrl: portfolioUrl.trim(),
        message: message.trim()
      });

      setSubmittedInfo({
        name: name.trim(),
        formTitle: activeMeta.title,
        contact: contact.trim()
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit form:', err);
      setSubmitError(
        '접수 저장 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 카카오톡(@AI다함스튜디오)으로 바로 연락해 주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const accentColor = FORM_TYPE_COLORS[activeMeta.type];
  const messageLimit =
    activeSlug === 'project-inquiry' ? 800 : activeSlug === 'class-apply' ? 500 : 600;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      <SiteHeader badge="APPLY" ctaLabel="홈으로 →" ctaTo="/" />

      <main className="pt-28 pb-24 px-[22px] sm:px-8 lg:px-14 max-w-4xl mx-auto">
        {/* Top Back Link */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C8C8C] hover:text-[#C6FF00] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>홈으로 돌아가기</span>
          </Link>
          {isPreview && (
            <span className="text-[11px] font-extrabold px-2.5 py-1 bg-[#F5C400] text-[#0A0A0A] rounded-[2px]">
              ADMIN PREVIEW MODE (닫힘 상태 미리보기)
            </span>
          )}
        </div>

        {/* Form Switcher Tabs */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8"
          role="tablist"
          aria-label="신청 · 문의 폼 선택"
        >
          {FORM_TABS.map((tab) => {
            const isActive = tab.slug === activeSlug;
            const tabOpen =
              tab.slug === 'class-apply'
                ? siteSettings.classApplicationOpen
                : tab.slug === 'instructor-recruit'
                  ? siteSettings.instructorRecruitOpen
                  : true;
            return (
              <button
                key={tab.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => navigate(`/apply/${tab.slug}${isPreview ? '?preview=1' : ''}`)}
                className={`p-3.5 text-left rounded-[2px] border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#12160A] border-[#C6FF00] text-[#F2F2F2]'
                    : 'bg-[#0E0E0E] border-white/[0.1] text-[#8C8C8C] hover:border-white/30 hover:text-[#F2F2F2]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-extrabold tracking-wider ${
                      tabOpen ? 'text-[#C6FF00]' : 'text-[#F5C400]'
                    }`}
                  >
                    {tabOpen ? '접수 중' : '준비 중'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold leading-tight">
                  {tab.shortLabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Page Title Banner */}
        <header className="mb-8 border-b border-white/[0.1] pb-7">
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] mb-2.5" style={{ color: accentColor }}>
            <Sparkles size={13} aria-hidden="true" />
            <span>{activeMeta.badge}</span>
          </div>
          <h1 className="ff-disp text-3xl sm:text-5xl leading-tight mb-3 break-keep">
            {activeMeta.title}
          </h1>
          <p className="text-sm sm:text-[15px] text-[#8C8C8C] leading-relaxed break-keep">
            {activeMeta.subtitle}
          </p>
        </header>

        {/* Loading Settings Guard */}
        {settingsLoading ? (
          <div className="p-12 border border-white/[0.1] bg-[#0E0E0E] rounded-[2px] flex items-center justify-center gap-3 text-sm text-[#8C8C8C]">
            <Loader2 size={18} className="animate-spin text-[#C6FF00]" />
            <span>신청 폼 상태를 확인하고 있습니다...</span>
          </div>
        ) : !isFormOpen ? (
          /* Closed Form Notice */
          <div className="p-8 sm:p-10 border border-[#F5C400]/40 bg-[#12110A] rounded-[2px] text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-[2px] bg-[#F5C400]/15 border border-[#F5C400]/40 flex items-center justify-center text-[#F5C400]">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="ff-disp text-2xl sm:text-3xl mb-2">
                {activeSlug === 'class-apply'
                  ? siteSettings.classApplicationClosedMessage || '1기 신청 폼 정비 중 · 곧 오픈됩니다'
                  : '강사 합류 설문 폼 준비 중입니다'}
              </h2>
              <p className="text-sm text-[#8C8C8C] max-w-lg mx-auto leading-relaxed break-keep">
                {activeSlug === 'class-apply'
                  ? '강의·출강 문의 또는 1기 오픈 우선 알림을 남겨주시면 일정 확정 시 가장 먼저 연락드립니다.'
                  : '현재 파트너 강사 합류 설문지를 정리하고 있습니다. 합류를 원하시는 분은 카카오톡으로 편하게 포트폴리오를 보내주세요.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {activeSlug === 'class-apply' && (
                <Link to="/apply/class-inquiry" className="hero-cta">
                  강의 문의 · 오픈 알림 남기기 →
                </Link>
              )}
              {siteSettings.kakaoUrl && (
                <a
                  href={siteSettings.kakaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta-secondary"
                >
                  <MessageCircle size={15} />
                  <span>카카오톡 1:1 문의 →</span>
                </a>
              )}
            </div>
          </div>
        ) : submittedInfo ? (
          /* Submission Success State */
          <div className="p-8 sm:p-12 border border-[#C6FF00] bg-gradient-to-br from-[#121809] to-[#0B0B0B] rounded-[2px] text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-[2px] bg-[#C6FF00] text-[#0A0A0A] flex items-center justify-center">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.18em] text-[#C6FF00] mb-2">
                SUBMISSION RECEIVED
              </div>
              <h2 className="ff-disp text-3xl sm:text-4xl mb-3">
                접수가 정상적으로 완료되었습니다
              </h2>
              <p className="text-sm sm:text-base text-[#F2F2F2]/85 max-w-lg mx-auto leading-relaxed break-keep">
                <strong>{submittedInfo.name}</strong>님의{' '}
                <span className="text-[#C6FF00] font-bold">
                  {FORM_TYPE_LABELS[activeMeta.type]}
                </span>
                가 안전하게 접수되었습니다. 확인 후 기재해주신 연락처(
                <strong>{submittedInfo.contact}</strong>) 또는 카카오톡으로 빠르게 안내드리겠습니다.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {siteSettings.kakaoUrl && (
                <a
                  href={siteSettings.kakaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta"
                >
                  <MessageCircle size={15} />
                  <span>카카오톡 1:1 오픈채팅 연결 →</span>
                </a>
              )}
              <Link to="/" className="hero-cta-secondary">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          /* Native On-Site Form */
          <form onSubmit={handleSubmit} className="space-y-7">
            {isExternalRedirectConfigured && externalUrlForSlug && (
              <div className="p-4 border border-white/15 bg-[#101010] rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-[#8C8C8C]">
                  외부 구글폼 링크가 연결되어 있습니다. 원하시면 기존 구글폼으로도 작성할 수 있습니다.
                </span>
                <a
                  href={externalUrlForSlug}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#C6FF00] font-extrabold hover:underline shrink-0"
                >
                  <span>구글폼으로 열기</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* Security reassurance notice */}
            <div className="p-3.5 bg-[#0F120C] border border-[#C6FF00]/25 rounded-[2px] flex items-start gap-2.5 text-xs text-[#F2F2F2]/80">
              <ShieldCheck size={16} className="text-[#C6FF00] shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                입력하신 연락처 및 신청 정보는 암호화된 보안 데이터베이스에 저장되며, 오직 DO-DAHAM 운영진만 상담 및 안내 목적으로 열람할 수 있습니다.
              </span>
            </div>

            {/* Section 1: Basic Info */}
            <section className="p-6 sm:p-7 bg-[#0E0E0E] border border-white/[0.1] rounded-[2px] space-y-5">
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#C6FF00] uppercase">
                01 · 기본 정보
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(activeSlug === 'class-inquiry' || activeSlug === 'project-inquiry') && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="form-org" className="text-xs font-bold text-[#8C8C8C]">
                      {activeSlug === 'project-inquiry'
                        ? '브랜드 · 업체명 (선택)'
                        : '기업 · 기관명 (개인인 경우 비워두셔도 됩니다)'}
                    </label>
                    <input
                      id="form-org"
                      type="text"
                      maxLength={120}
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder={
                        activeSlug === 'project-inquiry'
                          ? '예: 스튜디오 다함 / 개인 브랜드'
                          : '예: 고양시청, OO기업 마케팅팀'
                      }
                      className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="form-name" className="text-xs font-bold text-[#F2F2F2]">
                    {activeSlug === 'instructor-recruit'
                      ? '성함 또는 활동명 *'
                      : activeSlug === 'class-apply'
                        ? '수강생 성함 *'
                        : '담당자 / 신청자 성함 *'}
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="form-contact" className="text-xs font-bold text-[#F2F2F2]">
                    연락처 (휴대폰 번호 또는 카카오톡 ID) *
                  </label>
                  <input
                    id="form-contact"
                    type="text"
                    required
                    maxLength={120}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="010-0000-0000"
                    className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="form-email" className="text-xs font-bold text-[#F2F2F2]">
                    {activeSlug === 'instructor-recruit'
                      ? 'Google 계정 이메일 (강사 포털 초대 링크 수령용 Gmail) *'
                      : '이메일 (선택)'}
                  </label>
                  <input
                    id="form-email"
                    type="email"
                    required={activeSlug === 'instructor-recruit'}
                    maxLength={150}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeSlug === 'instructor-recruit'
                        ? 'example@gmail.com'
                        : 'reply@example.com'
                    }
                    className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Form-specific Options */}
            <section className="p-6 sm:p-7 bg-[#0E0E0E] border border-white/[0.1] rounded-[2px] space-y-6">
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#C6FF00] uppercase">
                02 · {activeMeta.shortLabel} 세부 항목
              </div>

              {/* A. Class Application Specific */}
              {activeSlug === 'class-apply' && (
                <>
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      희망 클래스 규모 (1인 · 1회차 기준 수강료) *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {CLASS_TIERS.map((opt) => {
                        const selected = tier === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTier(opt.value)}
                            className={`p-4 text-left rounded-[2px] border transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#C6FF00] bg-[#141A08]'
                                : 'border-white/[0.14] bg-black hover:border-white/35'
                            }`}
                          >
                            <div className="text-xs font-bold text-[#8C8C8C] mb-1">
                              {opt.title}
                            </div>
                            <div
                              className={`text-lg font-extrabold mb-1 ${
                                selected ? 'text-[#C6FF00]' : 'text-[#F2F2F2]'
                              }`}
                            >
                              {opt.price}
                            </div>
                            <div className="text-[11px] text-[#8C8C8C] leading-snug">
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      희망 과정 회차 *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_SESSIONS.map((opt) => {
                        const selected = sessions === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSessions(opt)}
                            className={`px-4 py-2.5 text-xs font-extrabold rounded-[2px] border cursor-pointer transition-colors ${
                              selected
                                ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                                : 'bg-black text-[#F2F2F2] border-white/[0.18] hover:border-[#C6FF00]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      관심 분야 (복수 선택 가능)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_INTERESTS.map((cat) => {
                        const selected = categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors flex items-center gap-1.5 ${
                              selected
                                ? 'bg-[#C6FF00]/15 text-[#C6FF00] border-[#C6FF00]'
                                : 'bg-black text-[#8C8C8C] border-white/[0.15] hover:text-[#F2F2F2]'
                            }`}
                          >
                            {selected && <Check size={12} />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* B. Instructor Recruit Specific */}
              {activeSlug === 'instructor-recruit' && (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#F2F2F2]">
                        강의 가능 전문 분야 (제한 없이 모두 선택) *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCategories(
                            categories.length === INSTRUCTOR_SPECIALTIES.length
                              ? []
                              : [...INSTRUCTOR_SPECIALTIES]
                          )
                        }
                        className="text-[11px] font-extrabold text-[#C6FF00] hover:underline cursor-pointer"
                      >
                        {categories.length === INSTRUCTOR_SPECIALTIES.length
                          ? '전체 해제'
                          : '전체 선택'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INSTRUCTOR_SPECIALTIES.map((tag) => {
                        const selected = categories.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleCategory(tag)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors flex items-center gap-1.5 ${
                              selected
                                ? 'bg-[#28B8E8]/20 text-[#28B8E8] border-[#28B8E8]'
                                : 'bg-black text-[#8C8C8C] border-white/[0.15] hover:text-[#F2F2F2]'
                            }`}
                          >
                            {selected && <Check size={12} />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-portfolio" className="text-xs font-bold text-[#F2F2F2]">
                      포트폴리오 · 유튜브 · 작업물 링크 (URL)
                    </label>
                    <input
                      id="form-portfolio"
                      type="url"
                      maxLength={500}
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://youtube.com/... 또는 포트폴리오 링크"
                      className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                    />
                  </div>
                </>
              )}

              {/* C. Class / Corporate Inquiry Specific */}
              {activeSlug === 'class-inquiry' && (
                <>
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      문의 유형 / 예상 교육 인원
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_INQUIRY_SCALES.map((opt) => {
                        const selected = tier === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setTier(opt)}
                            className={`px-3.5 py-2.5 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors ${
                              selected
                                ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                                : 'bg-black text-[#F2F2F2] border-white/[0.16] hover:border-[#C6FF00]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      관심 교육 주제 (복수 선택 가능)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_INTERESTS.map((cat) => {
                        const selected = categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors flex items-center gap-1.5 ${
                              selected
                                ? 'bg-[#C6FF00]/15 text-[#C6FF00] border-[#C6FF00]'
                                : 'bg-black text-[#8C8C8C] border-white/[0.15] hover:text-[#F2F2F2]'
                            }`}
                          >
                            {selected && <Check size={12} />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* D. Project Inquiry Specific */}
              {activeSlug === 'project-inquiry' && (
                <>
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      제작 의뢰 분야 (복수 선택 가능) *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_CATEGORIES.map((cat) => {
                        const selected = categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors flex items-center gap-1.5 ${
                              selected
                                ? 'bg-[#E02898]/20 text-[#F2F2F2] border-[#E02898]'
                                : 'bg-black text-[#8C8C8C] border-white/[0.15] hover:text-[#F2F2F2]'
                            }`}
                          >
                            {selected && <Check size={12} className="text-[#E02898]" />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#F2F2F2]">
                      예상 예산 범위
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_BUDGETS.map((opt) => {
                        const selected = budget === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setBudget(opt)}
                            className={`px-3.5 py-2.5 text-xs font-bold rounded-[2px] border cursor-pointer transition-colors ${
                              selected
                                ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]'
                                : 'bg-black text-[#F2F2F2] border-white/[0.16] hover:border-[#C6FF00]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-ref-url" className="text-xs font-bold text-[#F2F2F2]">
                      참고 레퍼런스 · 기존 홈페이지 링크 (선택)
                    </label>
                    <input
                      id="form-ref-url"
                      type="url"
                      maxLength={500}
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://... 참고하고 싶은 영상이나 사이트 주소"
                      className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                    />
                  </div>
                </>
              )}

              {/* Common Schedule Preference */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form-schedule" className="text-xs font-bold text-[#F2F2F2]">
                  {activeSlug === 'project-inquiry'
                    ? '희망 납품 일정 (선택)'
                    : '선호 요일 · 시간대 / 희망 장소 (선택)'}
                </label>
                <input
                  id="form-schedule"
                  type="text"
                  maxLength={200}
                  value={schedulePref}
                  onChange={(e) => setSchedulePref(e.target.value)}
                  placeholder={
                    activeSlug === 'project-inquiry'
                      ? '예: 3주 이내 납품 희망, 12월 중 런칭 예정'
                      : '예: 평일 저녁 7시~9시 / 주말 오후 (고양·서울)'
                  }
                  className="p-3.5 bg-black border border-white/[0.18] rounded-[2px] text-sm text-[#F2F2F2] outline-none focus:border-[#C6FF00]"
                />
              </div>

              {/* Message with LetterLimitTextarea */}
              <div className="space-y-1.5">
                <label htmlFor="form-message" className="block text-xs font-bold text-[#F2F2F2]">
                  {activeSlug === 'class-apply'
                    ? '현재 AI 경험 및 완성해보고 싶은 결과물 (선택)'
                    : activeSlug === 'instructor-recruit'
                      ? '주요 경력 및 강사 소개 *'
                      : activeSlug === 'project-inquiry'
                        ? '프로젝트 상세 내용 및 요청 사항 *'
                        : '희망 교육 주제 및 상세 문의 내용 *'}
                </label>
                <LetterLimitTextarea
                  id="form-message"
                  value={message}
                  onChange={setMessage}
                  limit={messageLimit}
                  nearThreshold={60}
                  rows={4}
                  required={activeSlug !== 'class-apply'}
                  placeholder={
                    activeSlug === 'class-apply'
                      ? '예: 미드저니로 우리 매장 홍보 쇼츠를 직접 만들어보고 싶습니다.'
                      : activeSlug === 'instructor-recruit'
                        ? '실무 프로젝트 경험, 강의 이력, 본인만의 커리큘럼 강점을 편하게 작성해 주세요.'
                        : activeSlug === 'project-inquiry'
                          ? '제작 목적, 분량/페이지 수, 타겟 고객 등 떠올리신 구상을 편하게 적어주세요.'
                          : '교육 대상의 수준, 희망 커리큘럼 방향 또는 1기 오픈 시 받고 싶은 안내를 적어주세요.'
                  }
                />
              </div>
            </section>

            {/* Section 3: Consent & Policy */}
            <section className="p-6 bg-[#0E0E0E] border border-white/[0.1] rounded-[2px] space-y-4">
              {activeSlug === 'class-apply' && (
                <div className="p-4 bg-black/70 border border-white/[0.08] text-xs text-[#8C8C8C] leading-relaxed space-y-1">
                  <div className="text-[#F2F2F2] font-bold">개설 · 환불 기준 안내</div>
                  <p>• 희망 트랙의 최소 개설 인원 미달 시 개강 3일 전 안내 후 예약금(50,000원) 100% 전액 환불</p>
                  <p>• 개설 확정 후 개인 사정 취소 시 개강 7일 전 100% 환불 / 개강 3일 전까지 50% 환불</p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#C6FF00] shrink-0"
                />
                <span className="text-xs sm:text-sm text-[#F2F2F2]/90 leading-relaxed break-keep">
                  {activeSlug === 'class-apply'
                    ? '위 개설·환불 기준을 확인했으며, 수강 일정 및 예약금 안내 목적의 개인정보(성함·연락처·이메일) 수집·이용에 동의합니다. *'
                    : '상담 답변 및 일정 안내 목적의 개인정보(성함·연락처·이메일) 수집·이용에 동의합니다. (상담 종료 또는 요청 시 즉시 파기) *'}
                </span>
              </label>

              {submitError && (
                <div
                  role="alert"
                  className="p-3.5 border border-[#E02898]/50 bg-[#E02898]/10 text-[#F2F2F2] text-xs font-bold flex items-start gap-2"
                >
                  <AlertTriangle size={15} className="text-[#E02898] shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="hero-cta justify-center min-w-[220px] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>접수 중...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>{activeMeta.shortLabel} 제출하기</span>
                    </>
                  )}
                </button>

                {siteSettings.kakaoUrl && (
                  <a
                    href={siteSettings.kakaoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C8C8C] hover:text-[#C6FF00] transition-colors"
                  >
                    <MessageCircle size={14} />
                    <span>폼 대신 카카오톡으로 바로 질문하기 →</span>
                  </a>
                )}
              </div>
            </section>
          </form>
        )}
      </main>

      <footer>
        <div className="footer-logo">
          <CrystalCube size={34} pfx="appftr" />
          <span className="footer-logo-text uppercase tracking-widest">DO-DAHAM</span>
        </div>
        <div className="footer-copy">
          <div>do-daham.com</div>
          <div>문의 · 카카오톡 {siteSettings.kakaoHandle}</div>
          <div className="acid mt-1">CREATIVE REBELS · AI STUDIO × EDUCATION</div>
        </div>
      </footer>
    </div>
  );
}
