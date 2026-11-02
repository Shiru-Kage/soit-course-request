import React, { useState, useMemo, useEffect } from 'react';
import KineticCounter from './KineticCounter';
import UserManagementSection from './UserManagementSection';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Search, 
  PlusCircle, 
  Filter, 
  TrendingUp, 
  FileSpreadsheet,
  KeyRound, 
  UserPlus, 
  Trash2, 
  Lock, 
  LogOut,
  Mail,
  Info,
  Check,
  CalendarClock,
  Clock,
  Archive,
  PlayCircle,
  StopCircle,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3
} from 'lucide-react';
import { MIN_STUDENT_THRESHOLD, DEPARTMENTS } from '../data/courses';
import { SOIT_PROGRAMS } from '../data/programs';
import { addCustomCourse, computeNextQuarterCode } from '../services/enrollmentStorage';
import { 
  getAllowedAdminEmails, 
  addAdminEmail, 
  removeAdminEmail, 
  changeCurrentAdminPassword,
  getConsultationProfileForEmail,
  isSuperAdmin,
  canAdminManageCourse,
  inferCourseDepartment,
  FIXED_ADMIN_DEPARTMENTS,
  CLUSTER_PROGRAM_LABELS,
  isLeadProgramChair,
  canManageClusterMember,
  updateAdminClusterAssignment,
  getAdminRoleEmails,
  fetchAdminRolesFromCloud,
  hasAdminPrivilege,
  grantAdminPrivilege,
  revokeAdminPrivilege
} from '../services/adminAuth';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ChairDashboard({ 
  requests = [], 
  coursesWithDemand = [], 
  openedSections = [],
  onSectionActionChange,
  consultations = {},
  onSaveConsultationProfile,
  onUpdateStatus, 
  onCourseAdded, 
  currentUser, 
  onLogout,
  quarterState = { currentQuarter: '2Q2627', isQuarterOpen: true, archivedQuarters: [] },
  onEndQuarter,
  onOpenQuarter,
  onReopenQuarter,
  onDeleteArchivedQuarter,
  onDeleteArchivedPetitionRecord,
  initialSubTab
}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (initialSubTab) return initialSubTab;
    try {
      const saved = localStorage.getItem('soit_chair_subtab');
      if (saved && ['courses', 'roster', 'add_course', 'consultation', 'admins', 'quarters'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'courses';
  });

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('soit_chair_subtab', activeTab);
      }
    } catch {}
  }, [activeTab]);
  const [searchCourses, setSearchCourses] = useState('');
  const [searchRoster, setSearchRoster] = useState('');
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [bannerToast, setBannerToast] = useState('');

  // New course form
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('CS');
  const [newUnits, setNewUnits] = useState(3);
  const [addMsg, setAddMsg] = useState({ text: '', type: '' });

  // Admin & Cluster Management State
  const [adminEmails, setAdminEmails] = useState(() => getAllowedAdminEmails());
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminCluster, setNewAdminCluster] = useState('CS');
  const [selectedClusterView, setSelectedClusterView] = useState('MY_CLUSTER');
  const [adminActionMsg, setAdminActionMsg] = useState({ text: '', type: '' });
  
  // Password Change State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });

  // Quarter & End-of-Quarter Archive State
  const activeQuarterCode = quarterState?.currentQuarter || '2Q2627';
  const isQuarterCurrentlyOpen = quarterState?.isQuarterOpen !== false;
  const archivedQuarters = Array.isArray(quarterState?.archivedQuarters) ? quarterState.archivedQuarters : [];
  const [nextQuarterInput, setNextQuarterInput] = useState(() =>
    computeNextQuarterCode(quarterState?.currentQuarter || '2Q2627')
  );
  const [quarterActionMsg, setQuarterActionMsg] = useState({ text: '', type: '' });
  const [selectedArchiveCode, setSelectedArchiveCode] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDeptFilter, setArchiveDeptFilter] = useState('ALL');
  const [archiveSubView, setArchiveSubView] = useState('summary'); // 'summary' | 'roster'
  const [archiveRosterPage, setArchiveRosterPage] = useState(1);
  const ARCHIVE_PER_PAGE = 12;
  const [deleteArchiveModal, setDeleteArchiveModal] = useState({ isOpen: false, targetArchive: null, isDeleting: false });
  const [deleteRecordModal, setDeleteRecordModal] = useState({ isOpen: false, quarterCode: '', record: null, isDeleting: false });

  useEffect(() => {
    const baseCode = quarterState?.lastClosedQuarter && !quarterState?.isQuarterOpen
      ? quarterState.lastClosedQuarter
      : (quarterState?.currentQuarter || '2Q2627');
    setNextQuarterInput(computeNextQuarterCode(baseCode));
  }, [quarterState?.currentQuarter, quarterState?.lastClosedQuarter, quarterState?.isQuarterOpen]);

  useEffect(() => {
    if (archivedQuarters.length > 0) {
      if (!selectedArchiveCode || !archivedQuarters.some(q => q.quarterCode === selectedArchiveCode)) {
        setSelectedArchiveCode(archivedQuarters[0].quarterCode);
      }
    } else {
      setSelectedArchiveCode('');
    }
  }, [archivedQuarters, selectedArchiveCode]);

  // Logged-in Administrator's Personal Consultation Settings & Role Scope
  const activeAdminEmail = currentUser?.email || 'imppcabalag@gmail.com';
  const [adminRoleEmails, setAdminRoleEmails] = useState(() => getAdminRoleEmails());
  const hasAdminAccess = hasAdminPrivilege(activeAdminEmail, adminRoleEmails);

  useEffect(() => {
    fetchAdminRolesFromCloud().then(roles => {
      if (Array.isArray(roles)) {
        setAdminRoleEmails(roles);
      }
    });
  }, [activeAdminEmail]);

  const hasSuperAdminAccess = isSuperAdmin(activeAdminEmail);
  const myInitialProfile = useMemo(
    () => getConsultationProfileForEmail(activeAdminEmail, consultations),
    [activeAdminEmail, consultations]
  );
  const lockedProgramDept = FIXED_ADMIN_DEPARTMENTS[String(activeAdminEmail).trim().toLowerCase()] || null;
  const effectiveAdminDept = hasSuperAdminAccess ? 'SOIT' : (lockedProgramDept || myInitialProfile.dept || 'CS');

  const [chairName, setChairName] = useState(myInitialProfile.name || '');
  const [chairDept, setChairDept] = useState(effectiveAdminDept);
  const [chairProgramTitle, setChairProgramTitle] = useState(myInitialProfile.programTitle || '');
  const [chairSlots, setChairSlots] = useState(
    Array.isArray(myInitialProfile.slots) && myInitialProfile.slots.length > 0
      ? myInitialProfile.slots
      : [{ day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' }]
  );
  const [consultSavedMsg, setConsultSavedMsg] = useState('');

  // Sync consultation form and default course department filter when logged-in admin changes
  useEffect(() => {
    const prof = getConsultationProfileForEmail(activeAdminEmail, consultations);
    const superFlag = isSuperAdmin(activeAdminEmail);
    const fixedDept = FIXED_ADMIN_DEPARTMENTS[String(activeAdminEmail).trim().toLowerCase()];
    const nextDept = superFlag ? 'SOIT' : (fixedDept || (prof.dept && prof.dept !== 'SOIT' ? prof.dept : 'CS'));

    setChairName(prof.name || '');
    setChairDept(nextDept);
    setChairProgramTitle(prof.programTitle || '');
    setChairSlots(
      Array.isArray(prof.slots) && prof.slots.length > 0
        ? prof.slots.map(s => ({ ...s }))
        : [{ day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' }]
    );
    setFilterDept(superFlag ? 'ALL' : nextDept);
    if (!superFlag) {
      setNewDept(nextDept);
      setNewAdminCluster(nextDept);
      setSelectedClusterView(nextDept);
    } else {
      setNewAdminCluster('CS');
      setSelectedClusterView('ALL');
    }
  }, [activeAdminEmail, consultations]);

  const handleSlotChange = (index, field, value) => {
    setChairSlots(prev => prev.map((slot, idx) => idx === index ? { ...slot, [field]: value } : slot));
  };

  const handleAddSlot = () => {
    setChairSlots(prev => [...prev, { day: 'Wednesday', startTime: '01:00 PM', endTime: '04:00 PM' }]);
  };

  const handleRemoveSlot = (index) => {
    if (chairSlots.length <= 1) return;
    setChairSlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveMyConsultation = async (e) => {
    e.preventDefault();
    const deptLabels = {
      CS: 'Computer Science (CS)',
      IT: 'Information Technology (IT)',
      DS: 'Data Science (DS)',
      EMC: 'Entertainment & Multimedia Computing (EMC)',
      IS: 'Information Systems (IS)',
      SOIT: 'SOIT Administration'
    };
    const updated = {
      name: chairName.trim() || activeAdminEmail.split('@')[0],
      dept: chairDept,
      programTitle: chairProgramTitle.trim() || deptLabels[chairDept] || chairDept,
      slots: chairSlots
    };
    if (onSaveConsultationProfile) {
      await onSaveConsultationProfile(activeAdminEmail, updated);
    }
    setConsultSavedMsg(`Saved consultation hours for ${updated.name} (${activeAdminEmail}). Students will now see these updated hours.`);
    setTimeout(() => setConsultSavedMsg(''), 4500);
  };

  const refreshAdmins = () => {
    setAdminEmails(getAllowedAdminEmails());
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAdminActionMsg({ text: '', type: '' });
    const targetCluster = newAdminCluster || (hasSuperAdminAccess ? 'CS' : effectiveAdminDept);
    const res = addAdminEmail(newAdminEmail, targetCluster, newAdminName, activeAdminEmail);
    if (res.success) {
      if (onSaveConsultationProfile && res.profile) {
        await onSaveConsultationProfile(res.profile.email, res.profile);
      }
      setAdminActionMsg({
        text: `Authorized ${newAdminEmail} under the ${targetCluster} (${CLUSTER_PROGRAM_LABELS[targetCluster]}) cluster. Temporary password: 1234.`,
        type: 'success'
      });
      setNewAdminEmail('');
      setNewAdminName('');
      setSelectedClusterView(hasSuperAdminAccess ? 'ALL' : targetCluster);
      refreshAdmins();
    } else {
      setAdminActionMsg({ text: res.error || 'Failed to authorize email.', type: 'error' });
    }
  };

  const handleReassignCluster = async (memberEmail, nextCluster) => {
    setAdminActionMsg({ text: '', type: '' });
    if (!canManageClusterMember(activeAdminEmail, memberEmail, consultations)) {
      setAdminActionMsg({
        text: 'Access Restricted: You can only manage faculty members within your own cluster.',
        type: 'error'
      });
      return;
    }
    const res = await updateAdminClusterAssignment(memberEmail, nextCluster);
    if (res.success) {
      if (onSaveConsultationProfile && res.profile) {
        await onSaveConsultationProfile(memberEmail, res.profile);
      }
      setAdminActionMsg({ text: res.message, type: 'success' });
      refreshAdmins();
    } else {
      setAdminActionMsg({ text: res.error || 'Failed to update cluster.', type: 'error' });
    }
  };

  const handleRemoveAdmin = (emailToRemove) => {
    if (emailToRemove.toLowerCase() === (currentUser?.email || '').toLowerCase()) {
      setAdminActionMsg({ text: 'You cannot revoke your own active admin account.', type: 'error' });
      return;
    }
    if (!canManageClusterMember(activeAdminEmail, emailToRemove, consultations)) {
      setAdminActionMsg({
        text: 'Access Restricted: You can only remove faculty members under your assigned cluster.',
        type: 'error'
      });
      return;
    }
    const res = removeAdminEmail(emailToRemove);
    if (res.success) {
      setAdminActionMsg({ text: `Removed ${emailToRemove} from your cluster.`, type: 'success' });
      refreshAdmins();
    } else {
      setAdminActionMsg({ text: res.error || 'Failed to remove admin.', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ text: '', type: '' });
    if (newPwd !== confirmPwd) {
      setPwdMsg({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }
    const adminEmail = currentUser?.email || adminEmails[0];
    const res = await changeCurrentAdminPassword(adminEmail, currentPwd, newPwd);
    if (res.success) {
      setPwdMsg({ text: 'Your administrator password has been updated.', type: 'success' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      setPwdMsg({ text: res.error || 'Failed to update password.', type: 'error' });
    }
  };

  // Normalize course demand counts cleanly
  const normalizedCourses = useMemo(() => {
    return coursesWithDemand.map(c => {
      const cnt = c.count ?? c.requestCount ?? 0;
      const pct = Math.min(100, Math.round((cnt / MIN_STUDENT_THRESHOLD) * 100));
      const isMet = cnt >= MIN_STUDENT_THRESHOLD;
      return {
        ...c,
        requestCount: cnt,
        progressPercentage: pct,
        isThresholdMet: isMet
      };
    });
  }, [coursesWithDemand]);

  // Metrics
  const totalRequests = requests.length;
  const readyCourses = normalizedCourses.filter(c => c.isThresholdMet);
  const nearReadyCourses = normalizedCourses.filter(c => !c.isThresholdMet && c.requestCount >= 10);
  const openCount = openedSections.filter(s => (s.actionType || 'OPEN') === 'OPEN').length;
  const consultCount = openedSections.filter(s => s.actionType === 'CONSULTATION').length;

  // Filtered Courses for Tab 1
  const filteredCourses = useMemo(() => {
    const q = searchCourses.toLowerCase().trim();
    return normalizedCourses
      .filter(c => {
        const matchDept = filterDept === 'ALL' || c.dept === filterDept || (c.code && c.code.startsWith(filterDept));
        const matchQ = !q ||
          String(c.code || '').toLowerCase().includes(q) ||
          String(c.title || '').toLowerCase().includes(q);
        return matchDept && matchQ;
      })
      .sort((a, b) => b.requestCount - a.requestCount);
  }, [normalizedCourses, filterDept, searchCourses]);

  // Filtered Roster for Tab 2
  const filteredRoster = useMemo(() => {
    return requests.filter(r => {
      const q = searchRoster.toLowerCase().trim();
      const matchQ = !q || 
        String(r.studentNumber || '').toLowerCase().includes(q) ||
        String(r.lastName || '').toLowerCase().includes(q) ||
        String(r.firstName || '').toLowerCase().includes(q) ||
        String(r.courseCode || '').toLowerCase().includes(q) ||
        String(r.id || '').toLowerCase().includes(q);
      
      const matchProg = filterProgram === 'ALL' || r.program === filterProgram;
      return matchQ && matchProg;
    });
  }, [requests, searchRoster, filterProgram]);

  const handleExportCSV = () => {
    window.open('/api/export-csv', '_blank');
  };

  const handleCloseQuarterOnly = async () => {
    setQuarterActionMsg({ text: '', type: '' });
    const closingCode = activeQuarterCode;
    if (onEndQuarter) {
      const res = await onEndQuarter({
        actorEmail: activeAdminEmail,
        actorName: myInitialProfile.name || activeAdminEmail,
        openNextQuarter: false,
        nextQuarterCode: ''
      });
      if (res?.success) {
        setSelectedArchiveCode(closingCode);
        setQuarterActionMsg({
          text: `Ended quarter ${closingCode} and moved all ${requests.length} student petition(s) to the Previous Quarters Archive. The Student Portal is now closed ("The Quarter has not yet begun") until you open a new quarter.`,
          type: 'success'
        });
        setBannerToast(`Quarter ${closingCode} archived & closed. Students logging in will now see "The Quarter has not yet begun."`);
        setTimeout(() => setBannerToast(''), 5000);
      }
    }
  };

  const handleCloseAndOpenNextQuarter = async () => {
    setQuarterActionMsg({ text: '', type: '' });
    const cleanNext = String(nextQuarterInput || '').trim().toUpperCase();
    if (!cleanNext) {
      setQuarterActionMsg({ text: 'Please enter the new Quarter Code to open (e.g. 3Q2627).', type: 'error' });
      return;
    }
    const closingCode = activeQuarterCode;
    if (onEndQuarter) {
      const res = await onEndQuarter({
        actorEmail: activeAdminEmail,
        actorName: myInitialProfile.name || activeAdminEmail,
        openNextQuarter: true,
        nextQuarterCode: cleanNext
      });
      if (res?.success) {
        setSelectedArchiveCode(closingCode);
        setQuarterActionMsg({
          text: `Archived ${closingCode} (${requests.length} petitions moved to Previous Quarters) and opened fresh quarter ${cleanNext} with 0 student petitions!`,
          type: 'success'
        });
        setBannerToast(`Archived ${closingCode} and opened fresh quarter ${cleanNext}!`);
        setTimeout(() => setBannerToast(''), 5000);
      }
    }
  };

  const handleOpenNewQuarterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setQuarterActionMsg({ text: '', type: '' });
    const cleanNext = String(nextQuarterInput || '').trim().toUpperCase();
    if (!cleanNext) {
      setQuarterActionMsg({ text: 'Please enter a valid Quarter Code to open (e.g. 3Q2627).', type: 'error' });
      return;
    }
    if (onOpenQuarter) {
      const res = await onOpenQuarter({
        quarterCode: cleanNext,
        actorEmail: activeAdminEmail,
        actorName: myInitialProfile.name || activeAdminEmail
      });
      if (res?.success) {
        setQuarterActionMsg({
          text: `Opened new quarter ${cleanNext}! The current quarter is now live and fresh with 0 student petitions.`,
          type: 'success'
        });
        setBannerToast(`New quarter ${cleanNext} is now OPEN and ready for student petitions!`);
        setTimeout(() => setBannerToast(''), 5000);
      }
    }
  };

  const handleReopenArchivedQuarterAction = async (targetQuarterCode) => {
    if (!targetQuarterCode) return;
    setQuarterActionMsg({ text: '', type: '' });
    if (onReopenQuarter) {
      const res = await onReopenQuarter({
        quarterCode: targetQuarterCode,
        actorEmail: activeAdminEmail,
        actorName: myInitialProfile.name || activeAdminEmail
      });
      if (res?.success) {
        setQuarterActionMsg({
          text: `Successfully reopened quarter ${targetQuarterCode}! Restored all ${res.requests?.length || 0} student petitions and active sections.`,
          type: 'success'
        });
        setBannerToast(`Reopened quarter ${targetQuarterCode} with all restored petitions!`);
        setTimeout(() => setBannerToast(''), 5000);
      }
    }
  };

  const handleConfirmDeleteArchive = async () => {
    if (!deleteArchiveModal.targetArchive) return;
    setDeleteArchiveModal(prev => ({ ...prev, isDeleting: true }));
    const target = deleteArchiveModal.targetArchive;
    try {
      if (onDeleteArchivedQuarter) {
        await onDeleteArchivedQuarter({
          quarterId: target.id,
          quarterCode: target.quarterCode,
          actorEmail: activeAdminEmail,
          actorName: myInitialProfile.name || activeAdminEmail
        });
      }
      setQuarterActionMsg({
        text: `Archived quarter record ${target.quarterCode} has been permanently deleted from Previous Quarters Data Archive.`,
        type: 'success'
      });
      setBannerToast(`Archived quarter record ${target.quarterCode} deleted.`);
      setTimeout(() => setBannerToast(''), 5000);
      const remaining = archivedQuarters.filter(q => q.quarterCode !== target.quarterCode && q.id !== target.id);
      if (remaining.length > 0) {
        setSelectedArchiveCode(remaining[0].quarterCode);
      } else {
        setSelectedArchiveCode('');
      }
    } catch (err) {
      setQuarterActionMsg({
        text: err.message || 'Failed to delete archive record.',
        type: 'error'
      });
    } finally {
      setDeleteArchiveModal({ isOpen: false, targetArchive: null, isDeleting: false });
    }
  };

  const handleConfirmDeletePetitionRecord = async () => {
    if (!deleteRecordModal.record || !deleteRecordModal.quarterCode) return;
    setDeleteRecordModal(prev => ({ ...prev, isDeleting: true }));
    const { quarterCode, record } = deleteRecordModal;
    try {
      if (onDeleteArchivedPetitionRecord) {
        await onDeleteArchivedPetitionRecord({
          quarterCode,
          requestId: record.id || record.requestId,
          actorEmail: activeAdminEmail,
          actorName: myInitialProfile.name || activeAdminEmail
        });
      }
      setQuarterActionMsg({
        text: `Petition record ${record.id} for ${record.lastName}, ${record.firstName} has been removed from ${quarterCode} archive.`,
        type: 'success'
      });
      setBannerToast(`Petition record ${record.id} deleted from ${quarterCode} archive.`);
      setTimeout(() => setBannerToast(''), 5000);
    } catch (err) {
      setQuarterActionMsg({
        text: err.message || 'Failed to delete petition record from archive.',
        type: 'error'
      });
    } finally {
      setDeleteRecordModal({ isOpen: false, quarterCode: '', record: null, isDeleting: false });
    }
  };

  const handleExportArchiveCSV = (archiveEntry, filterCourseCode = '') => {
    if (!archiveEntry || !Array.isArray(archiveEntry.requests)) return;
    const targetReqs = filterCourseCode
      ? archiveEntry.requests.filter(r => String(r.courseCode || '').toUpperCase() === String(filterCourseCode).toUpperCase())
      : archiveEntry.requests;

    const headers = [
      'Quarter',
      'Reference ID',
      'Student Number',
      'Last Name',
      'First Name',
      'MyMapua Email',
      'Program',
      'Units Left',
      'Course Code',
      'Course Title',
      'Final Status',
      'Date Submitted'
    ];
    const rows = targetReqs.map(r => [
      `"${archiveEntry.quarterCode || ''}"`,
      `"${r.id || ''}"`,
      `"${r.studentNumber || ''}"`,
      `"${String(r.lastName || '').replace(/"/g, '""')}"`,
      `"${String(r.firstName || '').replace(/"/g, '""')}"`,
      `"${r.email || ''}"`,
      `"${r.program || ''}"`,
      `"${r.unitsLeft || ''}"`,
      `"${r.courseCode || ''}"`,
      `"${String(r.courseTitle || '').replace(/"/g, '""')}"`,
      `"${r.status || 'Pending Review'}"`,
      `"${r.createdAt || ''}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = filterCourseCode ? `_${filterCourseCode}` : '_All_Courses';
    link.setAttribute('download', `SOIT_Archive_${archiveEntry.quarterCode}${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle 3-Action Dropdown Change ('CLOSED' | 'OPEN' | 'CONSULTATION')
  const handleCourseActionSelect = async (course, newAction) => {
    if (!canAdminManageCourse(activeAdminEmail, course, consultations)) {
      setBannerToast(`Access Restricted: As ${myInitialProfile.name} (${effectiveAdminDept}), you can only modify ${effectiveAdminDept} courses.`);
      setTimeout(() => setBannerToast(''), 4500);
      return;
    }
    if (onSectionActionChange) {
      await onSectionActionChange(course, newAction);
    }
    if (newAction === 'OPEN') {
      setBannerToast(`Opened section for ${course.code} (${course.title}). Visible in the Opened & Consultation tab.`);
    } else if (newAction === 'CONSULTATION') {
      setBannerToast(`Marked ${course.code} (${course.title}) For Consultation. Students are now advised to consult the ${course.dept || 'SOIT'} Program Chair.`);
    } else {
      setBannerToast(`Closed / hid section ${course.code} (${course.title}) from the student view.`);
    }
    setTimeout(() => setBannerToast(''), 4500);
  };

  const handleAddCourseSubmit = (e) => {
    e.preventDefault();
    setAddMsg({ text: '', type: '' });

    if (!newCode.trim() || !newTitle.trim()) {
      setAddMsg({ text: 'Both Course Code and Course Title are required.', type: 'error' });
      return;
    }

    const res = addCustomCourse({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      dept: newDept,
      units: Number(newUnits)
    });

    if (res.success) {
      setAddMsg({
        text: `Course ${newCode.trim().toUpperCase()} (${newTitle.trim()}) is now live in the student catalog.`,
        type: 'success'
      });
      setNewCode('');
      setNewTitle('');
      if (onCourseAdded) onCourseAdded();
    } else {
      setAddMsg({ text: res.error || 'Failed to add course.', type: 'error' });
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Clean Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '999px',
            background: hasAdminAccess ? 'rgba(185, 28, 28, 0.08)' : 'rgba(217, 119, 6, 0.08)',
            border: `1px solid ${hasAdminAccess ? 'rgba(185, 28, 28, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
            color: hasAdminAccess ? 'var(--crimson-bright)' : '#d97706',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            <ShieldCheck size={14} />
            <span>{hasAdminAccess ? 'SOIT System Administration' : `${effectiveAdminDept} Program Chair`}</span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{myInitialProfile.name}</span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{activeAdminEmail}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-pure)', margin: 0 }}>
            Chair & Faculty Console
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.3rem', marginBottom: 0, lineHeight: 1.5 }}>
            Manage section actions (<strong>Open Section</strong>, <strong>For Consultation</strong>, or <strong>Close Section</strong>) and customize Program Chair consultation schedules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary-ghost"
            onClick={() => setActiveTab('quarters')}
            style={{
              padding: '0.6rem 1.05rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              borderColor: isQuarterCurrentlyOpen ? 'var(--emerald-border)' : 'rgba(245, 158, 11, 0.4)',
              background: isQuarterCurrentlyOpen ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.12)',
              color: isQuarterCurrentlyOpen ? 'var(--emerald-core)' : '#d97706'
            }}
          >
            <Archive size={15} />
            <span>
              {isQuarterCurrentlyOpen
                ? `Active Quarter: ${activeQuarterCode} (End / Archive)`
                : `Portal Closed (${quarterState?.lastClosedQuarter || activeQuarterCode} Ended) • Open Quarter`}
            </span>
          </button>

          <button
            type="button"
            className="btn-secondary-ghost"
            onClick={handleExportCSV}
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem', fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} style={{ color: 'var(--emerald-core)' }} />
            <span>Export Master CSV</span>
          </button>
        </div>
      </div>

      {/* Action Toast Notification */}
      {bannerToast && (
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
          <span>{bannerToast}</span>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="dossier-card tilt-card" style={{ padding: '1.25rem 1.4rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Total Student Petitions
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-pure)', marginTop: '0.25rem', lineHeight: 1.1 }}>
            <KineticCounter value={totalRequests} />
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
            Active student submissions
          </span>
        </div>

        <div className="dossier-card tilt-card" style={{ padding: '1.25rem 1.4rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald-core)' }}>
            Ready to Open (15+)
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--emerald-core)', marginTop: '0.25rem', lineHeight: 1.1 }}>
            <KineticCounter value={readyCourses.length} />
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
            {openCount} section{openCount !== 1 ? 's' : ''} currently opened
          </span>
        </div>

        <div className="dossier-card tilt-card" style={{ padding: '1.25rem 1.4rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706' }}>
            For Consultation (10–14)
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem', lineHeight: 1.1 }}>
            <KineticCounter value={consultCount} />
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
            {nearReadyCourses.length} course{nearReadyCourses.length !== 1 ? 's' : ''} near threshold
          </span>
        </div>

        <div className="dossier-card tilt-card" style={{ padding: '1.25rem 1.4rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crimson-bright)' }}>
            My Consultation Slots
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--crimson-bright)', marginTop: '0.25rem', lineHeight: 1.1 }}>
            <KineticCounter value={chairSlots.length} />
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
            {myInitialProfile.name} ({myInitialProfile.dept})
          </span>
        </div>
      </div>

      {/* Clean Segmented Sub-Tab Navigation */}
      <div>
        <div className="chair-tab-bar">
          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <TrendingUp size={15} />
            <span>1. Course Thresholds</span>
          </button>

          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Users size={15} />
            <span>2. Student Roster ({requests.length})</span>
          </button>

          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'add_course' ? 'active' : ''}`}
            onClick={() => setActiveTab('add_course')}
          >
            <PlusCircle size={15} />
            <span>3. Add Course</span>
          </button>

          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'consultation' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultation')}
          >
            <CalendarClock size={15} />
            <span>4. Consultation Schedule</span>
          </button>

          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            <ShieldCheck size={15} />
            <span>
              {hasAdminAccess ? '5. User & Admin Management' : `5. ${effectiveAdminDept} Cluster & Faculty`}
            </span>
          </button>

          <button
            type="button"
            className={`chair-tab-btn ${activeTab === 'quarters' ? 'active' : ''}`}
            onClick={() => setActiveTab('quarters')}
          >
            <Archive size={15} />
            <span>6. Quarter Archives ({isQuarterCurrentlyOpen ? activeQuarterCode : 'Closed'})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COURSE THRESHOLDS & 3-ACTION DROPDOWN */}
      {activeTab === 'courses' && (
        <div className="dossier-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                  Course Demand & Section Action Control
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.22rem 0.65rem',
                  borderRadius: '999px',
                  background: hasSuperAdminAccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(185, 28, 28, 0.1)',
                  color: hasSuperAdminAccess ? 'var(--emerald-core)' : 'var(--crimson-bright)',
                  border: `1px solid ${hasSuperAdminAccess ? 'var(--emerald-border)' : 'rgba(185, 28, 28, 0.25)'}`
                }}>
                  {hasSuperAdminAccess
                    ? 'SOIT General Admin • Can Edit All Courses'
                    : `${myInitialProfile.name} • Can Edit ${effectiveAdminDept} Courses Only`}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                {hasSuperAdminAccess ? (
                  <>As <strong>SOIT General Administration ({activeAdminEmail})</strong>, you can open, close, or set for consultation <strong>all SOIT courses</strong>.</>
                ) : (
                  <>As the <strong>{effectiveAdminDept} Program Chair ({myInitialProfile.name})</strong>, you can open, close, and set for consultation <strong>{effectiveAdminDept} courses</strong>. Other departments are view-only.</>
                )}
              </p>
            </div>
          </div>

          {/* Search & Department Chip Filter */}
          <div className="course-control-toolbar" style={{ marginBottom: '1.25rem' }}>
            <div className="search-field-wrapper">
              <Search size={15} />
              <input
                type="text"
                className="search-input-sleek"
                placeholder="Search course code or title..."
                value={searchCourses}
                onChange={(e) => setSearchCourses(e.target.value)}
              />
            </div>

            <div className="dept-chip-rack">
              {DEPARTMENTS.map((d, idx) => {
                const deptId = typeof d === 'string' ? d : d.id;
                const deptName = typeof d === 'string' ? d : (d.name || d.id);
                return (
                  <button
                    key={deptId || idx}
                    type="button"
                    className={`dept-chip ${filterDept === deptId ? 'active' : ''}`}
                    onClick={() => setFilterDept(deptId)}
                  >
                    {deptName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Dept</th>
                  <th>Enrolled Petitions</th>
                  <th>15-Student Progress</th>
                  <th>Current Status</th>
                  <th>Section Action (3 Options)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, idx) => {
                  const isMet = course.isThresholdMet;
                  const isNear = !isMet && course.requestCount >= 10;
                  const activeRecord = openedSections.find(
                    s => String(s.code || '').toUpperCase() === String(course.code || '').toUpperCase()
                  );
                  const currentAction = activeRecord
                    ? (activeRecord.actionType === 'CONSULTATION' ? 'CONSULTATION' : 'OPEN')
                    : 'CLOSED';
                  const needed = Math.max(0, MIN_STUDENT_THRESHOLD - course.requestCount);

                  return (
                    <tr key={course.id || `${course.code}-${idx}`} className={`${isMet ? 'milestone-15-row' : ''} ${isNear ? 'thermal-demand-row' : ''}`.trim() || undefined}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span className="course-mono-code" style={{ fontSize: '0.86rem' }}>{course.code}</span>
                          {(course.isAutoCataloged || course.isCustom) && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '0.12rem 0.45rem',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--emerald-core)',
                              border: '1px solid var(--emerald-border)'
                            }}>
                              Auto-Added
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-pure)' }}>{course.title}</td>
                      <td>
                        <span style={{
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-hairline)'
                        }}>
                          {course.dept || 'SOIT'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ fontSize: '0.9rem', color: isMet ? 'var(--emerald-core)' : isNear ? '#d97706' : 'var(--text-pure)' }}>
                          {course.requestCount}
                        </strong>
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}> / {MIN_STUDENT_THRESHOLD}</span>
                      </td>
                      <td style={{ minWidth: '175px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.74rem', fontWeight: 700 }}>
                          <span style={{ color: isMet ? 'var(--emerald-core)' : isNear ? '#d97706' : 'var(--text-muted)' }}>
                            {isMet ? 'Reached 15' : `${needed} more needed`}
                          </span>
                          <span style={{ color: 'var(--text-faint)' }}>{course.progressPercentage}%</span>
                        </div>
                        <div className="micro-meter">
                          <div 
                            className={`micro-fill ${isMet ? 'met' : ''}`}
                            style={{ width: `${course.progressPercentage}%` }}
                          />
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {currentAction === 'OPEN' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.14)',
                            color: 'var(--emerald-core)',
                            border: '1px solid var(--emerald-border)'
                          }}>
                            <Check size={12} /> Section Open
                          </span>
                        ) : currentAction === 'CONSULTATION' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: 'rgba(245, 158, 11, 0.14)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.35)'
                          }}>
                            <CalendarClock size={12} /> For Consultation
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: isMet ? 'rgba(16, 185, 129, 0.08)' : isNear ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-input)',
                            color: isMet ? 'var(--emerald-core)' : isNear ? '#d97706' : 'var(--text-faint)',
                            border: '1px solid var(--border-hairline)'
                          }}>
                            {isMet ? 'Ready to Open' : isNear ? 'Almost Full' : 'Closed / Gathering'}
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {canAdminManageCourse(activeAdminEmail, course, consultations) ? (
                          <select
                            className="chair-status-select"
                            value={currentAction}
                            onChange={e => handleCourseActionSelect(course, e.target.value)}
                            style={{
                              fontWeight: 700,
                              borderColor:
                                currentAction === 'OPEN'
                                  ? 'var(--emerald-core)'
                                  : currentAction === 'CONSULTATION'
                                  ? '#d97706'
                                  : 'var(--border-medium)',
                              color:
                                currentAction === 'OPEN'
                                  ? 'var(--emerald-core)'
                                  : currentAction === 'CONSULTATION'
                                  ? '#d97706'
                                  : 'var(--text-pure)'
                            }}
                          >
                            <option value="CLOSED">Close / Hide Section</option>
                            <option value="OPEN">Open Section</option>
                            <option value="CONSULTATION">For Consultation</option>
                          </select>
                        ) : (
                          <span
                            title={`Only the ${course.dept || inferCourseDepartment(course)} Program Chair or SOIT General Admin (imppcabalag@gmail.com) can modify this course.`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.73rem',
                              fontWeight: 700,
                              padding: '0.38rem 0.7rem',
                              borderRadius: '8px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-faint)',
                              border: '1px solid var(--border-hairline)',
                              cursor: 'not-allowed'
                            }}
                          >
                            <Lock size={12} />
                            <span>{course.dept || inferCourseDepartment(course)} Chair Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="dossier-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                Student Submissions Roster
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
                Review individual student petitions, remaining units to graduate, and update petition status.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="search-field-wrapper" style={{ flex: 1, minWidth: '260px' }}>
              <Search size={15} />
              <input 
                type="text" 
                className="search-input-sleek" 
                placeholder="Search by student number, name, course code, or reference ID..."
                value={searchRoster}
                onChange={e => setSearchRoster(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="chair-status-select" 
                value={filterProgram}
                onChange={e => setFilterProgram(e.target.value)}
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
              >
                <option value="ALL">All Degree Programs</option>
                {SOIT_PROGRAMS.map(p => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student No. & Ref</th>
                  <th>Student Name & Email</th>
                  <th>Program & Units</th>
                  <th>Requested Course</th>
                  <th>Current Status</th>
                  <th>Update Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map(req => {
                  const st = req.status || 'Pending Review';
                  const isApproved = st.includes('Approved') || st.includes('Endorsed') || st.includes('Met') || st.includes('Opened');
                  const isDeclined = st.includes('Declined');

                  return (
                    <tr key={req.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--text-pure)' }}>
                          {req.studentNumber}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                          {req.id}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-pure)', fontSize: '0.86rem' }}>
                          {req.lastName}, {req.firstName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {req.email}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.18rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(185, 28, 28, 0.08)',
                            color: 'var(--crimson-bright)'
                          }}>
                            {req.program}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {req.unitsLeft} units left
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="course-mono-code" style={{ fontSize: '0.85rem' }}>{req.courseCode}</span>
                        {req.courseTitle && (
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.courseTitle}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.6rem',
                          borderRadius: '999px',
                          background: isApproved
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isDeclined
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                          color: isApproved
                            ? 'var(--emerald-core)'
                            : isDeclined
                            ? '#ef4444'
                            : '#d97706',
                          border: `1px solid ${isApproved ? 'var(--emerald-border)' : 'var(--border-hairline)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {st}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {canAdminManageCourse(activeAdminEmail, req.courseCode, consultations) ? (
                          <select 
                            className="chair-status-select"
                            value={st} 
                            onChange={e => onUpdateStatus(req.id, e.target.value)}
                          >
                            <option value="Pending Review">Pending Review</option>
                            <option value="Threshold Met">Threshold Met</option>
                            <option value="Section Opened">Section Opened</option>
                            <option value="For Consultation">For Consultation</option>
                            <option value="Approved for Opening">Approved for Opening</option>
                            <option value="Endorsed to Registrar">Endorsed to Registrar</option>
                            <option value="Declined">Declined</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.32rem 0.65rem',
                              borderRadius: '8px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-faint)',
                              border: '1px solid var(--border-hairline)'
                            }}
                          >
                            <Lock size={11} />
                            <span>{inferCourseDepartment(req.courseCode)} Chair Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CATALOG MANAGER (Add Course) */}
      {activeTab === 'add_course' && (
        <div className="dossier-card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
              Add New Course to SOIT Catalog
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem', marginBottom: 0 }}>
              Publish a new or special-topic course directly to the catalog so students can immediately select and petition it.
            </p>
          </div>

          {addMsg.text && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: addMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: addMsg.type === 'success' ? 'var(--emerald-core)' : '#ef4444',
              border: `1px solid ${addMsg.type === 'success' ? 'var(--emerald-border)' : 'rgba(239, 68, 68, 0.3)'}`,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {addMsg.text}
            </div>
          )}

          <form onSubmit={handleAddCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div className="input-field-group" style={{ marginBottom: 0 }}>
              <label className="field-label">
                Course Code <span className="required-dot">*</span>
              </label>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="e.g. CSS198 or ITS190P"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="input-field-group" style={{ marginBottom: 0 }}>
              <label className="field-label">
                Course Title <span className="required-dot">*</span>
              </label>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="e.g. Special Topics in Generative AI"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Department</label>
                <select 
                  className="custom-input" 
                  value={hasSuperAdminAccess ? newDept : effectiveAdminDept} 
                  onChange={e => setNewDept(e.target.value)}
                  disabled={!hasSuperAdminAccess}
                >
                  <option value="CS">Computer Science (CS)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="DS">Data Science (DS)</option>
                  <option value="EMC">Entertainment & Multimedia (EMC)</option>
                  <option value="IS">Information Systems (IS)</option>
                  {hasSuperAdminAccess && <option value="MATH">Mathematics (MATH)</option>}
                </select>
              </div>

              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Academic Units</label>
                <input 
                  type="number" 
                  className="custom-input" 
                  value={newUnits} 
                  onChange={e => setNewUnits(e.target.value)}
                  min="1" 
                  max="6"
                />
              </div>
            </div>

            <button type="submit" className="tactile-btn-primary" style={{ marginTop: '0.5rem', padding: '0.9rem 1.5rem' }}>
              <PlusCircle size={16} />
              <span>Publish Course to Catalog</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: PER-ADMINISTRATOR CONSULTATION HOURS SETTINGS */}
      {activeTab === 'consultation' && (
        <div className="dossier-card" style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--crimson-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Personalized Program Chair Settings • {activeAdminEmail}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-pure)', marginTop: '0.2rem', marginBottom: 0 }}>
                  My Consultation Hours & Schedule
                </h2>
              </div>
              <span style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(185, 28, 28, 0.08)',
                color: 'var(--crimson-bright)',
                border: '1px solid rgba(185, 28, 28, 0.2)'
              }}>
                Dept: {chairDept}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
              Configure your consultation days and time windows for your logged-in administrator account. These exact days and times are displayed to students in the <strong>Opened & Consultation</strong> tab.
            </p>
          </div>

          {consultSavedMsg && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--emerald-core)',
              border: '1px solid var(--emerald-border)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{consultSavedMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveMyConsultation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Program Chair Name / Title</label>
                <input
                  type="text"
                  className="custom-input"
                  value={chairName}
                  onChange={e => setChairName(e.target.value)}
                  placeholder="e.g. Sir JP, Ma'am Samonte"
                  required
                />
              </div>

              <div className="input-field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Assigned Program / Department</label>
                {hasSuperAdminAccess ? (
                  <input
                    type="text"
                    className="custom-input"
                    value="SOIT — General Administration (All Courses Access)"
                    disabled
                    style={{ fontWeight: 700, color: 'var(--emerald-core)', background: 'var(--bg-input)', cursor: 'not-allowed' }}
                  />
                ) : (
                  <select
                    className="custom-input"
                    value={chairDept}
                    onChange={e => setChairDept(e.target.value)}
                    disabled={Boolean(lockedProgramDept)}
                    style={lockedProgramDept ? { fontWeight: 700, cursor: 'not-allowed' } : undefined}
                  >
                    <option value="CS">CS — Computer Science</option>
                    <option value="IT">IT — Information Technology</option>
                    <option value="DS">DS — Data Science</option>
                    <option value="EMC">EMC — Entertainment & Multimedia</option>
                    <option value="IS">IS — Information Systems</option>
                  </select>
                )}
              </div>
            </div>

            {/* Dynamic Consultation Days & Time Windows */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label className="field-label" style={{ margin: 0 }}>
                  <Clock size={14} /> Consultation Days & Time Windows
                </label>
                <button
                  type="button"
                  className="btn-secondary-ghost"
                  onClick={handleAddSlot}
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.76rem', fontWeight: 700 }}
                >
                  <PlusCircle size={13} />
                  <span>Add Day & Time Slot</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {chairSlots.map((slot, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.1fr 1fr 1fr auto',
                      gap: '0.65rem',
                      alignItems: 'center',
                      background: 'var(--bg-input)',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-hairline)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: '0.2rem' }}>
                        Day of Week
                      </div>
                      <select
                        className="custom-input"
                        style={{ padding: '0.5rem 0.7rem', fontSize: '0.82rem', background: 'var(--bg-card)' }}
                        value={slot.day}
                        onChange={e => handleSlotChange(index, 'day', e.target.value)}
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: '0.2rem' }}>
                        Start Time
                      </div>
                      <input
                        type="text"
                        className="custom-input"
                        style={{ padding: '0.5rem 0.7rem', fontSize: '0.82rem', background: 'var(--bg-card)' }}
                        value={slot.startTime}
                        onChange={e => handleSlotChange(index, 'startTime', e.target.value)}
                        placeholder="e.g. 09:00 AM"
                        required
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: '0.2rem' }}>
                        End Time
                      </div>
                      <input
                        type="text"
                        className="custom-input"
                        style={{ padding: '0.5rem 0.7rem', fontSize: '0.82rem', background: 'var(--bg-card)' }}
                        value={slot.endTime}
                        onChange={e => handleSlotChange(index, 'endTime', e.target.value)}
                        placeholder="e.g. 12:00 PM"
                        required
                      />
                    </div>

                    <div style={{ paddingTop: '1.1rem' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        disabled={chairSlots.length <= 1}
                        title="Remove time slot"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: chairSlots.length <= 1 ? 'var(--border-medium)' : '#ef4444',
                          cursor: chairSlots.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '0.4rem'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="tactile-btn-primary" style={{ padding: '0.9rem 1.5rem' }}>
              <CheckCircle2 size={16} />
              <span>Save My Consultation Schedule</span>
            </button>
          </form>
        </div>
      )}
    
      {/* TAB 5: CLUSTER & ADMIN MANAGEMENT */}
      {activeTab === 'admins' && (
        <UserManagementSection
          activeAdminEmail={activeAdminEmail}
          consultations={consultations}
          adminEmails={adminEmails}
          adminRoleEmails={adminRoleEmails}
          requests={requests}
          effectiveAdminDept={effectiveAdminDept}
          hasAdminAccess={hasAdminAccess}
          onRefreshData={() => {
            setAdminEmails(getAllowedAdminEmails());
            fetchAdminRolesFromCloud().then(r => setAdminRoleEmails(r));
          }}
          onAdminRolesChanged={(updatedRoles) => {
            setAdminRoleEmails(updatedRoles);
          }}
          onConsultationsChanged={(updatedConsultations) => {
            // refresh consultations if needed
          }}
        />
      )}

      {/* TAB 6: END OF QUARTER & PREVIOUS QUARTERS ARCHIVE (REFINED LOW-COGNITIVE LOAD UI) */}
      {activeTab === 'quarters' && (() => {
        const selectedArchive = archivedQuarters.find(q => q.quarterCode === selectedArchiveCode) || archivedQuarters[0] || null;
        const archiveRequests = Array.isArray(selectedArchive?.requests) ? selectedArchive.requests : [];
        const archiveOpened = Array.isArray(selectedArchive?.openedSections) ? selectedArchive.openedSections : [];

        // Compute course demand summary for selected archive
        const archiveCourseMap = new Map();
        archiveRequests.forEach(r => {
          const code = String(r.courseCode || '').trim().toUpperCase();
          if (!code) return;
          if (!archiveCourseMap.has(code)) {
            archiveCourseMap.set(code, {
              code,
              title: r.courseTitle || code,
              dept: inferCourseDepartment(code),
              count: 0,
              met: false
            });
          }
          const entry = archiveCourseMap.get(code);
          entry.count += 1;
          entry.met = entry.count >= MIN_STUDENT_THRESHOLD;
        });

        const archiveCourseSummary = Array.from(archiveCourseMap.values()).sort((a, b) => b.count - a.count);
        const coursesMetCount = archiveCourseSummary.filter(c => c.met).length;

        // Filter requests for the roster view
        const filteredArchiveRequests = archiveRequests.filter(r => {
          const dept = inferCourseDepartment(r.courseCode);
          const matchDept = archiveDeptFilter === 'ALL' || dept === archiveDeptFilter;
          const q = archiveSearch.toLowerCase().trim();
          const matchQ = !q ||
            String(r.studentNumber || '').toLowerCase().includes(q) ||
            String(r.lastName || '').toLowerCase().includes(q) ||
            String(r.firstName || '').toLowerCase().includes(q) ||
            String(r.courseCode || '').toLowerCase().includes(q) ||
            String(r.courseTitle || '').toLowerCase().includes(q) ||
            String(r.id || '').toLowerCase().includes(q);
          return matchDept && matchQ;
        });

        // Pagination for Roster to eliminate cognitive overload & infinite scrolling
        const totalRosterPages = Math.max(1, Math.ceil(filteredArchiveRequests.length / ARCHIVE_PER_PAGE));
        const paginatedRequests = filteredArchiveRequests.slice(
          (archiveRosterPage - 1) * ARCHIVE_PER_PAGE,
          archiveRosterPage * ARCHIVE_PER_PAGE
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Action Toast Notification */}
            {quarterActionMsg.text && (
              <div
                style={{
                  padding: '0.85rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  backgroundColor: quarterActionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: quarterActionMsg.type === 'success' ? 'var(--emerald-core)' : '#ef4444',
                  border: `1px solid ${quarterActionMsg.type === 'success' ? 'var(--emerald-border)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{quarterActionMsg.text}</span>
              </div>
            )}

            {/* SECTION 1: ELEGANT COMPACT LIFECYCLE CONTROLLER */}
            <div
              className="dossier-card"
              style={{
                padding: '1.4rem 1.6rem',
                border: '1px solid var(--border-hairline)',
                borderLeft: `4px solid ${isQuarterCurrentlyOpen ? 'var(--emerald-core)' : '#d97706'}`,
                background: 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: isQuarterCurrentlyOpen ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isQuarterCurrentlyOpen ? 'var(--emerald-core)' : '#d97706',
                      border: `1px solid ${isQuarterCurrentlyOpen ? 'var(--emerald-border)' : 'rgba(245, 158, 11, 0.3)'}`,
                      flexShrink: 0
                    }}
                  >
                    <Archive size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                        Term Rollover & Quarter Lifecycle
                      </h2>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.6rem',
                          borderRadius: '999px',
                          background: isQuarterCurrentlyOpen ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.16)',
                          color: isQuarterCurrentlyOpen ? 'var(--emerald-core)' : '#d97706',
                          border: `1px solid ${isQuarterCurrentlyOpen ? 'var(--emerald-border)' : 'rgba(245, 158, 11, 0.35)'}`
                        }}
                      >
                        {isQuarterCurrentlyOpen
                          ? `Active Term: ${activeQuarterCode} • ${requests.length} Petitions`
                          : `Closed Term: ${quarterState?.lastClosedQuarter || activeQuarterCode} (Site Inactive)`}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                      {isQuarterCurrentlyOpen
                        ? `Students can currently petition courses for ${activeQuarterCode}. You can conclude this quarter or roll over to a fresh term below.`
                        : `The portal is currently closed to students ("The Quarter has not yet begun"). Open the next quarter below to restart student petitions.`}
                    </p>
                  </div>
                </div>

                {/* Quick Rollover / Close Actions Dock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {isQuarterCurrentlyOpen ? (
                    <>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-input)', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>Next Term:</span>
                        <input
                          type="text"
                          value={nextQuarterInput}
                          onChange={e => setNextQuarterInput(e.target.value.toUpperCase())}
                          style={{
                            width: '85px',
                            padding: '0.25rem 0.45rem',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-medium)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-pure)'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="tactile-btn-primary"
                        onClick={handleCloseAndOpenNextQuarter}
                        style={{ padding: '0.65rem 1.15rem', fontSize: '0.82rem' }}
                        title={`Move ${requests.length} petitions from ${activeQuarterCode} to archive and open ${nextQuarterInput || '3Q2627'} fresh`}
                      >
                        <PlayCircle size={15} />
                        <span>End {activeQuarterCode} & Open {nextQuarterInput || '3Q2627'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseQuarterOnly}
                        style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                        title={`Move ${activeQuarterCode} to archive and set portal status to 'Quarter has not yet begun'`}
                      >
                        <StopCircle size={14} />
                        <span>End Quarter Only</span>
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleOpenNewQuarterSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={nextQuarterInput}
                        onChange={e => setNextQuarterInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 3Q2627"
                        style={{
                          width: '100px',
                          padding: '0.5rem 0.65rem',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-medium)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-pure)'
                        }}
                        required
                      />
                      <button
                        type="submit"
                        className="tactile-btn-primary"
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
                      >
                        <PlayCircle size={15} />
                        <span>Open Quarter {nextQuarterInput || '3Q2627'} (Fresh Start)</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: CLEAN HIGH-DENSITY HISTORICAL ARCHIVE EXPLORER */}
            <div className="dossier-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header with Term Switcher Pills */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={18} style={{ color: 'var(--crimson-bright)' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                      Previous Quarters Data Archive ({archivedQuarters.length})
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Review final course demand thresholds, export rosters, or restore and delete historical quarter records.
                  </p>
                </div>

                {archivedQuarters.length > 0 && (
                  <div className="dept-chip-rack" style={{ margin: 0 }}>
                    {archivedQuarters.map(arch => {
                      const reqCount = Array.isArray(arch.requests) ? arch.requests.length : (arch.totalRequests || 0);
                      const isSelected = selectedArchive?.quarterCode === arch.quarterCode;
                      return (
                        <button
                          key={arch.id || arch.quarterCode}
                          type="button"
                          className={`dept-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedArchiveCode(arch.quarterCode);
                            setArchiveRosterPage(1);
                          }}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                        >
                          <span>{arch.quarterCode}</span>
                          <span style={{ opacity: 0.8, fontSize: '0.7rem', fontWeight: 700 }}>({reqCount})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {archivedQuarters.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-medium)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Archive size={26} style={{ color: 'var(--text-faint)', marginBottom: '0.4rem' }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-pure)', marginBottom: '0.2rem' }}>
                    No Previous Quarters Archived Yet
                  </div>
                  <p style={{ fontSize: '0.8rem', maxWidth: '480px', margin: '0 auto' }}>
                    When you close or roll over <strong>{activeQuarterCode}</strong>, a snapshot of its student petitions and section demands will appear here.
                  </p>
                </div>
              ) : selectedArchive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* Selected Quarter Action Bar & Quick Metrics */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                      padding: '0.9rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-hairline)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-pure)' }}>
                        {selectedArchive.quarterCode}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {archiveRequests.length} Student Petitions • {archiveCourseSummary.length} Courses • {coursesMetCount} Reached Threshold
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                        (Archived: {selectedArchive.closedAt ? new Date(selectedArchive.closedAt).toLocaleDateString() : 'Concluded'})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      {/* Reopen Button */}
                      <button
                        type="button"
                        onClick={() => handleReopenArchivedQuarterAction(selectedArchive.quarterCode)}
                        style={{
                          padding: '0.45rem 0.95rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-sm)',
                          background: selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen
                            ? 'var(--bg-card)'
                            : 'var(--mapua-crimson)',
                          color: selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen
                            ? 'var(--emerald-core)'
                            : '#ffffff',
                          border: selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen
                            ? '1px solid var(--emerald-border)'
                            : 'none',
                          cursor: selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen
                            ? 'default'
                            : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                        disabled={selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen}
                        title={`Restore ${selectedArchive.quarterCode} and its petitions to live active state`}
                      >
                        <RotateCcw size={13} />
                        <span>
                          {selectedArchive.quarterCode === activeQuarterCode && isQuarterCurrentlyOpen
                            ? `${selectedArchive.quarterCode} Live Active`
                            : `Reopen ${selectedArchive.quarterCode}`}
                        </span>
                      </button>

                      {/* Export CSV Button */}
                      <button
                        type="button"
                        className="btn-secondary-ghost"
                        onClick={() => handleExportArchiveCSV(selectedArchive)}
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <Download size={13} style={{ color: 'var(--emerald-core)' }} />
                        <span>Export CSV</span>
                      </button>

                      {/* Delete Archived Quarter Record Button */}
                      <button
                        type="button"
                        onClick={() => setDeleteArchiveModal({ isOpen: true, targetArchive: selectedArchive, isDeleting: false })}
                        style={{
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        title={`Permanently delete the archived record for ${selectedArchive.quarterCode}`}
                      >
                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                        <span>Delete Archive Record</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-View Switcher: Demand Summary vs Detailed Roster */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
                    <div className="dept-chip-rack" style={{ margin: 0 }}>
                      <button
                        type="button"
                        className={`dept-chip ${archiveSubView === 'summary' ? 'active' : ''}`}
                        onClick={() => setArchiveSubView('summary')}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                      >
                        <BarChart3 size={13} />
                        <span>Course Demand Summary ({archiveCourseSummary.length})</span>
                      </button>
                      <button
                        type="button"
                        className={`dept-chip ${archiveSubView === 'roster' ? 'active' : ''}`}
                        onClick={() => setArchiveSubView('roster')}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                      >
                        <Users size={13} />
                        <span>Student Petitions Roster ({filteredArchiveRequests.length})</span>
                      </button>
                    </div>

                    {archiveSubView === 'roster' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div className="search-field-wrapper" style={{ minWidth: '180px' }}>
                          <Search size={13} />
                          <input
                            type="text"
                            className="search-input-sleek"
                            placeholder="Filter student / course..."
                            value={archiveSearch}
                            onChange={e => {
                              setArchiveSearch(e.target.value);
                              setArchiveRosterPage(1);
                            }}
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem 0.35rem 1.8rem' }}
                          />
                        </div>

                        <div className="dept-chip-rack" style={{ margin: 0 }}>
                          {['ALL', 'CS', 'IT', 'DS', 'EMC', 'IS'].map(d => (
                            <button
                              key={d}
                              type="button"
                              className={`dept-chip ${archiveDeptFilter === d ? 'active' : ''}`}
                              onClick={() => {
                                setArchiveDeptFilter(d);
                                setArchiveRosterPage(1);
                              }}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VIEW A: COURSE DEMAND SUMMARY (COMPACT & CLEAN) */}
                  {archiveSubView === 'summary' && (
                    <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Course Code</th>
                            <th>Course Title</th>
                            <th>Cluster</th>
                            <th>Final Demand</th>
                            <th>Threshold Outcome</th>
                            <th style={{ textAlign: 'right' }}>Course Roster</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archiveCourseSummary.map(c => (
                            <tr key={c.code}>
                              <td>
                                <span className="course-mono-code" style={{ fontSize: '0.82rem' }}>{c.code}</span>
                              </td>
                              <td style={{ fontWeight: 600, color: 'var(--text-pure)', fontSize: '0.82rem' }}>{c.title}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'var(--bg-input)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-hairline)'
                                }}>
                                  {c.dept}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: c.met ? 'var(--emerald-core)' : 'var(--text-pure)', fontSize: '0.86rem' }}>
                                  {c.count}
                                </strong>
                                <span style={{ color: 'var(--text-faint)', fontSize: '0.74rem' }}> / {MIN_STUDENT_THRESHOLD}</span>
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '999px',
                                  background: c.met ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  color: c.met ? 'var(--emerald-core)' : '#d97706',
                                  border: `1px solid ${c.met ? 'var(--emerald-border)' : 'rgba(245, 158, 11, 0.3)'}`
                                }}>
                                  {c.met ? 'Met 15+ Threshold' : `Below Threshold (${c.count})`}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn-secondary-ghost"
                                  onClick={() => handleExportArchiveCSV(selectedArchive, c.code)}
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}
                                  title={`Export ${c.code} CSV`}
                                >
                                  <Download size={11} />
                                  <span>CSV ({c.count})</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW B: PAGINATED STUDENT ROSTER */}
                  {archiveSubView === 'roster' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student No.</th>
                              <th>Student Name</th>
                              <th>Program</th>
                              <th>Course</th>
                              <th>Final Status</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRequests.map(req => (
                              <tr key={req.id}>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                                  {req.studentNumber}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, color: 'var(--text-pure)', fontSize: '0.82rem' }}>
                                    {req.lastName}, {req.firstName}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{req.email}</div>
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '0.12rem 0.4rem',
                                    borderRadius: '4px',
                                    background: 'rgba(185, 28, 28, 0.08)',
                                    color: 'var(--crimson-bright)'
                                  }}>
                                    {req.program}
                                  </span>
                                </td>
                                <td>
                                  <span className="course-mono-code" style={{ fontSize: '0.8rem' }}>{req.courseCode}</span>
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-hairline)'
                                  }}>
                                    {req.status || 'Pending'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteRecordModal({
                                      isOpen: true,
                                      quarterCode: selectedArchive.quarterCode,
                                      record: req,
                                      isDeleting: false
                                    })}
                                    style={{
                                      padding: '0.22rem 0.55rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                    title={`Delete petition ${req.id} from ${selectedArchive.quarterCode} archive`}
                                  >
                                    <Trash2 size={11} />
                                    <span>Delete</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Clean Pagination Bar */}
                      {totalRosterPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.2rem 0.5rem' }}>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            Showing page <strong>{archiveRosterPage}</strong> of <strong>{totalRosterPages}</strong> ({filteredArchiveRequests.length} total petitions)
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-secondary-ghost"
                              onClick={() => setArchiveRosterPage(p => Math.max(1, p - 1))}
                              disabled={archiveRosterPage === 1}
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', opacity: archiveRosterPage === 1 ? 0.5 : 1 }}
                            >
                              <ChevronLeft size={13} />
                              <span>Prev</span>
                            </button>

                            <button
                              type="button"
                              className="btn-secondary-ghost"
                              onClick={() => setArchiveRosterPage(p => Math.min(totalRosterPages, p + 1))}
                              disabled={archiveRosterPage === totalRosterPages}
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', opacity: archiveRosterPage === totalRosterPages ? 0.5 : 1 }}
                            >
                              <span>Next</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* MODAL 1: DELETE ARCHIVED QUARTER RECORD */}
      {deleteArchiveModal.isOpen && deleteArchiveModal.targetArchive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => {
            if (!deleteArchiveModal.isDeleting) {
              setDeleteArchiveModal({ isOpen: false, targetArchive: null, isDeleting: false });
            }
          }}
        >
          <div
            className="dossier-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                  Delete Archived Quarter Record
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Permanent Archive Purge Confirmation
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}
            >
              Are you sure you want to permanently delete the archived record for{' '}
              <strong style={{ color: 'var(--text-pure)', fontFamily: 'var(--font-mono)' }}>
                {deleteArchiveModal.targetArchive.quarterCode}
              </strong>?
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                • Total Stored Petitions: <strong>{deleteArchiveModal.targetArchive.requests?.length || deleteArchiveModal.targetArchive.totalRequests || 0}</strong><br />
                • Archived Timestamp: <strong>{deleteArchiveModal.targetArchive.closedAt ? new Date(deleteArchiveModal.targetArchive.closedAt).toLocaleString() : 'N/A'}</strong><br />
                • Closed By: <strong>{deleteArchiveModal.targetArchive.closedByName || deleteArchiveModal.targetArchive.closedBy || 'Admin'}</strong>
              </div>
              <div style={{ marginTop: '0.65rem', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>
                ⚠️ Warning: This action permanently removes this quarter's snapshot from the Previous Quarters Data Archive and cannot be undone.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setDeleteArchiveModal({ isOpen: false, targetArchive: null, isDeleting: false })}
                disabled={deleteArchiveModal.isDeleting}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteArchive}
                disabled={deleteArchiveModal.isDeleting}
                style={{
                  padding: '0.65rem 1.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                  cursor: deleteArchiveModal.isDeleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <Trash2 size={14} />
                <span>{deleteArchiveModal.isDeleting ? 'Deleting...' : 'Delete Archive Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE INDIVIDUAL PETITION RECORD FROM ARCHIVE */}
      {deleteRecordModal.isOpen && deleteRecordModal.record && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => {
            if (!deleteRecordModal.isDeleting) {
              setDeleteRecordModal({ isOpen: false, quarterCode: '', record: null, isDeleting: false });
            }
          }}
        >
          <div
            className="dossier-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-pure)', margin: 0 }}>
                  Delete Student Record from Archive
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Term: {deleteRecordModal.quarterCode}
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}
            >
              <div>Applicant: <strong style={{ color: 'var(--text-pure)' }}>{deleteRecordModal.record.lastName}, {deleteRecordModal.record.firstName}</strong></div>
              <div>Student No.: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-pure)' }}>{deleteRecordModal.record.studentNumber}</strong></div>
              <div>Course: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--crimson-bright)' }}>{deleteRecordModal.record.courseCode}</strong> ({deleteRecordModal.record.courseTitle})</div>
              <div>Docket ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-bright)' }}>{deleteRecordModal.record.id}</strong></div>
              <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 600 }}>
                This student record will be permanently purged from the {deleteRecordModal.quarterCode} archive snapshot.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn-secondary-ghost"
                onClick={() => setDeleteRecordModal({ isOpen: false, quarterCode: '', record: null, isDeleting: false })}
                disabled={deleteRecordModal.isDeleting}
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePetitionRecord}
                disabled={deleteRecordModal.isDeleting}
                style={{
                  padding: '0.65rem 1.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                  cursor: deleteRecordModal.isDeleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <Trash2 size={14} />
                <span>{deleteRecordModal.isDeleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
