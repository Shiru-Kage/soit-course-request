import React, { useEffect, useState } from 'react';

/**
 * InteractiveAtmosphere Component
 * Orchestrates:
 * 1. Time-of-Day dynamic ambient atmosphere (Morning, Afternoon, Evening, Night)
 * 2. Cursor Spotlight illumination on interactive cards
 * 3. 3D perspective gyroscopic tilt on cards
 * 4. Magnetic micro-physics on focal action buttons
 */
export default function InteractiveAtmosphere() {
  const [timePeriod, setTimePeriod] = useState('day');

  // 1. Time-of-Day Ambient Engine
  useEffect(() => {
    const updateTimeAtmosphere = () => {
      const hour = new Date().getHours();
      let period = 'afternoon';
      if (hour >= 5 && hour < 12) {
        period = 'morning';
      } else if (hour >= 12 && hour < 17) {
        period = 'afternoon';
      } else if (hour >= 17 && hour < 21) {
        period = 'evening';
      } else {
        period = 'night';
      }
      setTimePeriod(period);
      document.documentElement.setAttribute('data-time-of-day', period);
    };

    updateTimeAtmosphere();
    const interval = setInterval(updateTimeAtmosphere, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // 2. Cursor Spotlight, 3. 3D Tilt, and 4. Magnetic Micro-Physics
  useEffect(() => {
    // Check user preference
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // A. Cursor Spotlight tracking for cards
    const handlePointerMove = (e) => {
      const cards = document.querySelectorAll('.spotlight-card, .dossier-card, .course-tile, .bento-card, .navbar-inner');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        // Check if cursor is roughly near card (within 250px) to conserve DOM operations
        if (
          e.clientX >= rect.left - 250 &&
          e.clientX <= rect.right + 250 &&
          e.clientY >= rect.top - 250 &&
          e.clientY <= rect.bottom + 250
        ) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
        }
      });
    };

    // B. 3D Perspective Tilt on .tilt-card & .dossier-card
    const handleCardTilt = (e) => {
      const target = e.target.closest('.tilt-card, .dossier-card');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Max tilt degrees: +/- 3.5 deg
      const maxTilt = 3.5;
      const rotateX = ((centerY - y) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      target.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    };

    const handleCardLeave = (e) => {
      const target = e.target.closest('.tilt-card, .dossier-card');
      if (!target) return;
      target.style.transform = '';
    };

    // C. Magnetic Micro-Physics on Action Buttons (.magnetic-btn, .tactile-btn-primary, .brand-crest)
    const handleMagneticMove = (e) => {
      const btn = e.target.closest('.magnetic-btn, .tactile-btn-primary, .brand-crest');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Gentle magnetic pull: max 3.5px translation
      const pullX = (x / (rect.width / 2)) * 3.5;
      const pullY = (y / (rect.height / 2)) * 3.5;

      btn.style.transform = `translate(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px)`;
    };

    const handleMagneticLeave = (e) => {
      const btn = e.target.closest('.magnetic-btn, .tactile-btn-primary, .brand-crest');
      if (!btn) return;
      btn.style.transform = '';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mousemove', handleCardTilt, { passive: true });
    document.addEventListener('mouseout', handleCardLeave, { passive: true });
    document.addEventListener('mousemove', handleMagneticMove, { passive: true });
    document.addEventListener('mouseout', handleMagneticLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mousemove', handleCardTilt);
      document.removeEventListener('mouseout', handleCardLeave);
      document.removeEventListener('mousemove', handleMagneticMove);
      document.removeEventListener('mouseout', handleMagneticLeave);
    };
  }, []);

  return (
    <div className={`ambient-aurora-overlay ${timePeriod}`} aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
    </div>
  );
}
