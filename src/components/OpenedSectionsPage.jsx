import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  CalendarClock,
  Building2,
  UserCheck,
  Search,
  BookOpen,
  Users,
  AlertCircle,
  Mail,
  Clock
} from 'lucide-react';
import { DEFAULT_CHAIR_CONSULTATIONS, canAdminManageCourse } from '../services/adminAuth';

const PROGRAM_CHAIR_ORDER = [
  { email: 'jpqtomas@mapua.edu.ph', dept: 'CS', fallbackName: 'Sir JP', fallbackEmail: 'JPQTomas@mapua.edu.ph', deptFull: 'Computer Science (CS)' },
  { email: 'mjcsamonte@mapua.edu.ph', dept: 'IT', fallbackName: "Ma'am Samonte", fallbackEmail: 'mjcsamonte@mapua.edu.ph', deptFull: 'Information Technology (IT)' },
  { email: 'rmdadigan@mapua.edu.ph', dept: 'DS', fallbackName: 'Sir Dadigan', fallbackEmail: 'rmdadigan@mapua.edu.ph', deptFull: 'Data Science (DS)' },
  { email: 'capascua@mapua.edu.ph', dept: 'EMC', fallbackName: "Ma'am Pascua", fallbackEmail: 'capascua@mapua.edu.ph', deptFull: 'Entertainment & Multimedia (EMC)' },
  { email: 'gldintal@mapua.edu.ph', dept: 'IS', fallbackName: "Ma'am Intal", fallbackEmail: 'gldintal@mapua.edu.ph', deptFull: 'Information Systems (IS)' }
];

