import React, { useState, useMemo, useEffect } from 'react';
import { 
  Ticket,
  Layers,
  Search, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  X,
  Copy,
  Check,
  Lock,
  UserCheck,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { MIN_STUDENT_THRESHOLD } from '../data/courses';
import { canAdminManageCourse, inferCourseDepartment, isSuperAdmin } from '../services/adminAuth';

const LEDGER_DEPARTMENTS = [
  { id: 'ALL', label: 'All Depts' },
  { id: 'CS', label: 'CS' },
  { id: 'IT', label: 'IT' },
  { id: 'DS', label: 'DS' },
  { id: 'EMC', label: 'EMC' },
  { id: 'IS', label: 'IS' }
];

export default function StatusTracker({ 
  requests = [], 
  coursesWithDemand = [], 
  onRetract,
  initialQuery = '',
  currentUser = null,
  consultations = {}
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filterMode, setFilterMode] = useState('ALL'); // 'MINE' | 'ALL' | 'MET' | 'PENDING'
  const [selectedDept, setSelectedDept] = useState('ALL'); // 'ALL' | 'CS' | 'IT' | 'DS' | 'EMC' | 'IS'
  const [selectedCourse, setSelectedCourse] = useState('ALL'); // 'ALL' | courseCode
  const [retractingItem, setRetractingItem] = useState(null);
  const [isRetracting, setIsRetracting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [notification, setNotification] = useState('');
  const [displayFormat, setDisplayFormat] = useState('ticket'); // 'ticket' | 'list'

  // Sync initialQuery prop if passed
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Helper: Get department of a petition's course
  const getRequestDept = (req) => {
    const codeUpper = String(req?.courseCode || '').toUpperCase();
    const matchCourse = coursesWithDemand.find(
      c => String(c.code || '').toUpperCase() === codeUpper
    );
    return matchCourse?.dept || inferCourseDepartment(codeUpper);
  };

  // Helper: Check if logged-in user can remove this petition
  // - Students can only remove their own petitions
  // - Program Chairs can only remove petitions for their assigned department (CS -> CS, IT -> IT, etc.)
  // - imppcabalag@gmail.com (SOIT General Admin) can remove any petition
  const canRemovePetition = (req) => {
    if (!currentUser) return false;
    if (currentUser.role === 'chair') {
      return canAdminManageCourse(currentUser.email, req.courseCode, consultations);
    }
    if (currentUser.role === 'student') {
      const myEmail = String(currentUser.email || '').trim().toLowerCase();
      const myNum = String(currentUser.studentNumber || '').trim();
      const reqEmail = String(req.email || '').trim().toLowerCase();
      const reqNum = String(req.studentNumber || '').trim();
      return (myEmail && reqEmail === myEmail) || (myNum && reqNum === myNum);
    }
    return false;
  };

  // Count logged-in user's removable petitions
  const myRequestsCount = useMemo(() => {
    if (!currentUser) return 0;
    return requests.filter(r => canRemovePetition(r)).length;
  }, [requests, currentUser, consultations]);

  // Unique courses that have petitions (or all courses matching selectedDept) for the Per-Course dropdown
  const courseFilterOptions = useMemo(() => {
    const map = new Map();
    requests.forEach(r => {
      const code = String(r.courseCode || '').toUpperCase();
      if (!code) return;
      const dept = getRequestDept(r);
      if (selectedDept !== 'ALL' && dept !== selectedDept) return;
      if (!map.has(code)) {
        const cMatch = coursesWithDemand.find(c => String(c.code || '').toUpperCase() === code);
        map.set(code, {
          code,
          title: r.courseTitle || cMatch?.title || 'Course Section',
          dept,
          count: 0
        });
      }
      map.get(code).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [requests, coursesWithDemand, selectedDept]);

  // Reset selectedCourse if it no longer matches selectedDept
  useEffect(() => {
    if (selectedCourse !== 'ALL') {
      const stillValid = courseFilterOptions.some(c => c.code === selectedCourse);
      if (!stillValid) setSelectedCourse('ALL');
    }
  }, [selectedDept, courseFilterOptions, selectedCourse]);

  const cleanQuery = query.trim().toLowerCase();

  // Filter requests based on query, department, specific course, and status filterMode
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // 1. Search query filter
      const matchesQuery = !cleanQuery || 
        String(r.studentNumber || '').toLowerCase().includes(cleanQuery) ||
        String(r.lastName || '').toLowerCase().includes(cleanQuery) ||
        String(r.firstName || '').toLowerCase().includes(cleanQuery) ||
        String(r.email || '').toLowerCase().includes(cleanQuery) ||
        String(r.id || '').toLowerCase().includes(cleanQuery) ||
        String(r.courseCode || '').toLowerCase().includes(cleanQuery);

      if (!matchesQuery) return false;

      // 2. Department filter (CS, IT, DS, EMC, IS)
      const reqDept = getRequestDept(r);
      if (selectedDept !== 'ALL' && reqDept !== selectedDept) {
        return false;
      }

      // 3. Per-Course filter
      const codeUpper = String(r.courseCode || '').toUpperCase();
      if (selectedCourse !== 'ALL' && codeUpper !== selectedCourse) {
        return false;
      }

      // 4. Status / Ownership filter
      if (filterMode === 'MINE') {
        return canRemovePetition(r);
      }

      const cDemand = coursesWithDemand.find(c => 
        c.code.toUpperCase() === codeUpper
      );
      const count = cDemand ? (cDemand.count || cDemand.requestCount || 0) : 1;
      const isMet = count >= MIN_STUDENT_THRESHOLD;

      if (filterMode === 'MET') return isMet;
      if (filterMode === 'PENDING') return !isMet;
      return true;
    }).sort((a, b) => {
      const aMine = canRemovePetition(a) ? 1 : 0;
      const bMine = canRemovePetition(b) ? 1 : 0;
      if (aMine !== bMine) return bMine - aMine;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }, [requests, cleanQuery, selectedDept, selectedCourse, filterMode, coursesWithDemand, currentUser, consultations]);

  // Overall metrics
  const metCount = useMemo(() => {
    return requests.filter(r => {
      const c = coursesWithDemand.find(cd => cd.code.toUpperCase() === String(r.courseCode || '').toUpperCase());
      return c && (c.count || c.requestCount || 0) >= MIN_STUDENT_THRESHOLD;
    }).length;
  }, [requests, coursesWithDemand]);

  const pendingCount = requests.length - metCount;

  // Copy Reference ID
  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Execute Petition Removal
  const confirmRemovePetition = async () => {
    if (!retractingItem) return;
    setIsRetracting(true);
    try {
      await onRetract(retractingItem.id);
      setNotification(`Petition ${retractingItem.id} for ${retractingItem.courseCode} has been removed.`);
      setRetractingItem(null);
      setTimeout(() => setNotification(''), 4500);
    } catch (err) {
      alert('Error removing petition: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRetracting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
          <span className="live-pill" style={{ padding: '0.3rem 0.8rem' }}>
            <span className="live-status-dot" /> LIVE PETITION LEDGER & COURSE FILTERING
          </span>
        </div>
        <h1 style={{ 
          fontSize: '1.65rem', 
          fontWeight: 800, 
          letterSpacing: '-0.025em', 
          color: 'var(--text-pure)',
          marginBottom: '0.35rem'
        }}>
          Petition Ledger & Removal Portal
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', maxWidth: '820px', lineHeight: 1.5, margin: 0 }}>
          {currentUser?.role === 'chair' ? (
            isSuperAdmin(currentUser.email) ? (
              <>Filter petitions by department (<strong>CS, IT, DS, EMC, IS</strong>) or by specific course. As <strong>SOIT General Administration ({currentUser.email})</strong>, you can remove petitions across all courses.</>
            ) : (
              <>Filter petitions by department (<strong>CS, IT, DS, EMC, IS</strong>) or by specific course. As a Program Chair (<strong>{currentUser.email}</strong>), you can only remove petitions belonging to your assigned department.</>
            )
          ) : (
            <>Filter petitions by department (<strong>CS, IT, DS, EMC, IS</strong>) or specific course. For security, <strong>you can only remove petitions submitted under your own authenticated Student Profile</strong> ({currentUser?.email || 'signed-in account'}).</>
          )}
        </p>
      </section>

      {/* Notification Toast */}
      {notification && (
        <div style={{ 
          padding: '0.95rem 1.25rem', 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
          border: '1px solid var(--emerald-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--emerald-core)',
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} />
            <span>{notification}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification('')}
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Multi-Filter Workstation Card */}
      <div className="dossier-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Row 1: Search Input + Per-Course Dropdown Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search 
              size={17} 
              style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-faint)',
                pointerEvents: 'none'
              }} 
            />
            <input 
              type="text" 
              className="search-input-sleek" 
              placeholder="Search by Course Code (e.g. CSS122P), Student No., Name, Email, or Ref ID..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '2.6rem', paddingRight: query ? '2.4rem' : '1rem', fontSize: '0.9rem' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
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
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Per-Course Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Filter size={15} style={{ color: 'var(--crimson-bright)', flexShrink: 0 }} />
            <select
              className="chair-status-select"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              style={{ 
                padding: '0.58rem 0.85rem', 
                fontSize: '0.82rem', 
                minWidth: '240px', 
                fontWeight: 700,
                colorScheme: 'dark',
                background: 'var(--bg-surface)',
                color: 'var(--text-pure)',
                borderColor: 'var(--border-medium)',
                cursor: 'pointer'
              }}
              aria-label="Filter by specific course"
            >
              <option value="ALL" style={{ background: '#0f172a', color: '#f8fafc' }}>All Courses ({courseFilterOptions.reduce((s, c) => s + c.count, 0)} petitions)</option>
              {courseFilterOptions.map(c => (
                <option key={c.code} value={c.code} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {c.code} — {c.title} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Department Filter Pills (ALL, CS, IT, DS, EMC, IS) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-hairline)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>Department:</span>
            {LEDGER_DEPARTMENTS.map(d => {
              const countForDept = d.id === 'ALL'
                ? requests.length
                : requests.filter(r => getRequestDept(r) === d.id).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`dept-chip ${selectedDept === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDept(d.id)}
                >
                  {d.label} ({countForDept})
                </button>
              );
            })}
          </div>

          {/* Status & Removable Filter Pills */}
          <div className="dept-chip-rack">
            {currentUser && (
              <button
                type="button"
                className={`dept-chip ${filterMode === 'MINE' ? 'active' : ''}`}
                onClick={() => setFilterMode(filterMode === 'MINE' ? 'ALL' : 'MINE')}
              >
                {currentUser.role === 'chair' ? `My Removable Dept (${myRequestsCount})` : `My Petitions (${myRequestsCount})`}
              </button>
            )}
            <button
              type="button"
              className={`dept-chip ${filterMode === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterMode('ALL')}
            >
              All Statuses ({requests.length})
            </button>
            <button
              type="button"
              className={`dept-chip ${filterMode === 'MET' ? 'active' : ''}`}
              onClick={() => setFilterMode('MET')}
            >
              Threshold Met ({metCount})
            </button>
            <button
              type="button"
              className={`dept-chip ${filterMode === 'PENDING' ? 'active' : ''}`}
              onClick={() => setFilterMode('PENDING')}
            >
              Pending Quota ({pendingCount})
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {selectedCourse !== 'ALL' ? (
            <span>Showing petitions for course <strong style={{ color: 'var(--crimson-bright)' }}>{selectedCourse}</strong>:</span>
          ) : selectedDept !== 'ALL' ? (
            <span>Showing petitions for <strong style={{ color: 'var(--crimson-bright)' }}>{selectedDept}</strong> department:</span>
          ) : (
            <span>Displaying active petition records:</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.2rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              className={`action-pill-btn ${displayFormat === 'ticket' ? 'active' : ''}`}
              onClick={() => setDisplayFormat('ticket')}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', borderRadius: 'var(--radius-full)', background: displayFormat === 'ticket' ? 'linear-gradient(135deg, var(--crimson-core), #7f1d1d)' : 'transparent', color: displayFormat === 'ticket' ? '#ffffff' : 'var(--text-muted)' }}
            >
              <Ticket size={12} />
              <span>Boarding Passes</span>
            </button>
            <button
              type="button"
              className={`action-pill-btn ${displayFormat === 'list' ? 'active' : ''}`}
              onClick={() => setDisplayFormat('list')}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', borderRadius: 'var(--radius-full)', background: displayFormat === 'list' ? 'linear-gradient(135deg, var(--crimson-core), #7f1d1d)' : 'transparent', color: displayFormat === 'list' ? '#ffffff' : 'var(--text-muted)' }}
            >
              <Layers size={12} />
              <span>Compact Roster</span>
            </button>
          </div>
          <span className="mono-tag" style={{ color: 'var(--text-faint)' }}>
            {filteredRequests.length} RECORD{filteredRequests.length !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* Results List */}
      {filteredRequests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(req => {
            const courseDemand = coursesWithDemand.find(c => 
              c.code.toUpperCase() === String(req.courseCode || '').toUpperCase()
            );
            const count = courseDemand ? (courseDemand.count || courseDemand.requestCount || 0) : 1;
            const isMet = count >= MIN_STUDENT_THRESHOLD;
            const pct = Math.min(100, Math.round((count / MIN_STUDENT_THRESHOLD) * 100));
            const remaining = Math.max(0, MIN_STUDENT_THRESHOLD - count);
            const canRemove = canRemovePetition(req);
            const reqDept = getRequestDept(req);

            if (displayFormat === 'ticket') {
              return (
                <div key={req.id} className="boarding-pass-ticket">
                  {/* Main Ticket Section */}
                  <div className="ticket-main">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-pure)', letterSpacing: '0.04em' }}>
                          MAPÚA SOIT PETITION PASS
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: '4px', background: 'rgba(185, 28, 28, 0.1)', color: 'var(--crimson-bright)' }}>
                          {reqDept} Track
                        </span>
                        {canRemove && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.12rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.14)', color: 'var(--emerald-core)', border: '1px solid var(--emerald-border)' }}>
                            {currentUser?.role === 'chair' ? `${reqDept} CHAIR` : 'YOUR PASS'}
                          </span>
                        )}
                      </div>
                      <span className="ticket-date">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Active Term'}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-pure)' }}>
                          {req.courseCode}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {req.courseTitle || 'Course Section'}
                        </span>
                      </div>
                    </div>

                    <div className="ticket-field-grid">
                      <div>
                        <span className="ticket-field-label">STUDENT</span>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-pure)', fontSize: '0.86rem' }}>{req.lastName}, {req.firstName}</p>
                        <span className="ticket-field-sub" style={{ fontFamily: 'var(--font-mono)' }}>{req.studentNumber}</span>
                      </div>
                      <div>
                        <span className="ticket-field-label">PROGRAM & REMAINING</span>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--crimson-bright)', fontSize: '0.86rem' }}>{req.program}</p>
                        <span className="ticket-field-sub">{req.unitsLeft} units left</span>
                      </div>
                      <div>
                        <span className="ticket-field-label">CURRENT QUOTA</span>
                        <p style={{ margin: 0, fontWeight: 700, color: isMet ? 'var(--emerald-core)' : 'var(--gold-core)', fontSize: '0.86rem' }}>{count} / {MIN_STUDENT_THRESHOLD} Students</p>
                        <span className="ticket-field-sub">{pct}% Threshold</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                      <div className={`rubber-stamp ${isMet ? 'granted' : 'gathering'}`}>
                        {isMet ? '★ SECTION GRANTED ★' : 'PETITION RECORDED • GATHERING'}
                      </div>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(req.id)}
                          style={{ fontSize: '0.72rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                        >
                          <Trash2 size={13} />
                          <span>{currentUser?.role === 'chair' ? 'Remove Petition' : 'Retract My Petition'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Perforated Divider */}
                  <div className="ticket-divider-perforated">
                    <div className="ticket-notch-top" />
                    <div className="ticket-notch-bottom" />
                  </div>

                  {/* Stub */}
                  <div className="ticket-stub">
                    <div style={{ width: '100%' }}>
                      <span className="ticket-stub-label">PASS REF</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--crimson-bright)', margin: '0.15rem 0' }}>
                        {req.id}
                      </div>
                    </div>

                    <div style={{ margin: '0.75rem 0' }}>
                      <div className="decorative-barcode">
                        |||| || |||||| | |||
                      </div>
                      <span className="ticket-barcode-tag">SOIT-PASS-GATE</span>
                    </div>

                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => handleCopy(req.id)}
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem' }}
                    >
                      <Copy size={12} />
                      <span>{copiedId === req.id ? 'Copied' : 'Copy Ref'}</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={req.id} 
                style={{ 
                  background: 'var(--bg-card)', 
                  backdropFilter: 'blur(16px)',
                  border: canRemove ? '1px solid var(--emerald-border)' : '1px solid var(--border-hairline)', 
                  borderRadius: 'var(--radius-xl)', 
                  padding: '1.35rem 1.5rem',
                  boxShadow: 'var(--shadow-bento)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Top Bar */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-hairline)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      color: 'var(--gold-bright)',
                      background: 'var(--bg-input)',
                      padding: '0.22rem 0.6rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-hairline)'
                    }}>
                      REF: {req.id}
                    </span>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: 'rgba(185, 28, 28, 0.08)',
                      color: 'var(--crimson-bright)'
                    }}>
                      {reqDept} Course
                    </span>

                    {canRemove && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: 'var(--emerald-core)',
                        border: '1px solid var(--emerald-border)',
                        letterSpacing: '0.04em'
                      }}>
                        {currentUser?.role === 'chair' ? `${reqDept} CHAIR ACCESS` : 'YOUR PETITION'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(req.id)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-faint)', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.72rem'
                      }}
                      title="Copy Reference ID"
                    >
                      {copiedId === req.id ? (
                        <>
                          <Check size={12} style={{ color: 'var(--emerald-core)' }} />
                          <span style={{ color: 'var(--emerald-core)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.22rem 0.7rem',
                    borderRadius: 'var(--radius-full)',
                    background: isMet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                    color: isMet ? 'var(--emerald-core)' : 'var(--gold-bright)',
                    border: `1px solid ${isMet ? 'var(--emerald-border)' : 'rgba(217, 119, 6, 0.3)'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {isMet ? 'Threshold Met (15+ Students)' : `${remaining} More Needed to Open`}
                  </span>
                </div>

                {/* Course & Student Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.15rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--crimson-bright)', marginBottom: '0.2rem' }}>
                      Requested Course ({reqDept})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                        {req.courseCode}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                      {req.courseTitle || courseDemand?.title || 'Course Title on Record'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.2rem' }}>
                      Applicant Credentials
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-pure)' }}>
                      {req.lastName}, {req.firstName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {req.studentNumber}</span>
                      <span>•</span>
                      <span>Program: <strong style={{ color: 'var(--text-pure)' }}>{req.program}</strong></span>
                      <span>•</span>
                      <span>{req.unitsLeft} Units Left</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                      {req.email}
                    </div>
                  </div>
                </div>

                {/* Live Section Capacity Micro-Meter */}
                <div style={{ 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-hairline)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.75rem 0.95rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Section Demand Headcount: <strong style={{ color: isMet ? 'var(--emerald-core)' : 'var(--text-pure)' }}>{count}</strong> / {MIN_STUDENT_THRESHOLD}
                    </span>
                    <span className="mono-tag" style={{ color: isMet ? 'var(--emerald-core)' : 'var(--text-muted)' }}>
                      {pct}% Threshold
                    </span>
                  </div>
                  <div className="micro-meter">
                    <div 
                      className={`micro-fill ${isMet ? 'met' : ''}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Action Dock: Remove Petition Button (Only enabled for assigned Dept Chair, Super Admin, or Petition Owner) */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '0.75rem',
                  paddingTop: '0.35rem'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    {req.createdAt ? `Submitted: ${new Date(req.createdAt).toLocaleDateString()}` : 'Active Section Headcount'}
                  </div>

                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => setRetractingItem(req)}
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.52rem 1rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove Petition</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.73rem',
                        fontWeight: 600,
                        color: 'var(--text-faint)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'not-allowed'
                      }}
                      title={
                        currentUser?.role === 'chair'
                          ? `Only the ${reqDept} Program Chair or SOIT General Admin can remove ${reqDept} petitions`
                          : 'You can only remove petitions submitted under your own student account'
                      }
                    >
                      <Lock size={12} />
                      <span>
                        {currentUser?.role === 'chair'
                          ? `Locked • ${reqDept} Chair Only`
                          : 'Protected • Owned by Another Student'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Results State */
        <div style={{ 
          padding: '3rem 1.5rem', 
          textAlign: 'center', 
          background: 'var(--bg-card)', 
          borderRadius: 'var(--radius-xl)', 
          border: '1px dashed var(--border-hairline)',
          boxShadow: 'var(--shadow-bento)'
        }}>
          <FileText size={36} style={{ color: 'var(--text-faint)', margin: '0 auto 0.85rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.35rem' }}>
            No Matching Course Petitions Found
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.15rem', lineHeight: 1.45 }}>
            No petitions match your current search, department ({selectedDept}), or course ({selectedCourse}) filter.
          </p>
          <button 
            type="button" 
            className="tactile-btn-secondary"
            onClick={() => { setQuery(''); setSelectedDept('ALL'); setSelectedCourse('ALL'); setFilterMode('ALL'); }}
          >
            <span>Reset All Ledger Filters ({requests.length})</span>
          </button>
        </div>
      )}

      {/* Remove Petition Confirmation Modal */}
      {retractingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                Confirm Remove Petition
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to remove the petition for <strong style={{ color: 'var(--text-pure)' }}>{retractingItem.courseCode}</strong> ({retractingItem.courseTitle})?
            </p>

            <div style={{ 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-hairline)', 
              borderRadius: 'var(--radius-md)', 
              padding: '0.85rem 1rem',
              fontSize: '0.775rem',
              color: 'var(--text-muted)'
            }}>
              <div>Applicant: <strong style={{ color: 'var(--text-pure)' }}>{retractingItem.lastName}, {retractingItem.firstName}</strong></div>
              <div>Student Number: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-pure)' }}>{retractingItem.studentNumber}</strong></div>
              <div>Docket ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-bright)' }}>{retractingItem.id}</strong></div>
              <div style={{ color: '#ef4444', marginTop: '0.35rem', fontWeight: 600 }}>
                Warning: Removing this petition deducts 1 student from this course's 15-student minimum threshold.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="tactile-btn-secondary"
                onClick={() => setRetractingItem(null)}
                disabled={isRetracting}
              >
                <span>Cancel</span>
              </button>

              <button
                type="button"
                className="tactile-btn-primary"
                onClick={confirmRemovePetition}
                disabled={isRetracting}
                style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderColor: '#ef4444' }}
              >
                {isRetracting ? (
                  <>
                    <span className="live-status-dot" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Confirm Remove Petition</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
