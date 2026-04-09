// ============================================================================
// AnimatedCounter — Smooth count-up animation for KPI metrics
// Animates from 0 to target value with easing, supports prefix/suffix
// ============================================================================

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;       // ms
  prefix?: string;         // e.g., "$"
  suffix?: string;         // e.g., "M"
  decimals?: number;       // decimal places
  className?: string;
  formatter?: (n: number) => string; // custom formatter
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  formatter,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState("0");
  const prevValue = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const startValue = prevValue.current;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = startValue + (value - startValue) * easedProgress;

      if (formatter) {
        setDisplay(formatter(current));
      } else {
        setDisplay(current.toFixed(decimals));
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, decimals, formatter]);

  return (
    <span className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
