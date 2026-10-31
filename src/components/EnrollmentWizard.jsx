import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  PlusCircle,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DEPARTMENTS, MIN_STUDENT_THRESHOLD } from '../data/courses';
import { validateForm, validateUnlistedCourse, splitCombinedCourseFormat } from '../utils/validation';

export default function EnrollmentWizard({ 
  coursesWithDemand = [], 
  onSubmitSuccess,
  currentUser = null,
  onOpenProfile,
  onOpenTracker,
  onReopenModal
}) {
  // 3-Step Course Request Flow:
  // 1: Choose Course (Catalog)
  // 2: Add Missing Course (Unlisted)
  // 3: Review & Submit
  const [step, setStep] = useState(1);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  const [formData, setFormData] = useState(() => ({
    studentNumber: currentUser?.studentNumber || '',
    lastName: currentUser?.lastName || '',
    firstName: currentUser?.firstName || '',
    email: currentUser?.email || '',
    unitsLeft: currentUser?.unitsLeft ?? '',
    program: currentUser?.program || '',
    courseCode: '',
    courseTitle: '',
    customCombinedInput: '',
    customCourseCode: '',
    customCourseTitle: '',
    agreeTerms: false
  }));

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        studentNumber: currentUser.studentNumber || prev.studentNumber,
        lastName: currentUser.lastName || prev.lastName,
        firstName: currentUser.firstName || prev.firstName,
        email: currentUser.email || prev.email,
        unitsLeft: currentUser.unitsLeft ?? prev.unitsLeft,
        program: currentUser.program || prev.program
      }));
    }
  }, [currentUser]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Course Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const filteredCourses = useMemo(() => {
    return coursesWithDemand.filter(c => {
      const matchesDept = selectedDept === 'ALL' || c.dept === selectedDept || (c.code && c.code.startsWith(selectedDept));
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (c.code && c.code.toLowerCase().includes(q)) || 
        (c.title && c.title.toLowerCase().includes(q));
      return matchesDept && matchesSearch;
    });
  }, [coursesWithDemand, selectedDept, searchQuery]);

  // Top demand courses for the sidebar
  const topDemandCourses = useMemo(() => {
    return [...coursesWithDemand]
      .sort((a, b) => (b.count || b.requestCount || 0) - (a.count || a.requestCount || 0))
      .slice(0, 6);
  }, [coursesWithDemand]);

  const metrics = useMemo(() => {
    const totalPetitions = coursesWithDemand.reduce((acc, c) => acc + (c.count || c.requestCount || 0), 0);
    const metThreshold = coursesWithDemand.filter(c => (c.count || c.requestCount || 0) >= MIN_STUDENT_THRESHOLD).length;
    const nearThreshold = coursesWithDemand.filter(c => (c.count || c.requestCount || 0) >= 10 && (c.count || c.requestCount || 0) < MIN_STUDENT_THRESHOLD).length;
    return { totalPetitions, metThreshold, nearThreshold };
  }, [coursesWithDemand]);

  // Live validation for Step 2 (Add Missing Course)
  const unlistedPreview = useMemo(() => {
    if (!formData.customCourseCode && !formData.customCourseTitle) {
      return null;
    }
    return validateUnlistedCourse(
      formData.customCourseCode,
      formData.customCourseTitle,
      coursesWithDemand
    );
  }, [formData.customCourseCode, formData.customCourseTitle, coursesWithDemand]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Smart auto-split if student pastes "CSS122P Computer Programming 3" into Course Code
  const handleCombinedFormatChange = (rawVal) => {
    const split = splitCombinedCourseFormat(rawVal);
    setFormData(prev => ({
      ...prev,
      customCombinedInput: rawVal,
      customCourseCode: split.code || (rawVal.trim().split(/\s+/)[0] || '').toUpperCase(),
      customCourseTitle: split.title || '',
      courseCode: '',
      courseTitle: ''
    }));
    setErrors(prev => ({ ...prev, customCourseCode: null, customCourseTitle: null, course: null }));
  };

  const handleSelectCourse = (course) => {
    setSubmittedReceipt(null);
    setFormData(prev => ({
      ...prev,
      courseCode: course.code,
      courseTitle: course.title,
      customCombinedInput: '',
      customCourseCode: '',
      customCourseTitle: ''
    }));
    if (errors.courseCode || errors.course) {
      setErrors(prev => ({ ...prev, courseCode: null, course: null }));
    }
  };

  const handleQuickAutoAddFromSearch = () => {
    setSubmittedReceipt(null);
    const q = searchQuery.trim();
    if (q) {
      const split = splitCombinedCourseFormat(q);
      setFormData(prev => ({
        ...prev,
        courseCode: '',
        courseTitle: '',
        customCombinedInput: q,
        customCourseCode: split.code || q.split(/\s+/)[0].toUpperCase(),
        customCourseTitle: split.title || ''
      }));
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.courseCode && !formData.customCourseCode) {
      newErrors.course = 'Please enter both the Course Code and Course Title.';
    } else if (formData.customCourseCode) {
      const check = validateUnlistedCourse(formData.customCourseCode, formData.customCourseTitle, coursesWithDemand);
      if (!check.valid) {
        if (check.missingTitle) {
          newErrors.customCourseTitle = check.error;
        } else {
          newErrors.customCourseCode = check.error;
        }
        newErrors.course = check.error;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartAnotherCourse = () => {
    setSubmittedReceipt(null);
    setSubmitError('');
    setErrors({});
    setSearchQuery('');
    setFormData(prev => ({
      ...prev,
      courseCode: '',
      courseTitle: '',
      customCombinedInput: '',
      customCourseCode: '',
      customCourseTitle: '',
      agreeTerms: false
    }));
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(formData, coursesWithDemand);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await onSubmitSuccess(formData);
      if (res && res.success) {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 }
        });
        setSubmittedReceipt(res.request);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError(res?.message || res?.error || 'Failed to submit request. Please try again.');
      }
    } catch (err) {
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourseObj = useMemo(() => {
    if (formData.courseCode) {
      return coursesWithDemand.find(c => c.code === formData.courseCode) || null;
    }
    if (unlistedPreview && unlistedPreview.valid && unlistedPreview.existingMatch) {
      return unlistedPreview.existingMatch;
    }
    return null;
  }, [formData.courseCode, coursesWithDemand, unlistedPreview]);

  return (
    <div className="enrollment-workstation" style={{ marginTop: '0.5rem' }}>
      <div className="workstation-layout">
        
        {/* =========================================================================
            LEFT SIDEBAR: CLEAN TOP DEMAND OVERVIEW
            ========================================================================= */}
        <aside className="command-dock">
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.2rem' }}>
              Most Requested Courses
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              15 students needed to open a section
            </p>
          </div>

          {/* Simple 3-Metric Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '0.5rem',
            background: 'var(--bg-subtle)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                {metrics.totalPetitions}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Requests</div>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald-core)' }}>
                {metrics.metThreshold}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Reached 15</div>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-bright)' }}>
                {metrics.nearThreshold}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Almost Full</div>
            </div>
          </div>

          {/* Clean Course List */}
          <div className="demand-radar-list">
            {topDemandCourses.map((c, idx) => {
              const count = c.count || c.requestCount || 0;
              const pct = Math.min(100, Math.round((count / MIN_STUDENT_THRESHOLD) * 100));
              const isMet = count >= MIN_STUDENT_THRESHOLD;
              const isSelected = !submittedReceipt && formData.courseCode === c.code;

              return (
                <div 
                  key={c.id || `${c.code}-${idx}`} 
                  className={`radar-item ${isMet ? 'met' : ''}`}
                  style={isSelected ? { borderColor: 'var(--crimson-bright)', background: 'var(--bg-active)' } : {}}
                  onClick={() => {
                    handleSelectCourse(c);
                    if (submittedReceipt || step === 2) setStep(1);
                  }}
                >
                  <div className="radar-header">
                    <span className="radar-code">{c.code}</span>
                    <span className="radar-count">
                      <strong style={{ color: isMet ? 'var(--emerald-core)' : 'var(--text-pure)' }}>{count}</strong> / {MIN_STUDENT_THRESHOLD}
                    </span>
                  </div>
                  <div className="radar-title">{c.title}</div>
                  <div className="micro-meter">
                    <div 
                      className={`micro-fill ${isMet ? 'met' : ''}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* =========================================================================
            MAIN CARD: CLEAN 3-STEP WORKFLOW
            ========================================================================= */}
        <div className="dossier-card">
          
          {/* Clean 3-Step Bar */}
          <div className="segmented-stepper">
            <button 
              type="button"
              className={`step-tab-btn ${!submittedReceipt && step === 1 ? 'active' : ''} ${(step > 1 || submittedReceipt) ? 'completed' : ''}`}
              onClick={() => { setSubmittedReceipt(null); setStep(1); }}
            >
              <span className="step-num-badge">{(step > 1 || submittedReceipt) ? '✓' : '1'}</span>
              <span>Choose Course</span>
            </button>

            <button 
              type="button"
              className={`step-tab-btn ${!submittedReceipt && step === 2 ? 'active' : ''} ${(step > 2 || submittedReceipt) ? 'completed' : ''}`}
              onClick={() => { setSubmittedReceipt(null); setStep(2); }}
            >
              <span className="step-num-badge">{(step > 2 || submittedReceipt) ? '✓' : '2'}</span>
              <span>Add Missing Course</span>
            </button>

            <button 
              type="button"
              className={`step-tab-btn ${!submittedReceipt && step === 3 ? 'active' : ''} ${submittedReceipt ? 'completed' : ''}`}
              onClick={() => {
                if (formData.courseCode || (unlistedPreview && unlistedPreview.valid)) {
                  setSubmittedReceipt(null);
                  setStep(3);
                }
              }}
            >
              <span className="step-num-badge">{submittedReceipt ? '✓' : '3'}</span>
              <span>Review & Submit</span>
            </button>
          </div>

          {/* =====================================================================
              POST-SUBMISSION SUCCESS VIEW
              ===================================================================== */}
          {submittedReceipt ? (
            <div className="step-content-anim" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.14)',
                color: 'var(--emerald-core)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.4rem' }}>
                Course Request Submitted
              </h2>

              <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Your request for <strong>{submittedReceipt.courseCode} — {submittedReceipt.courseTitle}</strong> has been recorded (Ref: <strong>{submittedReceipt.id}</strong>).
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="tactile-btn-primary"
                  onClick={handleStartAnotherCourse}
                >
                  <PlusCircle size={16} />
                  <span>Request Another Course</span>
                </button>

                {onOpenTracker && (
                  <button
                    type="button"
                    className="tactile-btn-secondary"
                    onClick={() => onOpenTracker(submittedReceipt.studentNumber)}
                  >
                    <span>View My Requests</span>
                  </button>
                )}

                {onReopenModal && (
                  <button
                    type="button"
                    className="tactile-btn-secondary"
                    onClick={() => onReopenModal(submittedReceipt)}
                  >
                    <Printer size={15} />
                    <span>Print Receipt</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* =====================================================================
                  STEP 1: CHOOSE COURSE FROM CATALOG
                  ===================================================================== */}
              {step === 1 && (
                <div className="step-content-anim">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.2rem' }}>
                        Choose a Course
                      </h2>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Click a course below to select it, or add a missing course if yours isn't listed.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="tactile-btn-secondary"
                      onClick={handleQuickAutoAddFromSearch}
                      style={{ fontSize: '0.825rem', padding: '0.55rem 0.95rem' }}
                    >
                      <PlusCircle size={14} />
                      <span>Can't find your course? Add it here</span>
                    </button>
                  </div>

                  {/* Selected Course Bar */}
                  {formData.courseCode && (
                    <div style={{ 
                      marginBottom: '1.25rem', 
                      padding: '0.85rem 1.15rem', 
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid var(--emerald-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.925rem', color: 'var(--text-pure)' }}>
                        Selected: <strong>{formData.courseCode} — {formData.courseTitle}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          onClick={() => handleChange('courseCode', '')}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          className="tactile-btn-primary"
                          onClick={() => {
                            setStep(3);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          <span>Continue to Review</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search & Filter Bar */}
                  <div className="course-control-toolbar">
                    <div className="search-field-wrapper">
                      <Search size={16} />
                      <input
                        type="text"
                        className="search-input-sleek"
                        placeholder="Search by course code or title (e.g. CSS122P or Web Systems)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="dept-chip-rack">
                      {DEPARTMENTS.map((dept, dIdx) => {
                        const deptId = typeof dept === 'string' ? dept : dept.id;
                        const deptName = typeof dept === 'string' ? dept : (dept.name || dept.id);
                        return (
                          <button
                            key={deptId || dIdx}
                            type="button"
                            className={`dept-chip ${selectedDept === deptId ? 'active' : ''}`}
                            onClick={() => setSelectedDept(deptId)}
                          >
                            {deptName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean Course Grid */}
                  <div className="tactical-course-grid">
                    {filteredCourses.map((course, idx) => {
                      const count = course.count || course.requestCount || 0;
                      const pct = Math.min(100, Math.round((count / MIN_STUDENT_THRESHOLD) * 100));
                      const isMet = count >= MIN_STUDENT_THRESHOLD;
                      const isSelected = formData.courseCode === course.code;

                      return (
                        <div
                          key={course.id || `${course.code}-${idx}`}
                          className={`course-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectCourse(course)}
                        >
                          <div className="course-tile-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span className="course-mono-code">{course.code}</span>
                              {(course.isAutoCataloged || course.isCustom) && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: 'var(--emerald-core)'
                                }}>
                                  New
                                </span>
                              )}
                            </div>
                            
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: isMet ? 'var(--emerald-core)' : 'var(--text-muted)'
                            }}>
                              {count} / {MIN_STUDENT_THRESHOLD}
                            </span>
                          </div>

                          <div className="course-full-title" style={{ margin: '0.25rem 0 0.5rem' }}>
                            {course.title}
                          </div>

                          <div className="micro-meter">
                            <div 
                              className={`micro-fill ${isMet ? 'met' : ''}`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty Search Prompt */}
                  {filteredCourses.length === 0 && (
                    <div style={{ 
                      padding: '2rem 1.5rem', 
                      textAlign: 'center', 
                      background: 'var(--bg-subtle)', 
                      borderRadius: 'var(--radius-lg)',
                      marginTop: '1rem',
                      border: '1px solid var(--border-hairline)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-pure)' }}>
                        "{searchQuery}" isn't in the catalog yet
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '440px', margin: 0 }}>
                        You can add this course right now and your request will be counted immediately.
                      </p>
                      <button
                        type="button"
                        className="tactile-btn-primary"
                        onClick={handleQuickAutoAddFromSearch}
                        style={{ marginTop: '0.25rem' }}
                      >
                        <PlusCircle size={15} />
                        <span>Add "{searchQuery}"</span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Bar */}
                  <div className="button-dock-actions">
                    <button 
                      type="button"
                      className="tactile-btn-secondary"
                      onClick={handleQuickAutoAddFromSearch}
                    >
                      <span>Course not listed? Add it in Step 2</span>
                    </button>

                    <button 
                      type="button"
                      className="tactile-btn-primary"
                      disabled={!formData.courseCode}
                      style={!formData.courseCode ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      onClick={() => {
                        if (formData.courseCode) {
                          setStep(3);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <span>{formData.courseCode ? `Continue with ${formData.courseCode}` : 'Select a course to continue'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  STEP 2: ADD MISSING COURSE (SIMPLE, UNCLUTTERED 2-INPUT FORM)
                  ===================================================================== */}
              {step === 2 && (
                <div className="step-content-anim">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.25rem' }}>
                      Add a Missing Course
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      If your course wasn't listed in Step 1, enter its code and title below. It will be added to the catalog automatically when you submit.
                    </p>
                  </div>

                  {/* Two Clean Inputs Only */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">
                        Course Code <span className="required-dot">*</span>
                      </label>
                      <input
                        type="text"
                        className={`custom-input ${errors.customCourseCode ? 'error' : ''}`}
                        placeholder="e.g. CSS155P"
                        value={formData.customCourseCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (val.includes(' ') && !formData.customCourseTitle) {
                            handleCombinedFormatChange(e.target.value);
                            return;
                          }
                          const cleanVal = val.replace(/\s+/g, '');
                          setFormData(prev => ({
                            ...prev,
                            customCourseCode: cleanVal,
                            customCombinedInput: `${cleanVal} ${prev.customCourseTitle}`.trim(),
                            courseCode: '',
                            courseTitle: ''
                          }));
                          setErrors(prev => ({ ...prev, customCourseCode: null, course: null }));
                        }}
                      />
                    </div>

                    <div className="input-field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label">
                        Course Title <span className="required-dot">*</span>
                      </label>
                      <input
                        type="text"
                        className={`custom-input ${errors.customCourseTitle ? 'error' : ''}`}
                        placeholder="e.g. Cloud Architecture & Security"
                        value={formData.customCourseTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            customCourseTitle: val,
                            customCombinedInput: `${prev.customCourseCode} ${val}`.trim(),
                            courseCode: '',
                            courseTitle: ''
                          }));
                          setErrors(prev => ({ ...prev, customCourseTitle: null, course: null }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Single Calm Feedback Message */}
                  {unlistedPreview && (
                    <div style={{ marginTop: '1.25rem' }}>
                      {!unlistedPreview.valid ? (
                        <div style={{ 
                          padding: '0.85rem 1rem', 
                          background: 'rgba(239, 68, 68, 0.08)', 
                          border: '1px solid rgba(239, 68, 68, 0.3)', 
                          borderRadius: 'var(--radius-md)',
                          color: '#ef4444',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <AlertCircle size={16} style={{ flexShrink: 0 }} />
                          <span>{unlistedPreview.error}</span>
                        </div>
                      ) : unlistedPreview.existingMatch ? (
                        <div style={{ 
                          padding: '0.9rem 1.1rem', 
                          background: 'rgba(217, 119, 6, 0.1)', 
                          border: '1px solid rgba(217, 119, 6, 0.35)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          color: 'var(--text-pure)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem'
                        }}>
                          <CheckCircle2 size={17} style={{ color: 'var(--gold-bright)', flexShrink: 0 }} />
                          <span>
                            <strong>{unlistedPreview.existingMatch.code} — {unlistedPreview.existingMatch.title}</strong> is already in the catalog ({unlistedPreview.existingMatch.count || unlistedPreview.existingMatch.requestCount || 0}/15 students). Your request will join this existing course.
                          </span>
                        </div>
                      ) : (
                        <div style={{ 
                          padding: '0.9rem 1.1rem', 
                          background: 'rgba(16, 185, 129, 0.08)', 
                          border: '1px solid var(--emerald-border)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          color: 'var(--text-pure)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem'
                        }}>
                          <Sparkles size={17} style={{ color: 'var(--emerald-core)', flexShrink: 0 }} />
                          <span>
                            Ready to add: <strong>{unlistedPreview.code} — {unlistedPreview.title}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {errors.course && !unlistedPreview && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.8rem 1rem', 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                      borderRadius: 'var(--radius-md)',
                      color: '#ef4444',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} /> {errors.course}
                    </div>
                  )}

                  {/* Bottom Buttons */}
                  <div className="button-dock-actions">
                    <button 
                      type="button"
                      className="tactile-btn-secondary"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft size={15} />
                      <span>Back to Catalog</span>
                    </button>

                    <button 
                      type="button"
                      className="tactile-btn-primary"
                      onClick={() => {
                        if (validateStep2()) {
                          setStep(3);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <span>Continue to Review</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  STEP 3: REVIEW & SUBMIT
                  ===================================================================== */}
              {step === 3 && (
                <div className="step-content-anim">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-pure)', marginBottom: '0.25rem' }}>
                      Review & Submit Request
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Confirm your course and student details below before submitting.
                    </p>
                  </div>

                  {/* Clean Summary Card */}
                  <div style={{ 
                    background: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-hairline)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                  }}>
                    {/* Course Being Requested */}
                    <div style={{ 
                      padding: '1.15rem 1.25rem', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          Course Requested
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-pure)' }}>
                          {formData.courseCode || unlistedPreview?.code || formData.customCourseCode} — {formData.courseTitle || unlistedPreview?.title || formData.customCourseTitle}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-pure)',
                        border: '1px solid var(--border-hairline)'
                      }}>
                        {selectedCourseObj 
                          ? `${selectedCourseObj.count || selectedCourseObj.requestCount || 0} / ${MIN_STUDENT_THRESHOLD} students`
                          : 'New catalog course (1 / 15)'}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Student</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{formData.lastName}, {formData.firstName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Student Number</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{formData.studentNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Program & Units Left</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{formData.program} • {formData.unitsLeft} units</div>
                      </div>
                    </div>

                    {/* Certification Checkbox */}
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.65rem', 
                      cursor: 'pointer',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-hairline)'
                    }}>
                      <input
                        type="checkbox"
                        style={{ marginTop: '0.2rem', accentColor: 'var(--crimson-core)', width: '16px', height: '16px' }}
                        checked={formData.agreeTerms}
                        onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                        I confirm that this course request is accurate and that I meet the prerequisites for this subject.
                      </span>
                    </label>
                  </div>

                  {submitError && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.8rem 1rem', 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      border: '1px solid #ef4444', 
                      borderRadius: 'var(--radius-md)', 
                      color: '#ef4444',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} /> {submitError}
                    </div>
                  )}

                  {/* Bottom Buttons */}
                  <div className="button-dock-actions">
                    <button 
                      type="button"
                      className="tactile-btn-secondary"
                      onClick={() => setStep(formData.customCourseCode ? 2 : 1)}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} />
                      <span>Back</span>
                    </button>

                    <button 
                      type="submit"
                      className="tactile-btn-primary"
                      disabled={isSubmitting || !formData.agreeTerms}
                      style={(!formData.agreeTerms || isSubmitting) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                    >
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Course Request'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
