import { useRef, useEffect, useState } from 'react';

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function CountUp({ to, from = 0, duration = 1.2, delay = 200, separator = '', className = '' }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !ref.current) return;
    let raf;
    const timer = setTimeout(() => {
    const startTime = performance.now();
    const ms = duration * 1000;
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ms, 1);
      const eased = easeOutExpo(progress);
      const current = from + (to - from) * eased;
      const rounded = Number.isInteger(to) ? Math.round(current) : parseFloat(current.toFixed(2));
      if (ref.current) {
        ref.current.textContent = separator
          ? rounded.toLocaleString('en-IE')
          : String(rounded);
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [started, to, from, duration, delay, separator]);

  return <span className={className} ref={ref}>{from}</span>;
}
