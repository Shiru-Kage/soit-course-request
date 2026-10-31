import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import EnrollmentWizard from './components/EnrollmentWizard';
import StatusTracker from './components/StatusTracker';
import DemandAnalytics from './components/DemandAnalytics';
import ChairDashboard from './components/ChairDashboard';
import RoleLoginPage from './components/RoleLoginPage';
import StudentProfilePage from './components/StudentProfilePage';
import OpenedSectionsPage from './components/OpenedSectionsPage';
import ConfirmationModal from './components/ConfirmationModal';
import InteractiveAtmosphere from './components/InteractiveAtmosphere';
import MilestoneCelebration from './components/MilestoneCelebration';
import BlueprintMode from './components/BlueprintMode';
import { SOIT_COURSES } from './data/courses';
import { 
  fetchAllRequests, 
  submitCourseRequest, 
  retractRequest, 
  updateRequestStatus, 
  calculateCourseDemands,
  getCustomCourses,
  fetchCustomCourses,
  saveCustomCourses,
  getOpenedSections,
  fetchOpenedSections,
  saveOpenedSections,
  openCourseSection,
  closeCourseSection,
  saveLocalRequests,
  getLocalQuarterState,
  saveLocalQuarterState,
  fetchQuarterState,
  endCurrentQuarter,
  openNewQuarter,
  reopenArchivedQuarter,
  computeNextQuarterCode,
  deleteArchivedQuarter,
  deleteArchivedPetitionRecord
} from './services/enrollmentStorage';
import { updateStudentProfile, syncStudentsFromServer } from './services/studentAuth';
import { getLocalConsultations, fetchAdminConsultations, saveLocalConsultations, saveAdminConsultationProfile, DEFAULT_CHAIR_CONSULTATIONS, canAdminManageCourse } from './services/adminAuth';

