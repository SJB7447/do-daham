import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, Youtube, Github, Zap, Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function App() {
  const [theme, setTheme] = useState<Theme>('system');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');

    let effectiveTheme = theme;
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    }

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const renderThemeIcon = () => {
    if (theme === 'light') return <Sun size={20} />;
    if (theme === 'dark') return <Moon size={20} />;
    return <Monitor size={20} />;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans overflow-x-hidden selection:bg-[var(--color-neon-pink)] selection:text-white transition-colors duration-300">

      {/* (1) Hero Section - Cinematic & Kinetic Intro */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-black">

        {/* Full-screen Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-black/90 z-10"></div>
          {/* subtle noise overlay for cinematic feel */}
          <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay z-10 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%221%22/%3E%3C/svg%3E')]"></div>

          {/* 테스트용 더미 영상. 나중에 실제 교체 */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-80 scale-105"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-5119-large.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="relative z-20 w-full max-w-7xl flex flex-col items-start justify-center h-full pt-20">

          <div className="flex flex-col">
            {/* 키네틱 타이포그래피 스타일 */}
            <h1 className="font-['Black_Han_Sans'] text-7xl md:text-[9rem] lg:text-[11rem] text-white leading-[0.8] tracking-tighter uppercase mb-6 drop-shadow-2xl">
              <motion.span
                initial={{ y: 80, opacity: 0, rotate: 5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="block origin-bottom-left"
              >
                DO
              </motion.span>
              <motion.span
                initial={{ y: 80, opacity: 0, rotate: 5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="block origin-bottom-left"
              >
                WHAT
              </motion.span>
              <motion.span
                initial={{ y: 80, opacity: 0, rotate: 5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="block origin-bottom-left"
              >
                YOU
              </motion.span>
              <motion.span
                initial={{ y: 80, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                className="text-[var(--color-neon-green)] inline-block mt-4 md:mt-6 bg-clip-text drop-shadow-[0_0_20px_rgba(0,255,102,0.4)] mix-blend-lighten"
              >
                WANT.
              </motion.span>
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
            className="mt-6 md:mt-10 flex flex-col items-start backdrop-blur-sm bg-black/20 p-5 border-l-4 border-[var(--color-neon-pink)] shadow-[10px_10px_0px_rgba(0,0,0,0.5)]"
          >
            <p className="font-['Noto_Sans_KR'] text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
              하고 싶은 거, <span className="text-[var(--color-neon-pink)]">다 해!</span>
            </p>
            <p className="font-['Nanum_Pen_Script'] text-3xl md:text-5xl text-white/90 mt-4 tracking-wider rotate-[-2deg]">
              머뭇거릴 시간 없어.<br className="md:hidden" /> <span className="text-[var(--color-vivid-yellow)] border-b-2 border-dashed border-[var(--color-vivid-yellow)] inline-block mt-2 md:mt-0">지금 바로 뛰어들어.</span>
            </p>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="mt-12 bg-[var(--color-neon-pink)] text-white font-['Black_Han_Sans'] text-2xl md:text-3xl px-10 py-5 shadow-[8px_8px_0px_var(--color-vivid-yellow)] hover:shadow-[12px_12px_0px_var(--color-vivid-yellow)] transition-all uppercase tracking-wider relative overflow-hidden group torn-paper"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></div>
            뛰어들기 💥
          </motion.button>

          {/* 스크롤 유도 화살표 애니메이션 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/60"
          >
            <span className="font-['Noto_Sans_KR'] text-[10px] uppercase tracking-[0.4em] font-bold">Scroll</span>
            <div className="w-[30px] h-[46px] border-2 border-white/40 rounded-full flex justify-center p-1.5 shadow-[0_0_10px_rgba(255,255,255,0.1)] relative">
              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-2.5 bg-white/80 rounded-full drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* (2) My Universe - Scrapbook Style (서비스 포털 버전) */}
      <section className="py-32 px-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.h2
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="font-['Black_Han_Sans'] text-6xl md:text-7xl text-[var(--color-vivid-yellow)] mb-20 -rotate-3 inline-block"
          >
            MY UNIVERSE 🚀
          </motion.h2>

          <div className="flex flex-wrap justify-center gap-10 md:gap-16">
            {/* Scrapbook Item 1 : Mood Brew */}
            <motion.a
              href="/mood"
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl rotate-3 block cursor-pointer"
              whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <div className="masking-tape"></div>
              {/* 커피나 감성적인 카페 이미지로 교체하면 좋습니다 */}
              <img src="https://picsum.photos/seed/coffee/400/400" alt="Mood Brew" className="w-full h-64 object-cover filter contrast-125 saturate-150" referrerPolicy="no-referrer" />
              <p className="absolute bottom-4 left-0 w-full text-center font-['Nanum_Pen_Script'] text-4xl text-black font-bold">
                #Mood_Brew ☕️
              </p>
            </motion.a>

            {/* Scrapbook Item 2 : MechFlow */}
            <motion.a
              href="/cafe"
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl -rotate-6 mt-10 md:mt-20 block cursor-pointer"
              whileHover={{ rotate: [0, 5, -5, 5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <div className="masking-tape" style={{ transform: 'translateX(-50%) rotate(5deg)' }}></div>
              {/* 커피 머신이나 테크놀로지 느낌의 이미지로 교체하면 좋습니다 */}
              <img src="https://picsum.photos/seed/machine/400/400" alt="MechFlow" className="w-full h-64 object-cover filter contrast-125 saturate-150" referrerPolicy="no-referrer" />
              <p className="absolute bottom-4 left-0 w-full text-center font-['Nanum_Pen_Script'] text-4xl text-black font-bold">
                #MechFlow ⚙️
              </p>
            </motion.a>

            {/* Scrapbook Item 3 : YouTube Channels */}
            <motion.a
              href="https://www.youtube.com/@CodeM_Studio_AI11"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl rotate-6 mt-5 md:mt-10 block cursor-pointer"
              whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <div className="masking-tape" style={{ transform: 'translateX(-50%) rotate(-2deg)' }}></div>
              {/* Code_M Studio나 SimSimHey 채널의 대표 썸네일로 교체하면 좋습니다 */}
              <img src="https://picsum.photos/seed/youtube/400/400" alt="YouTube Creators" className="w-full h-64 object-cover filter contrast-125 saturate-150" referrerPolicy="no-referrer" />
              <p className="absolute bottom-4 left-0 w-full text-center font-['Nanum_Pen_Script'] text-4xl text-black font-bold">
                #크리에이터_ON 🎬
              </p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* (3) Challenge Section - Post-it Graffiti Board */}
      <section className="py-32 px-6 bg-[var(--color-bg-secondary)] border-y-8 border-[var(--color-neon-green)] border-dashed transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <motion.h2
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="font-['Black_Han_Sans'] text-6xl md:text-7xl text-[var(--color-text-primary)] transition-colors duration-300"
            >
              CHALLENGE 🎯
            </motion.h2>
            <p className="font-['Nanum_Pen_Script'] text-4xl text-[var(--color-neon-pink)] mt-4 md:mt-0 rotate-[-5deg] flex flex-col items-end">
              <span>다음 타겟은 뭐야? 망설이지 말고 질러!</span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/notion/test');
                    const text = await res.text();
                    try {
                      const data = JSON.parse(text);
                      if (data.success) {
                        alert(`노션 연결 성공! 총 ${data.data.results?.length}개의 데이터를 불러왔습니다.`);
                      } else {
                        alert(`노션 연결 에러: ${data.error}\n(노션 페이지 우측 상단 '...' 메뉴에서 권한(연결)에 해당 통합(Integration)을 추가했는지 확인해주세요.)`);
                      }
                    } catch (e) {
                      alert(`파싱 에러: ${text}`);
                    }
                  } catch (error: any) {
                    alert('네트워크 또는 서버 에러가 발생했습니다.');
                  }
                }}
                className="mt-4 text-sm font-sans bg-black/50 text-white px-4 py-2 hover:bg-[var(--color-neon-pink)] transition-colors border-2 border-[var(--color-neon-pink)] rounded shadow-[4px_4px_0px_var(--color-neon-pink)] rotate-2"
              >
                Notion DB 연동 테스트 🔌
              </button>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {/* Challenge 1 (Done) */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative bg-[var(--color-vivid-yellow)] p-6 aspect-square flex items-center justify-center shadow-lg rotate-2"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-black text-center line-through decoration-4 decoration-black">
                유튜브 채널<br />개설하기
              </p>
              <div className="stamp-done">찢었다!</div>
            </motion.div>

            {/* Challenge 2 (Done) */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#FF00FF] p-6 aspect-square flex items-center justify-center shadow-lg -rotate-3"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-white text-center line-through decoration-4 decoration-black">
                나만의 웹서비스<br />런칭하기
              </p>
              <div className="stamp-done" style={{ borderColor: '#39FF14', color: '#39FF14', transform: 'translate(-50%, -50%) rotate(15deg)' }}>DONE!</div>
            </motion.div>

            {/* Challenge 3 (Pending) */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#00FFFF] p-6 aspect-square flex items-center justify-center shadow-lg rotate-1"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-black text-center">
                한 달 동안<br />매일 코딩하기
              </p>
            </motion.div>

            {/* Challenge 4 (Pending) */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#FF5500] p-6 aspect-square flex items-center justify-center shadow-lg -rotate-2"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-white text-center">
                해외에서<br />한 달 살기
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* (4) Gallery Section - Dynamic Collage */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-['Black_Han_Sans'] text-6xl md:text-7xl text-center mb-20 text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-electric-blue)]"
          >
            GALLERY 📸
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 auto-rows-[200px] md:auto-rows-[300px]">
            <div className="relative col-span-2 row-span-2 group overflow-hidden border-4 border-white">
              <img src="https://picsum.photos/seed/party/800/800" alt="Party" className="w-full h-full object-cover filter contrast-125 saturate-150 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 font-['Nanum_Pen_Script'] text-3xl text-[var(--color-vivid-yellow)] -rotate-6">
                이때 진짜 미쳤었지 ㅋㅋ
              </div>
            </div>

            <div className="relative group overflow-hidden border-4 border-[var(--color-neon-green)]">
              <img src="https://picsum.photos/seed/concert/400/400" alt="Concert" className="w-full h-full object-cover filter contrast-125 saturate-150 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute bottom-4 right-4 bg-[var(--color-neon-pink)] px-3 py-1 font-['Black_Han_Sans'] text-xl text-white rotate-3">
                레전드 갱신 🎸
              </div>
            </div>

            <div className="relative group overflow-hidden border-4 border-[var(--color-vivid-yellow)]">
              <img src="https://picsum.photos/seed/travel/400/400" alt="Travel" className="w-full h-full object-cover filter contrast-125 saturate-150 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-4 py-2 font-['Black_Han_Sans'] text-2xl -rotate-12 shadow-xl">
                YOLO! ✈️
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (5) Footer Section - Electric Blue */}
      <footer className="bg-[var(--color-electric-blue)] py-24 px-6 text-center relative overflow-hidden">
        {/* Background noise/pattern */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%221%22/%3E%3C/svg%3E')] mix-blend-overlay"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <Zap size={64} strokeWidth={2.5} className="text-[var(--color-vivid-yellow)] mb-8 animate-bounce" />

          <h2 className="font-['Black_Han_Sans'] text-5xl md:text-6xl lg:text-7xl mb-12 text-white drop-shadow-[4px_4px_0px_#000]">
            인생은 짧아.<br />내일도 하고 싶은 거 다 하면서 놀자!
          </h2>

          <div className="flex gap-8 mb-12">
            <a href="#" className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-[var(--color-neon-pink)] hover:text-white transition-colors border-4 border-black shadow-[4px_4px_0px_#000] -rotate-6">
              <Instagram size={32} strokeWidth={2.5} />
            </a>
            <a href="#" className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-[var(--color-neon-pink)] hover:text-white transition-colors border-4 border-black shadow-[4px_4px_0px_#000] rotate-6">
              <Youtube size={32} strokeWidth={2.5} />
            </a>
            <a href="#" className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-[var(--color-neon-pink)] hover:text-white transition-colors border-4 border-black shadow-[4px_4px_0px_#000] -rotate-3">
              <Github size={32} strokeWidth={2.5} />
            </a>
          </div>

          <p className="font-['Noto_Sans_KR'] font-bold text-xl text-white/80 tracking-widest uppercase">
            © {new Date().getFullYear()} DO-DAHAM. NO LIMITS.
          </p>
        </div>
      </footer>
      {/* (6) Floating Theme Toggle */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isThemeMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="mb-3 bg-white dark:bg-[#111] border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff] flex flex-col overflow-hidden"
            >
              <button
                onClick={() => { setTheme('light'); setIsThemeMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-vivid-yellow)] hover:text-black transition-colors font-bold ${theme === 'light' ? 'bg-[var(--color-vivid-yellow)] text-black' : 'text-black dark:text-white'}`}
              >
                <Sun size={18} /> Light
              </button>
              <button
                onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-vivid-yellow)] hover:text-black transition-colors font-bold border-y-2 border-black dark:border-white ${theme === 'dark' ? 'bg-[var(--color-vivid-yellow)] text-black' : 'text-black dark:text-white'}`}
              >
                <Moon size={18} /> Dark
              </button>
              <button
                onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-vivid-yellow)] hover:text-black transition-colors font-bold ${theme === 'system' ? 'bg-[var(--color-vivid-yellow)] text-black' : 'text-black dark:text-white'}`}
              >
                <Monitor size={18} /> System
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
          className="w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_var(--color-neon-pink)] hover:shadow-[6px_6px_0px_var(--color-neon-pink)] transition-all border-2 border-[var(--color-neon-pink)]"
          aria-label="Toggle theme"
        >
          {renderThemeIcon()}
        </motion.button>
      </div>
    </div>
  );
}

