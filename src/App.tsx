import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import AdminDashboard from './components/AdminDashboard';
import { motion } from 'motion/react';
import { ArrowRight, Zap, Skull, Youtube, Coffee, Cpu, Settings, ExternalLink, Link as LinkIcon } from 'lucide-react';
import mCubeLogo from './assets/m_cube_logo.png';

// Icon mapper for dynamic project cards
const getProjectIcon = (title: string) => {
  const name = title.toLowerCase();
  if (name.includes('youtube') || name.includes('studio') || name.includes('codem')) return Youtube;
  if (name.includes('coffee') || name.includes('brew') || name.includes('mood')) return Coffee;
  if (name.includes('cpu') || name.includes('mech') || name.includes('flow')) return Cpu;
  if (name.includes('soon') || name.includes('zap')) return Zap;
  return LinkIcon;
};

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

  const isYoutube = data.masterpiece.embedSrc?.includes('youtube');

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f0] font-sans selection:bg-[#ccff00] selection:text-black overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-[#f4f4f0]/20 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex justify-between items-center p-4 md:p-6 max-w-7xl mx-auto">
          <div className="font-display text-2xl tracking-wider uppercase text-[#ccff00]">
            {data.userName}
          </div>
          <div className="flex gap-6 text-sm font-bold tracking-widest uppercase items-center">
            <a href="#manifesto" className="hover:text-[#ccff00] transition-colors hidden sm:block">Manifesto</a>
            <a href="#masterpiece" className="hover:text-[#ccff00] transition-colors hidden sm:block">Masterpiece</a>
            <a href="#actions" className="hover:text-[#ccff00] transition-colors hidden sm:block">Actions</a>
            <Link 
              to="/admin" 
              className="bg-[#ccff00] text-black px-4 py-2 hover:bg-white transition-colors font-bold text-xs tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0_#fff]"
            >
              <Settings size={12} />
              CMS
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-6 min-h-screen flex flex-col justify-center relative">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto w-full"
        >
          <div className="font-sans font-black leading-[1.1] tracking-tight uppercase mb-6 text-[#ccff00] flex flex-col whitespace-nowrap">
            {/* Mobile (3 lines) */}
            <div className="block md:hidden text-[20vw] break-all">{data.userName.slice(0, 5)}</div>
            <div className="block md:hidden text-[20vw] break-all">{data.userName.slice(5)}</div>

            {/* Desktop (2 lines, 1st line) */}
            <div className="hidden md:block md:text-[19.5vw] lg:text-[min(19.5vw,225px)] xl:text-[230px]">
              {data.userName}
            </div>

            {/* Shared last line */}
            <div className="text-[35vw] md:text-[28vw] lg:text-[min(28vw,320px)] xl:text-[330px]">다함.</div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mt-12">
            <p className="text-xl md:text-3xl font-bold max-w-2xl leading-tight">
              WE DON'T FOLLOW RULES. WE BREAK THEM.<br />
              우리는 규칙을 따르지 않는다. 부술 뿐.
            </p>
            <a 
              href="#manifesto"
              className="bg-[#ccff00] text-black font-display text-2xl px-8 py-4 uppercase hover:bg-white transition-colors flex items-center gap-2 group font-bold shadow-[4px_4px_0_#fff]"
            >
              Explore Manifesto
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </a>
          </div>
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="border-y border-[#f4f4f0]/20 bg-[#ccff00] text-black py-4 overflow-hidden flex whitespace-nowrap">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 12 }}
          className="font-display text-4xl tracking-widest uppercase flex gap-8 font-black"
        >
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
          <span>{data.userRole}</span>
          <span>•</span>
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
          <span>{data.userRole}</span>
          <span>•</span>
        </motion.div>
      </div>

      {/* Manifesto */}
      <section id="manifesto" className="py-32 px-4 md:px-6 border-b border-[#f4f4f0]/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 font-display text-8xl text-[#f4f4f0]/20 font-black">
            01
          </div>
          <div className="md:col-span-8">
            <h2 className="font-display text-6xl md:text-8xl mb-12 text-[#ccff00] font-black">IDENTITY</h2>
            <div className="space-y-8 text-3xl md:text-5xl font-bold leading-snug break-keep">
              {data.manifesto.lines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
              <p className="text-[#ccff00] font-sans font-black tracking-tight text-5xl md:text-7xl mt-12">
                {data.manifesto.highlight}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Masterpiece / Video */}
      <section id="masterpiece" className="py-32 px-4 md:px-6 border-b border-[#f4f4f0]/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-4 flex flex-col justify-center h-full">
            <div className="font-display text-8xl text-[#f4f4f0]/20 mb-8 font-black">
              02
            </div>
            <h2 className="font-display text-5xl md:text-7xl mb-6 text-[#ccff00] uppercase break-keep font-black whitespace-pre-line">
              {data.masterpiece.title}
            </h2>
            <div className="space-y-4 text-xl md:text-2xl font-bold leading-snug break-keep opacity-90">
              <p>{data.masterpiece.descriptionTitle}</p>
              {data.masterpiece.descriptionSub && (
                <p className="text-sm md:text-base text-[#f4f4f0]/60 font-sans font-normal mt-2">
                  {data.masterpiece.descriptionSub}
                </p>
              )}
            </div>
          </div>
          <div className="md:col-span-8">
            {data.masterpiece.embedSrc ? (
              <div className="aspect-video w-full bg-[#1a1a1a] border border-[#f4f4f0]/20 relative group overflow-hidden shadow-[0_0_30px_rgba(204,255,0,0.05)]">
                {isYoutube ? (
                  <iframe
                    className="absolute top-0 left-0 w-full h-full grayscale-[50%] group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all duration-700"
                    src={data.masterpiece.embedSrc}
                    title={data.masterpiece.descriptionTitle}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img
                    src={data.masterpiece.embedSrc}
                    alt={data.masterpiece.descriptionTitle}
                    className="absolute top-0 left-0 w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all duration-700"
                  />
                )}
              </div>
            ) : (
              <div className="aspect-video w-full bg-[#0d0d0d] border border-dashed border-[#f4f4f0]/15 flex items-center justify-center">
                <span className="font-display text-2xl uppercase opacity-20">No Media uploaded</span>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* Actions / Grid */}
      <section id="actions" className="py-32 px-4 md:px-6 border-b border-[#f4f4f0]/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <h2 className="font-display text-6xl md:text-8xl font-black">ACTIONS</h2>
            <div className="font-display text-8xl text-[#f4f4f0]/20 hidden md:block font-black">03</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.actions.map((item: any) => {
              const IconComponent = getProjectIcon(item.title);
              const isYoutubeCard = item.mediaType === 'youtube' && item.videoSrc;

              const CardContent = (
                <>
                  <div className="aspect-[4/3] bg-black border border-[#f4f4f0]/20 overflow-hidden relative mb-6 shadow-[0_0_20px_rgba(204,255,0,0.02)]">
                    {isYoutubeCard ? (
                      <iframe
                        className="absolute top-0 left-0 w-full h-full grayscale-[30%] hover:grayscale-0 opacity-90 hover:opacity-100 transition-all duration-500"
                        src={item.videoSrc}
                        title={item.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <img
                          src={item.img}
                          alt={item.title}
                          className="w-full h-full object-cover mix-blend-luminosity group-hover:scale-105 group-hover:mix-blend-normal transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-[#ccff00]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center border-b border-[#f4f4f0]/20 pb-4">
                    <h3 className="font-display text-3xl uppercase font-bold">{item.title}</h3>
                    <IconComponent className="text-[#ccff00] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              );

              return !isYoutubeCard && item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : "_self"}
                  rel={item.external ? "noopener noreferrer" : ""}
                  className="group cursor-pointer block"
                >
                  {CardContent}
                </a>
              ) : (
                <div key={item.id} className="group block">
                  {CardContent}
                </div>
              );
            })}
          </div>

          {data.actions.length === 0 && (
            <div className="text-center py-20 border border-dashed border-[#f4f4f0]/15 opacity-25 uppercase tracking-widest font-bold">
              No actions/projects uploaded.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 md:px-6 bg-[#ccff00] text-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-display text-6xl md:text-9xl uppercase tracking-tighter flex items-center gap-4 font-black">
            DO-DAHAM
            <Skull className="w-12 h-12 md:w-20 md:h-20" />
          </div>
          <div className="text-center md:text-right font-bold uppercase tracking-widest flex flex-col gap-2">
            <a href="https://do-daham.com" className="hover:underline text-xl md:text-2xl">{data.userName.toLowerCase()}.com</a>
            <span className="text-sm md:text-base">© {new Date().getFullYear()} ALL RIGHTS RESERVED.</span>
            <span className="text-sm md:text-base">OR NOT. WE DON'T CARE.</span>
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
