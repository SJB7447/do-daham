import { useEffect, useRef, useState } from 'react';

interface ScrambleNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

const SCRAMBLE_DIGITS = '0123456789';

export function ScrambleNumber({
  value,
  suffix = '',
  prefix = '',
  durationMs = 260,
  className = ''
}: ScrambleNumberProps) {
  const formattedTarget = `${prefix}${value.toLocaleString('ko-KR')}${suffix}`;
  const [display, setDisplay] = useState(formattedTarget);
  const prevValueRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (prevValueRef.current === value) {
      setDisplay(formattedTarget);
      return;
    }
    prevValueRef.current = value;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(formattedTarget);
      return;
    }

    const start = performance.now();
    const numStr = value.toLocaleString('ko-KR');

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const lockedCount = Math.floor(progress * numStr.length);

      let scrambled = '';
      for (let i = 0; i < numStr.length; i += 1) {
        const ch = numStr[i];
        if (ch === ',' || ch === '.' || i < lockedCount || progress >= 1) {
          scrambled += ch;
        } else {
          scrambled += SCRAMBLE_DIGITS[Math.floor(Math.random() * SCRAMBLE_DIGITS.length)];
        }
      }

      setDisplay(`${prefix}${scrambled}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(formattedTarget);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, prefix, suffix, durationMs, formattedTarget]);

  return <span className={`tabular-nums ${className}`}>{display}</span>;
}
