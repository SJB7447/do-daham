import React, { useEffect, useId, useRef } from 'react';

interface JellySliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  ariaLabel?: string;
}

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

const R = 12;
const TR = 14;
const D = 18;
const OX = 40;
const OY = 80;
const CY = 16;
const RISE = -38;
const REST_DROP = 0.5;

export function JellySlider({
  min,
  max,
  value,
  onChange,
  ariaLabel = '인원 조절 슬라이더'
}: JellySliderProps) {
  const filterId = useId().replace(/:/g, '');
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropLabelRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stateRef = useRef({
    width: 300,
    ratio: (value - min) / Math.max(1, max - min),
    dragging: false,
    hover: false,
    lifted: false,
    lastEmitted: value,
    X: { x: 100, v: 0, t: 100, k: 900, c: 50 } as SpringState,
    DX: { x: 100, v: 0, t: 100, k: 260, c: 18 } as SpringState,
    DY: { x: CY, v: 0, t: CY, k: 420, c: 22 } as SpringState,
    DS: { x: REST_DROP, v: 0, t: REST_DROP, k: 420, c: 22 } as SpringState,
    PS: { x: 1, v: 0, t: 1, k: 520, c: 16 } as SpringState
  });

  const toX = (val: number, w: number) => {
    const span = Math.max(w - 2 * R, 1);
    return R + ((val - min) / Math.max(1, max - min)) * span;
  };

  const toVal = (x: number, w: number) => {
    const span = Math.max(w - 2 * R, 1);
    return min + clamp((x - R) / span, 0, 1) * (max - min);
  };

  // Sync external value changes (e.g. clicking Tier preset buttons)
  useEffect(() => {
    const st = stateRef.current;
    if (st.dragging) return;
    if (value !== st.lastEmitted) {
      st.lastEmitted = value;
      st.ratio = (value - min) / Math.max(1, max - min);
      st.X.k = 420;
      st.X.c = 34;
      st.X.t = toX(value, st.width);
    }
  }, [value, min, max]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const ro = new ResizeObserver(() => {
      const w = rail.clientWidth;
      if (!w) return;
      const st = stateRef.current;
      st.width = w;
      const targetX = toX(st.lastEmitted, w);
      st.X.x = targetX;
      st.X.t = targetX;
      st.X.v = 0;
      st.DX.x = targetX;
      st.DX.t = targetX;
      st.DX.v = 0;
    });
    ro.observe(rail);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const st = stateRef.current;
      const w = st.width;

      const sub = 4;
      const subDt = dt / sub;
      for (let k = 0; k < sub; k += 1) {
        st.DX.t = st.X.x;
        stepSpring(st.X, subDt);
        stepSpring(st.DX, subDt);
        stepSpring(st.DY, subDt);
        stepSpring(st.DS, subDt);
        stepSpring(st.PS, subDt);
      }

      const x = st.X.x;
      const currentRounded = Math.round(toVal(clamp(x, R, w - R), w));
      if (currentRounded !== st.lastEmitted) {
        st.lastEmitted = currentRounded;
        onChangeRef.current(currentRounded);
      }

      if (thumbRef.current) {
        const stretch = reduceMotion ? 1 : 1 + Math.min(Math.abs(st.X.v) / 2400, 0.4);
        thumbRef.current.style.transform = `translate(${x - TR + OX}px,${CY - TR + OY}px) scale(${stretch * st.PS.x},${st.PS.x / stretch})`;
      }

      const tilt = reduceMotion ? 0 : clamp((st.DX.x - st.X.x) * 0.9, -28, 28);
      const dropTransform = `translate(${st.DX.x - D}px,${st.DY.x - D}px) rotate(${tilt}deg) scale(${st.DS.x})`;

      if (dropRef.current) {
        dropRef.current.style.transform = `translate(${OX}px,${OY}px) ${dropTransform}`;
      }
      if (dropLabelRef.current) {
        dropLabelRef.current.style.transform = dropTransform;
        dropLabelRef.current.style.opacity = String(clamp((st.DS.x - 0.7) / 0.25, 0, 1));
        dropLabelRef.current.textContent = String(currentRounded);
      }
      if (fillRef.current) {
        fillRef.current.style.width = `${clamp(x, 0, Math.max(w, 0))}px`;
      }
      if (hitRef.current) {
        hitRef.current.style.left = `${x - R}px`;
        hitRef.current.setAttribute('aria-valuenow', String(currentRounded));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [min, max]);

  const syncTargets = () => {
    const st = stateRef.current;
    const up = st.dragging || st.lifted;
    st.DY.t = up ? CY + RISE : CY;
    st.DS.t = up ? 1 : REST_DROP;
    st.PS.t = st.dragging ? 1.16 : st.hover ? 1.08 : 1;
  };

  const rubber = (x: number, minX: number, maxX: number, d = 16) => {
    if (x < minX) return minX - (1 - 1 / (((minX - x) * 0.55) / d + 1)) * d;
    if (x > maxX) return maxX + (1 - 1 / (((x - maxX) * 0.55) / d + 1)) * d;
    return x;
  };

  const localX = (e: React.PointerEvent) => {
    const rect = railRef.current?.getBoundingClientRect();
    return rect ? e.clientX - rect.left : 0;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const st = stateRef.current;
    st.dragging = true;
    try {
      railRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    st.X.k = 900;
    st.X.c = 50;
    st.X.t = rubber(localX(e), R, st.width - R);
    syncTargets();
    hitRef.current?.focus({ preventScroll: true });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const st = stateRef.current;
    if (!st.dragging) return;
    st.X.t = rubber(localX(e), R, st.width - R);
  };

  const handlePointerEnd = () => {
    const st = stateRef.current;
    if (!st.dragging) return;
    st.dragging = false;
    st.X.k = 300;
    st.X.c = 14;
    st.X.t = clamp(st.X.t, R, st.width - R);
    syncTargets();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 5,
      PageDown: -5
    };
    const abs: Record<string, number> = { Home: min, End: max };
    const d = deltas[e.key];
    const absVal = abs[e.key];
    if (d === undefined && absVal === undefined) return;
    e.preventDefault();

    const st = stateRef.current;
    const next = absVal !== undefined ? absVal : clamp(st.lastEmitted + d, min, max);
    st.X.k = 420;
    st.X.c = 34;
    st.X.t = toX(next, st.width);
    st.lifted = true;
    syncTargets();
  };

  // Build scale ticks (every 1 or 5)
  const ticks = [1, 5, 10, 15, 20, 25, 30];

  return (
    <div className="pt-4 pb-1 select-none">
      {/* SVG Gooey Filter */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id={`goo-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            result="g"
          />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </svg>

      {/* Interactive Rail */}
      <div
        ref={railRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') {
            stateRef.current.hover = true;
            syncTargets();
          }
        }}
        onPointerLeave={() => {
          stateRef.current.hover = false;
          syncTargets();
        }}
        className="relative h-8 cursor-pointer touch-none"
      >
        <div className="absolute left-0 right-0 top-[13px] h-1.5 rounded-full bg-white/[0.14] overflow-hidden">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 bottom-0 bg-[#C6FF00] rounded-full"
            style={{ width: '0px' }}
          />
        </div>

        {/* Goo Layer */}
        <div
          className="absolute -left-[40px] -right-[40px] -top-[80px] h-[140px] pointer-events-none"
          style={{ filter: `url(#goo-${filterId})` }}
        >
          <div
            ref={dropRef}
            className="absolute left-0 top-0 w-[36px] h-[36px] bg-[#C6FF00] rounded-full will-change-transform"
          />
          <div
            ref={thumbRef}
            className="absolute left-0 top-0 w-[28px] h-[28px] bg-[#C6FF00] rounded-full will-change-transform"
          />
        </div>

        {/* Value Drop Label */}
        <div
          ref={dropLabelRef}
          className="absolute left-0 top-0 w-[36px] h-[36px] grid place-items-center text-xs font-black tabular-nums text-[#0A0A0A] pointer-events-none will-change-transform"
        >
          {value}
        </div>

        {/* Keyboard Focus Target */}
        <div
          ref={hitRef}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hitRef.current?.matches(':focus-visible')) {
              stateRef.current.lifted = true;
              syncTargets();
            }
          }}
          onBlur={() => {
            stateRef.current.lifted = false;
            syncTargets();
          }}
          className="absolute top-1 w-6 h-6 rounded-full outline-none"
        />
      </div>

      {/* Scale Ticks */}
      <div className="mt-2 relative h-6" aria-hidden="true">
        {ticks.map((t) => {
          const pct = ((t - min) / (max - min)) * 100;
          const active = value >= t;
          return (
            <div
              key={t}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `calc(12px + (100% - 24px) * ${pct / 100})` }}
            >
              <span
                className={`w-[1.5px] rounded-sm transition-all duration-200 ${
                  t === 1 || t === 10 || t === 16 || t === 30 ? 'h-2' : 'h-1'
                } ${active ? 'bg-[#C6FF00]' : 'bg-white/25'}`}
              />
              <span
                className={`text-[10px] font-bold mt-1 tabular-nums transition-colors ${
                  active ? 'text-[#F2F2F2]' : 'text-[#8C8C8C]'
                }`}
              >
                {t}명
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
