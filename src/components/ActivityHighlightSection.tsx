import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Newspaper, ArrowRight, Calendar, Building2 } from 'lucide-react';
import { ActivityItem } from '../types/activity';
import { getStoredActivities } from '../data/defaultActivities';

export default function ActivityHighlightSection() {
  const [highlights, setHighlights] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Get top 3 latest items from storage/defaults
    const all = getStoredActivities();
    setHighlights(all.slice(0, 3));
  }, []);

  return (
    <section className="section" id="activity" data-screen-label="Activity">
      <div className="sec-head">
        <span className="sec-num">04</span>
        <span className="sec-title">ACTIVITY & MEDIA</span>
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[#C6FF00] text-xs font-mono tracking-widest uppercase">
              CREDIBILITY & SOCIAL PROOF
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-[#F2F2F2] mt-1 ff-disp uppercase break-keep">
              현장에서 증명하는 커리어 & 언론 보도
            </h3>
            <p className="text-xs md:text-sm text-[#8E8E8E] mt-2 max-w-xl leading-relaxed break-keep">
              책상 위 이론을 넘어 실제 교육 현장의 생생한 열기와
              <br className="hidden md:inline" /> 공신력 있는 언론 보도로 검증된 강사 DO-DAHAM의 발자취입니다.
            </p>
          </div>

          <Link
            to="/activity"
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#0A0A0A] bg-[#C6FF00] hover:bg-white px-5 py-3 rounded-sm transition-all shadow-[0_0_15px_rgba(198,255,0,0.25)] hover:scale-105 self-start md:self-auto"
          >
            <span>전체 활동 & 보도 보기</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {highlights.map((item) => {
          const isPhoto = item.category === 'photo';

          return (
            <Link
              key={item.id}
              to="/activity"
              className="group relative bg-[#121215]/90 backdrop-blur-md border border-white/[0.08] hover:border-[#C6FF00]/50 rounded-lg overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-black/20" />

                {/* Badge */}
                <div className="absolute top-3.5 left-3.5">
                  {isPhoto ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-black/75 backdrop-blur-md border border-[#C6FF00]/40 text-[#C6FF00] rounded-full flex items-center gap-1.5 shadow-md">
                      <ImageIcon size={10} /> FIELD PHOTO
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-black/75 backdrop-blur-md border border-[#28C8F0]/40 text-[#28C8F0] rounded-full flex items-center gap-1.5 shadow-md">
                      <Newspaper size={10} /> PRESS & MEDIA
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-neutral-200 font-semibold text-[11px] truncate max-w-[65%]">
                      {item.organization}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono tracking-wider">
                      {item.date}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-[#C6FF00] transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>

                  <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white transition-colors">
                  <span className="font-mono text-[10px] text-neutral-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                    {item.tags?.[0] ? `#${item.tags[0]}` : '#강사커리어'}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-[#C6FF00] group-hover:translate-x-1 transition-transform">
                    자세히 보기 <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
