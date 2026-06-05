import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import AdminDashboard from './components/AdminDashboard';
import { Settings } from 'lucide-react';
import mCubeLogo from './assets/m_cube_logo.png';

// ═══ CRYSTAL CUBE SVG GENERATOR COMPONENT ═══
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
    { id: `${pfx}l4`, x1: g(40), y1: g(202), x2: g(40), y2: g(88), c1: '#28A0C8', c2: '#7030D0' },
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
    { pts: p([bl, tl, lfc]), gid: `${pfx}l4` },
  ];

  const sw = sc.toFixed(2);
  const sw2 = (sc * 0.8).toFixed(2);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="crystal-svg">
      <defs>
        {grads.map(g => (
          <linearGradient key={g.id} id={g.id} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            <stop offset="0%" stopColor={g.c1} />
            <stop offset="100%" stopColor={g.c2} />
          </linearGradient>
        ))}
      </defs>
      {tris.map((t, idx) => (
        <polygon key={idx} points={t.pts} fill={`url(#${t.gid})`} />
      ))}
      <polygon points={p([top, tr, br, bot, bl, tl])} fill="none" stroke="rgba(255,255,255,.30)" strokeWidth={sw} />
      <line x1={g(140)} y1={g(30)} x2={g(140)} y2={g(145)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
      <line x1={g(240)} y1={g(88)} x2={g(90)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
      <line x1={g(40)} y1={g(88)} x2={g(190)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
    </svg>
  );
}

// ═══ PUBLIC PORTFOLIO COMPONENT ═══
function PortfolioHome() {
  const [data, setData] = useState({
    userName: "DO-DAHAM",
    userRole: "CREATIVE REBELS",
    manifesto: {
      lines: ["눈치 보지 마.", "허락 구하지 마.", "그냥 해."],
      highlight: "하고싶은거 다해."
    },
    masterpiece: {
      title: "REPRESENTATIVE\nWORK",
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
  });

  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

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
          
          setData({
            userName: parsed.userName || "DO-DAHAM",
            userRole: parsed.userRole || "CREATIVE REBELS",
            manifesto: {
              lines: parsed.manifesto?.lines?.length ? parsed.manifesto.lines : ["눈치 보지 마.", "허락 구하지 마.", "그냥 해."],
              highlight: parsed.manifesto?.highlight || "하고싶은거 다해."
            },
            masterpiece: {
              title: parsed.masterpiece?.title || "REPRESENTATIVE\nWORK",
              descriptionTitle: parsed.masterpiece?.descriptionTitle || "등록된 작품이 없습니다.",
              descriptionSub: parsed.masterpiece?.descriptionSub || "",
              embedSrc: parsed.masterpiece?.embedSrc || ""
            },
            actions: parsed.actions || []
          });
        }
      } catch (err) {
        console.error("Firestore read error, using local defaults:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tickerItems = Array(12).fill(null).map((_, i) => (
    <span key={i}>
      DO WHATEVER YOU WANT <span className="dot">/</span> 하고싶은거 다해 <span className="dot">/</span>{" "}
    </span>
  ));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C6FF00]"></div>
          <span className="font-mono text-xs tracking-widest uppercase opacity-65">Unpacking site...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="selection:bg-[#C6FF00] selection:text-[#0A0A0A]">
      {/* Navigation */}
      <nav className={`bar ${scrolled ? 'scrolled' : ''}`} id="main-nav">
        <a href="#" className="nav-logo">
          <CrystalCube size={26} pfx="nav" />
          <span className="nav-logo-text uppercase tracking-wider">{data.userName}</span>
        </a>
        <div className="nav-links">
          <a href="#manifesto">MANIFESTO</a>
          <a href="#masterpiece">MASTERPIECE</a>
          <a href="#actions">ACTIONS</a>
          <Link to="/admin" className="flex items-center gap-1 hover:text-[#C6FF00] transition-colors text-[11px] font-bold tracking-[0.14em]">
            <Settings size={12} /> CMS
          </Link>
        </div>
        <a href="https://www.youtube.com/@do-daham" target="_blank" rel="noopener noreferrer" className="nav-watch">WATCH →</a>
      </nav>

      {/* Hero Section */}
      <section className="hero" data-screen-label="Hero">
        <div className="hero-ghost">다함</div>

        <div className="hero-text">
          <span className="hero-kicker uppercase tracking-widest">{data.userRole}</span>
          <div className="hero-h1">하고싶은거</div>
          <div className="hero-h1-accent">다함.</div>
          <p className="hero-tagline">
            <strong>WE DON'T FOLLOW RULES. WE BREAK THEM.</strong>
            우리는 규칙을 따르지 않는다. 부술 뿐.
          </p>
          <a href="#actions" className="hero-cta">JOIN THE REBELLION →</a>
        </div>

        <div className="hero-crystal-col">
          <div className="crystal-col-glow"></div>
          <div className="crystal-float" id="crystal-hero">
            <CrystalCube size={310} pfx="hero" />
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {tickerItems}
        </div>
      </div>

      {/* Manifesto */}
      <section className="section" id="manifesto" data-screen-label="Manifesto">
        <div className="sec-head">
          <span className="sec-num">01</span>
          <span className="sec-title">MANIFESTO</span>
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
          <span className="sec-num">02</span>
          <span className="sec-title">MASTERPIECE</span>
        </div>
        <div className="masterpiece-inner">
          <div className="video-block">
            {data.masterpiece.embedSrc ? (
              data.masterpiece.embedSrc.includes('youtube') ? (
                <iframe
                  className="absolute top-0 left-0 w-full h-full border-0"
                  src={data.masterpiece.embedSrc}
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
            <span className="video-caption">MEDIA · {data.masterpiece.descriptionTitle}</span>
          </div>
          <div className="ms-desc">
            <span className="ms-badge">SELECTED WORK · {data.masterpiece.descriptionTitle}</span>
            <div className="ms-title whitespace-pre-line">{data.masterpiece.descriptionSub}</div>
            {data.masterpiece.embedSrc && (
              <a href={data.masterpiece.embedSrc} target="_blank" rel="noopener noreferrer" className="link-btn">
                자세히 보기 →
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="section" id="actions" data-screen-label="Actions">
        <div className="sec-head">
          <span className="sec-num">03</span>
          <span className="sec-title">ACTIONS</span>
        </div>
        <div className="actions-grid">
          {data.actions.map((item: any, idx: number) => {
            const isYoutubeCard = item.mediaType === 'youtube' && item.videoSrc;
            const isComingSoon = !isYoutubeCard && (!item.href || item.title.toLowerCase().includes('soon'));
            const cardClass = `card-${(idx % 3) + 1}`;

            const cardInner = (
              <>
                {isYoutubeCard ? (
                  <>
                    <iframe
                      className="absolute inset-0 w-full h-full border-0 opacity-35 group-hover:opacity-70 transition-opacity duration-700 pointer-events-auto"
                      src={item.videoSrc}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none z-0" />
                  </>
                ) : item.img ? (
                  <>
                    <img
                      src={item.img}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:scale-105 group-hover:opacity-40 transition-all duration-700 mix-blend-luminosity pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none z-0" />
                  </>
                ) : null}
                <div className={`relative z-10 flex flex-col justify-end w-full h-full ${isYoutubeCard ? 'pointer-events-none' : ''}`}>
                  <div className="card-tag">
                    {isYoutubeCard ? 'PROJECT · WATCH VIDEO' : 'PROJECT · CLICK TO VISIT'}
                  </div>
                  <div className="card-name">{item.title}</div>
                </div>
              </>
            );

            if (isComingSoon) {
              return (
                <div key={item.id} className="action-card card-4 dim group relative">
                  {item.img && (
                    <>
                      <img
                        src={item.img}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent pointer-events-none z-0" />
                    </>
                  )}
                  <div className="relative z-10 flex flex-col justify-end w-full h-full">
                    <div className="card-tag">PROJECT · COMING SOON</div>
                    <div className="card-name">{item.title}</div>
                  </div>
                </div>
              );
            }

            if (isYoutubeCard) {
              return (
                <div
                  key={item.id}
                  className={`action-card ${cardClass} youtube-card group relative`}
                >
                  {cardInner}
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : "_self"}
                rel={item.external ? "noopener noreferrer" : ""}
                className={`action-card ${cardClass} group relative`}
              >
                {cardInner}
              </a>
            );
          })}
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
          <div className="acid flex justify-end gap-3 items-center">
            <span>OR NOT. WE DON'T CARE.</span>
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
      <Routes>
        <Route path="/" element={<PortfolioHome />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
