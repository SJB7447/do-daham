import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import ActivityHighlightSection from './components/ActivityHighlightSection';
import { CrystalCube } from './components/CrystalCube';
import { SiteHeader } from './components/SiteHeader';
import { DEFAULT_METRICS, fetchLiveClassMetrics, LiveClassMetrics } from './lib/classMetrics';
import {
  DEFAULT_SITE_SETTINGS,
  isInternalFormUrl,
  normalizeSiteSettings,
  SiteSettings
} from './lib/siteSettings';
import { Settings, Check, Copy } from 'lucide-react';
import mCubeLogo from './assets/m_cube_logo.png';
import { isYoutubeUrl, getYoutubeEmbedUrl, getYoutubeWatchUrl, isEmbeddableYoutubeVideo } from './lib/youtube';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const WorkshopPage = lazy(() => import('./components/WorkshopPage'));
const ActivityPage = lazy(() => import('./components/ActivityPage'));
const ClassPage = lazy(() => import('./components/ClassPage'));
const InstructorsPage = lazy(() => import('./components/InstructorsPage'));
const SchedulePage = lazy(() => import('./components/SchedulePage'));
const JoinInvitePage = lazy(() => import('./components/JoinInvitePage'));
const InstructorProfileEditPage = lazy(() => import('./components/InstructorProfileEditPage'));
const InstructorClassCreatePage = lazy(() => import('./components/InstructorClassCreatePage'));
const InstructorClassesManagePage = lazy(() => import('./components/InstructorClassesManagePage'));
const InstructorLoginPage = lazy(() => import('./components/InstructorLoginPage'));
const ProjectPage = lazy(() => import('./components/ProjectPage'));
const FormApplyPage = lazy(() => import('./components/FormApplyPage'));

const PORTFOLIO_CACHE_KEY = 'dodaham-portfolio-cache-v1';

const DEFAULT_PORTFOLIO_DATA = {
  userName: "DO-DAHAM",
  userRole: "CREATIVE REBELS",
  manifesto: {
    lines: ["눈치 보지 마.", "허락 구하지 마.", "그냥 해."],
    highlight: "하고싶은거 다해."
  },
  masterpiece: {
    title: "REPRESENTATIVE WORK",
    descriptionTitle: "경기관광공사 영상 공모전 입상작",
    descriptionSub: '"Code:M Studio"가 제작한 경기도의 새로운 매력.',
    embedSrc: "https://www.youtube.com/embed/P-b7WV-obKs"
  },
  actions: [
    { id: 1, title: "CodeM Studio", href: "https://www.youtube.com/@CodeM_Studio_AI11", img: mCubeLogo, external: true },
    { id: 2, title: "Mood Brew", href: "https://cafe.do-daham.com/mood/", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false },
    { id: 3, title: "MechFlow", href: "https://machine.do-daham.com", img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false },
    { id: 4, title: "Coming Soon...", href: "", img: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false }
  ]
};

function loadCachedPortfolio(): { data: typeof DEFAULT_PORTFOLIO_DATA; siteSettings?: SiteSettings } | null {
  try {
    const raw = sessionStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data) return parsed;
  } catch {
    // Ignore storage access/parse errors
  }
  return null;
}

const DEFAULT_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@CodeM_Studio_AI11';
const APPLY_FORM_URL = import.meta.env.VITE_APPLY_FORM_URL || 'https://forms.gle/w1cTzZYUCGkqdDTT6';