export default function App() {
  // Theme & Font
  const [theme, setTheme] = useState(() => localStorage.getItem('soit_theme') || 'mapua');

  // Role Session (Requires authenticated email/studentNumber for students, or chair email for faculty)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('soit_user_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed?.role === 'student' && (!parsed.email || !parsed.studentNumber)) {
        localStorage.removeItem('soit_user_session');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const saved = localStorage.getItem('soit_user_session');
      if (!saved) return 'login';
      const u = JSON.parse(saved);
      if (u?.role === 'student' && (!u.email || !u.studentNumber)) return 'login';
      return u?.role === 'chair' ? 'chair' : 'request';
    } catch {
      return 'login';
    }
  });
  const [requests, setRequests] = useState([]);
  const [customCourses, setCustomCourses] = useState(() => getCustomCourses());
  const [openedSections, setOpenedSections] = useState(() => getOpenedSections());
  const [consultations, setConsultations] = useState(() => getLocalConsultations());
  const [quarterState, setQuarterState] = useState(() => getLocalQuarterState());
  const [confirmedRequest, setConfirmedRequest] = useState(null);
  const [trackerInitialQuery, setTrackerInitialQuery] = useState('');
  const [loginView, setLoginView] = useState('select');
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('soit_theme', theme);
  }, [theme]);

  // Apply Font permanently to Plus Jakarta Sans
  useEffect(() => {
    document.body.className = 'font-jakarta';
    localStorage.setItem('soit_font', 'jakarta');
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'mapua' : 'dark'));
  };

  // Combine static SOIT courses + any newly auto-cataloged or chair-added courses
  const allCourses = useMemo(() => {
    return [...SOIT_COURSES, ...customCourses];
  }, [customCourses]);

  // Compute live demands
  const coursesWithDemand = useMemo(() => {
    return calculateCourseDemands(requests, allCourses);
  }, [requests, allCourses]);

  // Initial fetch and SSE live updates
  useEffect(() => {
    fetchAllRequests().then(data => {
      if (Array.isArray(data)) setRequests(data);
    });
    fetchCustomCourses().then(courses => {
      if (Array.isArray(courses)) setCustomCourses(courses);
    });
    fetchOpenedSections().then(sections => {
      if (Array.isArray(sections)) setOpenedSections(sections);
    });
    fetchAdminConsultations().then(map => {
      if (map && typeof map === 'object') setConsultations(map);
    });
    fetchQuarterState().then(qs => {
      if (qs && typeof qs === 'object') setQuarterState(qs);
    });
    syncStudentsFromServer().catch(() => {});

    // Connect to Server-Sent Events if available
    let evtSource;
    try {
      evtSource = new EventSource('/api/events');
      evtSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'requests_updated' && Array.isArray(payload.requests)) {
            setRequests(payload.requests);
          } else if (payload.type === 'courses_updated' && Array.isArray(payload.courses)) {
            saveCustomCourses(payload.courses);
            setCustomCourses(payload.courses);
          } else if (payload.type === 'opened_sections_updated' && Array.isArray(payload.openedSections)) {
            saveOpenedSections(payload.openedSections);
            setOpenedSections(payload.openedSections);
          } else if (payload.type === 'consultations_updated' && payload.consultations) {
            const merged = { ...DEFAULT_CHAIR_CONSULTATIONS, ...payload.consultations };
            saveLocalConsultations(merged);
            setConsultations(merged);
          } else if (payload.type === 'quarter_updated' && payload.quarterState) {
            saveLocalQuarterState(payload.quarterState);
            setQuarterState(payload.quarterState);
          } else if (payload.type === 'init') {
            if (Array.isArray(payload.requests)) {
              saveLocalRequests(payload.requests);
              setRequests(payload.requests);
            }
            if (Array.isArray(payload.courses) && payload.courses.length > 0) {
              saveCustomCourses(payload.courses);
              setCustomCourses(payload.courses);
            }
            if (Array.isArray(payload.openedSections)) {
              saveOpenedSections(payload.openedSections);
              setOpenedSections(payload.openedSections);
            }
            if (payload.quarterState && typeof payload.quarterState === 'object') {
              saveLocalQuarterState(payload.quarterState);
              setQuarterState(payload.quarterState);
            }
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      if (evtSource) evtSource.close();
    };
  }, []);

  const handleLoginStudent = (studentProfile) => {
    const user = {
      role: 'student',
      studentNumber: studentProfile.studentNumber,
      email: studentProfile.email,
      firstName: studentProfile.firstName,
      lastName: studentProfile.lastName,
      program: studentProfile.program,
      unitsLeft: String(studentProfile.unitsLeft ?? '')
    };
    setCurrentUser(user);
    localStorage.setItem('soit_user_session', JSON.stringify(user));
    setCurrentTab('request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStudentProfile = async (updates) => {
    if (!currentUser || currentUser.role !== 'student') return;
    const res = await updateStudentProfile(currentUser.email, updates);
    if (res.success && res.student) {
      setCurrentUser(res.student);
      localStorage.setItem('soit_user_session', JSON.stringify(res.student));
    } else {
      const merged = { ...currentUser, ...updates };
      setCurrentUser(merged);
      localStorage.setItem('soit_user_session', JSON.stringify(merged));
    }
  };

  const handleLoginChair = (email) => {
    const user = { role: 'chair', email };
    setCurrentUser(user);
    localStorage.setItem('soit_user_session', JSON.stringify(user));
    setCurrentTab('chair');
  };

  const handleLogout = () => {
    localStorage.removeItem('soit_user_session');
    setCurrentUser(null);
    setCurrentTab('login');
  };

  const handleSubmitSuccess = async (data) => {
    const res = await submitCourseRequest(data);
    if (res.success) {
      setCustomCourses(getCustomCourses());
      setRequests(prev => {
        const next = prev.some(r => r.id === res.request.id) ? prev : [...prev, res.request];
        const count = next.filter(r => String(r.courseCode).toUpperCase() === String(res.request.courseCode).toUpperCase()).length;
        if (count >= 15) setShowMilestoneCelebration(true);
        return next;
      });
      setConfirmedRequest(res.request);
    }
    return res;
  };

  const handleRetract = async (id) => {
    await retractRequest(id, currentUser);
    setRequests(prev => prev.filter(r => r.id !== id && r.studentNumber !== id));
  };

  const handleUpdateStatus = async (id, newStatus) => {
    await updateRequestStatus(id, newStatus);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleCourseAdded = () => {
    setCustomCourses(getCustomCourses());
  };

  const handleSectionActionChange = async (course, actionType) => {
    if (!canAdminManageCourse(currentUser?.email, course, consultations)) {
      return;
    }
    const codeUpper = String(course.code || '').toUpperCase();
    if (actionType === 'CLOSED') {
      const next = await closeCourseSection(codeUpper);
      setOpenedSections(next);
      setRequests(prev => prev.map(r =>
        String(r.courseCode || '').toUpperCase() === codeUpper && (r.status === 'Section Opened' || r.status === 'For Consultation')
          ? { ...r, status: 'Threshold Met' }
          : r
      ));
    } else {
      const mode = actionType === 'CONSULTATION' ? 'CONSULTATION' : 'OPEN';
      const next = await openCourseSection(course, currentUser?.email || 'Program Chair', mode);
      if (mode === 'OPEN') setShowMilestoneCelebration(true);
      setOpenedSections(next);
      const targetStatus = mode === 'CONSULTATION' ? 'For Consultation' : 'Section Opened';
      setRequests(prev => prev.map(r =>
        String(r.courseCode || '').toUpperCase() === codeUpper ? { ...r, status: targetStatus } : r
      ));
    }
  };

  const handleSaveConsultationProfile = async (email, updates) => {
    const nextMap = await saveAdminConsultationProfile(email, updates);
    setConsultations(nextMap);
  };

  const handleEndQuarter = async ({ actorEmail, actorName, openNextQuarter = false, nextQuarterCode = '' }) => {
    const res = await endCurrentQuarter({ actorEmail, actorName, openNextQuarter, nextQuarterCode });
    if (res.success && res.quarterState) {
      setQuarterState(res.quarterState);
      setRequests([]);
      setOpenedSections([]);
    }
    return res;
  };

  const handleReopenQuarter = async ({ quarterCode, actorEmail, actorName }) => {
    const res = await reopenArchivedQuarter({ quarterCode, actorEmail, actorName });
    if (res.success) {
      if (res.quarterState) setQuarterState(res.quarterState);
      if (Array.isArray(res.requests)) setRequests(res.requests);
      if (Array.isArray(res.openedSections)) setOpenedSections(res.openedSections);
    }
    return res;
  };

  const handleOpenQuarter = async ({ quarterCode, actorEmail, actorName }) => {
    const res = await openNewQuarter({ quarterCode, actorEmail, actorName });
    if (res.success && res.quarterState) {
      setQuarterState(res.quarterState);
      setRequests([]);
      setOpenedSections([]);
    }
    return res;
  };

  const handleDeleteArchivedQuarter = async ({ quarterId, quarterCode, actorEmail, actorName }) => {
    const res = await deleteArchivedQuarter({ quarterId, quarterCode, actorEmail, actorName });
    if (res.success && res.quarterState) {
      setQuarterState(res.quarterState);
    }
    return res;
  };

  const handleDeleteArchivedPetitionRecord = async ({ quarterCode, requestId, actorEmail, actorName }) => {
    const res = await deleteArchivedPetitionRecord({ quarterCode, requestId, actorEmail, actorName });
    if (res.success && res.quarterState) {
      setQuarterState(res.quarterState);
    }
    return res;
  };

  return (
    <div className="app-container">
      <InteractiveAtmosphere />
      <MilestoneCelebration 
        active={showMilestoneCelebration} 
        onComplete={() => setShowMilestoneCelebration(false)} 
      />
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onLogout={handleLogout}
        loginView={loginView}
        setLoginView={setLoginView}
        openedSectionsCount={openedSections.length}
        quarterState={quarterState}
        coursesWithDemand={coursesWithDemand}
        requests={requests}
        openedSections={openedSections}
        onSectionActionChange={handleSectionActionChange}
      />

      {/* Main View Area */}
      <main className="main-content">
        {currentTab === 'login' && (
          <RoleLoginPage 
            onLoginStudent={handleLoginStudent}
            onLoginChair={handleLoginChair}
            view={loginView}
            setView={setLoginView}
            quarterState={quarterState}
          />
        )}

        {currentTab !== 'login' && currentTab !== 'profile' && currentUser?.role !== 'chair' && !quarterState?.isQuarterOpen ? (
          <div style={{ maxWidth: '680px', margin: '3rem auto', padding: '0 1rem' }}>
            <div
              className="dossier-card"
              style={{
                padding: '2.75rem 2.25rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.15rem',
                borderColor: 'rgba(185, 28, 28, 0.3)',
                background: 'linear-gradient(180deg, rgba(185, 28, 28, 0.06) 0%, var(--bg-card) 100%)'
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '18px',
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  boxShadow: '0 8px 24px rgba(185, 28, 28, 0.14)',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/soit-logo-icon.png"
                  alt="Mapúa SOIT Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '0.3rem 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#d97706',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Academic Quarter Closed • {quarterState?.lastClosedQuarter || quarterState?.currentQuarter || '2Q2627'} Concluded
              </span>

              <h1
                style={{
                  fontSize: 'clamp(1.65rem, 3.2vw, 2.2rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: 'var(--text-pure)',
                  margin: 0
                }}
              >
                The Quarter has not yet begun.
              </h1>

              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-muted)',
                  maxWidth: '520px',
                  lineHeight: 1.6,
                  margin: 0
                }}
              >
                Course petitioning for the <strong>{quarterState?.lastClosedQuarter || quarterState?.currentQuarter || '2Q2627'}</strong> academic term has officially ended. The Program Chairs and SOIT Administration have not yet opened the next quarter (<strong>{computeNextQuarterCode(quarterState?.lastClosedQuarter || quarterState?.currentQuarter || '2Q2627')}</strong>). Please check back once the new quarter is opened.
              </p>

              {currentUser && (
                <div
                  style={{
                    padding: '0.7rem 1.15rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                  }}
                >
                  Signed in as <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.studentNumber} • {currentUser.program})
                </div>
              )}

              <div className="closed-quarter-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', width: '100%' }}>
                {currentUser?.role === 'student' && (
                  <button
                    type="button"
                    className="btn-secondary-ghost"
                    onClick={() => setCurrentTab('profile')}
                    style={{ padding: '0.7rem 1.25rem', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    View My Student Profile
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary-ghost"
                  onClick={() => {
                    setLoginView('chair_login');
                    setCurrentTab('login');
                  }}
                  style={{ padding: '0.7rem 1.25rem', fontSize: '0.84rem', fontWeight: 700, color: 'var(--crimson-bright)' }}
                >
                  Faculty / Chair Login
                </button>

                <button
                  type="button"
                  className="tactile-btn-primary"
                  onClick={handleLogout}
                  style={{ padding: '0.7rem 1.35rem', fontSize: '0.84rem' }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'request' && (
              <EnrollmentWizard
                coursesWithDemand={coursesWithDemand}
                onSubmitSuccess={handleSubmitSuccess}
                currentUser={currentUser}
                onOpenProfile={() => setCurrentTab('profile')}
                onOpenTracker={(studentNum) => {
                  setTrackerInitialQuery(studentNum || currentUser?.studentNumber || '');
                  setCurrentTab('track');
                }}
                onReopenModal={(req) => setConfirmedRequest(req)}
              />
            )}

            {currentTab === 'profile' && (
              <StudentProfilePage
                currentUser={currentUser}
                onUpdateStudentProfile={handleUpdateStudentProfile}
                onGoToRequestCourse={() => setCurrentTab('request')}
                myPetitionsCount={requests.filter(r => 
                  currentUser?.studentNumber && (
                    String(r.studentNumber || '').trim() === String(currentUser.studentNumber).trim() ||
                    String(r.email || '').toLowerCase() === String(currentUser.email || '').toLowerCase()
                  )
                ).length}
              />
            )}

            {currentTab === 'track' && (
              <StatusTracker
                requests={requests}
                coursesWithDemand={coursesWithDemand}
                onRetract={handleRetract}
                initialQuery={trackerInitialQuery}
                currentUser={currentUser}
                consultations={consultations}
              />
            )}

            {currentTab === 'demand' && (
              <DemandAnalytics
                coursesWithDemand={coursesWithDemand}
                requests={requests}
                currentUser={currentUser}
                consultations={consultations}
              />
            )}

            {currentTab === 'opened' && (
              <OpenedSectionsPage
                openedSections={openedSections}
                coursesWithDemand={coursesWithDemand}
                requests={requests}
                consultations={consultations}
                currentUser={currentUser}
                onSectionActionChange={handleSectionActionChange}
              />
            )}

            {(currentTab === 'chair' || currentTab === 'chair_archive') && (
              <ChairDashboard
                requests={requests}
                coursesWithDemand={coursesWithDemand}
                openedSections={openedSections}
                onSectionActionChange={handleSectionActionChange}
                consultations={consultations}
                onSaveConsultationProfile={handleSaveConsultationProfile}
                onUpdateStatus={handleUpdateStatus}
                onCourseAdded={handleCourseAdded}
                currentUser={currentUser}
                onLogout={handleLogout}
                quarterState={quarterState}
                onEndQuarter={handleEndQuarter}
                onOpenQuarter={handleOpenQuarter}
                onReopenQuarter={handleReopenQuarter}
                onDeleteArchivedQuarter={handleDeleteArchivedQuarter}
                onDeleteArchivedPetitionRecord={handleDeleteArchivedPetitionRecord}
                initialSubTab={currentTab === 'chair_archive' ? 'quarters' : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmedRequest && (
        <ConfirmationModal
          request={confirmedRequest}
          onClose={() => setConfirmedRequest(null)}
          onTrack={(studentNum) => {
            setTrackerInitialQuery(studentNum || confirmedRequest?.studentNumber || confirmedRequest?.id || '');
            setCurrentTab('track');
          }}
        />
      )}

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-hairline)', 
        padding: '2rem 1.5rem', 
        backgroundColor: 'var(--bg-card)', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
            Mapúa University • School of Information Technology (SOIT)
          </p>
          <p>
            Official Dynamic Course Request & Section Demand System. Minimum 15-Student Section Threshold Policy.
          </p>
          <p style={{ fontSize: '0.725rem', color: 'var(--text-light)' }}>
            Compliant with Mapúa University Academic Regulations & Enrollment Guidelines.
          </p>
        </div>
      </footer>
      <BlueprintMode />
    </div>
  );
}
