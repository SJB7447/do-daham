import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type SiteTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'dodaham-theme';
const REST_Y = 34;
const ARM_DELTA = 24;
const MAX_PULL = 74;

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

export function ThemePullCord() {
  const [theme, setTheme] = useState<SiteTheme>(() => {
    try {
      return sessionStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [armed, setArmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const cordPathRef = useRef<SVGPathElement>(null);
  const knobGroupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    movedDist: 0,
    armed: false
  });

  const springsRef = useRef<{ Y: SpringState; X: SpringState }>({
    Y: { x: REST_Y, v: 0, t: REST_Y, k: 420, c: 22 },
    X: { x: 0, v: 0, t: 0, k: 320, c: 18 }
  });

  const applyTheme = useCallback((next: SiteTheme) => {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      sessionStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  // Ensure document attribute stays synced on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: SiteTheme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        sessionStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  }, []);

  const renderCord = useCallback(() => {
    const { Y, X } = springsRef.current;
    const x = X.x;
    const y = Math.max(18, Y.x);
    const ctrlX = x * 0.45;
    const ctrlY = y * 0.55;

    if (cordPathRef.current) {
      cordPathRef.current.setAttribute('d', `M 28 0 Q ${(28 + ctrlX).toFixed(1)} ${ctrlY.toFixed(1)} ${(28 + x).toFixed(1)} ${y.toFixed(1)}`);
    }
    if (knobGroupRef.current) {
      const tilt = clamp(-x * 0.6, -18, 18);
      knobGroupRef.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg)`;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      const { Y, X } = springsRef.current;
      const sub = 3;
      const subDt = dt / sub;
      for (let i = 0; i < sub; i += 1) {
        stepSpring(Y, subDt);
        stepSpring(X, subDt);
      }

      renderCord();

      const settled =
        !dragRef.current.active &&
        Math.abs(Y.v) < 0.35 &&
        Math.abs(Y.x - Y.t) < 0.15 &&
        Math.abs(X.v) < 0.35 &&
        Math.abs(X.x - X.t) < 0.15;

      if (settled) {
        Y.x = Y.t;
        Y.v = 0;
        X.x = X.t;
        X.v = 0;
        renderCord();
        isAnimatingRef.current = false;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [renderCord]);

  useEffect(() => {
    renderCord();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      isAnimatingRef.current = false;
    };
  }, [renderCord]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      movedDist: 0,
      armed: false
    };
    setIsDragging(true);
    setArmed(false);
    startLoop();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    drag.movedDist = Math.max(drag.movedDist, Math.hypot(dx, dy));

    const pullY = clamp(dy, -8, MAX_PULL);
    const swayX = clamp(dx * 0.48, -22, 22);

    springsRef.current.Y.t = REST_Y + pullY;
    springsRef.current.X.t = swayX;

    const nowArmed = pullY >= ARM_DELTA;
    if (nowArmed !== drag.armed) {
      drag.armed = nowArmed;
      setArmed(nowArmed);
    }
    startLoop();
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const wasArmed = drag.armed;
    const wasClick = drag.movedDist < 6;

    drag.active = false;
    drag.armed = false;
    setIsDragging(false);
    setArmed(false);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    springsRef.current.Y.t = REST_Y;
    springsRef.current.X.t = 0;

    if (wasArmed) {
      if (!reduceMotion) {
        springsRef.current.Y.v = -220;
      }
      toggleTheme();
    } else if (wasClick) {
      if (!reduceMotion) {
        springsRef.current.Y.v = 560;
        springsRef.current.X.v = (Math.random() - 0.5) * 140;
      }
      toggleTheme();
    }

    startLoop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        springsRef.current.Y.v = 520;
        startLoop();
      }
      toggleTheme();
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className="theme-pull-cord fixed top-[64px] sm:top-[70px] right-[12px] sm:right-[24px] z-[95] w-[56px] h-[145px] pointer-events-none select-none"
      aria-label="화면 테마 전환 당김줄"
    >
      {/* Top Ceiling Socket */}
      <div
        className={`mx-auto w-[14px] h-[5px] rounded-b-[2px] border-x border-b transition-colors ${
          isLight
            ? 'bg-[#1D6F2C] border-[#1D6F2C]'
            : 'bg-[#181B10] border-[#C6FF00]/65'
        }`}
      />

      {/* Elastic SVG Cord */}
      <svg
        width="56"
        height="130"
        viewBox="0 0 56 130"
        className="absolute top-[4px] left-0 overflow-visible pointer-events-none"
        aria-hidden="true"
      >
        <path
          ref={cordPathRef}
          d={`M 28 0 Q 28 ${(REST_Y * 0.55).toFixed(1)} 28 ${REST_Y}`}
          fill="none"
          stroke={
            armed
              ? isLight
                ? '#B01B6E'
                : '#C6FF00'
              : isLight
                ? '#1D6F2C'
                : 'rgba(198, 255, 0, 0.72)'
          }
          strokeWidth={armed ? '2.2' : '1.7'}
          strokeLinecap="round"
        />
      </svg>

      {/* Draggable Prism Handle */}
      <div
        ref={knobGroupRef}
        className="absolute top-[4px] left-0 w-[56px] flex justify-center origin-top will-change-transform"
        style={{ transform: `translate3d(0px, ${REST_Y}px, 0px)` }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={isLight}
          aria-label={
            isLight
              ? '다크 네온 테마로 전환 (당기거나 클릭하세요)'
              : '눈이 편안한 라이트 테마로 전환 (당기거나 클릭하세요)'
          }
          title={
            isLight
              ? '줄을 당기거나 클릭하면 기본 다크 테마로 전환됩니다'
              : '눈이 편한 밝은 테마가 필요하면 줄을 아래로 당기거나 클릭하세요'
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onKeyDown={handleKeyDown}
          className={`group pointer-events-auto touch-none cursor-grab active:cursor-grabbing flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-[2px] border transition-colors shadow-lg ${
            armed
              ? 'bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] scale-105'
              : isLight
                ? 'bg-[#FFFFFF] text-[#141612] border-[#1D6F2C]/65 hover:border-[#1D6F2C]'
                : 'bg-[#11130C] text-[#F2F2F2] border-[#C6FF00]/55 hover:border-[#C6FF00]'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-[2px] flex items-center justify-center transition-colors ${
              armed
                ? 'bg-[#0A0A0A] text-[#C6FF00]'
                : isLight
                  ? 'bg-[#1D6F2C] text-white'
                  : 'bg-[#C6FF00] text-[#0A0A0A]'
            }`}
          >
            {isLight ? <Moon size={11} strokeWidth={2.5} /> : <Sun size={11} strokeWidth={2.5} />}
          </span>
          <span
            className={`text-[8px] font-black tracking-[0.08em] leading-none uppercase mt-0.5 ${
              armed
                ? 'text-[#0A0A0A]'
                : isLight
                  ? 'text-[#1D6F2C]'
                  : 'text-[#C6FF00]'
            }`}
          >
            {armed ? 'PULL!' : isDragging ? 'HOLD' : isLight ? 'DARK' : 'LIGHT'}
          </span>
        </button>
      </div>
    </div>
  );
}
