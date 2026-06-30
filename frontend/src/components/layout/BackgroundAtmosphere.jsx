import React, { useMemo } from 'react';

const BackgroundAtmosphere = () => {
  const elements = useMemo(() => {
    const stars = Array.from({ length: 25 }).map((_, i) => ({
      id: `star-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${Math.random() * 5}s`,
      size: `${2 + Math.random() * 4}px`
    }));

    const sparkles = Array.from({ length: 12 }).map((_, i) => ({
      id: `sparkle-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${5 + Math.random() * 5}s`,
      delay: `${Math.random() * 10}s`,
      size: `${16 + Math.random() * 20}px`
    }));

    const bubbles = Array.from({ length: 8 }).map((_, i) => ({
      id: `bubble-${i}`,
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 15}s`,
      delay: `${Math.random() * 20}s`,
      size: `${40 + Math.random() * 80}px`
    }));

    return { stars, sparkles, bubbles };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden">
      {elements.stars.map((s) => (
        <div
          key={s.id}
          className="absolute bg-primary rounded-full animate-pulse opacity-30"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDuration: s.duration,
            animationDelay: s.delay
          }}
        />
      ))}
      {elements.sparkles.map((sp) => (
        <span
          key={sp.id}
          className="absolute material-symbols-outlined text-secondary opacity-40 select-none animate-float"
          style={{
            left: sp.left,
            top: sp.top,
            fontSize: sp.size,
            animationDuration: sp.duration,
            animationDelay: sp.delay
          }}
        >
          auto_awesome
        </span>
      ))}
      {elements.bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute border-2 border-primary/10 rounded-full animate-float-slow"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDuration: b.duration,
            animationDelay: b.delay
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundAtmosphere;
