import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { CrystalCube } from './CrystalCube';
import { SiteHeader } from './SiteHeader';

const APPLY_FORM_URL = import.meta.env.VITE_APPLY_FORM_URL || 'https://forms.gle/w1cTzZYUCGkqdDTT6';

const SERVICES = [
  {
    code: 'SERVICE 01',
    title: 'AI 영상 제작',
    desc: '광고 · 숏폼 · 브랜드 필름 · 공모전/홍보 영상까지. 기획, 스토리보드, AI 생성 및 후반 편집을 원스톱으로 제작합니다.',
    tags: ['브랜드 숏폼', 'AI 광고 영상', '단편 · 홍보 필름'],
    featured: true
  },
  {
    code: 'SERVICE 02',
    title: '홈페이지 · 웹서비스',
    desc: '전환율이 나오는 랜딩페이지, 브랜드 홈페이지, 상세페이지, 실제 동작하는 소규모 웹서비스까지 직접 설계·개발합니다.',
    tags: ['브랜드 홈페이지', '상세페이지', '맞춤 웹서비스'],
    featured: false
  }
];

const PROCESS_STEPS = [
  { step: '01', title: '범위 · 목적 상담', desc: '원하시는 결과물, 참고 레퍼런스, 희망 납기와 예산 범위를 가볍게 공유해 주세요.' },
  { step: '02', title: '기획 · 시안 제안', desc: '영상은 콘티·무드보드, 웹은 구조·디자인 시안을 먼저 확인한 뒤 본 제작에 들어갑니다.' },
  { step: '03', title: '제작 · 피드백 반영', desc: '중간 결과물을 공유하며 디테일과 톤을 맞춰 완성도를 끌어올립니다.' },
  { step: '04', title: '최종 납품 · 활용 안내', desc: '채널별 규격 파일 또는 실제 배포된 웹사이트로 전달하며 운영 가이드를 함께 드립니다.' }
];

