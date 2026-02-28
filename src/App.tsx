import { motion } from 'motion/react';
import { ArrowRight, Zap, Skull, Youtube, Coffee, Cpu } from 'lucide-react';
import mCubeLogo from './assets/m_cube_logo.png';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f0] font-sans selection:bg-[#ccff00] selection:text-black overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-[#f4f4f0]/20 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex justify-between items-center p-4 md:p-6 max-w-7xl mx-auto">
          <div className="font-display text-2xl tracking-wider uppercase text-[#ccff00]">Do Daham</div>
          <div className="flex gap-6 text-sm font-bold tracking-widest uppercase">
            <a href="#manifesto" className="hover:text-[#ccff00] transition-colors">Manifesto</a>
            <a href="#actions" className="hover:text-[#ccff00] transition-colors">Actions</a>
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
          <div className="font-display text-[15vw] leading-[0.85] tracking-tight uppercase mb-6 text-[#ccff00] break-keep">
            하고싶은거<br />다함.
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mt-12">
            <p className="text-xl md:text-3xl font-bold max-w-2xl leading-tight">
              WE DON'T FOLLOW RULES. WE BREAK THEM.<br />
              우리는 규칙을 따르지 않는다. 부술 뿐.
            </p>
            <button className="bg-[#ccff00] text-black font-display text-2xl px-8 py-4 uppercase hover:bg-white transition-colors flex items-center gap-2 group">
              Join the rebellion
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="border-y border-[#f4f4f0]/20 bg-[#ccff00] text-black py-4 overflow-hidden flex whitespace-nowrap">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 10 }}
          className="font-display text-4xl tracking-widest uppercase flex gap-8"
        >
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
          <span>DO WHATEVER YOU WANT</span>
          <span>•</span>
          <span>하고싶은거 다해</span>
          <span>•</span>
        </motion.div>
      </div>

      {/* Manifesto */}
      <section id="manifesto" className="py-32 px-4 md:px-6 border-b border-[#f4f4f0]/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 font-display text-8xl text-[#f4f4f0]/20">
            01
          </div>
          <div className="md:col-span-8">
            <h2 className="font-display text-6xl md:text-8xl mb-12 text-[#ccff00]">IDENTITY</h2>
            <div className="space-y-8 text-3xl md:text-5xl font-bold leading-snug break-keep">
              <p>눈치 보지 마.</p>
              <p>허락 구하지 마.</p>
              <p>그냥 해.</p>
              <p className="text-[#ccff00] font-display text-5xl md:text-7xl mt-12">하고싶은거 다해.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Actions / Grid */}
      <section id="actions" className="py-32 px-4 md:px-6 border-b border-[#f4f4f0]/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <h2 className="font-display text-6xl md:text-8xl">ACTIONS</h2>
            <div className="font-display text-8xl text-[#f4f4f0]/20 hidden md:block">02</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { id: 1, title: "CodeM Studio", href: "https://www.youtube.com/@CodeM_Studio_AI11", img: mCubeLogo, external: true, icon: Youtube },
              { id: 2, title: "Mood Brew", href: "https://cafe.do-daham.com", img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: true, icon: Coffee },
              { id: 3, title: "MechFlow", href: "https://machine.do-daham.com", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", external: true, icon: Cpu },
              { id: 4, title: "Coming Soon...", href: "", img: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", icon: Zap }
            ].map((item) => {
              const CardContent = (
                <>
                  <div className="aspect-[4/3] bg-[#1a1a1a] border border-[#f4f4f0]/20 overflow-hidden relative mb-6">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover mix-blend-luminosity group-hover:scale-105 group-hover:mix-blend-normal transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-[#ccff00]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                  <div className="flex justify-between items-center border-b border-[#f4f4f0]/20 pb-4">
                    <h3 className="font-display text-3xl uppercase">{item.title}</h3>
                    <item.icon className="text-[#ccff00] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              );

              return item.href ? (
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
                <div key={item.id} className="group cursor-pointer">
                  {CardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 md:px-6 bg-[#ccff00] text-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-display text-6xl md:text-9xl uppercase tracking-tighter flex items-center gap-4">
            DO-DAHAM
            <Skull className="w-12 h-12 md:w-20 md:h-20" />
          </div>
          <div className="text-center md:text-right font-bold uppercase tracking-widest flex flex-col gap-2">
            <a href="https://do-daham.com" className="hover:underline text-xl md:text-2xl">do-daham.com</a>
            <span className="text-sm md:text-base">© {new Date().getFullYear()} ALL RIGHTS RESERVED.</span>
            <span className="text-sm md:text-base">OR NOT. WE DON'T CARE.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
