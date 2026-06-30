import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Settings,
  Trophy,
  Users,
  Video
} from 'lucide-react';

const APPLY_FORM_URL = import.meta.env.VITE_APPLY_FORM_URL || 'https://forms.gle/w1cTzZYUCGkqdDTT6';

const roadmap = [
  { title: '초급', period: '2주', focus: 'AI 업무 자동화', status: 'OPEN', tone: 'orange' },
  { title: '중급', period: '3주', focus: '워크플로우 자동화', status: 'COMING SOON', tone: 'gray' },
  { title: '심화', period: '4주', focus: 'AI 콘텐츠 제작', status: 'OPEN', tone: 'orange' },
  { title: '공모전반', period: '별도 모집', focus: '수상 도전', status: 'COMING SOON', tone: 'gray' }
];

const faqItems = [
  {
    q: 'AI를 전혀 모르는데 들을 수 있나요?',
    a: '네. 초급은 AI를 처음 접하는 분을 기준으로 설계했습니다. 스마트폰으로 카카오톡을 쓸 수 있으면 충분합니다.'
  },
  {
    q: '노트북이 없어도 되나요?',
    a: '노트북이 있으면 좋지만 없어도 됩니다. 태블릿이나 스마트폰으로도 실습이 가능합니다.'
  },
  {
    q: '온라인으로는 안 되나요?',
    a: '1기는 오프라인 전용으로 운영합니다. 소수정예 직접 코칭이 이 강의의 핵심이기 때문입니다.'
  },
  {
    q: '초급을 안 듣고 심화만 들을 수 있나요?',
    a: '가능합니다. 단, AI 기초 활용 경험이 있으신 분께 권장합니다.'
  },
  {
    q: '초급 수료 후 심화 등록 시 할인이 되나요?',
    a: '네. 초급 수료생은 심화 1기 금액에서 10% 할인된 441,000원을 적용받습니다.'
  },
  {
    q: '환불 정책이 어떻게 되나요?',
    a: '수업 시작 3일 전까지 전액 환불, 이후 취소 시 50% 환불됩니다.'
  }
];

function ApplyButton({ wide = false }: { wide?: boolean }) {
  return (
    <a
      href={APPLY_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`workshop-apply ${wide ? 'workshop-apply-wide' : ''}`}
    >
      <span>수강 신청하기</span>
      <ArrowRight size={18} aria-hidden="true" />
    </a>
  );
}

function SectionLabel({ children, tone = 'teal' }: { children: string; tone?: 'teal' | 'orange' }) {
  return <div className={`workshop-label workshop-label-${tone}`}>{children}</div>;
}