function normalizeYoutubeHref(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/@do-daham')) {
    return DEFAULT_YOUTUBE_CHANNEL_URL;
  }
  return trimmed;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => meta?.setAttribute(key, value));
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', attrs.content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function RouteScrollHandler() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const routeMeta: Record<string, { title: string; description: string; url: string; robots: string }> = {
      '/': {
        title: 'DO-DAHAM — AI 영상 · 홈페이지 제작, AI 강의',
        description: 'AI 영상과 웹서비스 제작부터 기관·기업·소그룹 실무 AI 교육까지. 직접 만들고, 직접 가르치는 크리에이티브 스튜디오 DO-DAHAM입니다.',
        url: 'https://do-daham.com/',
        robots: 'index, follow'
      },
      '/activity': {
        title: '교육 현장 · 활동 기록 | DO-DAHAM',
        description: 'DO-DAHAM의 AI 교육 현장과 기관 출강, 언론 보도 및 인터뷰 기록을 확인하세요.',
        url: 'https://do-daham.com/activity',
        robots: 'index, follow'
      },
      '/project': {
        title: 'AI 영상 · 홈페이지 제작 의뢰 | DO-DAHAM',
        description: '광고·숏폼·단편 영상부터 사업용 홈페이지·웹서비스까지. 기획부터 최종 납품까지 디렉터가 직접 제작합니다.',
        url: 'https://do-daham.com/project',
        robots: 'index, follow'
      },
      '/class': {
        title: 'AI 실무 클래스 1기 · 수강료 시뮬레이션 | DO-DAHAM',
        description: '모일수록 내려가는 수강료(GROUP-DROP)와 6회 실전 AI 커리큘럼. 1기 사전 신청을 확인하세요.',
        url: 'https://do-daham.com/class',
        robots: 'index, follow'
      },
      '/class/instructors': {
        title: '강사진 프로필 · 만나는 시간 | DO-DAHAM CLASS',
        description: '직접 만들고 직접 가르치는 DO-DAHAM의 대표 강사 및 분야별 파트너 강사진 프로필과 강의 가능 일정을 확인하세요.',
        url: 'https://do-daham.com/class/instructors',
        robots: 'index, follow'
      },
      '/class/schedule': {
        title: '수업 일정 · 신청 현황 | DO-DAHAM CLASS',
        description: '모집 중인 AI 클래스의 월간 달력, 주간 일정 및 실시간 신청 인원·개설 확정 현황을 확인하세요.',
        url: 'https://do-daham.com/class/schedule',
        robots: 'index, follow'
      },
      '/admin': {
        title: 'CMS 관리자 | DO-DAHAM',
        description: 'DO-DAHAM 관리자 대시보드',
        url: 'https://do-daham.com/admin',
        robots: 'noindex, nofollow'
      },
      '/instructor/login': {
        title: '강사 로그인 | DO-DAHAM CLASS',
        description: 'DO-DAHAM CLASS 강사 전용 로그인',
        url: 'https://do-daham.com/instructor/login',
        robots: 'noindex, nofollow'
      },
      '/instructor/profile': {
        title: '강사 프로필 편집 | DO-DAHAM CLASS',
        description: 'DO-DAHAM CLASS 강사 프로필 편집',
        url: 'https://do-daham.com/instructor/profile',
        robots: 'noindex, nofollow'
      },
      '/instructor/classes': {
        title: '내 수업 일정 관리 | DO-DAHAM CLASS',
        description: 'DO-DAHAM CLASS 강사 본인 수업 일정 관리',
        url: 'https://do-daham.com/instructor/classes',
        robots: 'noindex, nofollow'
      },
      '/instructor/classes/new': {
        title: '수업 일정 · 강의 계획 등록 | DO-DAHAM CLASS',
        description: 'DO-DAHAM CLASS 강사 수업 등록',
        url: 'https://do-daham.com/instructor/classes/new',
        robots: 'noindex, nofollow'
      },
      '/workshop-preview': {
        title: '워크숍 미리보기 | DO-DAHAM',
        description: 'DO-DAHAM AI 교육 워크숍 미리보기',
        url: 'https://do-daham.com/workshop-preview',
        robots: 'noindex, nofollow'
      }
    };

    const current = pathname.startsWith('/join/')
      ? {
          title: '강사 초대 가입 | DO-DAHAM CLASS',
          description: 'DO-DAHAM CLASS 파트너 강사 초대 가입',
          url: `https://do-daham.com${pathname}`,
          robots: 'noindex, nofollow'
        }
      : pathname === '/apply' || pathname.startsWith('/apply/')
        ? {
            title: '신청 · 문의 접수 | DO-DAHAM',
            description: 'AI 영상·홈페이지 제작 의뢰, 기업·기관 출강 문의, AI 클래스 수강 신청 및 강사 합류 접수.',
            url: `https://do-daham.com${pathname}`,
            robots: 'index, follow'
          }
        : routeMeta[pathname] || routeMeta['/'];
    document.title = current.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: current.description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: current.robots });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: current.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: current.description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: current.url });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: current.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: current.description });
    upsertCanonical(current.url);

    // Keep Admin CMS and Instructor portals in dark theme; restore session choice on public routes
    const isDarkOnlyRoute =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/instructor') ||
      pathname.startsWith('/join/');
    if (isDarkOnlyRoute) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      try {
        const saved = sessionStorage.getItem('dodaham-theme') === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', saved);
      } catch {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }

    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    let attempts = 0;
    let timer: number | undefined;
    const targetId = decodeURIComponent(hash.slice(1));

    const scrollToTarget = () => {
      const target = document.getElementById(targetId);

      if (target) {
        const navOffset = window.innerWidth <= 600 ? 66 : 70;
        const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({ top, behavior: 'smooth' });
        return;
      }

      if (attempts < 30) {
        attempts += 1;
        timer = window.setTimeout(scrollToTarget, 80);
      }
    };

    timer = window.setTimeout(scrollToTarget, 60);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname, hash]);

  return null;
}

