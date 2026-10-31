import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Search, 
  BarChart3, 
  ShieldCheck, 
  Moon, 
  Sun, 
  User,
  ChevronDown,
  LogOut,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  CalendarRange,
  Archive,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  theme, 
  toggleTheme, 
  currentUser, 
  setCurrentUser,
  onLogout,
  loginView = 'select',
  setLoginView,
  openedSectionsCount = 0,
  quarterState,
  coursesWithDemand = [],
  requests = [],
  openedSections = [],
  onSectionActionChange
}) {
  // Dynamic Island Logic
  const readyToOpenCourse = useMemo(() => {
    if (currentUser?.role !== 'chair' || !coursesWithDemand) return null;
    return coursesWithDemand.find(c => {
      const cnt = c.count || c.requestCount || 0;
      const isOpen = Array.isArray(openedSections) && openedSections.some(s => String(s.code).toUpperCase() === String(c.code).toUpperCase() && s.actionType === 'OPEN');
      return cnt >= 15 && !isOpen;
    });
  }, [currentUser, coursesWithDemand, openedSections]);

  const studentActivePetitionsCount = useMemo(() => {
    if (currentUser?.role !== 'student' || !requests || !currentUser?.studentNumber) return 0;
    return requests.filter(r => String(r.studentNumber).trim() === String(currentUser.studentNumber).trim()).length;
  }, [currentUser, requests]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setIsMobileMenuOpen(false);
    setShowRoleMenu(false);
    if ((tab === 'chair' || tab === 'chair_archive') && currentUser?.role !== 'chair') {
      setCurrentTab('login');
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <header className={`navbar-header ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Brand */}
        <div 
          className="navbar-brand" 
          onClick={() => {
            if (currentTab === 'login' && setLoginView) {
              setLoginView('select');
            } else if (currentUser?.role === 'chair') {
              setCurrentTab('chair');
            } else if (currentUser?.role === 'student') {
              setCurrentTab('request');
            } else {
              setCurrentTab('login');
              if (setLoginView) setLoginView('select');
            }
          }} 
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-crest" style={{ background: '#ffffff', border: '1px solid var(--border-hairline)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', padding: '4px' }}>
            <img
              src="/soit-logo-icon.png"
              alt="Mapúa SOIT Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div className="brand-text">
            <h1>SOIT Course Request</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span 
                className="live-pulse-container" 
                title={quarterState?.isQuarterOpen === false ? "SOIT Portal: Term Closed" : "SOIT Cluster Node: Synced & Active"}
              >
                <span className="live-pulse-ring">
                  <span 
                    className="live-pulse-dot-core" 
                    style={{ 
                      backgroundColor: quarterState?.isQuarterOpen === false ? '#f59e0b' : undefined,
                      boxShadow: quarterState?.isQuarterOpen === false ? '0 0 6px #f59e0b' : undefined 
                    }}
                  />
                </span>
              </span>
              <span className="brand-text-univ">Mapúa University</span>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  padding: '0.08rem 0.48rem',
                  borderRadius: '999px',
                  background: quarterState?.isQuarterOpen === false
                    ? 'rgba(245, 158, 11, 0.16)'
                    : 'rgba(16, 185, 129, 0.14)',
                  color: quarterState?.isQuarterOpen === false
                    ? '#d97706'
                    : 'var(--emerald-core)',
                  border: `1px solid ${quarterState?.isQuarterOpen === false ? 'rgba(245, 158, 11, 0.35)' : 'var(--emerald-border)'}`
                }}
              >
                {quarterState?.isQuarterOpen === false
                  ? 'Term Closed'
                  : `Term ${quarterState?.currentQuarter || '2Q2627'}`}
              </span>
            </p>
          </div>

          {/* Morphing Dynamic Island Capsule */}
          {readyToOpenCourse && currentTab !== 'login' && (
            <div 
              className="dynamic-island-capsule"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.22rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid var(--emerald-border)',
                color: 'var(--emerald-core)',
                fontSize: '0.72rem',
                fontWeight: 700,
                marginLeft: '0.4rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles size={12} style={{ color: '#fbbf24' }} />
              <span><strong>{readyToOpenCourse.code}</strong> Hit 15!</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSectionActionChange) onSectionActionChange(readyToOpenCourse, 'OPEN');
                }}
                style={{
                  padding: '0.12rem 0.45rem',
                  borderRadius: '999px',
                  background: 'var(--emerald-core)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Quick Open
              </button>
            </div>
          )}

          {studentActivePetitionsCount > 0 && currentTab !== 'login' && !readyToOpenCourse && (
            <div 
              className="dynamic-island-capsule"
              onClick={(e) => {
                e.stopPropagation();
                handleNavClick('track');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.22rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(217, 119, 6, 0.12)',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                color: 'var(--gold-bright)',
                fontSize: '0.71rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '0.4rem'
              }}
              title="Click to track your petitions"
            >
              <Ticket size={11} style={{ color: 'var(--crimson-bright)' }} />
              <span>{studentActivePetitionsCount} Active Pass{studentActivePetitionsCount > 1 ? 'es' : ''}</span>
            </div>
          )}
        </div>

        {/* Floating Navigation Pill Dock */}
        {currentTab !== 'login' ? (
          <nav className="navbar-nav">
            {currentUser?.role === 'chair' ? (
              <>
                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'chair' ? 'active' : ''}`}
                  onClick={() => handleNavClick('chair')}
                >
                  <ShieldCheck size={14} />
                  <span>Chair Dashboard</span>
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'opened' ? 'active' : ''}`}
                  onClick={() => handleNavClick('opened')}
                >
                  <CheckCircle2 size={14} />
                  <span>Opened Sections</span>
                  {openedSectionsCount > 0 && (
                    <span className="nav-badge-pill">{openedSectionsCount}</span>
                  )}
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'demand' ? 'active' : ''}`}
                  onClick={() => handleNavClick('demand')}
                >
                  <BarChart3 size={14} />
                  <span>Demand Analytics</span>
                  
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'track' ? 'active' : ''}`}
                  onClick={() => handleNavClick('track')}
                >
                  <Search size={14} />
                  <span>Petition Ledger</span>
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'chair_archive' ? 'active' : ''}`}
                  onClick={() => handleNavClick('chair_archive')}
                  title="Quarter Rollover & Historical Archives"
                >
                  <Archive size={14} />
                  <span>Archives</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      background: quarterState?.isQuarterOpen === false ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                      color: quarterState?.isQuarterOpen === false ? '#d97706' : 'var(--emerald-core)',
                      border: '1px solid currentColor'
                    }}
                  >
                    {quarterState?.isQuarterOpen === false ? 'Closed' : (quarterState?.currentQuarter || '2Q2627')}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'request' ? 'active' : ''}`}
                  onClick={() => handleNavClick('request')}
                >
                  <BookOpen size={14} />
                  <span>Request Course</span>
                </button>

                {currentUser?.role === 'student' && (
                  <button 
                    type="button"
                    className={`nav-link-btn ${currentTab === 'profile' ? 'active' : ''}`}
                    onClick={() => handleNavClick('profile')}
                  >
                    <User size={14} />
                    <span>My Profile</span>
                  </button>
                )}

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'opened' ? 'active' : ''}`}
                  onClick={() => handleNavClick('opened')}
                >
                  <CheckCircle2 size={14} />
                  <span>Opened Sections</span>
                  {openedSectionsCount > 0 && (
                    <span className="nav-badge-pill">{openedSectionsCount}</span>
                  )}
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'track' ? 'active' : ''}`}
                  onClick={() => handleNavClick('track')}
                >
                  <Search size={14} />
                  <span>Track & Retract</span>
                </button>

                <button 
                  type="button"
                  className={`nav-link-btn ${currentTab === 'demand' ? 'active' : ''}`}
                  onClick={() => handleNavClick('demand')}
                >
                  <BarChart3 size={14} />
                  <span>Demand Analytics</span>
                  
                </button>
              </>
            )}
          </nav>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.825rem', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--mapua-crimson)' }} />
            <span>Portal Authentication Gate</span>
          </div>
        )}

        {/* Right Controls */}
        <div className="navbar-actions">
          {currentTab !== 'login' && (
            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setShowRoleMenu(false);
              }}
              aria-label="Toggle navigation menu"
              title="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          )}
          <button
            type="button"
            className="action-pill-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} />}
          </button>

          {currentTab === 'login' ? (
            loginView !== 'select' && setLoginView ? (
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setLoginView('select')}
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <ArrowLeft size={14} />
                <span>Back to Student / Faculty</span>
              </button>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Select Role Below
              </div>
            )
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="role-pill-badge"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span className="role-pill-text">
                  {currentUser?.role === 'chair' 
                    ? `Chair (${currentUser.email?.split('@')[0] || 'Admin'})` 
                    : currentUser?.studentNumber
                      ? `${currentUser.lastName || currentUser.firstName} (${currentUser.studentNumber})`
                      : 'Student Portal'}
                </span>
                <ChevronDown size={12} />
              </button>

              {showRoleMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '125%',
                    right: 0,
                    backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-bento)',
                    width: '235px',
                    padding: '0.45rem',
                    zIndex: 9999
                  }}
                >
                  <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Active Session: {currentUser?.role === 'chair' ? 'Faculty Admin' : 'Student'}
                  </div>

                  {currentUser?.role === 'chair' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          setCurrentTab('chair');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.65rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--text-pure)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <KeyRound size={14} style={{ color: 'var(--mapua-gold)' }} />
                        <span>Admin & Security Controls</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          if (onLogout) onLogout();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.65rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          marginTop: '0.25rem',
                          borderTop: '1px solid var(--border-hairline)'
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out of Admin</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          setCurrentTab('profile');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.65rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--text-pure)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <User size={14} style={{ color: 'var(--emerald-core)' }} />
                        <span>View / Edit My Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          setCurrentTab('login');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.65rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--mapua-crimson)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <ShieldCheck size={14} />
                        <span>Faculty / Chair Login</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowRoleMenu(false);
                          if (onLogout) onLogout();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.55rem 0.65rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          marginTop: '0.25rem',
                          borderTop: '1px solid var(--border-hairline)'
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out of Student Account</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {isMobileMenuOpen && currentTab !== 'login' && (
          <div className="navbar-mobile-drawer">
            {/* User Details Badge */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: currentUser?.role === 'chair' ? 'rgba(185, 28, 28, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: currentUser?.role === 'chair' ? 'var(--crimson-bright)' : 'var(--emerald-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  {currentUser?.role === 'chair' ? <ShieldCheck size={18} /> : <User size={18} />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-pure)' }}>
                    {currentUser?.role === 'chair'
                      ? (currentUser.email?.split('@')[0] || 'Program Chair')
                      : `${currentUser?.firstName || ''} ${currentUser?.lastName || 'Student'}`}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {currentUser?.role === 'chair' ? currentUser.email : `${currentUser?.studentNumber || ''} • ${currentUser?.program || 'SOIT'}`}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: currentUser?.role === 'chair' ? 'rgba(185, 28, 28, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                color: currentUser?.role === 'chair' ? 'var(--crimson-bright)' : '#d97706',
                border: '1px solid currentColor'
              }}>
                {currentUser?.role === 'chair' ? 'Faculty' : 'Student'}
              </span>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
              {currentUser?.role === 'chair' ? (
                <>
                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'chair' ? 'active' : ''}`}
                    onClick={() => handleNavClick('chair')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <ShieldCheck size={17} />
                      <span>Chair Dashboard</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'opened' ? 'active' : ''}`}
                    onClick={() => handleNavClick('opened')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={17} />
                      <span>Opened Sections</span>
                    </div>
                    {openedSectionsCount > 0 && (
                      <span className="nav-badge-pill">{openedSectionsCount}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'demand' ? 'active' : ''}`}
                    onClick={() => handleNavClick('demand')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <BarChart3 size={17} />
                      <span>Demand Analytics</span>
                    </div>
                    
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'track' ? 'active' : ''}`}
                    onClick={() => handleNavClick('track')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Search size={17} />
                      <span>Petition Ledger</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'chair_archive' ? 'active' : ''}`}
                    onClick={() => handleNavClick('chair_archive')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Archive size={17} />
                      <span>Term Rollover & Archives</span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      background: quarterState?.isQuarterOpen === false ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                      color: quarterState?.isQuarterOpen === false ? '#d97706' : 'var(--emerald-core)',
                      border: '1px solid currentColor'
                    }}>
                      {quarterState?.isQuarterOpen === false ? 'Closed' : (quarterState?.currentQuarter || '2Q2627')}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'request' ? 'active' : ''}`}
                    onClick={() => handleNavClick('request')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <BookOpen size={17} />
                      <span>Request Course</span>
                    </div>
                  </button>

                  {currentUser?.role === 'student' && (
                    <button
                      type="button"
                      className={`mobile-nav-link ${currentTab === 'profile' ? 'active' : ''}`}
                      onClick={() => handleNavClick('profile')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <User size={17} />
                        <span>My Profile</span>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'opened' ? 'active' : ''}`}
                    onClick={() => handleNavClick('opened')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={17} />
                      <span>Opened Sections</span>
                    </div>
                    {openedSectionsCount > 0 && (
                      <span className="nav-badge-pill">{openedSectionsCount}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'track' ? 'active' : ''}`}
                    onClick={() => handleNavClick('track')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Search size={17} />
                      <span>Track & Retract</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mobile-nav-link ${currentTab === 'demand' ? 'active' : ''}`}
                    onClick={() => handleNavClick('demand')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <BarChart3 size={17} />
                      <span>Demand Analytics</span>
                    </div>
                    
                  </button>
                </>
              )}
            </div>

            {/* Mobile Footer Sign Out */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-hairline)'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
