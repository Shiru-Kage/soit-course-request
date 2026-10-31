import React, { useState, useEffect, useRef } from 'react';

/**
 * KineticCounter Component
 * Smoothly animates numbers rolling up using an easeOutExpo curve.
 * Respects 'prefers-reduced-motion'.
 */
export default function KineticCounter({ 
  value = 0, 
  duration = 750, 
  prefix = '', 
  suffix = '',
  className = '',
  style = {}
}) {
  const numericTarget = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericTarget);
  const prevValueRef = useRef(numericTarget);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(numericTarget);
      prevValueRef.current = numericTarget;
      return;
    }

    const startValue = prevValueRef.current;
    const diff = numericTarget - startValue;
    if (diff === 0) return;

    let startTime = null;
    let animationFrameId = null;

    const easeOutExpo = (t) => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = Math.round(startValue + diff * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericTarget);
        prevValueRef.current = numericTarget;
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [numericTarget, duration]);

  return (
    <span className={`kinetic-counter ${className}`} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
