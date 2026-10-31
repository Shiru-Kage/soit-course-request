import React from 'react';
import { 
  CheckCircle2, 
  Printer, 
  Copy, 
  Sparkles,
  X
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

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 9, 14, 0.78)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-bento)',
          color: 'var(--text-primary)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid var(--border-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Course Request Submitted</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Official SOIT Academic Request Slip</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Auto-Cataloged Celebration Banner */}
          {request.isAutoCataloged && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <Sparkles size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.8rem', lineHeight: 1.45, color: 'var(--text-pure)' }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '0.15rem' }}>
                  Course Automatically Added to Official Catalog!
                </strong>
                <span>
                  <strong>{request.courseCode} — {request.courseTitle}</strong> is now live in the SOIT Course Catalog for all students, and your petition has been recorded immediately as <strong>Student #1 / 15</strong>. You do <u>not</u> need to re-check or edit your response.
                </span>
              </div>
            </div>
          )}

          {/* Reference Badge */}
          <div style={{ 
            backgroundColor: 'var(--bg-subtle)', 
            border: '1.5px dashed var(--border-strong)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '1.25rem', 
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Request Reference Number
            </span>
            <div style={{ 
              fontSize: '1.65rem', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--mapua-crimson)', 
              letterSpacing: '0.05em',
              margin: '0.35rem 0'
            }}>
              {request.id}
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              Keep this reference code for petition verification or retraction.
            </p>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Student Number</span>
              <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{request.studentNumber}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Student Name</span>
              <p style={{ fontWeight: 700 }}>{request.lastName}, {request.firstName}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>MyMapua Email</span>
              <p style={{ fontWeight: 600 }}>{request.email}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Degree Program</span>
              <p style={{ fontWeight: 700, color: 'var(--mapua-crimson)' }}>{request.program}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Requested Course Code</span>
              <p style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--mapua-crimson)' }}>{request.courseCode}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Overall Units Remaining</span>
              <p style={{ fontWeight: 700 }}>{request.unitsLeft} units</p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Course Title</span>
              <p style={{ fontWeight: 700 }}>{request.courseTitle || 'N/A'}</p>
            </div>
          </div>

          {/* Important Institutional Reminder */}
          <div style={{ 
            backgroundColor: 'var(--mapua-gold-bg)', 
            border: '1px solid var(--mapua-gold-border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1rem', 
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1.5rem'
          }}>
            <strong style={{ color: 'var(--mapua-gold)' }}>Next Steps & Section Availability:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
              <li>A minimum of at least <strong>15 students</strong> must request this subject before the Program Chair reviews section opening.</li>
              <li>Updates on section offerings will be published in your official <strong>myMapua portal</strong>.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={handleCopy} style={{ flex: 1 }}>
              <Copy size={16} />
              <span>Copy ID</span>
            </button>
            <button type="button" className="btn-secondary" onClick={handlePrint} style={{ flex: 1 }}>
              <Printer size={16} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ flex: 1, fontWeight: 700, color: 'var(--emerald-core)', borderColor: 'var(--emerald-border)' }}
            >
              <span>+ Request Another Course</span>
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => {
                onClose();
                onTrack(request.studentNumber);
              }}
              style={{ flex: 1 }}
            >
              <span>Track Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