export default function OpenedSectionsPage({
  openedSections = [],
  coursesWithDemand = [],
  requests = [],
  consultations = {},
  currentUser = null,
  onSectionActionChange
}) {
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const isChair = currentUser?.role === 'chair';

  const mergedConsultations = useMemo(() => {
    return { ...DEFAULT_CHAIR_CONSULTATIONS, ...(consultations || {}) };
  }, [consultations]);

  // Helper to get the Program Chair profile for a department (CS, IT, DS, EMC, IS)
  const getChairForDept = (dept) => {
    const cleanDept = String(dept || 'CS').toUpperCase();
    const matchEntry = Object.values(mergedConsultations).find(
      p => String(p.dept || '').toUpperCase() === cleanDept
    );
    if (matchEntry) return matchEntry;
    return mergedConsultations['jpqtomas@mapua.edu.ph'];
  };

  // Enrich active section records
  const enrichedRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    return openedSections
      .map(sec => {
        const codeUpper = String(sec.code || '').toUpperCase();
        const demandMatch = coursesWithDemand.find(c => String(c.code || '').toUpperCase() === codeUpper);
        const enrolledCount = demandMatch ? (demandMatch.count ?? demandMatch.requestCount ?? 0) : 15;
        const myPetition = currentUser?.role === 'student' && requests.some(r => {
          const sameCourse = String(r.courseCode || '').toUpperCase() === codeUpper;
          const sameStudent =
            (currentUser.studentNumber && String(r.studentNumber || '').trim() === String(currentUser.studentNumber).trim()) ||
            (currentUser.email && String(r.email || '').toLowerCase() === String(currentUser.email).toLowerCase());
          return sameCourse && sameStudent;
        });
        const dept = sec.dept || demandMatch?.dept || 'CS';
        const chairProfile = getChairForDept(dept);

        return {
          ...sec,
          code: codeUpper,
          title: sec.title || demandMatch?.title || 'Course Section',
          dept,
          units: sec.units || demandMatch?.units || 3,
          actionType: sec.actionType === 'CONSULTATION' ? 'CONSULTATION' : 'OPEN',
          enrolledCount,
          myPetition,
          chairProfile
        };
      })
      .filter(sec => {
        if (!q) return true;
        return (
          sec.code.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q) ||
          sec.dept.toLowerCase().includes(q)
        );
      });
  }, [openedSections, coursesWithDemand, requests, currentUser, search, mergedConsultations]);

  const openList = useMemo(() => enrichedRecords.filter(r => r.actionType === 'OPEN'), [enrichedRecords]);
  const consultList = useMemo(() => enrichedRecords.filter(r => r.actionType === 'CONSULTATION'), [enrichedRecords]);

  const handleActionChange = async (sec, newAction) => {
    if (!onSectionActionChange) return;
    await onSectionActionChange(sec, newAction);
    if (newAction === 'CLOSED') {
      setToastMsg(`Closed ${sec.code} (${sec.title}) and hid it from the student view.`);
    } else if (newAction === 'CONSULTATION') {
      setToastMsg(`Moved ${sec.code} (${sec.title}) to For Consultation.`);
    } else {
      setToastMsg(`Opened section ${sec.code} (${sec.title}) for enrollment.`);
    }
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Clean Page Header */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--emerald-core)', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={17} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Official Section Offerings & Program Chair Consultation
            </span>
          </div>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: 'var(--text-pure)',
            margin: 0
          }}>
            Opened Sections & Consultation Portal
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
            View officially opened sections ready for enrollment and courses placed under Program Chair consultation.
          </p>
        </div>

        {openedSections.length > 0 && (
          <div className="search-field-wrapper" style={{ maxWidth: '300px' }}>
            <Search size={15} />
            <input
              type="text"
              className="search-input-sleek"
              placeholder="Search course code or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* Faculty Toast Notification */}
      {toastMsg && (
        <div style={{
          padding: '0.85rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid var(--emerald-border)',
          color: 'var(--emerald-core)',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          SECTION 1: OFFICIALLY OPENED COURSE SECTIONS
          ===================================================================== */}
      <div className="dossier-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.15rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--emerald-core)' }} />
            <span>1. Officially Opened Course Sections ({openList.length})</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
            These sections have met the threshold and been opened by the Program Chair. Follow the instructions below to add them.
          </p>
        </div>

        {/* 2-Column Enrollment Instructions for Opened Sections */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(185, 28, 28, 0.1)',
              color: 'var(--crimson-bright)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.15rem' }}>
                Course Schedule Conflict?
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                Go to your <strong>Program Chair for consultation</strong> if the opened course has a schedule conflict with your current classes.
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Building2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.15rem' }}>
                After the Enrollment Period?
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                If it is already after the enrollment period, you may proceed directly to the <strong>Office of the Registrar</strong> to add the section.
              </p>
            </div>
          </div>
        </div>

        {openList.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '1rem'
          }}>
            {openList.map(sec => (
              <div
                key={sec.code}
                style={{
                  background: 'var(--bg-card)',
                  border: sec.myPetition ? '1.5px solid var(--emerald-core)' : '1px solid var(--emerald-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.9rem',
                  boxShadow: 'var(--shadow-bento)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="course-mono-code" style={{ fontSize: '0.98rem' }}>{sec.code}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-hairline)'
                      }}>
                        {sec.dept}
                      </span>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: 'var(--emerald-core)',
                      border: '1px solid var(--emerald-border)'
                    }}>
                      <CheckCircle2 size={12} /> Section Open
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.35rem' }}>
                    {sec.title}
                  </div>

                  {sec.myPetition && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#047857',
                      background: '#ecfdf5',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '0.18rem 0.5rem',
                      borderRadius: '6px'
                    }}>
                      <CheckCircle2 size={11} /> You petitioned this course
                    </div>
                  )}
                </div>

                <div style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Users size={13} style={{ color: 'var(--emerald-core)' }} />
                    <span><strong style={{ color: 'var(--text-pure)' }}>{sec.enrolledCount}</strong> petitions</span>
                  </div>

                  {isChair ? (
                    canAdminManageCourse(currentUser?.email, sec, consultations) ? (
                      <select
                        className="chair-status-select"
                        value={sec.actionType}
                        onChange={e => handleActionChange(sec, e.target.value)}
                        style={{ fontSize: '0.74rem', padding: '0.32rem 0.6rem', fontWeight: 700, borderColor: 'var(--emerald-core)', color: 'var(--emerald-core)' }}
                      >
                        <option value="OPEN">Open Section</option>
                        <option value="CONSULTATION">For Consultation</option>
                        <option value="CLOSED">Close Section (Hide)</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700 }}>
                        Managed by {sec.dept} Chair
                      </span>
                    )
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--emerald-core)', fontWeight: 700 }}>
                      Ready for Enrollment
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '2rem 1.25rem',
            textAlign: 'center',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-hairline)',
            color: 'var(--text-muted)',
            fontSize: '0.84rem'
          }}>
            No sections are currently marked as Opened.
          </div>
        )}
      </div>

      {/* =====================================================================
          SECTION 2: FOR CONSULTATION & PROGRAM CHAIR SCHEDULE DIRECTORY
          ===================================================================== */}
      <div className="dossier-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.15rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CalendarClock size={18} style={{ color: '#d97706' }} />
            <span>2. Courses For Consultation & Program Chair Directory ({consultList.length})</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
            If your requested course is marked <strong>For Consultation</strong> below, please consult the respective <strong>SOIT Program Chair</strong> for your degree program during their scheduled consultation hours:
          </p>
        </div>

        {/* Courses Marked "For Consultation" */}
        {consultList.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              Courses Currently Marked For Consultation ({consultList.length})
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {consultList.map(sec => {
                const chair = sec.chairProfile;
                return (
                  <div
                    key={sec.code}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      boxShadow: 'var(--shadow-bento)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span className="course-mono-code" style={{ fontSize: '0.98rem' }}>{sec.code}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: 'var(--bg-input)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-hairline)'
                          }}>
                            {sec.dept}
                          </span>
                        </div>

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: 'rgba(245, 158, 11, 0.14)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.35)'
                        }}>
                          <CalendarClock size={12} /> For Consultation
                        </span>
                      </div>

                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.55rem' }}>
                        {sec.title}
                      </div>

                      {/* Assigned Program Chair & Live Hours Box */}
                      <div style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.8rem',
                        fontSize: '0.77rem'
                      }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.15rem' }}>
                          Consult {sec.dept} Program Chair: <span style={{ color: 'var(--crimson-bright)' }}>{chair.name}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: '0.35rem' }}>
                          Email: <strong>{chair.displayEmail || chair.email}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {(chair.slots || []).map((slot, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.73rem', color: 'var(--text-pure)', fontWeight: 600 }}>
                              <Clock size={11} style={{ color: '#d97706' }} />
                              <span>{slot.day}: {slot.startTime} – {slot.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      paddingTop: '0.7rem',
                      borderTop: '1px solid var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <strong>{sec.enrolledCount}</strong> student petitions
                      </span>

                      {isChair ? (
                        canAdminManageCourse(currentUser?.email, sec, consultations) ? (
                          <select
                            className="chair-status-select"
                            value={sec.actionType}
                            onChange={e => handleActionChange(sec, e.target.value)}
                            style={{ fontSize: '0.74rem', padding: '0.32rem 0.6rem', fontWeight: 700, borderColor: '#d97706', color: '#d97706' }}
                          >
                            <option value="CONSULTATION">For Consultation</option>
                            <option value="OPEN">Open Section</option>
                            <option value="CLOSED">Close Section (Hide)</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700 }}>
                            Managed by {sec.dept} Chair
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700 }}>
                          See Program Chair
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete SOIT Program Chair Consultation Directory (CS, IT, DS, EMC, IS) */}
        <div>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            SOIT Program Chairs & Official Consultation Hours
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))',
            gap: '0.9rem'
          }}>
            {PROGRAM_CHAIR_ORDER.map(item => {
              const prof = mergedConsultations[item.email] || {};
              const displayName = prof.name || item.fallbackName;
              const displayEmail = prof.displayEmail || item.fallbackEmail;
              const slots = Array.isArray(prof.slots) && prof.slots.length > 0
                ? prof.slots
                : [{ day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' }];

              return (
                <div
                  key={item.email}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.18rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(185, 28, 28, 0.1)',
                        color: 'var(--crimson-bright)'
                      }}>
                        {item.deptFull}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                      {displayName}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <Mail size={13} style={{ color: 'var(--crimson-bright)', flexShrink: 0 }} />
                      <a href={`mailto:${displayEmail}`} style={{ color: 'var(--crimson-bright)', fontWeight: 700, textDecoration: 'none' }}>
                        {displayEmail}
                      </a>
                    </div>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-hairline)',
                    paddingTop: '0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Consultation Schedule (Day & Time)
                    </div>
                    {slots.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-pure)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={12} style={{ color: '#d97706' }} />
                          {s.day}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                          {s.startTime} – {s.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