function CheckItem({ children }: { children: string }) {
  return (
    <li className="workshop-check-item">
      <Check size={17} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="workshop-meta-row">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CrystalCube({ size, pfx }: { size: number; pfx: string }) {
  const sc = size / 280;
  const V = {
    top: [140, 30],
    tr: [240, 88],
    br: [240, 202],
    bot: [140, 260],
    bl: [40, 202],
    tl: [40, 88],
    ctr: [140, 145],
    tfc: [140, 88],
    rfc: [190, 174],
    lfc: [90, 174]
  };

  const p = (pts: number[][]) => pts.map(([x, y]) => `${(x * sc).toFixed(2)},${(y * sc).toFixed(2)}`).join(' ');
  const g = (n: number) => (n * sc).toFixed(2);

  const grads = [
    { id: `${pfx}t1`, x1: g(140), y1: g(30), x2: g(240), y2: g(88), c1: '#FFF000', c2: '#C6FF00' },
    { id: `${pfx}t2`, x1: g(240), y1: g(88), x2: g(140), y2: g(145), c1: '#FF8A00', c2: '#E02898' },
    { id: `${pfx}t3`, x1: g(140), y1: g(145), x2: g(40), y2: g(88), c1: '#D020A0', c2: '#8028D8' },
    { id: `${pfx}t4`, x1: g(40), y1: g(88), x2: g(140), y2: g(30), c1: '#8C38C8', c2: '#D6FF00' },
    { id: `${pfx}r1`, x1: g(240), y1: g(88), x2: g(190), y2: g(174), c1: '#28C8F0', c2: '#18A0E0' },
    { id: `${pfx}r2`, x1: g(240), y1: g(202), x2: g(140), y2: g(260), c1: '#18B8D0', c2: '#9ECC00' },
    { id: `${pfx}r3`, x1: g(140), y1: g(260), x2: g(190), y2: g(174), c1: '#B6E020', c2: '#6090C0' },
    { id: `${pfx}r4`, x1: g(140), y1: g(145), x2: g(240), y2: g(88), c1: '#5870C8', c2: '#32C0E0' },
    { id: `${pfx}l1`, x1: g(40), y1: g(88), x2: g(140), y2: g(145), c1: '#8830D0', c2: '#5028C0' },
    { id: `${pfx}l2`, x1: g(140), y1: g(145), x2: g(140), y2: g(260), c1: '#4428C0', c2: '#1860C0' },
    { id: `${pfx}l3`, x1: g(140), y1: g(260), x2: g(40), y2: g(202), c1: '#1870C0', c2: '#28B0D0' },
    { id: `${pfx}l4`, x1: g(40), y1: g(202), x2: g(40), y2: g(88), c1: '#28A0C8', c2: '#7030D0' }
  ];

  const { top, tr, br, bot, bl, tl, ctr, tfc, rfc, lfc } = V;
  const tris = [
    { pts: p([top, tr, tfc]), gid: `${pfx}t1` },
    { pts: p([tr, ctr, tfc]), gid: `${pfx}t2` },
    { pts: p([ctr, tl, tfc]), gid: `${pfx}t3` },
    { pts: p([tl, top, tfc]), gid: `${pfx}t4` },
    { pts: p([tr, br, rfc]), gid: `${pfx}r1` },
    { pts: p([br, bot, rfc]), gid: `${pfx}r2` },
    { pts: p([bot, ctr, rfc]), gid: `${pfx}r3` },
    { pts: p([ctr, tr, rfc]), gid: `${pfx}r4` },
    { pts: p([tl, ctr, lfc]), gid: `${pfx}l1` },
    { pts: p([ctr, bot, lfc]), gid: `${pfx}l2` },
    { pts: p([bot, bl, lfc]), gid: `${pfx}l3` },
    { pts: p([bl, tl, lfc]), gid: `${pfx}l4` }
  ];

  const sw = sc.toFixed(2);
  const sw2 = (sc * 0.8).toFixed(2);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="crystal-svg" aria-hidden="true">
      <defs>
        {grads.map((grad) => (
          <linearGradient key={grad.id} id={grad.id} gradientUnits="userSpaceOnUse" x1={grad.x1} y1={grad.y1} x2={grad.x2} y2={grad.y2}>
            <stop offset="0%" stopColor={grad.c1} />
            <stop offset="100%" stopColor={grad.c2} />
          </linearGradient>
        ))}
      </defs>
      {tris.map((tri, idx) => (
        <polygon key={idx} points={tri.pts} fill={`url(#${tri.gid})`} />
      ))}
      <polygon points={p([top, tr, br, bot, bl, tl])} fill="none" stroke="rgba(255,255,255,.30)" strokeWidth={sw} />
      <line x1={g(140)} y1={g(30)} x2={g(140)} y2={g(145)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
      <line x1={g(240)} y1={g(88)} x2={g(90)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
      <line x1={g(40)} y1={g(88)} x2={g(190)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
    </svg>
  );
}

function WorkshopNav() {
  return (
    <nav className="workshop-nav" aria-label="Workshop navigation">
      <Link to="/" className="workshop-brand">
        <CrystalCube size={26} pfx="workshop-nav" />
        <span>DO-DAHAM</span>
      </Link>
      <div className="workshop-nav-links">
        <Link to="/workshop" className="active">WORKSHOP</Link>
        <Link to="/#manifesto">MANIFESTO</Link>
        <Link to="/#masterpiece">MASTERPIECE</Link>
        <Link to="/#actions">ACTIONS</Link>
        <Link to="/admin" className="workshop-cms-link">
          <Settings size={12} aria-hidden="true" />
          <span>CMS</span>
        </Link>
      </div>
      <ApplyButton />
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="workshop-hero">
      <div className="workshop-hero-copy">
        <p className="workshop-kicker">CREATIVE REBELS × AI 다함 스튜디오</p>
        <h1>
          <span className="workshop-hero-title-line">유튜브로 AI 공부는 했는데</span>
          <span className="workshop-hero-title-line workshop-hero-title-accent">왜 내 업무에는</span>
          <span className="workshop-hero-title-line workshop-hero-title-accent">바로 안 붙을까요?</span>
        </h1>
        <p className="workshop-hero-sub">
          <span>이론이 아니라 내 업종, 내 업무에 바로 쓰는 AI를 배웁니다.</span>
          <span>AI 영상 수상자 × AI 광고 입상자 2인이 직접 가르치는</span>
          <span>실전 중심 소수정예 클래스</span>
        </p>
        <ApplyButton />
      </div>
      <div className="workshop-hero-art" aria-hidden="true">
        <div className="workshop-orbit">
          <span>AI</span>
          <span>WORK</span>
          <span>LOCAL</span>
        </div>
        <div className="workshop-art-card">
          <Video size={42} />
          <strong>2 COURSES</strong>
          <span>BASIC / ADVANCED</span>
        </div>
      </div>
    </section>
  );
}

function CredentialSection() {
  return (
    <section className="workshop-section workshop-dark">
      <div className="workshop-container">
        <SectionLabel tone="orange">02. WHY US</SectionLabel>
        <div className="workshop-credential-grid">
          <article className="workshop-credential-card">
            <Trophy size={28} />
            <h2>심정보</h2>
            <p className="workshop-role">기술 디렉터</p>
            <div className="workshop-badge">2025 경기도 관광 국제 AI 영상 공모전 수상</div>
            <ul>
              <CheckItem>공공기관 AI 강의 다수</CheckItem>
              <CheckItem>SCA/SCAA 바리스타 자격, 커피 업계 15년</CheckItem>
              <CheckItem>CreatureStudio, HueBrief, MechFlow 개발 운영</CheckItem>
            </ul>
          </article>
          <article className="workshop-credential-card">
            <Briefcase size={28} />
            <h2>AI 프로덕션 코치</h2>
            <p className="workshop-role">광고 기획 및 영상 제작</p>
            <div className="workshop-badge">퓨리얼 AI 광고 공모전 입상</div>
            <ul>
              <CheckItem>AI 콘텐츠 제작 실전 경험</CheckItem>
              <CheckItem>현장 멀티디자이너 15년 경력</CheckItem>
              <CheckItem>브랜드 메시지를 영상으로 전환하는 기획력</CheckItem>
              <CheckItem>광고 목적에 맞춘 제작 코칭</CheckItem>
            </ul>
          </article>
        </div>
        <blockquote className="workshop-quote">
          수상 경험이 있는 두 사람이 같은 공간에서 함께 가르칩니다.
          <span>이런 조합은 쉽게 만나기 어렵습니다.</span>
        </blockquote>
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section className="workshop-section workshop-soft">
      <div className="workshop-container">
        <SectionLabel>03. ROADMAP</SectionLabel>
        <div className="workshop-roadmap">
          {roadmap.map((step, index) => (
            <article key={step.title} className={`workshop-roadmap-card ${step.tone === 'gray' ? 'is-muted' : ''}`}>
              <div className="workshop-roadmap-index">{String(index + 1).padStart(2, '0')}</div>
              <h2>{step.title}</h2>
              <p>{step.period}</p>
              <strong>{step.focus}</strong>
              <span className={`workshop-status workshop-status-${step.tone}`}>{step.status}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  title,
  listPrice,
  earlyPrice,
  accent,
  extra
}: {
  title: string;
  listPrice: string;
  earlyPrice: string;
  accent: 'orange' | 'teal';
  extra?: string;
}) {
  return (
    <aside className={`workshop-price-card workshop-price-${accent}`}>
      <p>{title}</p>
      <div className="workshop-price-row">
        <span>정가</span>
        <del>{listPrice}</del>
      </div>
      <div className="workshop-price-row main">
        <span>1기 얼리버드</span>
        <strong>{earlyPrice}</strong>
      </div>
      {extra && (
        <div className="workshop-price-row">
          <span>초급 수료생 특별가</span>
          <strong>{extra}</strong>
        </div>
      )}
    </aside>
  );
}

function BasicCourseSection() {
  return (
    <section className="workshop-section workshop-white">
      <div className="workshop-container workshop-course-grid">
        <div>
          <SectionLabel tone="orange">04. BASIC COURSE</SectionLabel>
          <h2 className="workshop-section-title">AI 비즈니스 리터러시</h2>
          <p className="workshop-course-lead">AI를 처음 써보는 분도 2주 후엔 내 업무에 바로 씁니다</p>
          <div className="workshop-meta">
            <MetaRow icon={Clock} label="기간" value="2주 | 주 1회 × 3시간" />
            <MetaRow icon={Users} label="정원" value="최대 10명 소수정예" />
            <MetaRow icon={MapPin} label="운영" value="신청 후 개별 안내" />
          </div>
          <h3>이런 분께 맞습니다</h3>
          <ul className="workshop-check-list">
            <CheckItem>AI를 써보고 싶은데 어디서 시작할지 모르는 분</CheckItem>
            <CheckItem>ChatGPT를 써봤는데 원하는 결과가 안 나오는 분</CheckItem>
            <CheckItem>내 업무나 사업에 AI를 연결하고 싶은 소상공인, 직장인</CheckItem>
          </ul>
        </div>
        <div className="workshop-course-side">
          <PriceCard title="초급 과정" listPrice="250,000원" earlyPrice="190,000원" accent="orange" />
          <h3>수강 후 가져가는 것</h3>
          <ul className="workshop-check-list">
            <CheckItem>내 업종 전용 ChatGPT 프롬프트 세트</CheckItem>
            <CheckItem>블로그, 인스타, 문자 홍보 문구 생성 템플릿</CheckItem>
            <CheckItem>사업 아이디어 1페이지 기획서</CheckItem>
            <CheckItem>AI 업무 루틴표</CheckItem>
            <CheckItem>AI 실전 가이드북 영구 소장</CheckItem>
          </ul>
        </div>
      </div>
    </section>
  );
}

function AdvancedCourseSection() {
  return (
    <section className="workshop-section workshop-dark">
      <div className="workshop-container workshop-course-grid workshop-course-reverse">
        <div className="workshop-course-side">
          <PriceCard title="심화 과정" listPrice="650,000원" earlyPrice="490,000원" extra="441,000원" accent="teal" />
          <h3>수강 후 가져가는 것</h3>
          <ul className="workshop-check-list">
            <CheckItem>AI 영상 제작 파이프라인 완성</CheckItem>
            <CheckItem>포트폴리오용 AI 숏폼 1편</CheckItem>
            <CheckItem>Midjourney, Kling, Suno 프롬프트 치트시트</CheckItem>
            <CheckItem>컷 구성 설계 시트</CheckItem>
            <CheckItem>AI 실전 가이드북 영구 소장</CheckItem>
          </ul>
        </div>
        <div>
          <SectionLabel>05. ADVANCED COURSE</SectionLabel>
          <h2 className="workshop-section-title">AI 크리에이티브 디렉터</h2>
          <p className="workshop-course-lead">AI로 영상을 만들고 포트폴리오까지 완성합니다</p>
          <div className="workshop-meta">
            <MetaRow icon={Clock} label="기간" value="4주 | 주 1회 × 3시간" />
            <MetaRow icon={Users} label="정원" value="최대 8명 소수정예" />
            <MetaRow icon={MapPin} label="운영" value="신청 후 개별 안내" />
          </div>
          <h3>이런 분께 맞습니다</h3>
          <ul className="workshop-check-list">
            <CheckItem>AI로 콘텐츠를 만들어보고 싶은 분</CheckItem>
            <CheckItem>Midjourney, Kling을 써봤는데 방향을 못 잡겠는 분</CheckItem>
            <CheckItem>AI 공모전에 도전하고 싶은 분</CheckItem>
          </ul>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    { icon: BookOpen, title: 'AI 실전 가이드북 영구 소장', text: '수업 후에도 혼자 계속 쓸 수 있는 프롬프트 템플릿과 파이프라인 카드' },
    { icon: MessageCircle, title: '수료 후 그룹 피드백 단톡방', text: '1개월 동안 결과물 공유, 질문, 피드백을 함께 합니다' },
    { icon: Phone, title: '개인 문의 상시 오픈', text: '카카오톡으로 언제든 질문하면 디렉터가 직접 답변드립니다' },
    { icon: Trophy, title: 'AI 공모전 정보 우선 안내', text: '관련 공모전 일정을 수강생에게 먼저 공유합니다' },
    { icon: Rocket, title: '공모전 반 우선 참여 자격', text: '추후 개설되는 공모전 준비반에 가장 먼저 초대됩니다' }
  ];

  return (
    <section className="workshop-section workshop-navy">
      <div className="workshop-container">
        <SectionLabel>06. BENEFITS</SectionLabel>
        <h2 className="workshop-section-title">수업이 끝나도 연결은 계속됩니다</h2>
        <p className="workshop-section-sub">모든 기수 공통 제공</p>
        <div className="workshop-benefit-grid">
          {benefits.map((item, index) => (
            <article key={item.title} className={index === benefits.length - 1 ? 'wide' : ''}>
              <item.icon size={26} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              {index === benefits.length - 1 && <span className="workshop-status workshop-status-gray">COMING SOON</span>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneySection() {
  return (
    <section className="workshop-section workshop-soft">
      <div className="workshop-container">
        <SectionLabel>07. YOUR JOURNEY</SectionLabel>
        <div className="workshop-journey">
          <article>
            <span>STEP 01</span>
            <h2>초급 수료</h2>
            <p>내 업무에 AI를 연결했다</p>
            <strong>190,000원 (1기)</strong>
          </article>
          <article>
            <span>STEP 02</span>
            <h2>심화 수료</h2>
            <p>AI로 콘텐츠를 만들 수 있다</p>
            <strong>441,000원 (초급 수료생 특별가)</strong>
          </article>
          <article className="is-muted">
            <span>STEP 03</span>
            <h2>공모전 반</h2>
            <p>AI 영상으로 수상에 도전한다</p>
            <strong>COMING SOON</strong>
          </article>
        </div>
        <blockquote className="workshop-journey-note">
          초급에서 함께한 강사진이 심화까지 그대로 이어집니다.
          <span>처음부터 끝까지 같은 팀과 함께합니다.</span>
        </blockquote>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="workshop-section workshop-white">
      <div className="workshop-container workshop-faq-wrap">
        <SectionLabel tone="orange">08. FAQ</SectionLabel>
        <div className="workshop-faq-list">
          {faqItems.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <article key={item.q} className={`workshop-faq ${isOpen ? 'is-open' : ''}`}>
                <button type="button" onClick={() => setOpenIndex(isOpen ? -1 : index)}>
                  <span>{item.q}</span>
                  <ChevronDown size={20} aria-hidden="true" />
                </button>
                {isOpen && <p>{item.a}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="workshop-final-cta">
      <div>
        <SectionLabel tone="orange">09. APPLY NOW</SectionLabel>
        <h2>지금 시작하세요.</h2>
        <p>1기 얼리버드는 선착순 마감입니다.</p>
        <div className="workshop-capacity">
          <span>초급 · 최대 10명</span>
          <span>심화 · 최대 8명</span>
        </div>
        <ApplyButton wide />
        <small>신청 후 카카오톡으로 개별 안내드립니다</small>
        <footer>문의: 카카오톡 @AI다함스튜디오</footer>
      </div>
    </section>
  );
}

export default function WorkshopPage() {
  useEffect(() => {
    const title = 'AI 다함 스튜디오 | AI 오프라인 클래스';
    const description =
      'AI 영상 수상자 × AI 광고 입상자 2인이 직접 가르치는 소수정예 AI 클래스. 초급 AI 비즈니스 리터러시 / 심화 AI 크리에이티브 디렉터';

    document.title = title;

    const upsertMeta = (selector: string, attrs: Record<string, string>) => {
      let meta = document.head.querySelector<HTMLMetaElement>(selector);
      if (!meta) {
        meta = document.createElement('meta');
        Object.entries(attrs).forEach(([key, value]) => meta?.setAttribute(key, value));
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', attrs.content);
    };

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: 'AI 영상 수상자 × AI 광고 입상자 2인 코칭. 내 업무에 바로 쓰는 AI를 배웁니다.'
    });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: 'https://do-daham.com/workshop' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  }, []);

  return (
    <main className="workshop-page">
      <WorkshopNav />
      <HeroSection />
      <CredentialSection />
      <RoadmapSection />
      <BasicCourseSection />
      <AdvancedCourseSection />
      <BenefitsSection />
      <JourneySection />
      <FAQSection />
      <CTASection />
    </main>
  );
}
