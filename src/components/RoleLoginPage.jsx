import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  UserPlus,
  User,
  Clock,
  Check,
  LogIn
} from 'lucide-react';
import { 
  verifyAdminCredentials, 
  sendPasswordResetCode, 
  verifyResetCode, 
  resetAdminPassword
} from '../services/adminAuth';
import {
  registerStudentAccount,
  verifyStudentCredentials,
  resetStudentPassword
} from '../services/studentAuth';
import { SOIT_PROGRAMS } from '../data/programs';

export default function RoleLoginPage({ onLoginStudent, onLoginChair, view: controlledView, setView: controlledSetView, quarterState }) {
  // view: 'select' | 'student_login' | 'student_signup' | 'student_reset' | 'chair_login' | 'reset_password'
  const [internalView, setInternalView] = useState('select');
  const view = controlledView !== undefined ? controlledView : internalView;
  const setView = controlledSetView !== undefined ? controlledSetView : setInternalView;

  // Student Login State
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);
  const [studentLoginError, setStudentLoginError] = useState('');
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false);

  // Student Sign-Up (Profile + Password) State
  const [signupData, setSignupData] = useState({
    studentNumber: '',
    email: '',
    lastName: '',
    firstName: '',
    unitsLeft: '',
    program: '',
    password: '',
    confirmPassword: ''
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [signupGeneralError, setSignupGeneralError] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Student Password Reset State
  const [stuResetEmail, setStuResetEmail] = useState('');
  const [stuResetNum, setStuResetNum] = useState('');
  const [stuResetNewPass, setStuResetNewPass] = useState('');
  const [stuResetError, setStuResetError] = useState('');
  const [stuResetSuccess, setStuResetSuccess] = useState(false);

  // Chair Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Chair Password Reset Form
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handle Student Login
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setStudentLoginError('');
    setIsStudentLoggingIn(true);
    try {
      const res = await verifyStudentCredentials(studentEmail, studentPassword);
      if (res.success) {
        onLoginStudent(res.student);
      } else {
        setStudentLoginError(res.error || 'Invalid student credentials.');
      }
    } catch (err) {
      setStudentLoginError(err.message || 'Failed to sign in.');
    } finally {
      setIsStudentLoggingIn(false);
    }
  };

  // Handle Student Sign Up (Profile + Password)
  const handleStudentSignup = async (e) => {
    e.preventDefault();
    setSignupGeneralError('');
    setSignupErrors({});
    setIsSigningUp(true);
    try {
      const res = await registerStudentAccount(signupData);
      if (res.success) {
        onLoginStudent(res.student);
      } else {
        if (res.errors) setSignupErrors(res.errors);
        setSignupGeneralError(res.error || 'Please check the required profile fields.');
      }
    } catch (err) {
      setSignupGeneralError(err.message || 'Registration failed.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignupField = (field, value) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    if (signupErrors[field]) {
      setSignupErrors(prev => ({ ...prev, [field]: null }));
    }
    if (signupGeneralError) setSignupGeneralError('');
  };

  // Handle Student Password Reset
  const handleStudentResetSubmit = async (e) => {
    e.preventDefault();
    setStuResetError('');
    const res = await resetStudentPassword(stuResetEmail, stuResetNum, stuResetNewPass);
    if (res.success) {
      setStuResetSuccess(true);
    } else {
      setStuResetError(res.error || 'Could not reset password.');
    }
  };

  // Submit Chair Login
  const handleChairLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await verifyAdminCredentials(email, password);
      if (res.success) {
        onLoginChair(res.email);
      } else {
        setLoginError(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setLoginError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAutofillChair = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('1234');
    setLoginError('');
  };

  const handleAutofillStudent = () => {
    setStudentEmail('jdelacruz@mymail.mapua.edu.ph');
    setStudentPassword('1234');
    setStudentLoginError('');
  };

  // Send Chair Reset Code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsSendingCode(true);

    try {
      const res = await sendPasswordResetCode(resetEmail);
      if (res.success) {
        setResetSuccess(res.message);
        setDevCodeHint(res.code);
        setResetStep(2);
      } else {
        setResetError(res.error);
      }
    } catch (err) {
      setResetError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Complete Chair Password Reset
  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 4) {
      setResetError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify and retype.');
      return;
    }

    setIsResetting(true);

    try {
      const verify = verifyResetCode(resetEmail, resetCode);
      if (!verify.success) {
        setResetError(verify.error);
        setIsResetting(false);
        return;
      }

      const update = await resetAdminPassword(resetEmail, newPassword);
      if (update.success) {
        setResetStep(3);
      } else {
        setResetError(update.error);
      }
    } catch (err) {
      setResetError(err.message || 'Failed to update password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1rem' }}>
      
      {/* Brand Header */}
      {view === 'select' && (
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '0.5rem' }}>
          <h1 style={{ 
            fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)', 
            fontWeight: 800, 
            letterSpacing: '-0.03em', 
            color: 'var(--text-pure)',
            marginBottom: '0.45rem'
          }}>
            Course Request & Demand Gateway
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto', lineHeight: 1.5 }}>
            Sign in to submit course petitions or manage department section quotas.
          </p>
        </div>
      )}

      {/* =======================================================================
          VIEW 1: GATEWAY SELECTION (DUAL BENTO CARDS)
          ======================================================================= */}
      {view === 'select' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem',
          maxWidth: '860px',
          margin: '0 auto'
        }}>
          
          {/* Card 1: Student Portal (Sign In or Create Profile) */}
          <div 
            className="dossier-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              gap: '1.5rem',
              padding: '2.25rem 2rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span className="mono-tag" style={{ color: 'var(--emerald-core)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--emerald-border)' }}>
                  STUDENT ACCOUNT
                </span>
                <GraduationCap size={22} style={{ color: 'var(--emerald-core)' }} />
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.65rem' }}>
                Student Portal
              </h2>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Sign in with your MyMapúa Email & Password to go directly to the Course Catalog, Auto-Add Course, and Docket—and securely manage or retract only your own petitions.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                className="tactile-btn-primary"
                onClick={() => setView('student_login')}
                style={{ width: '100%', padding: '0.9rem 1.5rem' }}
              >
                <LogIn size={16} />
                <span>Student Sign In</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="tactile-btn-secondary"
                onClick={() => setView('student_signup')}
                style={{ width: '100%', padding: '0.8rem 1.5rem', justifyContent: 'center', color: 'var(--text-pure)' }}
              >
                <UserPlus size={15} />
                <span>New Student? Create Profile & Sign Up</span>
              </button>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '0.2rem' }}>
                Profile-bound petitions • Owner-protected retraction
              </div>
            </div>
          </div>

          {/* Card 2: Program Chair & Faculty Portal */}
          <div 
            className="dossier-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              gap: '1.5rem',
              padding: '2.25rem 2rem',
              position: 'relative',
              overflow: 'hidden',
              borderColor: 'rgba(185, 28, 28, 0.25)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span className="mono-tag" style={{ color: 'var(--gold-bright)', background: 'rgba(217, 119, 6, 0.12)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                  ACADEMIC ADMIN
                </span>
                <ShieldCheck size={22} style={{ color: 'var(--crimson-bright)' }} />
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.65rem' }}>
                Program Chair / Faculty
              </h2>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Restricted administrative gateway for syllabus management, section opening endorsements, master roster auditing, and admin authorization.
              </p>
            </div>

            <div>
              <button
                type="button"
                className="tactile-btn-secondary"
                onClick={() => setView('chair_login')}
                style={{ width: '100%', padding: '0.95rem 1.5rem', color: 'var(--text-pure)', borderColor: 'var(--border-medium)' }}
              >
                <span>Faculty / Chair Login</span>
                <ArrowRight size={16} />
              </button>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '0.65rem' }}>
                Authorized accounts • Password protected
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =======================================================================
          VIEW 1B: STUDENT SIGN IN
          ======================================================================= */}
      {view === 'student_login' && (
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="dossier-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => { setView('select'); setStudentLoginError(''); }}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-pure)' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Student / Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => { setView('chair_login'); setStudentLoginError(''); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--crimson-bright)',
                  background: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.2)',
                  borderRadius: '999px',
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={14} />
                <span>Switch to Faculty</span>
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mono-tag" style={{ color: 'var(--emerald-core)', marginBottom: '0.25rem' }}>
                STUDENT AUTHENTICATION
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Sign In to Student Portal
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Use the MyMapúa email and password from your registered Student Profile.
              </p>
            </div>

            {studentLoginError && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                borderRadius: 'var(--radius-md)', 
                color: '#ef4444',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <span>{studentLoginError}</span>
              </div>
            )}

            <form onSubmit={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <Mail size={13} /> MyMapúa Email
                  </label>
                  <span className="mono-tag">@mymail.mapua.edu.ph</span>
                </div>
                <input
                  type="email"
                  className="custom-input"
                  placeholder="username@mymail.mapua.edu.ph"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <Lock size={13} /> Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('student_reset'); setStuResetEmail(studentEmail); setStuResetError(''); setStuResetSuccess(false); }}
                    style={{ fontSize: '0.72rem', color: 'var(--gold-bright)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showStudentPass ? 'text' : 'password'}
                    className="custom-input"
                    placeholder="Enter your password"
                    value={studentPassword}
                    onChange={e => setStudentPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPass(!showStudentPass)}
                    style={{ 
                      position: 'absolute', 
                      right: '0.85rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-faint)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    tabIndex={-1}
                  >
                    {showStudentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



              <button
                type="submit"
                className="tactile-btn-primary"
                disabled={isStudentLoggingIn}
                style={{ width: '100%', padding: '0.95rem 1.5rem' }}
              >
                {isStudentLoggingIn ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In & Proceed to Catalog</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-hairline)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Don't have a student profile yet?{' '}
                <button
                  type="button"
                  onClick={() => { setView('student_signup'); setSignupGeneralError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-bright)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Create Student Profile & Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 1C: STUDENT SIGN UP (COMPLETE PROFILE + PASSWORD)
          ======================================================================= */}
      {view === 'student_signup' && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="dossier-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => { setView('select'); setSignupGeneralError(''); }}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-pure)' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Student / Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => { setView('chair_login'); setSignupGeneralError(''); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--crimson-bright)',
                  background: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.2)',
                  borderRadius: '999px',
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={14} />
                <span>Switch to Faculty</span>
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mono-tag" style={{ color: 'var(--emerald-core)', marginBottom: '0.25rem' }}>
                ONE-TIME STUDENT PROFILE REGISTRATION
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Create Your Official Student Profile
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                Register your student credentials and password once. After signing up, your profile is automatically bound to all course requests and only you can retract your own petitions.
              </p>
            </div>

            {signupGeneralError && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                borderRadius: 'var(--radius-md)', 
                color: '#ef4444',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{signupGeneralError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSignup}>
              {/* 2-Column Grid: Student Number & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      <User size={13} /> Student Number <span className="required-dot">*</span>
                    </label>
                    <span className="mono-tag">10 Digits</span>
                  </div>
                  <input
                    type="text"
                    className={`custom-input ${signupErrors.studentNumber ? 'error' : ''}`}
                    placeholder="e.g. 2023104521"
                    value={signupData.studentNumber}
                    onChange={e => handleSignupField('studentNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  {signupErrors.studentNumber && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.studentNumber}</span>
                  )}
                </div>

                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      <Mail size={13} /> MyMapúa Email <span className="required-dot">*</span>
                    </label>
                    <span className="mono-tag">@mymail.mapua.edu.ph</span>
                  </div>
                  <input
                    type="email"
                    className={`custom-input ${signupErrors.email ? 'error' : ''}`}
                    placeholder="username@mymail.mapua.edu.ph"
                    value={signupData.email}
                    onChange={e => handleSignupField('email', e.target.value)}
                  />
                  {signupErrors.email && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.email}</span>
                  )}
                </div>
              </div>

              {/* 2-Column Grid: Last Name & First Name */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      Last Name <span className="required-dot">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    className={`custom-input ${signupErrors.lastName ? 'error' : ''}`}
                    placeholder="Dela Cruz"
                    value={signupData.lastName}
                    onChange={e => handleSignupField('lastName', e.target.value)}
                  />
                  {signupErrors.lastName && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.lastName}</span>
                  )}
                </div>

                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      First Name <span className="required-dot">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    className={`custom-input ${signupErrors.firstName ? 'error' : ''}`}
                    placeholder="Juan Miguel"
                    value={signupData.firstName}
                    onChange={e => handleSignupField('firstName', e.target.value)}
                  />
                  {signupErrors.firstName && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.firstName}</span>
                  )}
                </div>
              </div>

              {/* Units Left */}
              <div className="input-field-group" style={{ maxWidth: '300px' }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <Clock size={13} /> Overall Units Left to Graduate <span className="required-dot">*</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  max="250"
                  className={`custom-input ${signupErrors.unitsLeft ? 'error' : ''}`}
                  placeholder="e.g. 24"
                  value={signupData.unitsLeft}
                  onChange={e => handleSignupField('unitsLeft', e.target.value)}
                />
                {signupErrors.unitsLeft && (
                  <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.unitsLeft}</span>
                )}
              </div>

              {/* Degree Program Bento Grid */}
              <div className="input-field-group" style={{ marginTop: '0.25rem' }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <GraduationCap size={13} /> Degree Program <span className="required-dot">*</span>
                  </label>
                  <span className="mono-tag">9 SOIT Programs</span>
                </div>
                <div className="bento-programs">
                  {SOIT_PROGRAMS.map(prog => {
                    const isSelected = signupData.program === prog.code;
                    return (
                      <div
                        key={prog.code}
                        className={`program-bento-tile ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSignupField('program', prog.code)}
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
                {signupErrors.program && (
                  <span style={{ fontSize: '0.725rem', color: '#ef4444', marginTop: '0.4rem', display: 'block' }}>
                    {signupErrors.program}
                  </span>
                )}
              </div>

              {/* Password & Confirm Password */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      <Lock size={13} /> Create Password <span className="required-dot">*</span>
                    </label>
                    <span className="mono-tag">Min 4 chars</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupPass ? 'text' : 'password'}
                      className={`custom-input ${signupErrors.password ? 'error' : ''}`}
                      placeholder="Create account password"
                      value={signupData.password}
                      onChange={e => handleSignupField('password', e.target.value)}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPass(!showSignupPass)}
                      style={{ 
                        position: 'absolute', 
                        right: '0.85rem', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-faint)',
                        cursor: 'pointer'
                      }}
                      tabIndex={-1}
                    >
                      {showSignupPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.password}</span>
                  )}
                </div>

                <div className="input-field-group">
                  <div className="field-label-row">
                    <label className="field-label">
                      <Lock size={13} /> Confirm Password <span className="required-dot">*</span>
                    </label>
                  </div>
                  <input
                    type={showSignupPass ? 'text' : 'password'}
                    className={`custom-input ${signupErrors.confirmPassword ? 'error' : ''}`}
                    placeholder="Re-enter password"
                    value={signupData.confirmPassword}
                    onChange={e => handleSignupField('confirmPassword', e.target.value)}
                  />
                  {signupErrors.confirmPassword && (
                    <span style={{ fontSize: '0.725rem', color: '#ef4444' }}>{signupErrors.confirmPassword}</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="tactile-btn-primary"
                disabled={isSigningUp}
                style={{ width: '100%', padding: '0.95rem 1.5rem', marginTop: '0.5rem' }}
              >
                {isSigningUp ? (
                  <span>Creating Student Account...</span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Complete Sign Up & Proceed to Course Catalog</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Already created your Student Profile?{' '}
                <button
                  type="button"
                  onClick={() => { setView('student_login'); setStudentLoginError(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-bright)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Sign In Here
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 1D: STUDENT PASSWORD RESET
          ======================================================================= */}
      {view === 'student_reset' && (
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="dossier-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setView('student_login')}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-pure)' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Student Sign In</span>
              </button>

              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setView('select')}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem', fontWeight: 600 }}
              >
                <span>Choose Student / Faculty</span>
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mono-tag" style={{ color: 'var(--gold-bright)', marginBottom: '0.25rem' }}>
                STUDENT PASSWORD RECOVERY
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Reset Student Password
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Verify your registered MyMapúa Email and 10-digit Student Number to set a new password.
              </p>
            </div>

            {stuResetError && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                borderRadius: 'var(--radius-md)', 
                color: '#ef4444',
                fontSize: '0.825rem',
                marginBottom: '1.25rem'
              }}>
                {stuResetError}
              </div>
            )}

            {stuResetSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--emerald-core)', margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.4rem' }}>
                  Password Updated!
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  You can now sign in with your new student password.
                </p>
                <button
                  type="button"
                  className="tactile-btn-primary"
                  onClick={() => {
                    setStudentEmail(stuResetEmail);
                    setStudentPassword(stuResetNewPass);
                    setView('student_login');
                  }}
                  style={{ width: '100%' }}
                >
                  Return to Student Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleStudentResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">MyMapúa Email</label>
                  <input
                    type="email"
                    className="custom-input"
                    placeholder="username@mymail.mapua.edu.ph"
                    value={stuResetEmail}
                    onChange={e => setStuResetEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">10-Digit Student Number</label>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="e.g. 2023104521"
                    value={stuResetNum}
                    onChange={e => setStuResetNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label">New Password</label>
                  <input
                    type="password"
                    className="custom-input"
                    placeholder="Enter new password (min 4 chars)"
                    value={stuResetNewPass}
                    onChange={e => setStuResetNewPass(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="tactile-btn-primary" style={{ width: '100%' }}>
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 2: FACULTY & PROGRAM CHAIR LOGIN
          ======================================================================= */}
      {view === 'chair_login' && (
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="dossier-card" style={{ padding: '2rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => { setView('select'); setLoginError(''); }}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-pure)' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Student / Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => { setView('student_login'); setLoginError(''); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--emerald-core)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid var(--emerald-border)',
                  borderRadius: '999px',
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer'
                }}
              >
                <GraduationCap size={14} />
                <span>Switch to Student</span>
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mono-tag" style={{ color: 'var(--crimson-bright)', marginBottom: '0.25rem' }}>
                SECURITY GATEWAY
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Program Chair Authentication
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Enter your authorized faculty email and password to access the administrative dashboard.
              </p>
            </div>

            {loginError && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                borderRadius: 'var(--radius-md)', 
                color: '#ef4444',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleChairLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <Mail size={13} /> Authorized Faculty Email
                  </label>
                </div>
                <input
                  type="email"
                  className="custom-input"
                  placeholder="Enter authorized faculty email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <div className="field-label-row">
                  <label className="field-label">
                    <Lock size={13} /> Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('reset_password'); setResetEmail(email); }}
                    style={{ fontSize: '0.72rem', color: 'var(--gold-bright)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="custom-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '0.85rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-faint)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>


              <button
                type="submit"
                className="tactile-btn-primary"
                disabled={isLoggingIn}
                style={{ width: '100%', padding: '0.95rem 1.5rem', marginTop: '0.5rem' }}
              >
                {isLoggingIn ? (
                  <>
                    <span className="live-status-dot" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Authenticate & Enter Dashboard</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setView('reset_password'); setResetStep(1); setResetError(''); setResetSuccess(''); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-bright)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot / Reset Password?
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 3: CHAIR PASSWORD RESET WORKFLOW
          ======================================================================= */}
      {view === 'reset_password' && (
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="dossier-card" style={{ padding: '2rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => { setView('chair_login'); setResetError(''); setResetSuccess(''); }}
                style={{ padding: '0.5rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-pure)' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Faculty Login</span>
              </button>

              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => { setView('select'); setResetError(''); setResetSuccess(''); }}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem', fontWeight: 600 }}
              >
                <span>Choose Student / Faculty</span>
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mono-tag" style={{ color: 'var(--gold-bright)', marginBottom: '0.25rem' }}>
                PASSWORD RECOVERY
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Reset Administrator Password
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {resetStep === 1 && "Enter your authorized admin email to receive a 6-digit verification code."}
                {resetStep === 2 && "Enter the verification code and your new administrator password."}
                {resetStep === 3 && "Your password has been successfully updated."}
              </p>
            </div>

            {resetError && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444', 
                borderRadius: 'var(--radius-md)', 
                color: '#ef4444',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(16, 185, 129, 0.12)', 
                border: '1px solid var(--emerald-border)', 
                borderRadius: 'var(--radius-md)', 
                color: 'var(--emerald-core)',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{resetSuccess}</span>
              </div>
            )}

            {devCodeHint && resetStep === 2 && (
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(217, 119, 6, 0.15)', 
                border: '1px dashed var(--gold-bright)', 
                borderRadius: 'var(--radius-md)', 
                color: 'var(--gold-bright)',
                fontSize: '0.775rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <div>Testing Verification Code: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{devCodeHint}</strong></div>
                <button
                  type="button"
                  onClick={() => setResetCode(devCodeHint)}
                  style={{
                    background: 'rgba(217, 119, 6, 0.3)',
                    border: '1px solid var(--gold-bright)',
                    color: 'var(--gold-bright)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Auto-fill Code for Testing
                </button>
              </div>
            )}

            {resetStep === 1 && (
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <div className="field-label-row">
                    <label className="field-label">
                      <Mail size={13} /> Administrator Email
                    </label>
                  </div>
                  <input
                    type="email"
                    className="custom-input"
                    placeholder="Enter authorized faculty email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="tactile-btn-primary"
                  disabled={isSendingCode}
                  style={{ width: '100%', padding: '0.95rem 1.5rem' }}
                >
                  {isSendingCode ? 'Dispatching Code...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {resetStep === 2 && (
              <form onSubmit={handleCompleteReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <div className="field-label-row">
                    <label className="field-label">
                      <KeyRound size={13} /> 6-Digit Verification Code
                    </label>
                    <span className="mono-tag">Expires in 15 mins</span>
                  </div>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value)}
                    maxLength={6}
                    required
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', letterSpacing: '0.2em', textAlign: 'center' }}
                  />
                </div>

                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <div className="field-label-row">
                    <label className="field-label">
                      <Lock size={13} /> New Password
                    </label>
                    <span className="mono-tag">Min 4 chars</span>
                  </div>
                  <input
                    type="password"
                    className="custom-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="input-field-group" style={{ marginBottom: 0 }}>
                  <div className="field-label-row">
                    <label className="field-label">
                      Confirm New Password
                    </label>
                  </div>
                  <input
                    type="password"
                    className="custom-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="tactile-btn-primary"
                  disabled={isResetting}
                  style={{ width: '100%', padding: '0.95rem 1.5rem' }}
                >
                  {isResetting ? 'Updating...' : 'Update Password & Sign In'}
                </button>
              </form>
            )}

            {resetStep === 3 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle2 size={42} style={{ color: 'var(--emerald-core)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.5rem' }}>
                  Password Reset Complete
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Your password has been securely updated. You can now authenticate into the Program Chair portal.
                </p>
                <button
                  type="button"
                  className="tactile-btn-primary"
                  onClick={() => {
                    setView('chair_login');
                    setEmail(resetEmail);
                    setPassword(newPassword);
                    setResetStep(1);
                  }}
                  style={{ width: '100%', padding: '0.95rem 1.5rem' }}
                >
                  Proceed to Login
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
