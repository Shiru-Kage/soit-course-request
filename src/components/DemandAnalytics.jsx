import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Users, 
  Search, 
  Info,
  Flame,
  Filter,
  Download,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { MIN_STUDENT_THRESHOLD, DEPARTMENTS } from '../data/courses';
import { canAdminManageCourse, inferCourseDepartment } from '../services/adminAuth';

export default function DemandAnalytics({
  coursesWithDemand = [],
  requests = [],
  currentUser = null,
  consultations = {}
}) {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [search, setSearch] = useState('');
  const [hoveredCourseCode, setHoveredCourseCode] = useState(null);
  const [selectedExportCourse, setSelectedExportCourse] = useState('');
  const [exportToast, setExportToast] = useState('');

  const isChair = currentUser?.role === 'chair';

  // Helper: Check if the logged-in Program Chair is allowed to export/manage this course
  const canChairExportCourse = (courseOrCode) => {
    if (!isChair) return false;
    return canAdminManageCourse(currentUser?.email, courseOrCode, consultations);
  };

  // Export specific course's student petition list to CSV
  const handleExportCourseCSV = (courseObjOrCode) => {
    const codeUpper = String(
      typeof courseObjOrCode === 'string' ? courseObjOrCode : courseObjOrCode?.code || ''
    ).trim().toUpperCase();

    if (!codeUpper) return;

    const courseMeta = coursesWithDemand.find(
      c => String(c.code || '').toUpperCase() === codeUpper
    ) || (typeof courseObjOrCode === 'object' ? courseObjOrCode : { code: codeUpper, title: '' });

    const matchingRequests = requests.filter(
      r => String(r.courseCode || '').trim().toUpperCase() === codeUpper
    );

    const headers = [
      'No.',
      'Reference ID',
      'Student Number',
      'Last Name',
      'First Name',
      'Full Name',
      'MyMapua Email',
      'Degree Program',
      'Units Left to Graduate',
      'Course Code',
      'Course Title',
      'Department',
      'Petition Status',
      'Date Submitted'
    ];

    const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = matchingRequests.map((r, idx) => [
      escapeCSV(idx + 1),
      escapeCSV(r.id || ''),
      escapeCSV(r.studentNumber || ''),
      escapeCSV(r.lastName || ''),
      escapeCSV(r.firstName || ''),
      escapeCSV(`${r.lastName || ''}, ${r.firstName || ''}`.replace(/^,\s*|\s*,$/g, '')),
      escapeCSV(r.email || ''),
      escapeCSV(r.program || ''),
      escapeCSV(r.unitsLeft || ''),
      escapeCSV(codeUpper),
      escapeCSV(r.courseTitle || courseMeta?.title || ''),
      escapeCSV(courseMeta?.dept || inferCourseDepartment(codeUpper)),
      escapeCSV(r.status || 'Pending Review'),
      escapeCSV(r.createdAt ? new Date(r.createdAt).toLocaleString() : '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `SOIT_${codeUpper}_Student_Roster_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast(
      `Exported ${matchingRequests.length} student petition${matchingRequests.length !== 1 ? 's' : ''} for ${codeUpper} (${courseMeta?.title || 'Course Roster'}) to CSV.`
    );
    setTimeout(() => setExportToast(''), 4500);
  };

  const sortedCourses = useMemo(() => {
    return [...coursesWithDemand]
      .filter(c => {
        const matchesDept = selectedDept === 'ALL' || c.dept === selectedDept || (c.code && c.code.startsWith(selectedDept));
        const q = search.toLowerCase().trim();
        const matchesSearch = !q || 
          (c.code && c.code.toLowerCase().includes(q)) || 
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.equivalent && c.equivalent.toLowerCase().includes(q));
        return matchesDept && matchesSearch;
      })
      .sort((a, b) => (b.count || b.requestCount || 0) - (a.count || a.requestCount || 0));
  }, [coursesWithDemand, selectedDept, search]);

  // Courses available for the Chair's Quick CSV Export selector
  const exportableCourses = useMemo(() => {
    return [...coursesWithDemand]
      .filter(c => canChairExportCourse(c))
      .sort((a, b) => (b.count || b.requestCount || 0) - (a.count || a.requestCount || 0));
  }, [coursesWithDemand, currentUser, consultations]);

  const totalPetitions = useMemo(() => {
    return coursesWithDemand.reduce((sum, c) => sum + (c.count || c.requestCount || 0), 0);
  }, [coursesWithDemand]);

  const activeCourses = useMemo(() => {
    return coursesWithDemand.filter(c => (c.count || c.requestCount || 0) > 0);
  }, [coursesWithDemand]);

  const thresholdMetCount = coursesWithDemand.filter(c => (c.count || c.requestCount || 0) >= MIN_STUDENT_THRESHOLD).length;
  const nearThresholdCount = coursesWithDemand.filter(c => {
    const cnt = c.count || c.requestCount || 0;
    return cnt >= 10 && cnt < MIN_STUDENT_THRESHOLD;
  }).length;
  const buildingCount = Math.max(0, activeCourses.length - thresholdMetCount - nearThresholdCount);

  // Courses for the Main Horizontal Benchmark Bar Graph (Top 8 active courses matching current department filter)
  const chartCourses = useMemo(() => {
    return sortedCourses
      .filter(c => (c.count || c.requestCount || 0) > 0)
      .slice(0, 8);
  }, [sortedCourses]);

  // Max scale for the horizontal bar chart (at least 18 so the 15-student goal line sits clearly inside the chart area)
  const maxChartScale = useMemo(() => {
    const highest = chartCourses.reduce((max, c) => Math.max(max, c.count || c.requestCount || 0), 0);
    return Math.max(18, highest + 2);
  }, [chartCourses]);

  const goalLinePercent = Math.min(95, Math.round((MIN_STUDENT_THRESHOLD / maxChartScale) * 100));

  // Department demand aggregation for the right-hand distribution chart
  const deptBreakdown = useMemo(() => {
    const map = {};
    coursesWithDemand.forEach(c => {
      const dept = c.dept || 'SOIT';
      const cnt = c.count || c.requestCount || 0;
      if (!map[dept]) map[dept] = { dept, petitions: 0, activeSections: 0 };
      map[dept].petitions += cnt;
      if (cnt > 0) map[dept].activeSections += 1;
    });
    return Object.values(map)
      .filter(d => d.petitions > 0)
      .sort((a, b) => b.petitions - a.petitions);
  }, [coursesWithDemand]);

  const maxDeptPetitions = useMemo(() => {
    return Math.max(1, ...deptBreakdown.map(d => d.petitions));
  }, [deptBreakdown]);

  // SVG Donut chart calculations for Active Courses Readiness
  const totalActive = Math.max(1, activeCourses.length);
  const donutRadius = 46;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const metSegment = (thresholdMetCount / totalActive) * donutCircumference;
  const nearSegment = (nearThresholdCount / totalActive) * donutCircumference;
  const buildSegment = (buildingCount / totalActive) * donutCircumference;

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Clean Page Header */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ 
            fontSize: '1.65rem', 
            fontWeight: 800, 
            letterSpacing: '-0.025em', 
            color: 'var(--text-pure)',
            marginBottom: '0.25rem'
          }}>
            Demand Analytics
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Live student petition counts compared against the <strong>15-student target</strong> required to open a new section.
          </p>
        </div>

        {/* Program Chair Specific-Course CSV Export Bar */}
        {isChair && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            flexWrap: 'wrap',
            background: 'var(--bg-card)',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-bento)'
          }}>
            <FileSpreadsheet size={16} style={{ color: 'var(--emerald-core)', flexShrink: 0 }} />
            <select
              className="chair-status-select"
              value={selectedExportCourse || (exportableCourses[0]?.code || '')}
              onChange={e => setSelectedExportCourse(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.7rem', minWidth: '230px' }}
              aria-label="Select course to export CSV"
            >
              {exportableCourses.map(c => {
                const cnt = c.count || c.requestCount || 0;
                return (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.title} ({cnt} student{cnt !== 1 ? 's' : ''})
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="tactile-btn-primary"
              onClick={() => handleExportCourseCSV(selectedExportCourse || exportableCourses[0]?.code)}
              style={{ padding: '0.48rem 0.95rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
            >
              <Download size={14} />
              <span>Export Course CSV</span>
            </button>
          </div>
        )}

        {selectedDept !== 'ALL' && (
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className="btn-secondary-ghost"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            <Filter size={13} /> Filtering by {selectedDept} • Reset
          </button>
        )}
      </section>

      {/* CSV Export Confirmation Toast */}
      {exportToast && (
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
          gap: '0.55rem'
        }}>
          <CheckCircle2 size={17} />
          <span>{exportToast}</span>
        </div>
      )}

      {/* 3 Clean Summary KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1rem' 
      }}>
        <div className="dossier-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Total Student Petitions
            </span>
            <Users size={16} style={{ color: 'var(--crimson-bright)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-pure)', lineHeight: 1.1 }}>
            {totalPetitions}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>
            Across {activeCourses.length} requested courses
          </div>
        </div>

        <div className="dossier-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emerald-core)' }}>
              Ready to Open (15+ Students)
            </span>
            <CheckCircle2 size={16} style={{ color: 'var(--emerald-core)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--emerald-core)', lineHeight: 1.1 }}>
            {thresholdMetCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>
            Qualified for Program Chair scheduling
          </div>
        </div>

        <div className="dossier-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>
              Almost Full (10–14 Students)
            </span>
            <Flame size={16} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>
            {nearThresholdCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>
            Need only 1 to 5 more students
          </div>
        </div>
      </div>

      {/* Visual Analytics Section: Benchmark Bar Graph + Readiness & Dept Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.25rem',
        alignItems: 'stretch'
      }}>
        {/* Left/Main Visual Graph: Course Demand vs. 15-Student Goal Line */}
        <div className="dossier-card" style={{ padding: '1.5rem', gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <BarChart3 size={17} style={{ color: 'var(--crimson-bright)' }} />
                  Top Course Demand vs. 15-Student Target
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
                  Dashed line marks the 15-student threshold needed to open a class
                </p>
              </div>

              {/* Compact Color Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> 15+ Ready
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> 10–14 Near
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b91c1c' }} /> &lt;10 Building
                </span>
              </div>
            </div>

            {chartCourses.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active course requests match the current filter.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingTop: '1.6rem', paddingBottom: '0.25rem' }}>
                {/* Vertical 15-Student Threshold Benchmark Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '22px',
                    bottom: '4px',
                    left: `calc(118px + (100% - 178px) * ${goalLinePercent / 100})`,
                    borderLeft: '2px dashed #10b981',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-22px',
                    left: '-28px',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap'
                  }}>
                    Goal: 15
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {chartCourses.map((c) => {
                    const count = c.count || c.requestCount || 0;
                    const widthPct = Math.min(100, Math.max(4, Math.round((count / maxChartScale) * 100)));
                    const isMet = count >= MIN_STUDENT_THRESHOLD;
                    const isNear = count >= 10 && count < MIN_STUDENT_THRESHOLD;
                    const barColor = isMet
                      ? 'linear-gradient(90deg, #059669, #10b981)'
                      : isNear
                      ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                      : 'linear-gradient(90deg, #991b1b, #dc2626)';
                    const isHovered = hoveredCourseCode === c.code;

                    return (
                      <div
                        key={c.code}
                        onMouseEnter={() => setHoveredCourseCode(c.code)}
                        onMouseLeave={() => setHoveredCourseCode(null)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '102px 1fr 52px',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '8px',
                          background: isHovered ? 'var(--bg-input)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                        title={`${c.code} — ${c.title}: ${count} / ${MIN_STUDENT_THRESHOLD} students`}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-pure)', lineHeight: 1.1 }}>
                            {c.code}
                          </div>
                          <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-faint)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '98px'
                          }}>
                            {c.title}
                          </div>
                        </div>

                        {/* Bar Track */}
                        <div style={{
                          height: '14px',
                          background: 'var(--bg-input)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-hairline)',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${widthPct}%`,
                            height: '100%',
                            background: barColor,
                            borderRadius: '999px',
                            transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
                          }} />
                        </div>

                        {/* Exact Count Label */}
                        <div style={{
                          textAlign: 'right',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: isMet ? 'var(--emerald-core)' : isNear ? '#d97706' : 'var(--text-pure)'
                        }}>
                          {count}<span style={{ fontWeight: 500, color: 'var(--text-faint)', fontSize: '0.72rem' }}>/15</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.76rem',
            color: 'var(--text-faint)'
          }}>
            <span>Showing top {chartCourses.length} active courses</span>
            <span>Hover any bar to inspect course title</span>
          </div>
        </div>

        {/* Right Visual Panel: Section Readiness Donut + Department Distribution */}
        <div className="dossier-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '1.5rem' }}>
          {/* Top Half: Section Readiness Donut */}
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
              Section Readiness Breakdown
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: '1rem' }}>
              Status of the {activeCourses.length} courses with active petitions
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* SVG Multi-Segment Donut Chart */}
              <div style={{ position: 'relative', width: '116px', height: '116px', flexShrink: 0 }}>
                <svg width="116" height="116" viewBox="0 0 116 116" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="58"
                    cy="58"
                    r={donutRadius}
                    fill="transparent"
                    stroke="var(--bg-input)"
                    strokeWidth="14"
                  />
                  {/* Building (<10) segment */}
                  <circle
                    cx="58"
                    cy="58"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#b91c1c"
                    strokeWidth="14"
                    strokeDasharray={`${buildSegment} ${donutCircumference}`}
                    strokeDashoffset={-(metSegment + nearSegment)}
                  />
                  {/* Near (10-14) segment */}
                  <circle
                    cx="58"
                    cy="58"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="14"
                    strokeDasharray={`${nearSegment} ${donutCircumference}`}
                    strokeDashoffset={-metSegment}
                  />
                  {/* Ready (15+) segment */}
                  <circle
                    cx="58"
                    cy="58"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${metSegment} ${donutCircumference}`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-pure)', lineHeight: 1 }}>
                    {activeCourses.length}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-faint)', marginTop: '0.15rem' }}>
                    Active
                  </span>
                </div>
              </div>

              {/* Donut Legend Rows */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem', minWidth: '170px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-pure)', fontWeight: 600 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
                    Ready to Open (15+)
                  </span>
                  <strong style={{ color: '#047857' }}>{thresholdMetCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-pure)', fontWeight: 600 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }} />
                    Almost Full (10–14)
                  </span>
                  <strong style={{ color: '#d97706' }}>{nearThresholdCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-pure)', fontWeight: 600 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#b91c1c' }} />
                    Building (1–9)
                  </span>
                  <strong style={{ color: '#b91c1c' }}>{buildingCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half: Petitions by Department (Interactive Filter Bars) */}
          <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                Petitions by Department
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                Click a bar to filter
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deptBreakdown.map((d) => {
                const pct = Math.max(8, Math.round((d.petitions / maxDeptPetitions) * 100));
                const isSelected = selectedDept === d.dept;
                return (
                  <button
                    key={d.dept}
                    type="button"
                    onClick={() => setSelectedDept(isSelected ? 'ALL' : d.dept)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr 78px',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: isSelected ? 'rgba(185, 28, 28, 0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(185, 28, 28, 0.25)' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '0.3rem 0.45rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit'
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? 'var(--crimson-bright)' : 'var(--text-pure)' }}>
                      {d.dept}
                    </span>
                    <div style={{ height: '10px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isSelected
                          ? 'linear-gradient(90deg, #b91c1c, #f59e0b)'
                          : 'linear-gradient(90deg, #b91c1c, #dc2626)',
                        borderRadius: '999px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>
                      {d.petitions} reqs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* All Courses Filter & Search Catalog */}
      <div className="dossier-card" style={{ padding: '1.5rem' }}>
        <div className="course-control-toolbar" style={{ marginBottom: '1.25rem' }}>
          <div className="search-field-wrapper">
            <Search size={15} />
            <input
              type="text"
              className="search-input-sleek"
              placeholder="Search courses by code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dept-chip-rack">
            {DEPARTMENTS.map((dept, idx) => {
              const deptId = typeof dept === 'string' ? dept : dept.id;
              const deptName = typeof dept === 'string' ? dept : (dept.name || dept.id);
              return (
                <button
                  key={deptId || idx}
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

        {/* Clean Course Demand Grid */}
        <div className="tactical-course-grid" style={{ maxHeight: '680px' }}>
          {sortedCourses.map((c, idx) => {
            const count = c.count || c.requestCount || 0;
            const pct = Math.min(100, Math.round((count / MIN_STUDENT_THRESHOLD) * 100));
            const isMet = count >= MIN_STUDENT_THRESHOLD;
            const isNear = count >= 10 && count < MIN_STUDENT_THRESHOLD;
            const remaining = Math.max(0, MIN_STUDENT_THRESHOLD - count);
            const canExport = canChairExportCourse(c);

            return (
              <div 
                key={c.id || `${c.code}-${idx}`} 
                className={`course-tile ${isMet ? 'selected' : ''}`}
                style={{ cursor: 'default' }}
              >
                <div className="course-tile-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="course-mono-code">{c.code}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                      • {c.dept || 'SOIT'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    background: isMet
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isNear
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'var(--bg-input)',
                    color: isMet
                      ? 'var(--emerald-core)'
                      : isNear
                      ? '#d97706'
                      : 'var(--text-muted)',
                    border: `1px solid ${isMet ? 'var(--emerald-border)' : 'var(--border-hairline)'}`
                  }}>
                    {isMet ? 'Ready to Open' : `${remaining} more needed`}
                  </span>
                </div>

                <div>
                  <div className="course-full-title">{c.title}</div>
                  {(c.equivalent || c.equivalents) && (
                    <div className="course-eq-note">
                      <Info size={11} style={{ flexShrink: 0 }} />
                      <span>{c.equivalent || c.equivalents}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    <span>
                      <strong style={{ color: isMet ? 'var(--emerald-core)' : 'var(--text-pure)' }}>{count}</strong> / {MIN_STUDENT_THRESHOLD} students
                    </span>
                    <span style={{ fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="micro-meter">
                    <div 
                      className={`micro-fill ${isMet ? 'met' : ''}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Program Chair Per-Course CSV Export Button */}
                {isChair && (
                  <div style={{
                    paddingTop: '0.55rem',
                    borderTop: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                      {count} listed in CSV
                    </span>

                    {canExport ? (
                      <button
                        type="button"
                        onClick={() => handleExportCourseCSV(c)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.32rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--emerald-core)',
                          border: '1px solid var(--emerald-border)',
                          cursor: 'pointer'
                        }}
                        title={`Download CSV of students who requested ${c.code}`}
                      >
                        <Download size={12} />
                        <span>Export CSV ({count})</span>
                      </button>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--text-faint)'
                      }}>
                        <Lock size={11} />
                        <span>{c.dept || inferCourseDepartment(c)} Chair Only</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedCourses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            No courses match your search.
          </div>
        )}
      </div>
    </div>
  );
}
