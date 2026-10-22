import React, { useEffect, useState, useRef } from 'react';

/**
 * Tasteful scroll-reveal hook using IntersectionObserver.
 * Triggers once: fades in and rises 12-16px.
 * Respects prefers-reduced-motion automatically.
 */
export function useReveal({ threshold = 0.1, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          node.classList.add('reveal-visible');
          observer.unobserve(node); // Trigger once
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}

/**
 * Reusable Reveal component wrapper for clean scroll-reveal.
 */
export function Reveal({ children, delay = 0, className = '' }) {
  const [ref, isVisible] = useReveal();

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
      }}
      className={`reveal-init ${isVisible ? 'reveal-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default useReveal;
