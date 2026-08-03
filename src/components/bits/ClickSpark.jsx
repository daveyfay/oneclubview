import { useRef, useEffect, useCallback } from 'react';

export default function ClickSpark({
  sparkColor = 'var(--color-accent)',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  children
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();
    return () => ro.disconnect();
  }, []);

  const easeOut = useCallback(t => t * (2 - t), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    function draw(ts) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter(s => {
        const elapsed = ts - s.startTime;
        if (elapsed >= duration) return false;
        const progress = elapsed / duration;
        const eased = easeOut(progress);
        const dist = eased * sparkRadius;
        const len = sparkSize * (1 - eased);
        const x1 = s.x + dist * Math.cos(s.angle);
        const y1 = s.y + dist * Math.sin(s.angle);
        const x2 = s.x + (dist + len) * Math.cos(s.angle);
        const y2 = s.y + (dist + len) * Math.sin(s.angle);
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sparkColor, sparkSize, sparkRadius, duration, easeOut]);

  const handleClick = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, i) => ({
        x, y, angle: (2 * Math.PI * i) / sparkCount, startTime: now
      }))
    );
  };

  return (
    <div style={{ position: 'relative' }} onClick={handleClick}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }} />
      {children}
    </div>
  );
}
