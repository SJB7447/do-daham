import React, { useEffect, useRef, useState } from 'react';

interface LetterLimitTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  limit?: number;
  nearThreshold?: number;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export interface LetterLimitInputProps {
  id?: string;
  type?: 'text' | 'tel' | 'email' | 'url';
  value: string;
  onChange: (value: string) => void;
  limit?: number;
  nearThreshold?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

interface FallingLetter {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  rest: boolean;
  out: number;
  s: number;
  bin: number | null;
  hits: number;
}

const BIN_WIDTH = 10;
const MAX_PILE = 40;

function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

function useLetterLimitPhysics(value: string, limit: number, nearThreshold: number, singleLine = false) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGCircleElement>(null);
  const meterRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const prevLenRef = useRef(value.length);
  const lettersRef = useRef<FallingLetter[]>([]);
  const binsRef = useRef<Record<number, number>>({});

  // Springs: ring fill, counter pop, head-shake
  const springsRef = useRef<{ F: SpringState; CP: SpringState; SH: SpringState }>({
    F: { x: value.length / limit, v: 0, t: value.length / limit, k: 280, c: 22 },
    CP: { x: 1, v: 0, t: 1, k: 520, c: 16 },
    SH: { x: 0, v: 0, t: 0, k: 700, c: 12 }
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChangeMq = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChangeMq);
    return () => mq.removeEventListener('change', onChangeMq);
  }, []);

  // Update spring target and clear length state when value changes externally
  useEffect(() => {
    springsRef.current.F.t = Math.min(1, value.length / limit);
    prevLenRef.current = value.length;
  }, [value, limit]);

  // Physics rAF loop
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      const wrap = wrapRef.current;
      const boxRect = wrap?.getBoundingClientRect();
      const width = boxRect ? boxRect.width : 320;
      const floorY = boxRect ? boxRect.height + (singleLine ? 8 : 14) : singleLine ? 56 : 110;

      const { F, CP, SH } = springsRef.current;
      const sub = 4;
      const subDt = dt / sub;

      for (let k = 0; k < sub; k += 1) {
        stepSpring(F, subDt);
        stepSpring(CP, subDt);
        stepSpring(SH, subDt);

        lettersRef.current.forEach((l) => {
          if (l.out > 0) {
            l.out += subDt;
            l.vy += 900 * subDt;
            l.y += l.vy * subDt;
            l.s = Math.max(0, 1 - l.out / 0.32);
            return;
          }
          if (l.rest) return;

          l.vy += 1900 * subDt;
          l.x += l.vx * subDt;
          l.y += l.vy * subDt;
          l.r += l.vr * subDt;

          if (l.x < 10) {
            l.x = 10;
            l.vx = Math.abs(l.vx) * 0.5;
          } else if (l.x > width - 10) {
            l.x = width - 10;
            l.vx = -Math.abs(l.vx) * 0.5;
          }

          const b = Math.round(l.x / BIN_WIDTH);
          const ground = floorY - (binsRef.current[b] || 0) * 7;
          if (l.y >= ground && l.vy > 0) {
            l.y = ground;
            if (l.hits < 1 && l.vy > 240) {
              l.hits += 1;
              l.vy *= -0.3;
              l.vx *= 0.6;
              l.vr *= 0.5;
            } else {
              l.hits += 1;
              l.rest = true;
              l.bin = b;
              binsRef.current[b] = Math.min(3, (binsRef.current[b] || 0) + 1);
              l.r = Math.round(l.r / 90) * 90 + (Math.random() - 0.5) * 32;
              l.el.style.color = 'var(--dim-aa, #8C8C8C)';
            }
          }
        });
      }

      lettersRef.current = lettersRef.current.filter((l) => {
        if (l.out > 0.34) {
          l.el.remove();
          return false;
        }
        return true;
      });

      if (fillRef.current) {
        const clamped = Math.max(0, Math.min(1, F.x));
        fillRef.current.style.strokeDashoffset = (1 - clamped).toFixed(4);
      }

      const sh = prefersReducedMotion ? 0 : SH.x * 0.5;
      if (countRef.current) {
        countRef.current.style.transform = `translateX(${sh.toFixed(2)}px) scale(${CP.x.toFixed(4)})`;
      }
      if (meterRef.current) {
        meterRef.current.style.transform = `translateX(${sh.toFixed(2)}px) rotate(-90deg)`;
      }

      lettersRef.current.forEach((l) => {
        l.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) rotate(${l.r.toFixed(1)}deg) scale(${l.s.toFixed(3)})`;
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReducedMotion, singleLine]);

  // Cleanup DOM spans on unmount
  useEffect(() => {
    return () => {
      lettersRef.current.forEach((l) => l.el.remove());
      lettersRef.current = [];
    };
  }, []);

  const leaveLetter = (l: FallingLetter) => {
    if (l.out > 0) return;
    l.out = 0.001;
    l.vy = -210;
    l.rest = false;
    if (l.bin !== null) {
      binsRef.current[l.bin] = Math.max(0, (binsRef.current[l.bin] || 0) - 1);
    }
  };

  const getEndOfTextCoords = (currentText: string): [number, number] => {
    const mirror = mirrorRef.current;
    const wrap = wrapRef.current;
    if (!mirror || !wrap) return [180, singleLine ? 24 : 36];

    mirror.textContent = currentText;
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);

    const wrapRect = wrap.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const rawX = markerRect.left - wrapRect.left;
    const clampedX = singleLine ? Math.min(rawX, Math.max(40, wrapRect.width - 96)) : rawX;
    const yCoord = singleLine ? wrapRect.height * 0.5 : markerRect.top - wrapRect.top + 12;
    return [clampedX, yCoord];
  };

  const dropExtraChars = (kept: string, extra: string) => {
    const { SH, CP } = springsRef.current;
    if (!prefersReducedMotion) {
      SH.v += 34;
      CP.x = 1.24;
    }

    if (prefersReducedMotion || !pileRef.current) return;

    const [x, y] = getEndOfTextCoords(kept);
    Array.from(extra).forEach((ch, idx) => {
      if (!ch.trim() || !pileRef.current) return;
      const el = document.createElement('span');
      el.textContent = ch;
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = '20px';
      el.style.height = '24px';
      el.style.margin = '-12px 0 0 -10px';
      el.style.textAlign = 'center';
      el.style.fontSize = '15px';
      el.style.fontWeight = '700';
      el.style.lineHeight = '24px';
      el.style.color = 'var(--magenta, #E02898)';
      el.style.pointerEvents = 'none';
      el.style.willChange = 'transform, opacity';
      el.style.transition = 'color 0.45s';
      pileRef.current.appendChild(el);

      lettersRef.current.push({
        el,
        x: x + 4 + idx * 9,
        y,
        vx: -40 + Math.random() * 140,
        vy: -150 - Math.random() * 100,
        r: 0,
        vr: (Math.random() - 0.5) * 680,
        rest: false,
        out: 0,
        s: 1,
        bin: null,
        hits: 0
      });
    });

    while (lettersRef.current.filter((l) => l.out === 0).length > MAX_PILE) {
      const oldest = lettersRef.current.find((l) => l.out === 0);
      if (!oldest) break;
      leaveLetter(oldest);
    }
  };

  const syncTransition = (next: string, extra: string) => {
    if (extra) {
      dropExtraChars(next, extra);
    }

    const was = prevLenRef.current;
    prevLenRef.current = next.length;

    if (next.length < was) {
      const live = lettersRef.current.filter((l) => l.out === 0);
      const toClear = Math.min(was - next.length, live.length);
      for (let i = 0; i < toClear; i += 1) {
        leaveLetter(live[live.length - 1 - i]);
      }
    }

    if (next.length !== was && !prefersReducedMotion) {
      springsRef.current.CP.x = Math.max(springsRef.current.CP.x, 1.12);
    }

    springsRef.current.F.t = next.length / limit;
  };

  const remaining = limit - value.length;
  const isNear = remaining <= nearThreshold && remaining > 0;
  const isFull = remaining <= 0;

  const strokeColor = isFull ? 'var(--magenta)' : isNear ? 'var(--amber)' : 'var(--acid)';
  const countColor = isFull ? 'var(--magenta)' : isNear ? 'var(--amber)' : 'var(--dim-aa)';

  return {
    wrapRef,
    mirrorRef,
    fillRef,
    meterRef,
    countRef,
    pileRef,
    isNear,
    isFull,
    strokeColor,
    countColor,
    syncTransition
  };
}

export function LetterLimitTextarea({
  id,
  value,
  onChange,
  limit = 100,
  nearThreshold = 15,
  rows = 3,
  placeholder,
  required = false,
  className = ''
}: LetterLimitTextareaProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const {
    wrapRef,
    mirrorRef,
    fillRef,
    meterRef,
    countRef,
    pileRef,
    isNear,
    isFull,
    strokeColor,
    countColor,
    syncTransition
  } = useLetterLimitPhysics(value, limit, nearThreshold, false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    let next = raw;
    let extra = '';

    if (raw.length > limit) {
      const caret = e.target.selectionStart ?? limit;
      next = raw.slice(0, limit);
      extra = raw.slice(limit);

      if (taRef.current) {
        taRef.current.value = next;
        const pos = Math.min(caret, limit);
        taRef.current.setSelectionRange(pos, pos);
      }
    }

    syncTransition(next, extra);
    onChange(next);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <textarea
          ref={taRef}
          id={id}
          rows={rows}
          required={required}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full p-3.5 bg-black border rounded-[2px] text-[15px] leading-6 text-[#F2F2F2] outline-none resize-none transition-colors ${
            isFull
              ? 'border-[#E02898]'
              : isNear
                ? 'border-[#F5C400]'
                : 'border-white/[0.18] focus:border-[#C6FF00]'
          } ${className}`}
        />

        {/* Hidden mirror for exact end-of-text coordinate */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="absolute inset-0 p-3.5 text-[15px] leading-6 whitespace-pre-wrap break-words invisible pointer-events-none overflow-hidden"
        />
      </div>

      {/* Ring Meter + Remaining Counter */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <svg
          ref={meterRef}
          viewBox="0 0 24 24"
          className="w-5 h-5 will-change-transform"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="var(--div)"
            strokeWidth="2.6"
          />
          <circle
            ref={fillRef}
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="1 1"
            pathLength={1}
            style={{ transition: 'stroke 0.2s' }}
          />
        </svg>
        <span
          ref={countRef}
          aria-live="polite"
          className="text-xs font-bold tabular-nums will-change-transform"
          style={{ color: countColor, transition: 'color 0.2s' }}
        >
          {value.length} / {limit}자
        </span>
      </div>

      {/* Falling overflow letters layer */}
      <div
        ref={pileRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-visible z-30"
      />
    </div>
  );
}

export function LetterLimitInput({
  id,
  type = 'text',
  value,
  onChange,
  limit = 80,
  nearThreshold = 15,
  placeholder,
  required = false,
  className = ''
}: LetterLimitInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    wrapRef,
    mirrorRef,
    fillRef,
    meterRef,
    countRef,
    pileRef,
    isNear,
    isFull,
    strokeColor,
    countColor,
    syncTransition
  } = useLetterLimitPhysics(value, limit, nearThreshold, true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let next = raw;
    let extra = '';

    if (raw.length > limit) {
      const caret = e.target.selectionStart ?? limit;
      next = raw.slice(0, limit);
      extra = raw.slice(limit);

      if (inputRef.current) {
        inputRef.current.value = next;
        const pos = Math.min(caret, limit);
        inputRef.current.setSelectionRange(pos, pos);
      }
    }

    syncTransition(next, extra);
    onChange(next);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full min-h-[48px] pl-3.5 pr-24 py-2.5 bg-black border rounded-[2px] text-sm text-[#F2F2F2] outline-none transition-colors ${
            isFull
              ? 'border-[#E02898]'
              : isNear
                ? 'border-[#F5C400]'
                : 'border-white/[0.18] focus:border-[#C6FF00]'
          }`}
        />

        {/* Hidden single-line mirror for exact end-of-text coordinate */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="absolute inset-0 pl-3.5 pr-24 py-2.5 text-sm whitespace-pre invisible pointer-events-none overflow-hidden flex items-center"
        />

        {/* Inline Ring Meter + Counter HUD */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <svg
            ref={meterRef}
            viewBox="0 0 24 24"
            className="w-4 h-4 will-change-transform"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="var(--div)"
              strokeWidth="2.8"
            />
            <circle
              ref={fillRef}
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="1 1"
              pathLength={1}
              style={{ transition: 'stroke 0.2s' }}
            />
          </svg>
          <span
            ref={countRef}
            aria-live="polite"
            className="text-[11px] font-bold tabular-nums will-change-transform"
            style={{ color: countColor, transition: 'color 0.2s' }}
          >
            {value.length}/{limit}
          </span>
        </div>
      </div>

      {/* Falling overflow letters layer */}
      <div
        ref={pileRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-visible z-30"
      />
    </div>
  );
}
