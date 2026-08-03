import { useRef } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(26,42,58,.08)', style = {} }) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    ref.current.style.setProperty('--spotlight-color', spotlightColor);
  }

  return (
    <div ref={ref} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`} style={style}>
      {children}
    </div>
  );
}
