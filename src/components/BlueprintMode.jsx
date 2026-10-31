import React, { useState, useEffect } from 'react';
import { Compass, Eye, EyeOff, Layers, Cpu } from 'lucide-react';

/**
 * BlueprintMode Component
 * Toggles the Architectural X-Ray Blueprint diagnostic HUD:
 * Precision engineering grid, ISO system annotations, and technical cluster metrics.
 * Supports keyboard shortcut: Hold or press Shift + B, or click the floating compass widget.
 */
export default function BlueprintMode() {
  const [isBlueprintActive, setIsBlueprintActive] = useState(false);

  useEffect(() => {
    if (isBlueprintActive) {
      document.documentElement.setAttribute('data-blueprint-mode', 'active');
    } else {
      document.documentElement.removeAttribute('data-blueprint-mode');
    }
  }, [isBlueprintActive]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle on Shift + B
      if (e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        setIsBlueprintActive(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 999 }}>
      <button
        type="button"
        onClick={() => setIsBlueprintActive(!isBlueprintActive)}
        title={isBlueprintActive ? 'Exit X-Ray Blueprint Mode (Shift + B)' : 'Enter Architectural X-Ray Blueprint Mode (Shift + B)'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.5rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          background: isBlueprintActive ? '#0284c7' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${isBlueprintActive ? '#38bdf8' : 'var(--border-hairline)'}`,
          color: isBlueprintActive ? '#ffffff' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isBlueprintActive ? '0 0 20px rgba(56, 189, 248, 0.4)' : '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <Compass size={14} style={{ transform: isBlueprintActive ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
        <span>{isBlueprintActive ? 'Blueprint Mode [ON]' : 'X-Ray Blueprint'}</span>
      </button>

      {isBlueprintActive && (
        <div style={{
          position: 'fixed',
          top: '4.8rem',
          right: '1.5rem',
          padding: '0.45rem 0.85rem',
          background: 'rgba(2, 132, 199, 0.2)',
          border: '1px dashed #38bdf8',
          borderRadius: 'var(--radius-md)',
          color: '#38bdf8',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Cpu size={13} />
          <span>ISO/IEC-25010 ARCHITECTURAL BLUEPRINT HUD ACTIVE</span>
        </div>
      )}
    </div>
  );
}

