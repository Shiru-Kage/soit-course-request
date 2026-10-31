import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2
} from 'lucide-react';
import { SOIT_PROGRAMS } from '../data/programs';
import { resetStudentPassword } from '../services/studentAuth';

export default function StudentProfilePage({
  currentUser,
  onUpdateStudentProfile
}) {
  const [formData, setFormData] = useState({
    studentNumber: currentUser?.studentNumber || '',
    email: currentUser?.email || '',
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    program: currentUser?.program || '',
    unitsLeft: currentUser?.unitsLeft ?? ''
  });

  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        studentNumber: currentUser.studentNumber || '',
        email: currentUser.email || '',
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        program: currentUser.program || '',
        unitsLeft: currentUser.unitsLeft ?? ''
      });
    }
  }, [currentUser]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (saveSuccess) setSaveSuccess('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!String(formData.lastName || '').trim() || String(formData.lastName).trim().length < 2) {
      newErrors.lastName = 'Last Name is required.';
    }
    if (!String(formData.firstName || '').trim() || String(formData.firstName).trim().length < 2) {
      newErrors.firstName = 'First Name is required.';
    }
    if (!formData.program) {
      newErrors.program = 'Please select your degree program.';
    }
    const unitsNum = Number(formData.unitsLeft);
    if (String(formData.unitsLeft ?? '').trim() === '' || isNaN(unitsNum) || unitsNum < 0 || unitsNum > 250) {
      newErrors.unitsLeft = 'Please enter valid remaining units (0 - 250).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateStudentProfile({
        firstName: String(formData.firstName).trim(),
        lastName: String(formData.lastName).trim(),
        program: formData.program,
        unitsLeft: String(formData.unitsLeft).trim()
      });
      setSaveSuccess('Profile changes saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassMessage({ type: '', text: '' });
    if (!newPassword || newPassword.length < 4) {
      setPassMessage({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    const res = await resetStudentPassword(formData.email, formData.studentNumber, newPassword);
    if (res.success) {
      setNewPassword('');
      setConfirmPassword('');
      setPassMessage({ type: 'success', text: 'Password updated.' });
    } else {
      setPassMessage({ type: 'error', text: res.error || 'Failed to update password.' });
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0.5rem auto 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Main Profile Card */}
      <div className="dossier-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.2rem' }}>
            My Profile
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Update your name, degree program, and remaining units.
          </p>
        </div>

        {saveSuccess && (
          <div style={{
            padding: '0.8rem 1rem',
            marginBottom: '1.25rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--emerald-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--emerald-core)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={17} />
            <span>{saveSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="input-field-group">
              <label className="field-label">Student Number</label>
              <input
                type="text"
                className="custom-input"
                value={formData.studentNumber}
                disabled
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            <div className="input-field-group">
              <label className="field-label">MyMapúa Email</label>
              <input
                type="email"
                className="custom-input"
                value={formData.email}
                disabled
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="input-field-group">
              <label className="field-label">
                Last Name <span className="required-dot">*</span>
              </label>
              <input
                type="text"
                className={`custom-input ${errors.lastName ? 'error' : ''}`}
                value={formData.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
              />
              {errors.lastName && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.lastName}</span>}
            </div>

            <div className="input-field-group">
              <label className="field-label">
                First Name <span className="required-dot">*</span>
              </label>
              <input
                type="text"
                className={`custom-input ${errors.firstName ? 'error' : ''}`}
                value={formData.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
              />
              {errors.firstName && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.firstName}</span>}
            </div>
          </div>

          <div className="input-field-group" style={{ maxWidth: '280px' }}>
            <label className="field-label">
              Units Left to Graduate <span className="required-dot">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="250"
              className={`custom-input ${errors.unitsLeft ? 'error' : ''}`}
              value={formData.unitsLeft}
              onChange={e => handleChange('unitsLeft', e.target.value)}
            />
            {errors.unitsLeft && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.unitsLeft}</span>}
          </div>

          <div className="input-field-group" style={{ marginTop: '0.25rem' }}>
            <label className="field-label">
              Degree Program <span className="required-dot">*</span>
            </label>
            <div className="bento-programs">
              {SOIT_PROGRAMS.map(prog => {
                const isSelected = formData.program === prog.code;
                return (
                  <div
                    key={prog.code}
                    className={`program-bento-tile ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleChange('program', prog.code)}
                  >
                    <div className="program-tile-top">
                      <span className="program-tile-code">{prog.code}</span>
                      {isSelected && <Check size={16} style={{ color: 'var(--gold-bright)' }} />}
                    </div>
                    <div className="program-tile-name">{prog.name}</div>
                  </div>
                );
              })}
            </div>
            {errors.program && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{errors.program}</span>}
          </div>

          <div className="button-dock-actions">
            <div />
            <button type="submit" className="tactile-btn-primary" disabled={isSaving}>
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Update Card */}
      <div className="dossier-card" style={{ padding: '1.75rem 2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '1rem' }}>
          Change Password
        </h3>

        {passMessage.text && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            background: passMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${passMessage.type === 'success' ? 'var(--emerald-border)' : '#ef4444'}`,
            color: passMessage.type === 'success' ? 'var(--emerald-core)' : '#ef4444'
          }}>
            {passMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="input-field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">New Password</label>
            <input
              type="password"
              className="custom-input"
              placeholder="At least 4 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className="input-field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Confirm Password</label>
            <input
              type="password"
              className="custom-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="tactile-btn-secondary" style={{ height: '44px', justifyContent: 'center' }}>
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
