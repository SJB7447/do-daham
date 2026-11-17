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
  needsSync: boolean;
  out: number;
  s: number;
  bin: number | null;
  hits: number;
}

const BIN_WIDTH = 14;
const MAX_PILE = 90;
const POP_ACCENT_COLORS = [
  'var(--magenta, #E02898)',
  'var(--amber, #F5C400)',
  'var(--acid, #C6FF00)'
];

function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

function isSpringActive(s: SpringState): boolean {
  return Math.abs(s.x - s.t) > 0.0005 || Math.abs(s.v) > 0.002;
}

/**
 * Sandpile angle-of-repose relaxation: walks down steeper neighbor slopes
 * so piled characters spread horizontally into a broad mountain silhouette.
 */
function findMountainBin(
  startBin: number,
  minBin: number,
  maxBin: number,
  bins: Record<number, number>
): number {
  let cur = Math.max(minBin, Math.min(maxBin, startBin));

  for (let step = 0; step < 12; step += 1) {
    const hCur = bins[cur] || 0;
    const hLeft = cur > minBin ? (bins[cur - 1] || 0) : Infinity;
    const hRight = cur < maxBin ? (bins[cur + 1] || 0) : Infinity;

    const canLeft = hLeft < hCur;
    const canRight = hRight < hCur;
    if (!canLeft && !canRight) break;

    if (canLeft && canRight) {
      if (hLeft < hRight) {
        cur -= 1;
      } else if (hRight < hLeft) {
        cur += 1;
      } else {
        const hLeft2 = cur - 1 > minBin ? (bins[cur - 2] || 0) : Infinity;
        const hRight2 = cur + 1 < maxBin ? (bins[cur + 2] || 0) : Infinity;
        if (hLeft2 < hRight2) cur -= 1;
        else if (hRight2 < hLeft2) cur += 1;
        else cur += Math.random() < 0.5 ? -1 : 1;
      }
    } else if (canLeft) {
      cur -= 1;
    } else {
      cur += 1;
    }
  }

  return cur;
}

function layerColorForHeight(height: number): string {
  if (height >= 5) return 'var(--magenta, #E02898)';
  if (height >= 3) return 'var(--amber, #F5C400)';
  return 'var(--dim-aa, #8C8C8C)';
}