export default function ProjectPage() {
  const [kakaoCopied, setKakaoCopied] = useState(false);

  const handleCopyKakao = async () => {
    try {
      await navigator.clipboard.writeText('@AI다함스튜디오');
    } finally {
      setKakaoCopied(true);
      window.setTimeout(() => setKakaoCopied(false), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Top Navigation */}
      <SiteHeader badge="PROJECT" ctaLabel="의뢰 문의 →" ctaTo="/project#inquiry" />

      {/* Hero */}
      <section className="section pt-32 pb-20">
        <div className="max-w-4xl">
          <span className="hero-kicker uppercase tracking-widest">
            CREATIVE REBELS · AI STUDIO PRODUCTION
          </span>
          <h1 className="m-0 mb-5 break-keep">
            <span className="hero-h1 block !text-[clamp(44px,5.4vw,88px)]">아이디어를</span>
            <span className="hero-h1-accent block mb-0 !text-[clamp(44px,5.8vw,92px)] whitespace-nowrap">
              결과물로 다함.
            </span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[#8C8C8C] max-w-2xl mb-8 break-keep">
            광고·숏폼·단편 영상부터 사업용 홈페이지와 웹서비스까지.
            <br className="hidden sm:inline" />{' '}
            불필요한 대행사 중간 과정 없이, 직접 만들고 직접 가르치는 디렉터가 책임지고 제작합니다.
          </p>

          <div className="hero-cta-row">
            <a href="#inquiry" className="hero-cta">제작 의뢰 문의하기 →</a>
            <Link to="/#actions" className="hero-cta-secondary">
              포트폴리오 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 01 Services */}
      <section className="section" id="services">
        <div className="sec-head">
          <span className="sec-num">01</span>
          <h2 className="sec-title">제작 분야</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SERVICES.map((svc) => (
            <div
              key={svc.code}
              className={`what-card ${svc.featured ? 'featured' : ''}`}
            >
              <div>
                <div className="what-card-top">
                  <span>{svc.code}</span>
                </div>
                <h3>{svc.title}</h3>
                <p>{svc.desc}</p>
              </div>
              <div className="what-tags">
                {svc.tags.map((tag) => (
                  <span key={tag} className="what-tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 02 Process */}
      <section className="section" id="process">
        <div className="sec-head">
          <span className="sec-num">02</span>
          <h2 className="sec-title">진행 방식</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROCESS_STEPS.map((p) => (
            <div
              key={p.step}
              className="p-6 bg-[#0E0E0E] border border-white/[0.08] rounded-[2px]"
            >
              <div className="text-xs font-extrabold tracking-[0.14em] text-[#C6FF00] mb-3">
                STEP {p.step}
              </div>
              <h3 className="ff-disp text-xl mb-2.5">{p.title}</h3>
              <p className="text-sm text-[#8C8C8C] leading-relaxed break-keep">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 03 Director */}
      <section className="section" id="director">
        <div className="instructor-grid">
          <div className="instructor-photo-box">
            <CrystalCube size={88} pfx="prjdir" />
            <span className="text-xs text-[#8C8C8C]">[디렉터 실사 사진으로 교체]</span>
          </div>
          <div>
            <div className="sec-head mb-5">
              <span className="sec-num">03</span>
              <h2 className="sec-title leading-tight">
                디렉터가 직접<br />기획하고 만듭니다
              </h2>
            </div>
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <span className="ff-disp text-2xl">심정보</span>
              <span className="text-sm text-[#8C8C8C]">대표 · AI 크리에이터 · 웹 빌더</span>
            </div>
            <div className="instructor-cred-list">
              <div className="instructor-cred-row">
                <span className="instructor-cred-label">AWARD</span>
                <span>경기관광공사 영상 공모전 입상</span>
              </div>
              <div className="instructor-cred-row">
                <span className="instructor-cred-label">MAIN</span>
                <span>AI 디지털 튜터 양성 과정 메인 강사</span>
              </div>
              <div className="instructor-cred-row">
                <span className="instructor-cred-label">TEACHING</span>
                <span>AI 디지털 배움터 · 에이블런 출강</span>
              </div>
            </div>
            <Link to="/activity" className="hero-cta-secondary">
              현장 · 보도 기록 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 04 Inquiry */}
      <section className="section" id="inquiry">
        <div className="contact-grid">
          <div>
            <div className="sec-head mb-6">
              <span className="sec-num">04</span>
              <h2 className="sec-title">제작 의뢰하기</h2>
            </div>
            <div className="ff-disp text-4xl md:text-5xl leading-[1.12] mb-6">
              <div>눈치 보지 마.</div>
              <div>일단 말 걸어.</div>
              <div className="acid">같이 다함.</div>
            </div>
            <p className="text-sm leading-relaxed text-[#8C8C8C] max-w-md break-keep">
              아직 기획이 구체적이지 않아도 괜찮습니다. 만들고 싶은 방향과 일정만 알려주시면 현실적인 제작 범위와 견적을 바로 안내드립니다.
            </p>
          </div>

          <div className="contact-cards">
            <div className="contact-card primary">
              <div className="contact-card-kicker">FAST CONSULTATION</div>
              <h3>카카오톡으로 바로 상담</h3>
              <p>채널 ID를 복사해 카카오톡에서 검색하시면 디렉터와 1:1로 빠르게 상담하실 수 있습니다.</p>
              <button
                type="button"
                onClick={handleCopyKakao}
                className="hero-cta cursor-pointer border-0"
              >
                {kakaoCopied ? <Check size={15} /> : <Copy size={15} />}
                <span>
                  {kakaoCopied ? '카카오톡 ID 복사됨 (@AI다함스튜디오)' : '카카오톡 @AI다함스튜디오 복사 →'}
                </span>
              </button>
            </div>

            <div className="contact-card">
              <div className="contact-card-kicker">BRIEF FORM</div>
              <h3>의뢰 내용 남기기</h3>
              <p>제작 분야, 희망 납기, 참고 링크를 폼으로 남겨주시면 확인 후 연락드립니다.</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={APPLY_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta-secondary"
                >
                  문의 폼 작성 →
                </a>
                <Link to="/" className="hero-cta-text">
                  <ArrowLeft size={14} />
                  <span>홈으로 돌아가기</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-logo">
          <CrystalCube size={38} pfx="prjftr" />
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