// ═══ PUBLIC PORTFOLIO COMPONENT ═══
function PortfolioHome() {
  const [data, setData] = useState(() => loadCachedPortfolio()?.data ?? DEFAULT_PORTFOLIO_DATA);

  const [scrolled, setScrolled] = useState(false);
  const [kakaoCopied, setKakaoCopied] = useState(false);
  const [metrics, setMetrics] = useState<LiveClassMetrics>(DEFAULT_METRICS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    () => loadCachedPortfolio()?.siteSettings ?? DEFAULT_SITE_SETTINGS
  );

  const handleCopyKakao = async () => {
    try {
      await navigator.clipboard.writeText('@AI다함스튜디오');
      setKakaoCopied(true);
      window.setTimeout(() => setKakaoCopied(false), 2200);
    } catch {
      setKakaoCopied(true);
      window.setTimeout(() => setKakaoCopied(false), 2200);
    }
  };

  // Monitor scroll for nav header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'portfolios', 'admin_default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data().data;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          
          const seenIds = new Set<number | string>();
          const rawActions = Array.isArray(parsed.actions)
            ? parsed.actions
            : [
                { id: 1, title: "CodeM Studio", href: DEFAULT_YOUTUBE_CHANNEL_URL, img: mCubeLogo, external: true },
                { id: 2, title: "Mood Brew", href: "https://cafe.do-daham.com/mood/", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false },
                { id: 3, title: "MechFlow", href: "https://machine.do-daham.com", img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false },
                { id: 4, title: "Coming Soon...", href: "", img: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: false }
              ];

          const normalizedActions = rawActions.filter(Boolean).map((a: any, idx: number) => {
            let id = a.id ?? (idx + 1);
            while (seenIds.has(id)) {
              id = Date.now() + idx + Math.floor(Math.random() * 10000);
            }
            seenIds.add(id);
            const normalizedHref = normalizeYoutubeHref(a.href);
            const normalizedVideoSrc = normalizeYoutubeHref(a.videoSrc);
            return {
              ...a,
              id,
              title: a.title ?? '',
              href: normalizedHref,
              img: a.img ?? '',
              mediaType: a.mediaType || 'image',
              videoSrc: normalizedVideoSrc,
              external: a.external ?? (normalizedHref ? normalizedHref.startsWith('http') : false)
            };
          });

          const nextData = {
            userName: parsed.userName || "DO-DAHAM",
            userRole: parsed.userRole || "CREATIVE REBELS",
            manifesto: {
              lines: parsed.manifesto?.lines?.length ? parsed.manifesto.lines : ["눈치 보지 마.", "허락 구하지 마.", "그냥 해."],
              highlight: parsed.manifesto?.highlight || "하고싶은거 다해."
            },
            masterpiece: {
              title: String(parsed.masterpiece?.title || "REPRESENTATIVE WORK").replace(/^REPRESENTATIVE\s*\n\s*WORK$/i, "REPRESENTATIVE WORK"),
              descriptionTitle: parsed.masterpiece?.descriptionTitle || (parsed.masterpiece?.embedSrc ? "SELECTED WORK" : "등록된 작품이 없습니다."),
              descriptionSub: parsed.masterpiece?.descriptionSub || "",
              embedSrc: parsed.masterpiece?.embedSrc || ""
            },
            actions: normalizedActions
          };
          setData(nextData);

          const nextSiteSettings = parsed.siteSettings
            ? normalizeSiteSettings(parsed.siteSettings)
            : undefined;
          if (nextSiteSettings) {
            setSiteSettings(nextSiteSettings);
          }

          try {
            sessionStorage.setItem(
              PORTFOLIO_CACHE_KEY,
              JSON.stringify({ data: nextData, siteSettings: nextSiteSettings })
            );
          } catch {
            // Ignore sessionStorage quota errors
          }
        }
      } catch (err) {
        console.error("Firestore read error, using local defaults:", err);
      }
    };

    fetchData();
    fetchLiveClassMetrics().then(setMetrics);
  }, []);

  const tickerItems = Array(12).fill(null).map((_, i) => (
    <span key={i}>
      DO WHATEVER YOU WANT <span className="dot">/</span> 하고싶은거 다해 <span className="dot">/</span>{" "}
    </span>
  ));

  const youtubeAction = data.actions.find(
    (a: any) => isYoutubeUrl(a.href || '') || isYoutubeUrl(a.videoSrc || '')
  );
  const watchHref = youtubeAction
    ? getYoutubeWatchUrl(normalizeYoutubeHref(youtubeAction.href || youtubeAction.videoSrc))
    : DEFAULT_YOUTUBE_CHANNEL_URL;

  return (
    <div className="selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Navigation */}
      <SiteHeader
        brandName={data.userName}
        scrolled={scrolled}
        ctaLabel="문의하기 →"
        ctaTo="/#contact"
        watchHref={watchHref}
      />

      {/* Hero Section */}
      <section className="hero" data-screen-label="Hero">
        <div className="hero-ghost" aria-hidden="true">다함</div>

        <div className="hero-text">
          <span className="hero-kicker uppercase tracking-widest">
            {data.userRole} · AI STUDIO × AI EDUCATION
          </span>
          <h1 className="m-0">
            <span className="hero-h1 block">하고싶은거</span>
            <span className="hero-h1-accent block">다함.</span>
          </h1>
          <p className="hero-tagline mb-4">
            <strong>WE DON&apos;T FOLLOW RULES. WE BREAK THEM.</strong>
            우리는 규칙을 따르지 않는다. 부술 뿐.
          </p>
          <p className="hero-subcopy">
            AI 영상 · 홈페이지 · AI 강의.<br />
            직접 만들고, 직접 가르칩니다.
          </p>
          <div className="hero-cta-row">
            <Link to="/project" className="hero-cta">제작 의뢰하기 →</Link>
            <Link to="/class" className="hero-cta-secondary">클래스 1기 신청 →</Link>
            <a href="#masterpiece" className="hero-cta-text">대표 작품 보기 ↓</a>
          </div>
        </div>

        <div className="hero-crystal-col">
          <div className="crystal-col-glow"></div>
          <div className="crystal-float" id="crystal-hero">
            <CrystalCube size={310} pfx="hero" interactive />
          </div>
          <div className="hero-award-chip">
            <span>AWARD</span>
            <span>경기관광공사 영상 공모전 입상</span>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {tickerItems}
        </div>
      </div>

      {/* Trust Strip */}
      <section className="trust-strip" aria-label="주요 실적 및 신뢰 지표">
        <div className="trust-cell">
          <div className="trust-label">LECTURE HOURS</div>
          <div className="trust-value trust-value-lg">{metrics.totalHours.toLocaleString('ko-KR')}<span className="acid">시간+</span></div>
          <div className="trust-note">누적 AI 실무 · 영상 강의</div>
        </div>
        <div className="trust-cell">
          <div className="trust-label">STUDENTS</div>
          <div className="trust-value trust-value-lg">{metrics.totalStudents.toLocaleString('ko-KR')}<span className="acid">명+</span></div>
          <div className="trust-note">누적 수강생 · 교육 참여</div>
        </div>
        <div className="trust-cell">
          <div className="trust-label">AWARD</div>
          <div className="trust-value">경기관광공사<br />영상 공모전 입상</div>
        </div>
        <div className="trust-cell">
          <div className="trust-label">TEACHING</div>
          <div className="trust-value">AI 디지털 튜터 양성<br />에이블런 · 배움터 출강</div>
        </div>
      </section>

      {/* 01 WHAT WE DO */}
      <section className="section" id="what-we-do" data-screen-label="What We Do">
        <div className="sec-head">
          <span className="sec-num">01</span>
          <h2 className="sec-title">WHAT WE DO</h2>
        </div>
        <div className="what-grid">
          <Link to="/project" className="what-card">
            <div>
              <div className="what-card-top">
                <span>PROJECT 01</span>
                <span>자세히 →</span>
              </div>
              <h3>AI 영상 제작</h3>
              <p>광고 · 숏폼 · 단편 영상. 기획부터 결과물까지 직접 만듭니다.</p>
            </div>
            <div className="what-tags">
              <span className="what-tag">광고</span>
              <span className="what-tag">숏폼</span>
              <span className="what-tag">단편</span>
            </div>
          </Link>

          <Link to="/project" className="what-card">
            <div>
              <div className="what-card-top">
                <span>PROJECT 02</span>
                <span>자세히 →</span>
              </div>
              <h3>홈페이지 · 웹서비스</h3>
              <p>사업용 홈페이지와 상세페이지, 작은 웹서비스까지 직접 구축합니다.</p>
            </div>
            <div className="what-tags">
              <span className="what-tag">홈페이지</span>
              <span className="what-tag">상세페이지</span>
              <span className="what-tag">웹서비스</span>
            </div>
          </Link>

          <Link to="/class" className="what-card featured">
            <div>
              <div className="what-card-top">
                <span>CLASS · 1기 모집</span>
                <span>자세히 →</span>
              </div>
              <h3>AI 교육 · 클래스</h3>
              <p>기관·기업 출강과 소그룹 실전 클래스. 배운 사람이 작품을 가져갑니다.</p>
            </div>
            <div className="what-tags">
              <span className="what-tag">출강</span>
              <span className="what-tag">소그룹 클래스</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Manifesto */}
      <section className="section" id="manifesto" data-screen-label="Manifesto">
        <div className="sec-head">
          <span className="sec-num">02</span>
          <h2 className="sec-title">MANIFESTO</h2>
        </div>
        <div className="manifesto-lines">
          {data.manifesto.lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
          <div className="last">{data.manifesto.highlight}</div>
        </div>
      </section>

      {/* Masterpiece */}
      <section className="section" id="masterpiece" data-screen-label="Masterpiece">
        <div className="sec-head">
          <span className="sec-num">03</span>
          <h2 className="sec-title whitespace-pre-line">{data.masterpiece.title || "MASTERPIECE"}</h2>
        </div>
        <div className="masterpiece-inner">
          <div className="video-block">
            {data.masterpiece.embedSrc ? (
              isEmbeddableYoutubeVideo(data.masterpiece.embedSrc) ? (
                <iframe
                  className="absolute top-0 left-0 w-full h-full border-0"
                  src={getYoutubeEmbedUrl(data.masterpiece.embedSrc)}
                  title={data.masterpiece.descriptionTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <img
                  src={data.masterpiece.embedSrc}
                  alt={data.masterpiece.descriptionTitle}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="text-sm uppercase opacity-30">No Media Uploaded</div>
            )}
            <span className="video-caption pointer-events-none">MEDIA · {data.masterpiece.descriptionTitle}</span>
          </div>
          <div className="ms-desc">
            <span className="ms-badge">SELECTED WORK · {data.masterpiece.descriptionTitle}</span>
            <div className="ms-title whitespace-pre-line">{data.masterpiece.descriptionSub}</div>
            {data.masterpiece.embedSrc && (
              <a
                href={isYoutubeUrl(data.masterpiece.embedSrc) ? getYoutubeWatchUrl(data.masterpiece.embedSrc) : data.masterpiece.embedSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="link-btn"
              >
                자세히 보기 →
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="section" id="actions" data-screen-label="Actions">
        <div className="sec-head">
          <span className="sec-num">04</span>
          <h2 className="sec-title">ACTIONS</h2>
        </div>
        <div className="actions-grid">
          {data.actions.map((item: any, idx: number) => {
            const safeTitle = item.title || '';
            const rawYoutubeSrc = normalizeYoutubeHref(item.videoSrc || item.href || '');
            const isYoutubeCard = item.mediaType === 'youtube' && Boolean(rawYoutubeSrc);
            const isEmbeddableVideo = isYoutubeCard && isEmbeddableYoutubeVideo(rawYoutubeSrc);
            const targetHref = isYoutubeCard ? getYoutubeWatchUrl(rawYoutubeSrc) : normalizeYoutubeHref(item.href);
            const isComingSoon = !isYoutubeCard && (!targetHref || safeTitle.toLowerCase().includes('soon'));
            const isCodeMCard = safeTitle.toLowerCase().replace(/\s+/g, '').includes('codem');
            const actionImgSrc = isCodeMCard ? mCubeLogo : item.img;
            const cardClass = `card-${(idx % 3) + 1}`;
            const cardKey = item.id ?? `action-${idx}`;

            const cardInner = (
              <>
                {isEmbeddableVideo ? (
                  <>
                    <iframe
                      className="absolute inset-0 w-full h-full border-0 opacity-35 group-hover:opacity-70 transition-opacity duration-700 pointer-events-auto"
                      src={getYoutubeEmbedUrl(rawYoutubeSrc)}
                      title={safeTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none z-0" />
                  </>
                ) : actionImgSrc ? (
                  <>
                    <img
                      src={actionImgSrc}
                      alt={safeTitle}
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:scale-105 group-hover:opacity-90 group-hover:mix-blend-normal transition-all duration-500 mix-blend-luminosity pointer-events-none"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        if (!event.currentTarget.dataset.fallbackApplied) {
                          event.currentTarget.dataset.fallbackApplied = 'true';
                          event.currentTarget.src = mCubeLogo;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none z-0" />
                  </>
                ) : null}
                {isEmbeddableVideo ? (
                  <>
                    <a
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${safeTitle} 유튜브에서 보기`}
                      className="absolute top-3 right-3 w-11 h-11 z-20 pointer-events-auto"
                    />
                    <div className="relative z-10 flex flex-col justify-end w-full h-full pointer-events-none">
                      <a
                        href={targetHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto w-fit group/watch"
                      >
                        <div className="card-tag group-hover/watch:text-[#C6FF00] transition-colors">
                          PROJECT · WATCH VIDEO ↗
                        </div>
                        <div className="card-name group-hover/watch:text-[#C6FF00] transition-colors">
                          {safeTitle}
                        </div>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="relative z-10 flex flex-col justify-end w-full h-full">
                    <div className="card-tag">
                      {isYoutubeCard ? 'PROJECT · WATCH VIDEO' : 'PROJECT · CLICK TO VISIT'}
                    </div>
                    <div className="card-name">{safeTitle}</div>
                  </div>
                )}
              </>
            );

            if (isComingSoon) {
              return (
                <div key={cardKey} className="action-card card-4 dim group relative">
                  {actionImgSrc && (
                    <>
                      <img
                        src={actionImgSrc}
                        alt={safeTitle}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity pointer-events-none"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          if (!event.currentTarget.dataset.fallbackApplied) {
                            event.currentTarget.dataset.fallbackApplied = 'true';
                            event.currentTarget.src = mCubeLogo;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent pointer-events-none z-0" />
                    </>
                  )}
                  <div className="relative z-10 flex flex-col justify-end w-full h-full">
                    <div className="card-tag">PROJECT · COMING SOON</div>
                    <div className="card-name">{safeTitle}</div>
                  </div>
                </div>
              );
            }

            if (isEmbeddableVideo) {
              return (
                <div
                  key={cardKey}
                  className={`action-card ${cardClass} youtube-card group relative`}
                >
                  {cardInner}
                </div>
              );
            }

            const isExternal = isYoutubeCard || item.external || targetHref.startsWith('http');

            return (
              <a
                key={cardKey}
                href={targetHref}
                target={isExternal ? "_blank" : "_self"}
                rel={isExternal ? "noopener noreferrer" : ""}
                className={`action-card ${cardClass} ${isYoutubeCard ? 'youtube-card' : ''} group relative`}
              >
                {cardInner}
              </a>
            );
          })}
        </div>
      </section>

      {/* Activity & Media Highlight */}
      <ActivityHighlightSection />

      {/* Contact */}
      <section className="section" id="contact" data-screen-label="Contact">
        <div className="contact-grid">
          <div>
            <div className="sec-head mb-6">
              <span className="sec-num">05</span>
              <h2 className="sec-title">CONTACT</h2>
            </div>
            <div className="ff-disp text-4xl md:text-5xl leading-[1.12] mb-6">
              <div>눈치 보지 마.</div>
              <div>일단 말 걸어.</div>
              <div className="acid">같이 다함.</div>
            </div>
            <p className="text-[14.5px] font-medium leading-relaxed text-[#A3A79F] max-w-md break-keep">
              AI 영상·홈페이지 제작도, 기관·기업 출강도 좋습니다. 카카오톡 채널 또는 문의 폼으로 언제든 질문하면 디렉터가 직접 답변드립니다.
            </p>
          </div>

          <div className="contact-cards">
            <div className="contact-card primary">
              <div className="contact-card-kicker">PROJECT · 제작 의뢰</div>
              <h3>AI 영상 · 홈페이지</h3>
              <p>광고·숏폼·단편 영상, 사업용 홈페이지와 상세페이지. 범위부터 편하게 말씀해 주세요.</p>
              <div className="flex flex-wrap items-center gap-3">
                {siteSettings.kakaoUrl ? (
                  <a
                    href={siteSettings.kakaoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta"
                  >
                    카카오톡 바로 문의 →
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCopyKakao}
                    className="hero-cta cursor-pointer border-0"
                  >
                    {kakaoCopied ? <Check size={15} /> : <Copy size={15} />}
                    <span>
                      {kakaoCopied
                        ? `카카오톡 ID 복사됨 (${siteSettings.kakaoHandle})`
                        : `카카오톡 ${siteSettings.kakaoHandle} 복사 →`}
                    </span>
                  </button>
                )}
                {isInternalFormUrl(siteSettings.projectInquiryFormUrl) ? (
                  <Link
                    to={siteSettings.projectInquiryFormUrl}
                    className="hero-cta-secondary"
                  >
                    제작 문의 폼 →
                  </Link>
                ) : (
                  <a
                    href={siteSettings.projectInquiryFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta-secondary"
                  >
                    제작 문의 폼 →
                  </a>
                )}
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-card-kicker">CLASS · 강의 · 출강</div>
              <h3>기관 · 기업 · 소그룹 강의</h3>
              <p>대상과 목적에 맞춰 커리큘럼을 맞춤 구성합니다. 접수 후 카카오톡이나 유선으로 일정과 인원을 협의합니다.</p>
              <div className="flex flex-wrap items-center gap-3">
                {isInternalFormUrl(siteSettings.classInquiryFormUrl) ? (
                  <Link
                    to={siteSettings.classInquiryFormUrl}
                    className="hero-cta-secondary"
                  >
                    강의 문의 폼 작성 →
                  </Link>
                ) : (
                  <a
                    href={siteSettings.classInquiryFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-cta-secondary"
                  >
                    강의 문의 폼 작성 →
                  </a>
                )}
                <Link
                  to="/class/instructors"
                  className="inline-flex items-center min-h-[44px] px-2 text-xs font-bold text-[#8C8C8C] hover:text-[#C6FF00] underline underline-offset-4"
                >
                  강사진 프로필 보기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-logo">
          <CrystalCube size={38} pfx="ftr" />
          <span className="footer-logo-text uppercase tracking-widest">{data.userName}</span>
        </div>
        <div className="footer-copy">
          <div>{data.userName.toLowerCase()}.com</div>
          <div>© {new Date().getFullYear()} ALL RIGHTS RESERVED.</div>
          <div className="text-[#8C8C8C] my-1">문의 · 카카오톡 @AI다함스튜디오</div>
          <div className="acid flex justify-end gap-3 items-center flex-wrap">
            <span>OR NOT. WE DON&apos;T CARE.</span>
            <span>•</span>
            <Link to="/instructor/login" className="hover:underline flex items-center gap-1 font-bold text-xs text-[#8C8C8C] hover:text-[#C6FF00]">
              강사 로그인
            </Link>
            <span>•</span>
            <Link to="/admin" className="hover:underline flex items-center gap-1 font-bold text-xs">
              <Settings size={10} /> CMS LOGIN
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══ MAIN ROUTER COMPONENT ═══
export default function App() {
  return (
    <Router>
      <RouteScrollHandler />
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <Routes>
          <Route path="/" element={<PortfolioHome />} />
          <Route path="/project" element={<ProjectPage />} />
          <Route path="/class" element={<ClassPage />} />
          <Route path="/class/schedule" element={<SchedulePage />} />
          <Route path="/class/instructors" element={<InstructorsPage />} />
          <Route path="/apply" element={<FormApplyPage />} />
          <Route path="/apply/:formType" element={<FormApplyPage />} />
          <Route path="/join/:token" element={<JoinInvitePage />} />
          <Route path="/instructor" element={<InstructorLoginPage />} />
          <Route path="/instructor/login" element={<InstructorLoginPage />} />
          <Route path="/instructor/profile" element={<InstructorProfileEditPage />} />
          <Route path="/instructor/classes" element={<InstructorClassesManagePage />} />
          <Route path="/instructor/classes/new" element={<InstructorClassCreatePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          {/* 워크숍 전면 수정 기간 동안 일반 사용자 접근 차단 (메인으로 리다이렉트) */}
          <Route path="/workshop" element={<Navigate to="/" replace />} />
          {/* 수정 및 미리보기용 경로 */}
          <Route path="/workshop-preview" element={<WorkshopPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
