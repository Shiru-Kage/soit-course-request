import React from 'react';
import { 
  CheckCircle2, 
  Printer, 
  Copy, 
  Sparkles,
  X,
  QrCode,
  Ticket,
  GraduationCap
} from 'lucide-react';

export default function ConfirmationModal({ request, onClose, onTrack }) {
  if (!request) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(request.id);
    alert(`Reference ID ${request.id} copied to clipboard!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const isGranted = request.status === 'Section Opened' || request.status === 'Threshold Met';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 9, 14, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '640px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
          color: 'var(--text-primary)'
        }}
      >
        {/* Auto-Cataloged Celebration Banner */}
        {request.isAutoCataloged && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.16)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.15rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
          }}>
            <Sparkles size={20} style={{ color: '#10b981', flexShrink: 0 }} />
            <div style={{ fontSize: '0.825rem', lineHeight: 1.4, color: 'var(--text-pure)' }}>
              <strong style={{ color: '#10b981' }}>New Course Automatically Cataloged!</strong>
              <div><strong>{request.courseCode} — {request.courseTitle}</strong> is now live in the SOIT database. Your petition is officially registered.</div>
            </div>
          </div>
        )}

        {/* Tactile Academic Boarding Pass Ticket */}
        <div className="boarding-pass-ticket">
          {/* Main Ticket Body */}
          <div className="ticket-main">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--crimson-core), #7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-pure)', letterSpacing: '-0.02em' }}>
                    MAPÚA UNIVERSITY • SOIT
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Official Academic Course Petition Pass
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                style={{ color: 'var(--text-faint)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                aria-label="Close ticket"
              >
                <X size={18} />
              </button>
            </div>

            {/* Course Headline */}
            <div>
              <span className="mono-tag" style={{ color: 'var(--crimson-bright)', fontSize: '0.7rem' }}>
                REQUESTED COURSE
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-pure)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                {request.courseCode}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {request.courseTitle || 'Course Section'}
              </div>
            </div>

            {/* Student & Degree Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.82rem', padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>STUDENT</span>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--text-pure)' }}>{request.lastName}, {request.firstName}</p>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{request.studentNumber}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>PROGRAM & REMAINING</span>
                <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: 'var(--crimson-bright)' }}>{request.program}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{request.unitsLeft} units remaining</span>
              </div>
            </div>

            {/* Rubber Stamp Placement */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <div className={`rubber-stamp ${isGranted ? 'granted' : 'gathering'}`}>
                {isGranted ? '★ SECTION GRANTED ★' : 'PETITION RECORDED • GATHERING'}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {new Date(request.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Perforation Divider with Scallop Notches */}
          <div className="ticket-divider-perforated">
            <div className="ticket-notch-top" />
            <div className="ticket-notch-bottom" />
          </div>

          {/* Ticket Stub */}
          <div className="ticket-stub">
            <div style={{ width: '100%' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFERENCE ID</span>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: 'var(--crimson-bright)', 
                letterSpacing: '0.05em',
                margin: '0.25rem 0' 
              }}>
                {request.id}
              </div>
            </div>

            {/* Decorative Barcode */}
            <div style={{ margin: '1rem 0' }}>
              <div className="decorative-barcode">
                |||| | |||||| || | |||| |||
              </div>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em' }}>VERIFIED-PASS-SOIT</span>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              className="action-pill-btn"
              onClick={handleCopy}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}
            >
              <Copy size={13} />
              <span>Copy Pass ID</span>
            </button>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={handlePrint} style={{ flex: 1, padding: '0.65rem 1rem' }}>
            <Printer size={15} />
            <span>Print Official Ticket</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ flex: 1, padding: '0.65rem 1rem', fontWeight: 700, color: 'var(--emerald-core)', borderColor: 'var(--emerald-border)' }}
          >
            <span>+ Request Another</span>
          </button>
          <button 
            type="button" 
            className="tactile-btn-primary" 
            onClick={() => {
              onClose();
              onTrack(request.studentNumber);
            }}
            style={{ flex: 1, padding: '0.65rem 1rem' }}
          >
            <span>Track My Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
}
