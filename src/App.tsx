import { motion } from 'motion/react';
import { Instagram, Youtube, Github, Zap } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-white font-sans overflow-x-hidden selection:bg-[var(--color-neon-pink)] selection:text-white">
      
      {/* (1) Hero Section - Energy Explosion */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[var(--color-bg-dark)]/60 z-10 mix-blend-multiply"></div>
          {/* Collage of active photos */}
          <img src="https://picsum.photos/seed/jump/1920/1080" alt="Jumping" className="absolute top-0 left-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" referrerPolicy="no-referrer" />
          <img src="https://picsum.photos/seed/laugh/800/800" alt="Laughing" className="absolute -top-20 -right-20 w-1/2 h-1/2 object-cover opacity-50 rotate-12 mix-blend-screen" referrerPolicy="no-referrer" />
          <img src="https://picsum.photos/seed/skate/800/800" alt="Skating" className="absolute -bottom-20 -left-20 w-1/2 h-1/2 object-cover opacity-50 -rotate-12 mix-blend-screen" referrerPolicy="no-referrer" />
          
          {/* Neon spray blobs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 spray-bg rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-neon-pink)] opacity-20 filter blur-[60px] rounded-full"></div>
        </div>
        
        <div className="relative z-20 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="relative"
          >
            {/* Comic explosion effect behind text */}
            <div className="absolute -inset-10 bg-[var(--color-vivid-yellow)] opacity-20 blur-2xl rounded-full -z-10 animate-pulse"></div>
            
            <h1 className="font-['Black_Han_Sans'] text-7xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-300 uppercase tracking-tighter leading-none mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              하고 싶은 거?<br/>
              <span className="text-[var(--color-neon-green)] drop-shadow-[0_0_20px_rgba(0,255,102,0.8)]">다 해!</span>
            </h1>
          </motion.div>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl md:text-3xl font-bold mt-6 mb-12 bg-black/50 px-6 py-2 inline-block -rotate-2 border-2 border-[var(--color-neon-pink)]"
          >
            머뭇거릴 시간 없어. 지금 이 순간을 즐겨! 🔥
          </motion.p>
          
          <motion.button 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.1, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[var(--color-neon-pink)] text-white font-['Black_Han_Sans'] text-3xl px-10 py-5 torn-paper shadow-[10px_10px_0px_var(--color-vivid-yellow)] hover:shadow-[15px_15px_0px_var(--color-vivid-yellow)] transition-all uppercase tracking-wider"
          >
            뛰어들기 💥
          </motion.button>
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
              href="https://mood-brew-link.com" /* 실제 무드 브루 링크로 변경하세요 */
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl rotate-3 block cursor-pointer"
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
              href="https://mechflow-link.com" /* 실제 멕플로우 링크로 변경하세요 */
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ rotate: [0, 5, -5, 5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl -rotate-6 mt-10 md:mt-20 block cursor-pointer"
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
              href="https://youtube.com/@Code_M_Studio" /* 실제 유튜브 링크로 변경하세요 */
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="relative w-72 md:w-80 bg-white p-4 pb-16 shadow-2xl rotate-6 mt-5 md:mt-10 block cursor-pointer"
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
      <section className="py-32 px-6 bg-[#222] border-y-8 border-[var(--color-neon-green)] border-dashed">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="font-['Black_Han_Sans'] text-6xl md:text-7xl text-white"
            >
              CHALLENGE 🎯
            </motion.h2>
            <p className="font-['Nanum_Pen_Script'] text-4xl text-[var(--color-neon-pink)] mt-4 md:mt-0 rotate-[-5deg]">
              다음 타겟은 뭐야? 망설이지 말고 질러!
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {/* Challenge 1 (Done) */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative bg-[var(--color-vivid-yellow)] p-6 aspect-square flex items-center justify-center shadow-lg rotate-2"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-black text-center line-through decoration-4 decoration-black">
                유튜브 채널<br/>개설하기
              </p>
              <div className="stamp-done">찢었다!</div>
            </motion.div>

            {/* Challenge 2 (Done) */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#FF00FF] p-6 aspect-square flex items-center justify-center shadow-lg -rotate-3"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-white text-center line-through decoration-4 decoration-black">
                나만의 웹서비스<br/>런칭하기
              </p>
              <div className="stamp-done" style={{ borderColor: '#39FF14', color: '#39FF14', transform: 'translate(-50%, -50%) rotate(15deg)' }}>DONE!</div>
            </motion.div>

            {/* Challenge 3 (Pending) */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#00FFFF] p-6 aspect-square flex items-center justify-center shadow-lg rotate-1"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-black text-center">
                한 달 동안<br/>매일 코딩하기
              </p>
            </motion.div>

            {/* Challenge 4 (Pending) */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative bg-[#FF5500] p-6 aspect-square flex items-center justify-center shadow-lg -rotate-2"
            >
              <p className="font-['Nanum_Pen_Script'] text-4xl text-white text-center">
                해외에서<br/>한 달 살기
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
            인생은 짧아.<br/>내일도 하고 싶은 거 다 하면서 놀자!
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
    </div>
  );
}

