import { useRef, useState, useEffect } from 'react';

export default function BlurText({ text, delay = 80, className = '', as: Tag = 'span' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <span
          key={i}
          className={visible ? 'blur-text-word' : ''}
          style={{
            display: 'inline-block',
            opacity: visible ? undefined : 0,
            animationDelay: visible ? `${i * delay}ms` : undefined,
            marginRight: i < words.length - 1 ? '.3em' : 0,
          }}
        >
          {word}
        </span>
      ))}
    </Tag>
  );
}