function useLetterLimitPhysics(
  controlRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  value: string,
  limit: number,
  nearThreshold: number,
  singleLine = false
) {
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
  const boxSizeRef = useRef({ width: 320, height: singleLine ? 48 : 104 });
  const wakeLoopRef = useRef<() => void>(() => {});
  const colorIdxRef = useRef(0);

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

  // Update spring target when value/limit changes externally & wake rAF loop
  useEffect(() => {
    springsRef.current.F.t = Math.min(1, value.length / limit);
    prevLenRef.current = value.length;
    wakeLoopRef.current();
  }, [value, limit]);

  // Cache wrapper dimensions via ResizeObserver & run on-demand rAF physics loop
  useEffect(() => {
    const wrap = wrapRef.current;
    const measureBox = () => {
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        boxSizeRef.current = { width: rect.width, height: rect.height };
      }
    };
    measureBox();

    let ro: ResizeObserver | null = null;
    if (wrap && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          boxSizeRef.current = {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          };
        }
      });
      ro.observe(wrap);
    }

    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      const width = boxSizeRef.current.width;
      const floorY = boxSizeRef.current.height + (singleLine ? 6 : 10);
      const minBin = 1;
      const maxBin = Math.max(2, Math.floor((width - 14) / BIN_WIDTH));

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
            l.needsSync = true;
            return;
          }
          if (l.rest) return;

          l.vy += 1900 * subDt;
          l.x += l.vx * subDt;
          l.y += l.vy * subDt;
          l.r += l.vr * subDt;
          if (l.s > 1) {
            l.s = Math.max(1, l.s - (l.s - 1) * Math.min(1, subDt * 12));
          }

          if (l.x < 12) {
            l.x = 12;
            l.vx = Math.abs(l.vx) * 0.55;
          } else if (l.x > width - 12) {
            l.x = width - 12;
            l.vx = -Math.abs(l.vx) * 0.55;
          }

          const b = Math.max(minBin, Math.min(maxBin, Math.round(l.x / BIN_WIDTH)));
          const ground = floorY - (binsRef.current[b] || 0) * 7.5;
          if (l.y >= ground && l.vy > 0) {
            const hCur = binsRef.current[b] || 0;
            const hLeft = b > minBin ? (binsRef.current[b - 1] || 0) : Infinity;
            const hRight = b < maxBin ? (binsRef.current[b + 1] || 0) : Infinity;

            // Steep mountain slope: bounce & roll down the shallower side
            if ((hCur > hLeft || hCur > hRight) && l.hits < 2) {
              const rollDir =
                hLeft < hRight ? -1 : hRight < hLeft ? 1 : Math.random() < 0.5 ? -1 : 1;
              l.hits += 1;
              l.y = ground - 1;
              l.vy = -75 - Math.random() * 55;
              l.vx = rollDir * (90 + Math.random() * 95);
              l.vr = rollDir * (180 + Math.random() * 200);
            } else if (l.hits < 1 && l.vy > 240) {
              l.hits += 1;
              l.y = ground;
              l.vy *= -0.32;
              l.vx *= 0.65;
              l.vr *= 0.5;
            } else {
              const restBin = findMountainBin(b, minBin, maxBin, binsRef.current);
              const nextHeight = Math.min(8, (binsRef.current[restBin] || 0) + 1);
              binsRef.current[restBin] = nextHeight;

              l.hits += 1;
              l.rest = true;
              l.bin = restBin;
              l.x = Math.max(10, Math.min(width - 10, restBin * BIN_WIDTH + (Math.random() - 0.5) * 6));
              l.y = floorY - (nextHeight - 1) * 7.5;
              l.vx = 0;
              l.vy = 0;
              l.vr = 0;
              l.s = 1;
              l.r = (Math.random() - 0.5) * 38;
              l.needsSync = true;
              l.el.style.color = layerColorForHeight(nextHeight);
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
        if (l.needsSync || !l.rest || l.out > 0) {
          l.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) rotate(${l.r.toFixed(1)}deg) scale(${l.s.toFixed(3)})`;
          l.needsSync = false;
        }
      });

      const anyMoving =
        isSpringActive(F) ||
        isSpringActive(CP) ||
        isSpringActive(SH) ||
        lettersRef.current.some((l) => !l.rest || l.out > 0);

      if (anyMoving) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    };

    const wake = () => {
      if (!rafId) {
        measureBox();
        last = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };
    wakeLoopRef.current = wake;
    wake();

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
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
    l.needsSync = true;
    if (l.bin !== null) {
      binsRef.current[l.bin] = Math.max(0, (binsRef.current[l.bin] || 0) - 1);
    }
  };

  const getEndOfTextCoords = (currentText: string, caretIndex?: number): [number, number] => {
    const mirror = mirrorRef.current;
    const control = controlRef.current;
    if (!mirror || !control) {
      return [Math.min(180, boxSizeRef.current.width * 0.6), singleLine ? 24 : 36];
    }

    const cs = window.getComputedStyle(control);
    const clientW = control.clientWidth || boxSizeRef.current.width;
    const clientH = control.clientHeight || (singleLine ? 48 : 96);

    mirror.style.width = `${clientW}px`;
    mirror.style.fontFamily = cs.fontFamily;
    mirror.style.fontSize = cs.fontSize;
    mirror.style.fontWeight = cs.fontWeight;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.paddingTop = cs.paddingTop;
    mirror.style.paddingRight = cs.paddingRight;
    mirror.style.paddingBottom = cs.paddingBottom;
    mirror.style.paddingLeft = cs.paddingLeft;

    const pos = Math.max(0, Math.min(caretIndex ?? currentText.length, currentText.length));
    mirror.textContent = '';
    mirror.appendChild(document.createTextNode(currentText.slice(0, pos)));
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    if (pos < currentText.length) {
      mirror.appendChild(document.createTextNode(currentText.slice(pos)));
    }

    const parsedLineH = parseFloat(cs.lineHeight);
    const halfLineH = Number.isFinite(parsedLineH) ? parsedLineH * 0.5 : 12;

    const rawX = marker.offsetLeft - control.scrollLeft;
    const rawY = singleLine
      ? clientH * 0.5
      : marker.offsetTop - control.scrollTop + halfLineH;

    const maxVisibleX = singleLine
      ? Math.max(24, clientW - 96)
      : Math.max(24, clientW - 18);
    const clampedX = Math.max(18, Math.min(rawX, maxVisibleX));
    const clampedY = Math.max(14, Math.min(rawY, Math.max(18, clientH - 10)));
    return [clampedX, clampedY];
  };

  const spawnSparkAt = (x: number, y: number) => {
    const pile = pileRef.current;
    if (!pile) return;

    const spark = document.createElement('span');
    spark.style.position = 'absolute';
    spark.style.left = '0';
    spark.style.top = '0';
    spark.style.width = '18px';
    spark.style.height = '18px';
    spark.style.borderRadius = '9999px';
    spark.style.border = '2px solid var(--magenta, #E02898)';
    spark.style.boxShadow = '0 0 12px rgba(224, 40, 152, 0.55)';
    spark.style.pointerEvents = 'none';
    spark.style.willChange = 'transform, opacity';
    pile.appendChild(spark);

    const removeSpark = () => {
      if (spark.parentNode) spark.remove();
    };

    if (typeof spark.animate === 'function') {
      const anim = spark.animate(
        [
          {
            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(0.35)`,
            opacity: 0.95
          },
          {
            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(1.9)`,
            opacity: 0
          }
        ],
        { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
      anim.onfinish = removeSpark;
      window.setTimeout(removeSpark, 360);
    } else {
      window.setTimeout(removeSpark, 320);
    }
  };

  const dropExtraChars = (kept: string, extra: string, caretIndex?: number) => {
    const { SH, CP } = springsRef.current;
    if (!prefersReducedMotion) {
      SH.v += 34;
      CP.x = 1.24;
    }

    if (prefersReducedMotion || !pileRef.current) return;

    const [x, y] = getEndOfTextCoords(kept, caretIndex);
    spawnSparkAt(x, y);

    const width = boxSizeRef.current.width;
    const spread = Math.min(420, Math.max(220, width * 0.65));

    Array.from(extra).forEach((ch, idx) => {
      if (!ch.trim() || !pileRef.current) return;
      const accentColor = POP_ACCENT_COLORS[colorIdxRef.current % POP_ACCENT_COLORS.length];
      colorIdxRef.current += 1;

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
      el.style.fontWeight = '800';
      el.style.lineHeight = '24px';
      el.style.color = accentColor;
      el.style.pointerEvents = 'none';
      el.style.willChange = 'transform, opacity';
      el.style.transition = 'color 0.55s ease';
      pileRef.current.appendChild(el);

      // Bias slightly inward if cursor sits near the far right wall so mountain fans widely
      const rightEdgeBias = x > width * 0.78 ? -55 : x < width * 0.2 ? 45 : 0;
      const vx = (Math.random() - 0.5) * spread + rightEdgeBias;

      lettersRef.current.push({
        el,
        x: Math.max(14, Math.min(width - 14, x + Math.min(idx * 6, 24))),
        y,
        vx,
        vy: -210 - Math.random() * 130,
        r: (Math.random() - 0.5) * 18,
        vr: (Math.random() - 0.5) * 540,
        rest: false,
        needsSync: true,
        out: 0,
        s: 1.35,
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

  const syncTransition = (next: string, extra: string, caretIndex?: number) => {
    if (extra) {
      dropExtraChars(next, extra, caretIndex);
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
    wakeLoopRef.current();
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
  } = useLetterLimitPhysics(taRef, value, limit, nearThreshold, false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    let next = raw;
    let extra = '';
    let caretPos: number | undefined;

    if (raw.length > limit) {
      const caret = e.target.selectionStart ?? limit;
      next = raw.slice(0, limit);
      extra = raw.slice(limit);
      caretPos = Math.min(caret, limit);

      if (taRef.current) {
        taRef.current.value = next;
        taRef.current.setSelectionRange(caretPos, caretPos);
      }
    }

    syncTransition(next, extra, caretPos);
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

        {/* Hidden mirror positioned at top-left matching textarea clientWidth for exact caret/end coords */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="absolute top-0 left-0 p-3.5 box-border text-[15px] leading-6 whitespace-pre-wrap break-words invisible pointer-events-none overflow-hidden"
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
  } = useLetterLimitPhysics(inputRef, value, limit, nearThreshold, true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let next = raw;
    let extra = '';
    let caretPos: number | undefined;

    if (raw.length > limit) {
      const caret = e.target.selectionStart ?? limit;
      next = raw.slice(0, limit);
      extra = raw.slice(limit);
      caretPos = Math.min(caret, limit);

      if (inputRef.current) {
        inputRef.current.value = next;
        inputRef.current.setSelectionRange(caretPos, caretPos);
      }
    }

    syncTransition(next, extra, caretPos);
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

        {/* Hidden single-line mirror positioned at top-left matching input clientWidth */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="absolute top-0 left-0 h-full pl-3.5 pr-24 py-2.5 box-border text-sm whitespace-pre invisible pointer-events-none overflow-hidden"
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
